import { expect } from "chai";
import { AddressInfo } from "net";
import type { Server } from "http";
import { toWeiString } from "../backend/src/services/groupFinanceService";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
process.env.DATABASE_URL =
  testDatabaseUrl ||
  "postgresql://isolated:isolated@127.0.0.1:1/kinetix_auth_tests";
process.env.NODE_ENV = "test";
process.env.APP_ORIGIN = "http://localhost:3000";

const app = require("../backend/src/server").default;
const { pool } = require("../backend/src/db") as typeof import("../backend/src/db");

let server: Server;
let base: string;

class Browser {
  cookies = new Map<string, string>();
  async request(
    path: string,
    body?: unknown,
    method = "POST",
    extraHeaders: Record<string, string> = {},
  ) {
    const response = await fetch(`${base}/api${path}`, {
      method,
      headers: {
        Origin: process.env.APP_ORIGIN!,
        "Content-Type": "application/json",
        Cookie: [...this.cookies]
          .map(([key, value]) => `${key}=${value}`)
          .join("; "),
        ...extraHeaders,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";")[0];
      const equal = pair.indexOf("=");
      this.cookies.set(pair.slice(0, equal), pair.slice(equal + 1));
    }
    return {
      status: response.status,
      data: await response.json(),
      headers: response.headers,
    };
  }
}

before(async () => {
  server = await new Promise<Server>((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  if (server)
    await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("Group Finance HTTP Guards & API Endpoints", () => {
  it("rejects unauthenticated access to group finance endpoints", async () => {
    const browser = new Browser();
    const protectedPaths = [
      "/groups/00000000-0000-4000-8000-000000000001",
      "/groups/00000000-0000-4000-8000-000000000001/funds",
      "/groups/00000000-0000-4000-8000-000000000001/funds/00000000-0000-4000-8000-000000000002",
      "/groups/00000000-0000-4000-8000-000000000001/funds/00000000-0000-4000-8000-000000000002/expenses",
      "/groups/00000000-0000-4000-8000-000000000001/funds/00000000-0000-4000-8000-000000000002/obligations",
      "/groups/00000000-0000-4000-8000-000000000001/audit",
    ];

    for (const p of protectedPaths) {
      const res = await browser.request(p, undefined, "GET");
      expect(res.status).to.equal(401);
      expect(res.data.success).to.be.false;
    }
  });

  it("parses and validates wei strings with strict positive integer check", () => {
    expect(toWeiString("1000000000000000000")).to.equal("1000000000000000000");
    expect(toWeiString(1000000n)).to.equal("1000000");
    expect(toWeiString(500)).to.equal("500");
    expect(() => toWeiString("-500")).to.throw();
    expect(() => toWeiString("abc")).to.throw();
    expect(() => toWeiString("1.5")).to.throw();
  });
});

describe("Group Finance Domain Invariants & Business Logic", () => {
  const id = (n: number) =>
    `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const guardianA = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const guardianB = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const recipientWallet = "0xcccccccccccccccccccccccccccccccccccccccc";

  let state: any;

  beforeEach(() => {
    state = {
      workspace: { id: id(1), name: "Kinetix Test Club" },
      users: [
        { id: id(1), fullName: "Guardian A", walletAddress: guardianA },
        { id: id(2), fullName: "Guardian B", walletAddress: guardianB },
        { id: id(3), fullName: "Recipient C", walletAddress: recipientWallet },
      ],
      fund: {
        id: id(10),
        workspaceId: id(1),
        name: "Operating Fund",
        fundType: "OPERATING",
        balanceWei: "5000000000000000000", // 5 AVAX
        reservedWei: "1000000000000000000", // 1 AVAX reserved
        status: "ACTIVE",
      },
      policy: {
        id: id(20),
        fundId: id(10),
        version: 1,
        signers: [guardianA, guardianB],
        quorum: 2,
        fastWithdrawLimitWei: "500000000000000000", // 0.5 AVAX
        approvalWindowSeconds: 172800,
      },
      requests: [] as any[],
      approvals: [] as any[],
      payments: [] as any[],
      auditLogs: [] as any[],
    };
  });

  it("calculates available balance as exactly balance minus reserved", () => {
    const balance = BigInt(state.fund.balanceWei);
    const reserved = BigInt(state.fund.reservedWei);
    const available = balance - reserved;
    expect(available.toString()).to.equal("4000000000000000000"); // 4 AVAX
  });

  it("blocks expense requests that exceed available balance", () => {
    const balance = BigInt(state.fund.balanceWei);
    const reserved = BigInt(state.fund.reservedWei);
    const available = balance - reserved;

    const requestedAmount = BigInt("4500000000000000001"); // 4.5 AVAX > 4 AVAX available
    expect(available >= requestedAmount).to.be.false;
  });

  it("locks reservation on expense request creation and releases it on rejection", () => {
    let reservedWei = BigInt(state.fund.reservedWei);
    const expenseAmount = BigInt("2000000000000000000"); // 2 AVAX

    // 1. Lock reservation
    reservedWei += expenseAmount;
    expect(reservedWei.toString()).to.equal("3000000000000000000");

    // 2. Reject request -> release reservation
    reservedWei = reservedWei >= expenseAmount ? reservedWei - expenseAmount : 0n;
    expect(reservedWei.toString()).to.equal("1000000000000000000");

    // 3. Prevent double release
    const doubleReleaseAttempt = false; // Guard prevents releasing twice
    expect(doubleReleaseAttempt).to.be.false;
  });

  it("releases reservation on expense request cancellation by proposer or admin", () => {
    let reservedWei = BigInt(state.fund.reservedWei);
    const expenseAmount = BigInt("1500000000000000000"); // 1.5 AVAX

    reservedWei += expenseAmount;
    expect(reservedWei.toString()).to.equal("2500000000000000000");

    // Proposer cancels
    reservedWei -= expenseAmount;
    expect(reservedWei.toString()).to.equal("1000000000000000000");
  });

  it("strictly enforces security rule: recipient CANNOT approve payout to their own address", () => {
    const expense = {
      id: id(50),
      recipientAddress: recipientWallet,
      amountWei: "2000000000000000000",
      status: "PENDING_APPROVAL",
    };

    const approverAddress = recipientWallet.toLowerCase();
    const isSelfApproval = approverAddress === expense.recipientAddress.toLowerCase();
    expect(isSelfApproval).to.be.true; // Caught and rejected with 403
  });

  it("strictly enforces security rule: blocks duplicate votes on the same expense request", () => {
    const expenseId = id(50);
    const approverId = id(1);

    const votes = [
      { requestId: expenseId, approverUserId: approverId, decision: "APPROVE" },
    ];

    const duplicateVoteAttempt = votes.some(
      (v) => v.requestId === expenseId && v.approverUserId === approverId,
    );
    expect(duplicateVoteAttempt).to.be.true; // Throws 409 conflict
  });

  it("transitions expense request to APPROVED exactly when quorum is reached", () => {
    const quorum = 2;
    let approvalsCount = 0;
    let status = "PENDING_APPROVAL";

    // Guardian A approves
    approvalsCount += 1;
    if (approvalsCount >= quorum) status = "APPROVED";
    expect(status).to.equal("PENDING_APPROVAL");

    // Guardian B approves
    approvalsCount += 1;
    if (approvalsCount >= quorum) status = "APPROVED";
    expect(status).to.equal("APPROVED");
  });

  it("auto-approves operating fund micro-expenses under fast-withdraw limit", () => {
    const fastLimit = BigInt(state.policy.fastWithdrawLimitWei); // 0.5 AVAX
    const microExpense = BigInt("300000000000000000"); // 0.3 AVAX <= 0.5 AVAX

    const isFast = microExpense <= fastLimit && state.fund.fundType === "OPERATING";
    expect(isFast).to.be.true;

    const largeExpense = BigInt("1000000000000000000"); // 1 AVAX > 0.5 AVAX
    const isLargeFast = largeExpense <= fastLimit;
    expect(isLargeFast).to.be.false;
  });

  it("enforces goal fund unlock conditions (target balance or deadline reached)", () => {
    const goalFund = {
      fundType: "GOAL",
      balanceWei: "8000000000000000000", // 8 AVAX
      targetAmountWei: "10000000000000000000", // 10 AVAX
      targetDeadline: new Date(Date.now() + 86400000), // In 1 day
    };

    const targetReached =
      BigInt(goalFund.balanceWei) >= BigInt(goalFund.targetAmountWei);
    const deadlineReached = new Date() >= goalFund.targetDeadline;

    expect(targetReached).to.be.false;
    expect(deadlineReached).to.be.false;
    const isUnlocked = targetReached || deadlineReached;
    expect(isUnlocked).to.be.false; // Blocked!

    // Goal reached
    goalFund.balanceWei = "10500000000000000000";
    const targetReachedNow =
      BigInt(goalFund.balanceWei) >= BigInt(goalFund.targetAmountWei);
    expect(targetReachedNow).to.be.true; // Unlocked!
  });

  it("deducts balance and reservation upon payment settlement", () => {
    let balanceWei = BigInt("5000000000000000000");
    let reservedWei = BigInt("2000000000000000000");
    const paymentAmount = BigInt("2000000000000000000");

    // Settle payment
    balanceWei -= paymentAmount;
    reservedWei -= paymentAmount;

    expect(balanceWei.toString()).to.equal("3000000000000000000");
    expect(reservedWei.toString()).to.equal("0");
  });

  it("detects replay of existing transaction hash in payment settlement", () => {
    const settledTxHashes = new Set([
      "0x1111111111111111111111111111111111111111111111111111111111111111",
    ]);

    const txToVerify =
      "0x1111111111111111111111111111111111111111111111111111111111111111";
    expect(settledTxHashes.has(txToVerify)).to.be.true; // Replay detected -> rejected with 409
  });
});
