import { Router } from "express";
import { endpoint } from "./authRoutes";
import * as creation from "../services/vaultCreationService";
import { recordOperation, publicOperation } from "../services/operationService";
export const vaultCreationRouter = Router();
vaultCreationRouter.get(
  "/workspaces/:id/vault-creation",
  endpoint(async (req, res) =>
    res.json({
      success: true,
      data: await creation.creationContext(req.auth!, req.params.id),
    }),
  ),
);
vaultCreationRouter.get(
  "/workspaces/:id/vault-drafts",
  endpoint(async (req, res) =>
    res.json({
      success: true,
      drafts: await creation.listCreationDrafts(req.auth!, req.params.id),
    }),
  ),
);
vaultCreationRouter.post(
  "/workspaces/:id/vault-drafts",
  endpoint(async (req, res) =>
    res.json({
      success: true,
      draft: await creation.saveCreationDraft(
        req.auth!,
        req.params.id,
        req.body,
      ),
    }),
  ),
);
vaultCreationRouter.get(
  "/workspaces/:id/vault-drafts/:draftId",
  endpoint(async (req, res) =>
    res.json({
      success: true,
      draft: await creation.getCreationDraft(
        req.auth!,
        req.params.id,
        req.params.draftId,
      ),
    }),
  ),
);
vaultCreationRouter.patch(
  "/workspaces/:id/vault-drafts/:draftId",
  endpoint(async (req, res) =>
    res.json({
      success: true,
      draft: await creation.saveCreationDraft(
        req.auth!,
        req.params.id,
        req.body,
        req.params.draftId,
      ),
    }),
  ),
);
vaultCreationRouter.post(
  "/workspaces/:id/vault-drafts/:draftId/preflight",
  endpoint(async (req, res) =>
    res.json({
      success: true,
      draft: await creation.preflightCreation(
        req.auth!,
        req.params.id,
        req.params.draftId,
        req.body.revision,
      ),
    }),
  ),
);
vaultCreationRouter.post(
  "/workspaces/:id/vault-drafts/:draftId/claim",
  endpoint(async (req, res) =>
    res.json({
      success: true,
      intent: await creation.claimCreation(
        req.auth!,
        req.params.id,
        req.params.draftId,
        req.body.attemptId,
      ),
    }),
  ),
);
vaultCreationRouter.post(
  "/workspaces/:id/vault-drafts/:draftId/rejected",
  endpoint(async (req, res) =>
    res.json({
      success: true,
      draft: await creation.releaseCreation(
        req.auth!,
        req.params.id,
        req.params.draftId,
        req.body.attemptId,
      ),
    }),
  ),
);
vaultCreationRouter.post(
  "/workspaces/:id/vault-drafts/:draftId/transaction",
  endpoint(async (req, res) =>
    res.json({
      success: true,
      operation: publicOperation(
        await recordOperation(
          req.auth!,
          req.params.id,
          req.body.txHash,
          undefined,
          req.params.draftId,
        ),
      ),
    }),
  ),
);
