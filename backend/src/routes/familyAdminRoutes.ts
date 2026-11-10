import { Router } from "express";
import { endpoint } from "./authRoutes";
import { rateLimit } from "../auth/service";
import { adminOverview, prepareAdminIntent, executeAdminIntent } from "../services/familyAdminService";
export const familyAdminRouter = Router();
familyAdminRouter.get("/workspaces/:id/admin/overview", endpoint(async (req, res) => res.json({ success: true, data: await adminOverview(req.auth!, req.params.id) })));
familyAdminRouter.post("/workspaces/:id/admin/intents", endpoint(async (req, res) => { await rateLimit(`admin-prepare:${req.auth!.user.id}:${req.params.id}`, 30); res.json({ success: true, data: await prepareAdminIntent(req.auth!, req.params.id, req.body) }); }));
familyAdminRouter.post("/workspaces/:id/admin/intents/:intentId/execute", endpoint(async (req, res) => { await rateLimit(`admin-execute:${req.auth!.user.id}:${req.params.id}`, 30); res.json(await executeAdminIntent(req.auth!, req.params.id, req.params.intentId, req.body.signature)); }));
