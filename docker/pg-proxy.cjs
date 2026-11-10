// Private, fixed-target gateway for the existing Neon PostgreSQL wire driver.
// Never published to the host; PostgreSQL still authenticates every connection.
const http = require("node:http");
const net = require("node:net");
const { WebSocketServer, WebSocket } = require("ws");
const host = process.env.PGHOST || "postgres";
const port = Number(process.env.PGPORT || 5432);
const server = http.createServer((req, res) => { res.writeHead(req.url === "/health" ? 200 : 404); res.end(req.url === "/health" ? "ok" : "not found"); });
const sockets = new Set();
const gateway = new WebSocketServer({ server, maxPayload: 1024 * 1024 });
gateway.on("connection", (socket) => {
  const connection = net.createConnection({ host, port });
  sockets.add(connection);
  socket.on("message", (bytes) => { if (!connection.write(bytes)) socket.pause(); });
  connection.on("drain", () => socket.resume());
  connection.on("data", (bytes) => { if (socket.readyState === WebSocket.OPEN) socket.send(bytes); });
  connection.on("error", () => socket.close(1011));
  connection.on("close", () => { sockets.delete(connection); socket.close(); });
  socket.on("error", () => connection.destroy());
  socket.on("close", () => connection.destroy());
});
server.listen(Number(process.env.PROXY_PORT || 8080), "0.0.0.0");
for (const signal of ["SIGTERM", "SIGINT"]) process.once(signal, () => { for (const socket of sockets) socket.destroy(); gateway.close(); server.close(() => process.exit(0)); });
