import { Router } from "express";
import { endpoint } from "./authRoutes";
import { uuidInput } from "../auth/security";
import { completeOperation, listOperations, publicOperation, reconcileOperation, recordOperation } from "../services/operationService";
import { db, authChallenges } from "../db";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { coreDeploymentPlan, recordCoreDeployment } from "../services/coreDeploymentService";
import { startRecovery, listRecoveries, confirmRecovery, finishRecovery } from "../services/recoveryService";
import { assert } from "../auth/security";
import { BROWSER_COOKIE } from "../auth/service";

export const operationRouter = Router();
operationRouter.get("/recovery", endpoint(async (req, res) => res.json({ success: true, recoveries: await listRecoveries(req.auth!, uuidInput(String(req.query.workspaceId || ""))) })));
operationRouter.post("/recovery", endpoint(async (req, res) => {
  const browser = (req.headers.cookie || "").split(";").map((pair) => pair.trim()).find((pair) => pair.startsWith(`${BROWSER_COOKIE}=`))?.slice(BROWSER_COOKIE.length + 1);
  assert(browser && /^[A-Za-z0-9_-]{43}$/.test(browser), 401, "Thiếu browser challenge.");
  return res.json({ success: true, recovery: await startRecovery(req.auth!, req.body.challengeId, req.body.signature, browser) });
}));
operationRouter.post("/recovery/confirm", endpoint(async (req, res) => res.json({ success: true, result: await confirmRecovery(req.auth!, req.body.stepId, req.body.txHash) })));
operationRouter.post("/recovery/:id/finish", endpoint(async (req, res) => res.json({ success: true, result: await finishRecovery(req.auth!, req.params.id) })));
operationRouter.get("/deployment/core-plan", endpoint(async (req, res) => res.json({ success: true, plan: await coreDeploymentPlan(req.auth!, uuidInput(String(req.query.workspaceId || ""))) })));
operationRouter.post("/deployment/core-receipt", endpoint(async (req, res) => res.json({ success: true, result: await recordCoreDeployment(req.auth!, uuidInput(req.body.workspaceId || ""), req.body.key, req.body.txHash) })));
operationRouter.get("/operations", endpoint(async (req, res) => res.json({ success: true, operations: await listOperations(req.auth!, uuidInput(String(req.query.workspaceId || ""))) })));
operationRouter.post("/operations", endpoint(async (req, res) => {
  const row = await recordOperation(req.auth!, uuidInput(req.body.workspaceId || ""), req.body.txHash, req.body.attachmentId, req.body.draftId);
  return res.json({ success: true, operation: publicOperation(row) });
}));
operationRouter.post("/operations/:id/reconcile", endpoint(async (req, res) => res.json({ success: true, operation: await reconcileOperation(req.auth!, req.params.id) })));
operationRouter.post("/operations/:id/complete", endpoint(async (req, res) => res.json({ success: true, operation: await completeOperation(req.auth!, req.params.id) })));
operationRouter.get("/signatures", endpoint(async (req, res) => {
  const signatures = await db.select({ id: authChallenges.id, purpose: authChallenges.purpose, address: authChallenges.address, signatureHash: authChallenges.signatureHash, verifiedAt: authChallenges.signatureVerifiedAt }).from(authChallenges).where(and(eq(authChallenges.userId, req.auth!.user.id), isNotNull(authChallenges.signatureHash))).orderBy(desc(authChallenges.signatureVerifiedAt)).limit(100);
  return res.json({ success: true, signatures });
}));
