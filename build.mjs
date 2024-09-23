import fs from 'fs';
import path from 'path';
import esbuild from 'esbuild';
import { execSync } from 'child_process';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';
import inlineImportPlugin from 'esbuild-plugin-inline-import';
import { readFileSync } from 'fs';

if (!fs.existsSync('config.json')) {
  console.error('config.json not found');
  process.exit(1);
}

try {
  console.log('Building Evefan...');
  const connectorsDeclaration = path.resolve('./src/connectors/index.ts');

  const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));
  // TODO: validate config.json

  if (!config.deploy || !config.deploy.scriptName) {
    throw new Error('deploy.scriptName is not defined in config.json');
  }

  const fileContent = fs.readFileSync(connectorsDeclaration, 'utf-8');

  const originalLine = 'export async function loadConnector(type: string) {}\n';

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
  fs.writeFileSync(connectorsDeclaration, modifiedContent, 'utf-8');
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
      {
        name: 'wasm',
        setup(build) {
          build.onResolve({ filter: /\.wasm$/ }, (args) => {
            const wasmFileName = path.basename(args.path);
            const sourceWasmPath = path.resolve(args.resolveDir, args.path);
            const destWasmPath = path.resolve(
              process.cwd(),
              'dist',
              wasmFileName
            );

            // Ensure the destination directory exists
            fs.mkdirSync(path.dirname(destWasmPath), { recursive: true });

            // Copy WASM file to dist folder
            fs.copyFileSync(sourceWasmPath, destWasmPath);

            // Return a path relative to the output file
            return { path: './' + wasmFileName, external: true };
          });
        },
      },
      {
        name: 'patch-arrow',
        setup(build) {
          build.onLoad({ filter: /valid\.mjs$/ }, async (args) => {
            const customFunction = `
export function createIsValidFunction() {
  return () => true;
}
`;

            return {
              contents: customFunction,
              loader: 'js',
            };
          });
        },
      },
    ],
    platform: 'browser',
    conditions: ['worker', 'browser'],
    entryPoints: ['src/index.ts'],
    sourcemap: true,
    outfile: 'dist/index.js',
    logLevel: 'warning',
    format: 'esm',
    target: 'es2020',
    bundle: true,
    treeShaking: true,
    minify: process.NODE_ENV === 'production',
    external: ['cloudflare:workers', '*.wasm'],
    allowOverwrite: true,
    define: {
      IS_CLOUDFLARE_WORKER: 'true',
    },
    loader: {
      '.wasm': 'file',
    },
  });

  // After the build, restore the original line
  const restoredContent = modifiedContent
    .replace(newFunctionContent, originalLine)
    .trim(); // Remove any extra spaces

  // Write the restored content back to the file
  fs.writeFileSync(connectorsDeclaration, restoredContent, 'utf-8');
} catch (e) {
  console.error('Build error: ', e);
  process.exit(1);
}
