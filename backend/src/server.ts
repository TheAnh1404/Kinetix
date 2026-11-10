import http from "node:http";
import https from "node:https";
import dns from "node:dns";

// Ngăn lỗi IPv6 Happy Eyeballs gây timeout kết nối RPC & Database trên Windows
try {
  dns.setDefaultResultOrder("ipv4first");
  (http.globalAgent as any).options.autoSelectFamily = false;
  (https.globalAgent as any).options.autoSelectFamily = false;
} catch {}

import express from "express";
import {
  authRouter,
  authenticated,
  fullSession,
  originGuard,
  authErrorHandler,
} from "./routes/authRoutes";
import { apiRouter } from "./routes/apiRoutes";
import { memberRouter } from "./routes/memberRoutes";
import { operationRouter } from "./routes/operationRoutes";
import { settingsRouter } from "./routes/settingsRoutes";
import { firstUseRouter } from "./routes/firstUseRoutes";
import { START_FLOW_VERSION } from "../../shared/startFlow";
import { vaultCreationRouter } from "./routes/vaultCreationRoutes";
import { treasuryRouter } from "./routes/treasuryRoutes";
import * as dotenv from "dotenv";

dotenv.config();
const app = express();
app.set("json replacer", (_key: string, value: unknown) => typeof value === "bigint" ? value.toString() : value);
app.disable("x-powered-by");
// Set only to the exact trusted reverse-proxy hop count in deployment.
if (process.env.TRUST_PROXY_HOPS)
  app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS));
app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});
app.use("/api", originGuard, express.json({ limit: "1mb" }));
app.get("/api/health", (_req, res) =>
  res.json({ success: true, status: "ok", startFlowVersion: START_FLOW_VERSION }),
);
app.use("/api/auth", authRouter);
app.use("/api/settings", authenticated, fullSession, settingsRouter);
app.use("/api", authenticated, fullSession, treasuryRouter, vaultCreationRouter, firstUseRouter, operationRouter, memberRouter, apiRouter);
app.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "Kinetix API" }),
);
app.use((_req, res) =>
  res.status(404).json({ success: false, error: "Không tìm thấy API." }),
);
app.use(authErrorHandler);
if (process.env.NODE_ENV !== "test")
  app.listen(Number(process.env.PORT || 4000), () =>
    console.log("Kinetix API listening"),
  );
export default app;
