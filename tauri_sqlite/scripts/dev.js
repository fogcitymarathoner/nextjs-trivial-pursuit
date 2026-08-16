import { spawn } from "child_process";
import net from "net";
import fs from "fs";
import path from "path";

const TEMP_CONFIG_FILE = "tauri.temp.conf.json";

/**
 * Checks if a port is available on localhost.
 * @param {number} port
 * @returns {Promise<boolean>}
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => {
      resolve(false);
    });
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

/**
 * Gets the next available port starting from startPort.
 * @param {number} startPort
 * @returns {Promise<number>}
 */
async function getAvailablePort(startPort) {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    port++;
  }
  return port;
}

// Clean up temporary configuration file
function cleanup() {
  try {
    if (fs.existsSync(TEMP_CONFIG_FILE)) {
      fs.unlinkSync(TEMP_CONFIG_FILE);
    }
  } catch (err) {
    // Ignore cleanup errors on exit
  }
}

// Ensure cleanup occurs on termination signals
process.on("exit", cleanup);
process.on("SIGINT", () => {
  cleanup();
  process.exit(0);
});
process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});
process.on("uncaughtException", (err) => {
  cleanup();
  console.error("Uncaught exception:", err);
  process.exit(1);
});

async function run() {
  const preferredPort = 1420;
  const port = await getAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`\x1b[33mPort ${preferredPort} is already in use. Rolling over to next available port: ${port}\x1b[0m`);
  } else {
    console.log(`\x1b[32mSelected available development port: ${port}\x1b[0m`);
  }

  // Create temporary config override file containing the devUrl
  const tempConfig = {
    build: {
      devUrl: `http://localhost:${port}`,
    },
  };

  fs.writeFileSync(TEMP_CONFIG_FILE, JSON.stringify(tempConfig, null, 2), "utf-8");
  console.log(`\x1b[36mCreated temporary config override: ${TEMP_CONFIG_FILE}\x1b[0m`);

  console.log(`\x1b[36mLaunching Tauri dev...\x1b[0m`);

  // Spawn Tauri Dev command and point it to our temporary JSON configuration file.
  // Passing a plain file path to --config is 100% shell-proof, platform-independent,
  // and using shell: true on Windows prevents the 'spawn EINVAL' error with npx.
  const child = spawn(
    "npx",
    ["tauri", "dev", "--config", TEMP_CONFIG_FILE],
    {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: { ...process.env, VITE_PORT: String(port) },
    }
  );

  child.on("close", (code) => {
    cleanup();
    process.exit(code || 0);
  });
}

run().catch((err) => {
  cleanup();
  console.error("Failed to run custom dev script:", err);
  process.exit(1);
});
