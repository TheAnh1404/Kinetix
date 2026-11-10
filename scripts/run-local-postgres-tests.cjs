// Test-only WebSocket transport for the existing Neon driver against a local,
// disposable PostgreSQL server. Never imported by the application runtime.
require("dotenv").config();
const net = require("node:net");
const { createServer } = require("node:http");
const { WebSocketServer, WebSocket } = require("ws");
const { neonConfig } = require("@neondatabase/serverless");
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
  neonConfig.webSocketConstructor = WebSocket;
  neonConfig.useSecureWebSocket = false;
  neonConfig.forceDisablePgSSL = true;
  neonConfig.pipelineConnect = false;
  neonConfig.wsProxy = (host, requestedPort) => {
    if (host !== target.hostname || Number(requestedPort) !== port)
      throw new Error("NON_TEST_DATABASE_BLOCKED");
    return `127.0.0.1:${server.address().port}`;
  };
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
