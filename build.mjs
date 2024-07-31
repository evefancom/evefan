import fs from "fs";
import path from "path";
import esbuild from "esbuild";
import { execSync } from "child_process"
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
import inlineImportPlugin from "esbuild-plugin-inline-import";

if (!fs.existsSync("config.json")) {
  console.error("config.json not found");
  process.exit(1);
}

try {
  const connectorsDeclaration = path.resolve("./src/connectors/index.ts");

  const config = JSON.parse(fs.readFileSync("config.json", "utf-8"));
  // TODO: validate config.json

  if (!config.deploy || !config.deploy.scriptName) {
    throw new Error("deploy.scriptName is not defined in config.json");
  }

  const fileContent = fs.readFileSync(connectorsDeclaration, "utf-8");

  const originalLine = "export async function loadConnector(type: string) {}\n";

  // Generate the new function content dynamically based on a list of types
  let newFunctionContent = `export async function loadConnector(type: string) {
    switch (type) {
  `;

  for (const destination of config.destinations) {
    newFunctionContent += `    case "${destination.type}":\n      return await import("./${destination.type}");\n`;
  }

  newFunctionContent += `    // Add cases for other types\n    default:\n      throw new Error(\`Unsupported connector type: \${type}\`);\n  }\n}\n`;

  // Replace the specific line with the new function content
  const modifiedContent = fileContent.replace(
    /export async function loadConnector\(type: string\) \{.*\}/s,
    newFunctionContent
  );

  // Write the modified content back to the file
  fs.writeFileSync(connectorsDeclaration, modifiedContent, "utf-8");
  await esbuild.build({
    plugins: [
      // matching https://developers.cloudflare.com/workers/runtime-apis/nodejs/
      NodeGlobalsPolyfillPlugin({
        buffer: true,
        process: true,
      }),
      NodeModulesPolyfillPlugin({
        modules: {
          Crypto: true,
          DiagnosticsChannel: true,
          EventEmitter: true,
          net: true,
          path: true,
          Streams: true,
          StringDecoder: true,
          test: true,
          util: true,
        },
      }),
      inlineImportPlugin(),
    ],
    platform: "browser",
    conditions: ["worker", "browser"],
    entryPoints: ["src/index.ts"],
    sourcemap: true,
    outfile: "dist/index.js",
    logLevel: "warning",
    format: "esm",
    target: "es2020",
    bundle: true,
    treeShaking: true,
    minify: process.NODE_ENV === "production",
    external: ["cloudflare:workers"],
    define: {
      IS_CLOUDFLARE_WORKER: "true",
    },
  });

  // After the build, restore the original line
  const restoredContent = modifiedContent
    .replace(newFunctionContent, originalLine)
    .trim(); // Remove any extra spaces

  // Write the restored content back to the file
  fs.writeFileSync(connectorsDeclaration, restoredContent, "utf-8");

  // Check if wrangler.toml exists
  if (fs.existsSync("wrangler.template.toml")) {
    // Read existing content
    const templateWranglerConfig = fs.readFileSync(
      "wrangler.template.toml",
      "utf8"
    );

    // Merge existing content with new config
    let updatedConfig = templateWranglerConfig.replace(
      /^name\s*=.*$/m,
      `name = "${config.deploy.scriptName}"`
    );

    if (
      !config.queue ||
      !config.queue.batchSize ||
      !config.queue.maxRetries ||
      !config.queue.maxWaitTimeMs
    ) {
      throw new Error(
        "queue.maxWaitTimeMs, queue.batchSize or queue.maxRetries are not defined in config.json"
      );
    }
    // Prepare queue configurations
    let queueConfigs = "\n";

    // Iterate through destinations
    for (const destination of config.destinations) {
      const queue = `${config.deploy.scriptName}-${destination.type}`
      if (process.env.NODE_ENV === "production") {
        try {
          console.log(`Creating queue ${queue}`);
          execSync(`wrangler queues create ${queue}`);
        } catch (e) {
          console.log(`Queue ${queue} already exists`);
        }
      }
      queueConfigs += `
[[queues.producers]]
  queue = "${queue}"
  binding = "${destination.type.toUpperCase()}"
[[queues.consumers]]
  queue = "${queue}"
  max_batch_size = ${Math.min(destination.config.batchSize, 100)}
  max_batch_timeout = ${Math.floor(config.queue.maxWaitTimeMs / 1000)}
  max_retries = ${config.queue.maxRetries}
  dead_letter_queue = "${config.deploy.scriptName}-dl-${destination.type}"
`;
    }

    // Append queue configurations to updatedConfig
    updatedConfig += queueConfigs;

    // Write updated content back to file
    fs.writeFileSync("wrangler.toml", updatedConfig, "utf8");

    console.log("Generated wrangler.toml file");
  } else {
    throw new Error("wrangler.template.toml file does not exist");
  }
} catch (e) {
  console.error("Build error: ", e);
  process.exit(1);
}
