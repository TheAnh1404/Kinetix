// Test-only WebSocket transport for the existing Neon driver against a local,
// disposable PostgreSQL server. Never imported by the application runtime.
require("dotenv").config();
const net = require("node:net");
const path = require("node:path");
const { createServer } = require("node:http");
const Module = require("node:module");
const { WebSocketServer, WebSocket } = require("ws");
const { assertIsolatedDatabase } = require("./auth-test-safety.cjs");

try {
  assertIsolatedDatabase(
    process.env.TEST_DATABASE_URL,
    process.env.DATABASE_URL,
    process.env.AUTH_TEST_ALLOW_RESET,
  );
  const target = new URL(process.env.TEST_DATABASE_URL);
  if (!["127.0.0.1", "localhost"].includes(target.hostname))
    throw new Error(
      "Local test transport accepts only a loopback PostgreSQL test database.",
    );
  const port = Number(target.port || "5432");
  const server = createServer();
  const proxy = new WebSocketServer({ server });

  function getProxyAddress() {
    const addr = server.address();
    const proxyPort = addr && typeof addr === "object" ? addr.port : 0;
    return `127.0.0.1:${proxyPort}`;
  }

  function configureNeon(neonModule) {
    if (!neonModule || !neonModule.neonConfig) return;
    const cfg = neonModule.neonConfig;
    cfg.webSocketConstructor = WebSocket;
    cfg.useSecureWebSocket = false;
    cfg.forceDisablePgSSL = true;
    cfg.pipelineConnect = false;
    cfg.wsProxy = (host, requestedPort) => {
      if (
        host !== target.hostname &&
        host !== "127.0.0.1" &&
        host !== "localhost"
      ) {
        throw new Error("NON_TEST_DATABASE_BLOCKED");
      }
      return getProxyAddress();
    };
  }

  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (id) {
    const result = originalRequire.apply(this, arguments);
    if (
      id === "@neondatabase/serverless" ||
      (typeof id === "string" && id.includes("@neondatabase/serverless"))
    ) {
      configureNeon(result);
    }
    return result;
  };

  for (const dir of [__dirname, path.resolve(__dirname, "../backend"), path.resolve(__dirname, "../frontend")]) {
    try {
      const resolved = require.resolve("@neondatabase/serverless", { paths: [dir] });
      configureNeon(require(resolved));
    } catch {
      // Ignore workspaces without their own node_modules copy
    }
  }

  proxy.on("connection", (socket) => {
    const connection = net.createConnection({ host: "127.0.0.1", port });
    socket.on("message", (bytes) => connection.write(bytes));
    connection.on("data", (bytes) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(bytes);
    });
    connection.on("error", () => socket.close());
    connection.on("close", () => socket.close());
    socket.on("error", () => connection.destroy());
    socket.on("close", () => connection.end());
  });
  server.listen(0, "127.0.0.1", () => {
    server.unref();
    const addr = server.address();
    if (addr && typeof addr === "object") {
      process.env.LOCAL_PG_WS_PROXY = `127.0.0.1:${addr.port}`;
    }
    if (process.argv.includes("--treasury")) {
      require("ts-node/register/transpile-only");
      require("./verify-treasury-integration.ts");
    } else if (process.argv.includes("--v2")) {
      require("ts-node/register/transpile-only");
      require("./verify-v2-integration.ts");
    } else require("./run-auth-tests.cjs");
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
