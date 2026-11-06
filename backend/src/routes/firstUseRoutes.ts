import { Router } from "express";
import { endpoint } from "./authRoutes";
import { getStart, updateStart } from "../services/startService";
import {
  firstUseStatus,
  connectFirstUseWorkspace,
  firstUseVaultCandidates,
} from "../services/firstUseService";

export const firstUseRouter = Router();
firstUseRouter.get(
  "/workspaces/:id/start",
  endpoint(async (req, res) =>
    res.json({ success: true, data: await getStart(req.auth!, req.params.id) }),
  ),
);
firstUseRouter.patch(
  "/workspaces/:id/start",
  endpoint(async (req, res) =>
    res.json({
      success: true,
      data: await updateStart(req.auth!, req.params.id, req.body),
    }),
  ),
);
firstUseRouter.get(
  "/workspaces/:id/first-use",
  endpoint(async (req, res) =>
    res.json({
      success: true,
      data: await firstUseStatus(req.auth!, req.params.id),
    }),
  ),
);
firstUseRouter.post(
  "/workspaces/:id/first-use/connect",
  endpoint(async (req, res) =>
    res.json({
      success: true,
      data: await connectFirstUseWorkspace(req.auth!, req.params.id),
    }),
  ),
);
firstUseRouter.get(
  "/workspaces/:id/vault-candidates",
  endpoint(async (req, res) =>
    res.json({
      success: true,
      data: await firstUseVaultCandidates(req.auth!, req.params.id),
    }),
  ),
);
