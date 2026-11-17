import { Router } from "express";
import { endpoint } from "./authRoutes";
import {
  getGroupOverview,
  inviteGroupMember,
  removeGroupMember,
  listGroupFunds,
  createGroupFund,
  getFundDetail,
  updateFundPolicy,
  listFundObligations,
  createContributionIntent,
  reconcileContribution,
  listFundExpenses,
  createExpenseRequest,
  approveExpenseRequest,
  rejectExpenseRequest,
  cancelExpenseRequest,
  preparePayment,
  verifyAndSettlePayment,
  getGroupAuditEvents,
  listGroupTransfers,
  submitGroupTransfer,
  resolveGroupTransfer,
  exportGroupReport,
} from "../services/groupFinanceService";

export const groupFinanceRouter = Router();
groupFinanceRouter.get("/groups/:groupId/report", endpoint(async (req, res) => {
  res.json({ success: true, data: await exportGroupReport(req.auth!, req.params.groupId, req.query) });
}));

groupFinanceRouter.get("/groups/:groupId/transfers", endpoint(async (req, res) => {
  res.json({ success: true, data: await listGroupTransfers(req.auth!, req.params.groupId) });
}));
groupFinanceRouter.post("/fund-transfers/:intentId/submit", endpoint(async (req, res) => {
  res.json({ success: true, data: await submitGroupTransfer(req.auth!, req.params.intentId, req.body) });
}));
groupFinanceRouter.post("/fund-transfers/:intentId/resolve", endpoint(async (req, res) => {
  res.json({ success: true, data: await resolveGroupTransfer(req.auth!, req.params.intentId, req.body) });
}));

// =================================================================
// 1. NHÓM & THÀNH VIÊN (GROUPS & MEMBERS)
// =================================================================

const getGroupHandler = endpoint(async (req, res) => {
  const data = await getGroupOverview(req.auth!, req.params.groupId || req.params.id);
  res.json({ success: true, data });
});

const inviteMemberHandler = endpoint(async (req, res) => {
  const data = await inviteGroupMember(
    req.auth!,
    req.params.groupId || req.params.id,
    req.body,
  );
  res.json({ success: true, data });
});

const removeMemberHandler = endpoint(async (req, res) => {
  const data = await removeGroupMember(
    req.auth!,
    req.params.groupId || req.params.id,
    req.params.memberId,
  );
  res.json({ success: true, data });
});

groupFinanceRouter.get("/groups/:groupId", getGroupHandler);
groupFinanceRouter.get("/workspaces/:id/overview", getGroupHandler);

groupFinanceRouter.post("/groups/:groupId/members/invite", inviteMemberHandler);
groupFinanceRouter.post("/workspaces/:id/members/invite", inviteMemberHandler);

groupFinanceRouter.delete("/groups/:groupId/members/:memberId", removeMemberHandler);
groupFinanceRouter.delete("/workspaces/:id/members/:memberId", removeMemberHandler);

// =================================================================
// 2. QUẢN LÝ QUỸ & CHÍNH SÁCH (FUNDS & POLICIES)
// =================================================================

const listFundsHandler = endpoint(async (req, res) => {
  const data = await listGroupFunds(req.auth!, req.params.groupId || req.params.id);
  res.json({ success: true, data });
});

const createFundHandler = endpoint(async (req, res) => {
  const data = await createGroupFund(
    req.auth!,
    req.params.groupId || req.params.id,
    req.body,
  );
  res.json({ success: true, data });
});

const getFundDetailHandler = endpoint(async (req, res) => {
  const data = await getFundDetail(
    req.auth!,
    req.params.groupId || req.params.id,
    req.params.fundId,
  );
  res.json({ success: true, data });
});

const updatePolicyHandler = endpoint(async (req, res) => {
  const data = await updateFundPolicy(
    req.auth!,
    req.params.groupId || req.params.id,
    req.params.fundId,
    req.body,
  );
  res.json({ success: true, data });
});

groupFinanceRouter.get("/groups/:groupId/funds", listFundsHandler);
groupFinanceRouter.get("/workspaces/:id/funds", listFundsHandler);

groupFinanceRouter.post("/groups/:groupId/funds", createFundHandler);
groupFinanceRouter.post("/workspaces/:id/funds", createFundHandler);

groupFinanceRouter.get("/groups/:groupId/funds/:fundId", getFundDetailHandler);
groupFinanceRouter.get("/workspaces/:id/funds/:fundId", getFundDetailHandler);

groupFinanceRouter.patch("/groups/:groupId/funds/:fundId/policy", updatePolicyHandler);
groupFinanceRouter.patch("/workspaces/:id/funds/:fundId/policy", updatePolicyHandler);

// =================================================================
// 3. ĐÓNG GÓP & NGHĨA VỤ (CONTRIBUTIONS & OBLIGATIONS)
// =================================================================

