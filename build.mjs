import fs from "fs";

let config;
try {
  config = JSON.parse(fs.readFileSync("config.json", "utf8"));
} catch (error) {
  throw new Error("Failed to read or parse config.json");
}

if (!config.deploy || !config.deploy.scriptName) {
  throw new Error("deploy.scriptName is not defined in config.json");
}

// Check if wrangler.toml exists
if (fs.existsSync("wrangler.toml")) {
  // Read existing content
  const existingConfig = fs.readFileSync("wrangler.toml", "utf8");

  // Merge existing content with new config
  const updatedConfig = existingConfig.replace(
    /^name\s*=.*$/m,
    `name = "${config.deploy.scriptName}"`
  );

  // Write updated content back to file
  fs.writeFileSync("wrangler.toml", updatedConfig, "utf8");

  console.log("Updated existing wrangler.toml file");
} else {
  throw new Error("wrangler.toml file does not exist");
}
