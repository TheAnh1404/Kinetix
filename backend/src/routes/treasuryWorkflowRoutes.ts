import { Router } from "express";
import { endpoint } from "./authRoutes";
import {
  workflowOverview,
  createPolicyJar,
  createWorkflowJob,
  actWorkflowJob,
  saveSavingsGoal,
  readTreasuryProof,
} from "../services/treasuryWorkflowService";

export const treasuryWorkflowRouter = Router();
treasuryWorkflowRouter.get(
  "/treasury/jobs/:id/proof",
  endpoint(async (req, res) => {
    const image = await readTreasuryProof(req.auth!, req.params.id);
    res.type("image/png").send(image);
  }),
);
treasuryWorkflowRouter.get(
  "/workspaces/:id/vault-experience",
  endpoint(async (req, res) =>
    res.json({
      success: true,
      data: await workflowOverview(req.auth!, req.params.id),
    }),
  ),
);
treasuryWorkflowRouter.post(
  "/workspaces/:id/vault-experience",
  endpoint(async (req, res) =>
    res.json({
      success: true,
      data: await createPolicyJar(req.auth!, req.params.id, req.body),
    }),
  ),
);
treasuryWorkflowRouter.post(
  "/treasury/jars/:id/jobs",
  endpoint(async (req, res) =>
    res.json({
      success: true,
      data: await createWorkflowJob(req.auth!, req.params.id, req.body),
    }),
  ),
);
treasuryWorkflowRouter.post(
  "/treasury/jobs/:id/action",
  endpoint(async (req, res) =>
    res.json({
      success: true,
      data: await actWorkflowJob(req.auth!, req.params.id, req.body),
    }),
  ),
);
treasuryWorkflowRouter.post(
  "/treasury/jars/:id/goal",
  endpoint(async (req, res) => {
    await saveSavingsGoal(req.auth!, req.params.id, req.body);
    res.json({ success: true });
  }),
);