const listObligationsHandler = endpoint(async (req, res) => {
  const data = await listFundObligations(
    req.auth!,
    req.params.groupId || req.params.id,
    req.params.fundId,
  );
  res.json({ success: true, data });
});

const createIntentHandler = endpoint(async (req, res) => {
  const data = await createContributionIntent(
    req.auth!,
    req.params.groupId || req.params.id,
    req.params.fundId,
    req.body,
  );
  res.json({ success: true, data });
});

const reconcileContributionHandler = endpoint(async (req, res) => {
  const data = await reconcileContribution(
    req.auth!,
    req.params.groupId || req.params.id,
    req.params.fundId,
    req.body,
  );
  res.json({ success: true, data });
});

groupFinanceRouter.get("/groups/:groupId/funds/:fundId/obligations", listObligationsHandler);
groupFinanceRouter.get("/workspaces/:id/funds/:fundId/obligations", listObligationsHandler);

groupFinanceRouter.post("/groups/:groupId/funds/:fundId/contributions/intent", createIntentHandler);
groupFinanceRouter.post("/workspaces/:id/funds/:fundId/contributions/intent", createIntentHandler);

groupFinanceRouter.post("/groups/:groupId/funds/:fundId/contributions/reconcile", reconcileContributionHandler);
groupFinanceRouter.post("/workspaces/:id/funds/:fundId/contributions/reconcile", reconcileContributionHandler);

// =================================================================
// 4. ĐỀ NGHỊ CHI & XÉT DUYỆT ĐA CHỮ KÝ (EXPENSES & APPROVALS)
// =================================================================

const listExpensesHandler = endpoint(async (req, res) => {
  const data = await listFundExpenses(
    req.auth!,
    req.params.groupId || req.params.id,
    req.params.fundId,
    req.query as any,
  );
  res.json({ success: true, data });
});

const createExpenseHandler = endpoint(async (req, res) => {
  const idempotencyHeader = req.headers["x-idempotency-key"];
  const idempotencyKey =
    typeof idempotencyHeader === "string"
      ? idempotencyHeader
      : req.body.idempotencyKey;

  const data = await createExpenseRequest(
    req.auth!,
    req.params.groupId || req.params.id,
    req.params.fundId,
    {
      ...req.body,
      idempotencyKey,
    },
  );
  res.json({ success: true, data });
});

groupFinanceRouter.get("/groups/:groupId/funds/:fundId/expenses", listExpensesHandler);
groupFinanceRouter.get("/workspaces/:id/funds/:fundId/expenses", listExpensesHandler);

groupFinanceRouter.post("/groups/:groupId/funds/:fundId/expenses", createExpenseHandler);
groupFinanceRouter.post("/workspaces/:id/funds/:fundId/expenses", createExpenseHandler);

groupFinanceRouter.post(
  "/expenses/:expenseId/approve",
  endpoint(async (req, res) => {
    const data = await approveExpenseRequest(
      req.auth!,
      req.params.expenseId,
      req.body,
    );
    res.json({ success: true, data });
  }),
);

groupFinanceRouter.post(
  "/expenses/:expenseId/reject",
  endpoint(async (req, res) => {
    const data = await rejectExpenseRequest(
      req.auth!,
      req.params.expenseId,
      req.body,
    );
    res.json({ success: true, data });
  }),
);

groupFinanceRouter.post(
  "/expenses/:expenseId/cancel",
  endpoint(async (req, res) => {
    const data = await cancelExpenseRequest(req.auth!, req.params.expenseId);
    res.json({ success: true, data });
  }),
);

// =================================================================
// 5. THANH TOÁN & GIẢI NGÂN (PAYMENT & SETTLEMENT)
// =================================================================

groupFinanceRouter.post(
  "/expenses/:expenseId/pay",
  endpoint(async (req, res) => {
    const data = await preparePayment(req.auth!, req.params.expenseId);
    res.json({ success: true, data });
  }),
);

groupFinanceRouter.post(
  "/expenses/:expenseId/verify-payment",
  endpoint(async (req, res) => {
    const data = await verifyAndSettlePayment(
      req.auth!,
      req.params.expenseId,
      req.body,
    );
    res.json({ success: true, data });
  }),
);

// =================================================================
// 6. SỔ NHẬT KÝ KIỂM TOÁN (AUDIT TRAIL)
// =================================================================

const getAuditHandler = endpoint(async (req, res) => {
  const data = await getGroupAuditEvents(
    req.auth!,
    req.params.groupId || req.params.id,
    req.query as any,
  );
  res.json({ success: true, data });
});

groupFinanceRouter.get("/groups/:groupId/audit", getAuditHandler);
groupFinanceRouter.get("/workspaces/:id/audit", getAuditHandler);
