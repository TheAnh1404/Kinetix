import { Router } from "express";
import { endpoint } from "./authRoutes";
import {
  createTreasuryJar,
  createTreasuryTransfer,
  submitTreasuryHash,
  treasuryOverview,
} from "../services/treasuryService";

export const treasuryRouter = Router();
treasuryRouter.get(
  "/workspaces/:id/treasury",
  endpoint(async (req, res) =>
    res.json({
      success: true,
      data: await treasuryOverview(req.auth!, req.params.id),
    }),
  ),
);
treasuryRouter.post(
  "/workspaces/:id/treasury/jars",
  endpoint(async (req, res) =>
    res.json({
      success: true,
      jar: await createTreasuryJar(req.auth!, req.params.id, req.body.name),
    }),
  ),
);
treasuryRouter.post(
  "/workspaces/:id/treasury/transfers",
  endpoint(async (req, res) =>
    res.json({
      success: true,
      transfer: await createTreasuryTransfer(
        req.auth!,
        req.params.id,
        req.body,
      ),
    }),
  ),
);
treasuryRouter.post(
  "/treasury/transfers/:id/transaction",
  endpoint(async (req, res) =>
    res.json({
      success: true,
      transfer: await submitTreasuryHash(
        req.auth!,
        req.params.id,
        req.body.txHash,
      ),
    }),
  ),
);
