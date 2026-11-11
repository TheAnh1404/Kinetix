// Test-only Neon WebSocket adapter for a disposable loopback PostgreSQL database.
require("dotenv").config();
const net = require("node:net");
const { createServer } = require("node:http");
const { WebSocketServer, WebSocket } = require("ws");
const { neonConfig } = require("@neondatabase/serverless");
const { assertIsolatedDatabase } = require("./auth-test-safety.cjs");
assertIsolatedDatabase(
  process.env.TEST_DATABASE_URL,
  process.env.DATABASE_URL,
  process.env.AUTH_TEST_ALLOW_RESET,
);
const target = new URL(process.env.TEST_DATABASE_URL);
if (!["127.0.0.1", "localhost"].includes(target.hostname))
  throw new Error("LOCAL_TEST_DATABASE_REQUIRED");
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
server.listen(0, "127.0.0.1", () => server.unref());
