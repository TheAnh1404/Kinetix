import { strict as check } from "node:assert";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { AddressInfo } from "node:net";
import { eq, sql } from "drizzle-orm";
import type { AuthContext } from "../backend/src/auth/service";

require("./auth-test-safety.cjs").assertIsolatedDatabase(
  process.env.TEST_DATABASE_URL,
  process.env.DATABASE_URL,
  process.env.AUTH_TEST_ALLOW_RESET,
);
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const {
  db,
  pool,
  users,
  userWallets,
  workspaces,
  workspaceMembers,
  groupFunds,
  expenseRequests,
  contributions,
  payments,
  groupTransferIntents,
} = require("../backend/src/db") as typeof import("../backend/src/db");
const service =
  require("../backend/src/services/groupFinanceService") as typeof import("../backend/src/services/groupFinanceService");
const { groupTransferMemo } =
  require("../shared/groupFinance") as typeof import("../shared/groupFinance");
const reject = (action: () => Promise<unknown>, status: number) =>
  check.rejects(action, (error: any) => error.status === status);
let passed = 0;
const test = async (name: string, action: () => Promise<void>) => {
  await action();
  passed++;
  console.log(`PASS ${name}`);
};

async function main() {
  await require("../backend/src/db/migrations").applyDatabaseMigrations();
  await db.execute(sql`TRUNCATE TABLE users, workspaces CASCADE`);
  const hre = require("hardhat");
  hre.config.networks.hardhat.chainId = 43113;
  const provider = hre.network.provider;
  let wrongChain = false,
    finalityLag = false;
  const rpc = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    const run = async (item: any) => {
      try {
        let params = item.params || [];
        if (
          finalityLag &&
          item.method === "eth_getBlockByNumber" &&
          params[0] === "finalized"
        )
          params = ["0x0", params[1]];
        const result =
          wrongChain && item.method === "eth_chainId"
            ? "0x1"
            : await provider.request({ method: item.method, params });
        return { jsonrpc: "2.0", id: item.id, result };
      } catch (err: any) {
        return {
          jsonrpc: "2.0",
          id: item.id,
          error: { code: err.code || -32000, message: err.message },
        };
      }
    };
    const input = JSON.parse(body);
    const result = Array.isArray(input)
      ? await Promise.all(input.map(run))
      : await run(input);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
  });
  await new Promise<void>((resolve) => rpc.listen(0, "127.0.0.1", resolve));
  process.env.FUJI_RPC_URL = `http://127.0.0.1:${(rpc.address() as AddressInfo).port}`;
  try {
    const signers = await hre.ethers.getSigners();
    const [workspace] = await db
      .insert(workspaces)
      .values({
        name: `Group acceptance ${randomUUID()}`,
        creatorWallet: signers[0].address.toLowerCase(),
      })
      .returning();
    const actors: AuthContext[] = [];
    for (let i = 0; i < 5; i++) {
      const role =
        i === 0 || i === 4 ? "ADMIN" : i === 3 ? "CHILD" : "GUARDIAN";
      const [user] = await db
        .insert(users)
        .values({ fullName: `Group fixture ${i}`, role })
        .returning();
      const [wallet] = await db
        .insert(userWallets)
        .values({ userId: user.id, address: signers[i].address.toLowerCase() })
        .returning();
      await db
        .insert(workspaceMembers)
        .values({ workspaceId: workspace.id, userId: user.id, role });
      actors.push({
        user,
        wallet,
        session: { kind: "full" },
        credential: { mustChangePassword: false },
      } as AuthContext);
    }
    const [owner, reviewer, recipient, contributor, adminOnly] = actors;
    await db
      .update(workspaces)
      .set({ creatorUserId: owner.user.id })
      .where(eq(workspaces.id, workspace.id));
    const [other] = await db
      .insert(workspaces)
      .values({
        name: `Other group ${randomUUID()}`,
        creatorWallet: signers[0].address.toLowerCase(),
      })
      .returning();
    await db
      .insert(workspaceMembers)
      .values({ workspaceId: other.id, userId: owner.user.id, role: "ADMIN" });
    const config = {
      name: "Quỹ hoạt động kiểm thử",
      fundType: "OPERATING" as const,
      custodyType: "SHARED_TREASURY",
      treasuryWalletAddress: owner.wallet!.address,
      guardianWallets: [owner, reviewer, recipient].map(
        (actor) => actor.wallet!.address,
      ),
      requiredApprovals: 2,
      idempotencyKey: randomUUID(),
    };
    let fund: Awaited<ReturnType<typeof service.createGroupFund>>;
    await test("reject unavailable contract adapter and duplicate signers", async () => {
      await reject(
        () =>
          service.createGroupFund(owner, workspace.id, {
            ...config,
            custodyType: "ONCHAIN_HUB",
          }),
        409,
      );
      await reject(
        () =>
          service.createGroupFund(owner, workspace.id, {
            ...config,
            guardianWallets: [
              config.guardianWallets[0],
              config.guardianWallets[0],
            ],
          }),
        400,
      );
    });
    await test("create durable zero-balance fund with verified custody and explicit quorum", async () => {
      fund = await service.createGroupFund(owner, workspace.id, config);
      check.equal(
        (await service.createGroupFund(owner, workspace.id, config)).id,
        fund.id,
      );
      check.equal(fund.balanceWei, "0");
      check.equal(fund.treasuryWalletAddress, owner.wallet!.address);
      check.equal(
        (await service.listGroupFunds(owner, workspace.id))[0].id,
        fund.id,
      );
    });
    await test("tenant isolation on expense, obligation and contribution reads", async () => {
      await reject(
        () => service.listFundExpenses(owner, other.id, fund.id),
        404,
      );
      await reject(
        () => service.listFundObligations(owner, other.id, fund.id),
        404,
      );
      await reject(
        () =>
          service.createContributionIntent(contributor, other.id, fund.id, {
            amountWei: "1",
          }),
        403,
      );
    });
    let intent: Awaited<ReturnType<typeof service.createContributionIntent>>;
    await test("pin contribution and retry the same durable instruction", async () => {
      intent = await service.createContributionIntent(
        contributor,
        workspace.id,
        fund.id,
        { amountWei: "3000000000000000001" },
      );
      check.equal(
        (
          await service.createContributionIntent(
            contributor,
            workspace.id,
            fund.id,
            { amountWei: intent.amountWei },
          )
        ).id,
        intent.id,
      );
      await reject(
        () =>
          service.createContributionIntent(contributor, workspace.id, fund.id, {
            amountWei: "2",
          }),
        409,
      );
    });
    await test("unavailable receipt never creates a contribution", async () => {
      await check.rejects(() =>
        service.reconcileContribution(contributor, workspace.id, fund.id, {
          intentId: intent.id,
          txHash: `0x${"f".repeat(64)}`,
          amountWei: "999999",
        }),
      );
      check.equal(
        (
          await db
            .select()
            .from(contributions)
            .where(eq(contributions.fundId, fund.id))
        ).length,
        0,
      );
    });
    let deposit: any;
    await test("actual local-EVM transfer with exact wei, finality gate and replay safety", async () => {
      deposit = await signers[3].sendTransaction({
        to: intent.recipientAddress,
        value: BigInt(intent.amountWei),
        data: groupTransferMemo(intent.id),
        nonce: intent.nonce,
      });
      await deposit.wait();
      await service.submitGroupTransfer(contributor, intent.id, {
        txHash: deposit.hash,
      });
      finalityLag = true;
      await reject(
        () =>
          service.reconcileContribution(contributor, workspace.id, fund.id, {
            intentId: intent.id,
            txHash: deposit.hash,
          }),
        409,
      );
      finalityLag = false;
      await service.reconcileContribution(contributor, workspace.id, fund.id, {
        intentId: intent.id,
        txHash: deposit.hash,
        amountWei: "1",
      });
      await service.reconcileContribution(contributor, workspace.id, fund.id, {
        intentId: intent.id,
        txHash: deposit.hash,
      });
      check.equal(
        (await service.getFundDetail(owner, workspace.id, fund.id)).balanceWei,
        intent.amountWei,
      );
      check.equal(
        (
          await db
            .select()
            .from(contributions)
            .where(eq(contributions.fundId, fund.id))
        ).length,
        1,
      );
    });
    const expenseBody = () => ({
      title: "Chi thuê địa điểm",
      purpose: "Sinh hoạt nhóm",
      amountWei: "1000000000000000001",
      recipientAddress: recipient.wallet!.address,
      recipientName: "Đơn vị địa điểm",
      idempotencyKey: randomUUID(),
    });
    let expense: Awaited<ReturnType<typeof service.createExpenseRequest>>;
    await test("persistent request idempotency and immutable terms", async () => {
      const body = expenseBody();
      expense = await service.createExpenseRequest(
        contributor,
        workspace.id,
        fund.id,
        body,
      );
      check.equal(
        (
          await service.createExpenseRequest(
            contributor,
            workspace.id,
            fund.id,
            body,
          )
        ).id,
        expense.id,
      );
      await reject(
        () =>
          service.createExpenseRequest(contributor, workspace.id, fund.id, {
            ...body,
            title: "Khác nội dung",
          }),
        409,
      );
      check.equal(
        (await service.getFundDetail(owner, workspace.id, fund.id)).reservedWei,
        body.amountWei,
      );
    });
    await test("no recipient self-vote or ADMIN financial privilege; policy immutable", async () => {
      await reject(
        () => service.approveExpenseRequest(recipient, expense.id),
        403,
      );
      await reject(
        () => service.approveExpenseRequest(adminOnly, expense.id),
        403,
      );
      await reject(
        () =>
          service.updateFundPolicy(owner, workspace.id, fund.id, { quorum: 1 }),
        409,
      );
    });
    await test("quorum does not settle a payment; duplicate approvals rejected", async () => {
      await service.approveExpenseRequest(owner, expense.id);
      await reject(() => service.approveExpenseRequest(owner, expense.id), 409);
      await service.approveExpenseRequest(reviewer, expense.id);
      check.equal(
        (await service.listFundExpenses(owner, workspace.id, fund.id))[0]
          .status,
        "APPROVED",
      );
      check.equal(
        (await db.select().from(payments).where(eq(payments.fundId, fund.id)))
          .length,
        0,
      );
    });
    let payment: Awaited<ReturnType<typeof service.preparePayment>>;
    await test("only custodian prepares payment; cannot cancel or expire in-flight reservation", async () => {
      await reject(() => service.preparePayment(adminOnly, expense.id), 403);
      payment = await service.preparePayment(owner, expense.id);
      check.equal(
        (await service.preparePayment(owner, expense.id)).id,
        payment.id,
      );
      await reject(
        () => service.cancelExpenseRequest(contributor, expense.id),
        409,
      );
      await db
        .update(expenseRequests)
        .set({ deadline: new Date(0) })
        .where(eq(expenseRequests.id, expense.id));
      await service.listGroupFunds(owner, workspace.id);
      check.equal(
        (await service.listFundExpenses(owner, workspace.id, fund.id))[0]
          .status,
        "PAYMENT_PENDING",
      );
    });
    await test("wrong transfer cannot settle; exact local-EVM payout settles once", async () => {
      await reject(
        () =>
          service.verifyAndSettlePayment(owner, expense.id, {
            txHash: deposit.hash,
          }),
        409,
      );
      const tx = await signers[0].sendTransaction({
        to: payment.recipientAddress,
        value: BigInt(payment.amountWei),
        data: payment.data,
        nonce: payment.nonce,
      });
      await tx.wait();
      await service.submitGroupTransfer(owner, payment.id, { txHash: tx.hash });
      await service.reconcilePendingGroupTransfers();
      await service.verifyAndSettlePayment(owner, expense.id, {
        txHash: tx.hash,
      });
      const current = await service.getFundDetail(owner, workspace.id, fund.id);
      check.equal(current.balanceWei, "2000000000000000000");
      check.equal(current.reservedWei, "0");
      const feed = await service.listFundExpenses(owner, workspace.id, fund.id);
      check.doesNotThrow(() => JSON.stringify({ success: true, data: feed }));
      check.equal(feed[0].payment?.nonce, String(payment.nonce));
      check.equal(
        (await db.select().from(payments).where(eq(payments.fundId, fund.id)))
          .length,
        1,
      );
    });
    await test("cancel releases reservation exactly once and expiry commits", async () => {
      const request = await service.createExpenseRequest(
        contributor,
        workspace.id,
        fund.id,
        expenseBody(),
      );
      await service.cancelExpenseRequest(contributor, request.id);
      await reject(
        () => service.cancelExpenseRequest(contributor, request.id),
        409,
      );
      const expired = await service.createExpenseRequest(
        contributor,
        workspace.id,
        fund.id,
        expenseBody(),
      );
      await db
        .update(expenseRequests)
        .set({ deadline: new Date(0) })
        .where(eq(expenseRequests.id, expired.id));
      await service.listGroupFunds(owner, workspace.id);
      check.equal(
        (await service.getFundDetail(owner, workspace.id, fund.id)).reservedWei,
        "0",
      );
      check.equal(
        (
          await db
            .select()
            .from(expenseRequests)
            .where(eq(expenseRequests.id, expired.id))
        )[0].status,
        "EXPIRED",
      );
    });
    await test("wrong recipient proof and consumed nonce recovery never credit money", async () => {
      const abandoned = await service.createContributionIntent(
        contributor,
        workspace.id,
        fund.id,
        { amountWei: "1" },
      );
      const wrong = await signers[3].sendTransaction({
        to: signers[4].address,
        value: 1n,
        nonce: abandoned.nonce,
        data: abandoned.data,
      });
      await wrong.wait();
      await reject(
        () =>
          service.submitGroupTransfer(contributor, abandoned.id, {
            txHash: wrong.hash,
          }),
        409,
      );
      await reject(
        () =>
          service.reconcileContribution(contributor, workspace.id, fund.id, {
            intentId: abandoned.id,
            txHash: wrong.hash,
          }),
        409,
      );
      await service.resolveGroupTransfer(contributor, abandoned.id, {
        txHash: wrong.hash,
      });
      check.equal(
        (await service.listGroupTransfers(contributor, workspace.id)).length,
        0,
      );
      check.equal(
        (await service.getFundDetail(owner, workspace.id, fund.id)).balanceWei,
        "2000000000000000000",
      );
    });
    await test("RPC chain mismatch fails closed", async () => {
      wrongChain = true;
      try {
        await reject(
          () =>
            service.createContributionIntent(
              contributor,
              workspace.id,
              fund.id,
              { amountWei: "1" },
            ),
          503,
        );
      } finally {
        wrongChain = false;
      }
    });
    await test("concurrent reservations cannot overspend the remaining fund", async () => {
      const outcomes = await Promise.allSettled([
        service.createExpenseRequest(
          contributor,
          workspace.id,
          fund.id,
          expenseBody(),
        ),
        service.createExpenseRequest(
          contributor,
          workspace.id,
          fund.id,
          expenseBody(),
        ),
      ]);
      check.equal(
        outcomes.filter((item) => item.status === "fulfilled").length,
        1,
      );
      for (const outcome of outcomes) {
        if (outcome.status === "fulfilled")
          await service.cancelExpenseRequest(contributor, outcome.value.id);
        else check.equal((outcome.reason as any).status, 409);
      }
      check.equal(
        (await service.getFundDetail(owner, workspace.id, fund.id)).reservedWei,
        "0",
      );
    });
    await test("goal deadline never bypasses the target; no unsigned authority inferred", async () => {
      const goal = await service.createGroupFund(owner, workspace.id, {
        ...config,
        name: "=SUM(A1:A2)",
        fundType: "GOAL",
        targetAmountWei: "4000000000000000000",
        targetDeadline: new Date(Date.now() + 86400000).toISOString(),
        idempotencyKey: randomUUID(),
      });
      const goalIntent = await service.createContributionIntent(
        contributor,
        workspace.id,
        goal.id,
        { amountWei: "1000000000000000000" },
      );
      const tx = await signers[3].sendTransaction({
        to: goalIntent.recipientAddress,
        value: BigInt(goalIntent.amountWei),
        nonce: goalIntent.nonce,
        data: goalIntent.data,
      });
      await tx.wait();
      await service.reconcileContribution(contributor, workspace.id, goal.id, {
        intentId: goalIntent.id,
        txHash: tx.hash,
      });
      await db
        .update(groupFunds)
        .set({ targetDeadline: new Date(0) })
        .where(eq(groupFunds.id, goal.id));
      await reject(
        () =>
          service.createExpenseRequest(contributor, workspace.id, goal.id, {
            ...expenseBody(),
            amountWei: "1",
          }),
        409,
      );
      await reject(
        () =>
          service.createExpenseRequest(contributor, workspace.id, goal.id, {
            ...expenseBody(),
            amountWei: "1",
            unlockOverride: true,
          }),
        400,
      );
    });
    await test("scoped report uses exact settled money and protects CSV cells", async () => {
      const range = {
        from: new Date(Date.now() - 86400000).toISOString(),
        to: new Date(Date.now() + 86400000).toISOString(),
      };
      const report = await service.exportGroupReport(
        owner,
        workspace.id,
        range,
      );
      check.equal(report.count, 3);
      check(report.csv.includes("3000000000000000001"));
      check(report.csv.includes("'=SUM(A1:A2)"));
      check.equal(
        (await service.exportGroupReport(owner, other.id, range)).count,
        0,
      );
      await reject(
        () => service.exportGroupReport(contributor, other.id, range),
        403,
      );
    });
    await test("audit pagination uses a stable database cursor without duplicates", async () => {
      const first = await service.getGroupAuditEvents(owner, workspace.id, {
        limit: 2,
      });
      const second = await service.getGroupAuditEvents(owner, workspace.id, {
        limit: 2,
        cursor: first[1].event.id,
      });
      check.equal(first.length, 2);
      check.equal(second.length, 2);
      check(
        !second.some((item) =>
          first.some((previous) => previous.event.id === item.event.id),
        ),
      );
    });
    await test("workspace outgoing pause blocks new expenses while allowing contributions", async () => {
      const { familyAdminState } =
        require("../backend/src/db") as typeof import("../backend/src/db");
      await db
        .insert(familyAdminState)
        .values({ workspaceId: workspace.id, outgoingPaused: true });
      await reject(
        () =>
          service.createExpenseRequest(
            contributor,
            workspace.id,
            fund.id,
            expenseBody(),
          ),
        409,
      );
      await service.createContributionIntent(
        contributor,
        workspace.id,
        fund.id,
        { amountWei: "1" },
      );
      await db
        .update(familyAdminState)
        .set({ outgoingPaused: false })
        .where(eq(familyAdminState.workspaceId, workspace.id));
    });
    await test("membership revocation invalidates approval authority", async () => {
      const request = await service.createExpenseRequest(
        contributor,
        workspace.id,
        fund.id,
        expenseBody(),
      );
      await db
        .update(workspaceMembers)
        .set({ accessDisabledAt: new Date() })
        .where(eq(workspaceMembers.userId, reviewer.user.id));
      await reject(
        () => service.approveExpenseRequest(reviewer, request.id),
        403,
      );
    });
    console.log(
      `${passed} group-finance integration scenarios passed (disposable PostgreSQL + local EVM; not Fuji/mobile acceptance).`,
    );
  } finally {
    await new Promise<void>((resolve) => rpc.close(() => resolve()));
  }
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
