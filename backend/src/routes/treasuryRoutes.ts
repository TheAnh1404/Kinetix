import { Router } from "express";
import { endpoint } from "./authRoutes";
import { db, treasuryTransfers } from "../db";
import { eq } from "drizzle-orm";
import { membership } from "../auth/service";
import { assert, uuidInput } from "../auth/security";
import { requireWorkspaceWrites } from "../services/familyAccess";
import {
  createTreasuryJar,
  createTreasuryTransfer,
  submitTreasuryHash,
  treasuryOverview,
} from "../services/treasuryService";

export const treasuryRouter = Router();
treasuryRouter.post("/treasury/transfers/:id/preflight", endpoint(async (req, res) => {
  const [transfer] = await db.select().from(treasuryTransfers).where(eq(treasuryTransfers.id, uuidInput(req.params.id)));
  assert(transfer, 404, "Không tìm thấy giao dịch.");
  await membership(db, req.auth!, transfer.workspaceId);
  await requireWorkspaceWrites(db, transfer.workspaceId, transfer.kind !== "DEPOSIT");
  res.json({ success: true });
}));
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
