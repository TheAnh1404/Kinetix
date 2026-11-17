import { expect } from "chai";
import { readFileSync } from "node:fs";
import ts from "typescript";
import {
  groupAmount,
  groupTransferMemo,
  matchesGroupTransfer,
} from "../shared/groupFinance";

describe("Group finance native-transfer binding", () => {
  const intent = {
    id: "instruction-a",
    senderAddress: `0x${"1".repeat(40)}`,
    recipientAddress: `0x${"2".repeat(40)}`,
    amountWei: "1000000000000000001",
    nonce: 7,
  };
  const transaction = {
    from: intent.senderAddress,
    to: intent.recipientAddress,
    value: BigInt(intent.amountWei),
    nonce: 7,
    input: groupTransferMemo(intent.id),
  };
  it("preserves one wei and rejects floating-point, exponent and excess decimal inputs", () => {
    expect(groupAmount("1.000000000000000001")).to.equal(1000000000000000001n);
    for (const value of [
      0.1,
      "1e-3",
      "-1",
      "0",
      "0.0000000000000000001",
      "Infinity",
    ])
      expect(() => groupAmount(value)).to.throw();
  });
  it("requires the immutable sender, recipient, amount, nonce and memo together", () => {
    expect(matchesGroupTransfer(intent, transaction)).to.equal(true);
    for (const change of [
      { from: intent.recipientAddress },
      { to: intent.senderAddress },
      { to: null },
      { value: 1n },
      { nonce: 8 },
      { input: groupTransferMemo("instruction-b") },
    ])
      expect(
        matchesGroupTransfer(intent, { ...transaction, ...change }),
      ).to.equal(false);
  });
});

describe("Live group-finance hook uses API truth", () => {
  let slots: any[],
    cursor: number,
    hook: () => any,
    current: any,
    auth: any,
    family: any,
    api: any,
    calls: any[];
  const render = () => {
    cursor = 0;
    current = hook();
    return current;
  };
  const fixture = {
    id: "fund-a",
    workspaceId: "group-a",
    name: "Quỹ thật",
    fundType: "OPERATING",
    custodyType: "SHARED_TREASURY",
    treasuryWalletAddress: `0x${"1".repeat(40)}`,
    balanceWei: "1000000000000000001",
    reservedWei: "1",
    availableWei: "1000000000000000000",
    targetAmountWei: "0",
    createdAt: "2026-11-16T00:00:00Z",
    policy: {
      quorum: 1,
      signers: [`0x${"1".repeat(40)}`, `0x${"2".repeat(40)}`],
      fastWithdrawLimitWei: "0",
    },
  };
  beforeEach(() => {
    slots = [];
    cursor = 0;
    calls = [];
    auth = {
      user: { id: "user-a" },
      linkedWallet: { address: `0x${"1".repeat(40)}` },
    };
    family = { currentWorkspace: { id: "group-a" } };
    api = async (path: string) => ({
      success: true,
      data: path.endsWith("/funds") ? [fixture] : [],
    });
    const hooks = {
      useState: (initial: any) => {
        const index = cursor++;
        if (!(index in slots))
          slots[index] = typeof initial === "function" ? initial() : initial;
        return [
          slots[index],
          (next: any) => {
            slots[index] =
              typeof next === "function" ? next(slots[index]) : next;
          },
        ];
      },
      useRef: (initial: any) => {
        const index = cursor++;
        return (slots[index] ||= { current: initial });
      },
      useEffect() {},
      useCallback: (fn: any) => fn,
      useMemo: (fn: any) => fn(),
    };
    const code = ts.transpileModule(
      readFileSync("frontend/src/hooks/useGroupFinance.ts", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText;
    const module = { exports: {} as any };
    new Function("require", "module", "exports", code)(
      (name: string) => {
        if (name === "react") return hooks;
        if (name === "./useAuth")
          return {
            useAuth: () => auth,
            authRequest: (...args: any[]) => {
              calls.push(args);
              return api(...args);
            },
          };
        if (name.includes("FamilyContext")) return { useFamily: () => family };
        if (name.includes("shared/groupFinance"))
          return require("../shared/groupFinance");
        if (name.includes("web3/groupTransfers"))
          return {
            savedGroupHash: () => null,
            sendGroupTransfer: async () => {
              throw new Error("Unexpected wallet write");
            },
          };
        return require(name);
      },
      module,
      module.exports,
    );
    hook = module.exports.useGroupFinance;
    render();
  });
  it("starts with no synthetic money, requests, obligations or audit events", () => {
    for (const field of ["funds", "expenses", "obligations", "auditEvents"])
      expect(current[field]).to.deep.equal([]);
  });
  it("maps nested backend policy and preserves all exact wei strings", async () => {
    await current.refresh();
    render();
    expect(current.funds[0].balanceWei).to.equal("1000000000000000001");
    expect(current.funds[0].reservedWei).to.equal("1");
    expect(current.funds[0].requiredApprovals).to.equal(1);
    expect(current.funds[0].signers.length).to.equal(2);
  });
  it("empty server data clears an earlier nonempty fund list", async () => {
    await current.refresh();
    render();
    api = async () => ({ success: true, data: [] });
    await current.refresh();
    render();
    expect(current.funds).to.deep.equal([]);
  });
  it("quarantines legacy demo rows without a verified custody binding", async () => {
    api = async (path: string) => ({
      success: true,
      data: path.endsWith("/funds")
        ? [{ ...fixture, treasuryWalletAddress: null }]
        : [],
    });
    await current.refresh();
    render();
    expect(current.funds).to.deep.equal([]);
    expect(current.unsupportedFunds).to.deep.equal([
      { id: fixture.id, name: fixture.name },
    ]);
    expect(current.summary.totalBalanceAvax).to.equal(0);
  });
  it("API failure exposes an error and never substitutes demonstration data", async () => {
    api = async () => {
      throw new Error("API unavailable");
    };
    await current.refresh();
    render();
    expect(current.funds).to.deep.equal([]);
    expect(current.error).to.equal("API unavailable");
  });
  it("failed fund creation does not manufacture a fund or successful audit", async () => {
    api = async (_path: string, body?: unknown) => {
      if (body) throw new Error("Server rejected create");
      return { success: true, data: [] };
    };
    const result = await current.createFund({
      name: "New fund",
      fundType: "OPERATING",
      custodyType: "SHARED_TREASURY",
      guardianWallets: [],
      requiredApprovals: 1,
    });
    render();
    expect(result.success).to.equal(false);
    expect(current.funds).to.deep.equal([]);
    expect(current.auditEvents).to.deep.equal([]);
  });
  it("submits expense amount as exact wei and propagates failure without locking local money", async () => {
    await current.refresh();
    render();
    api = async (path: string, body?: unknown) => {
      if (body) throw new Error("Request not saved");
      return { success: true, data: path.endsWith("/funds") ? [fixture] : [] };
    };
    const result = await current.proposeExpense({
      fundId: "fund-a",
      title: "Chi",
      purpose: "Thuê sân",
      amountAvax: "0.000000000000000001",
      recipientAddress: `0x${"2".repeat(40)}`,
      recipientName: "Địa điểm",
      category: "OPERATING",
      idempotencyKey: "draft-key",
    });
    render();
    expect(result.success).to.equal(false);
    const write = calls.find(
      (call) => call[0].endsWith("/expenses") && call[1],
    );
    expect(write[1].amountWei).to.equal("1");
    expect(write[1].idempotencyKey).to.equal("draft-key");
    expect(current.funds[0].reservedWei).to.equal("1");
    expect(current.expenses).to.deep.equal([]);
  });
  it("hides the previous group's data immediately on a scope change", async () => {
    await current.refresh();
    render();
    family.currentWorkspace = { id: "group-b" };
    render();
    expect(current.funds).to.deep.equal([]);
  });
  it("discards late responses after switching groups", async () => {
    let release: (value: unknown) => void = () => {};
    const response = new Promise((resolve) => {
      release = resolve;
    });
    api = () => response;
    const pending = current.refresh();
    family.currentWorkspace = { id: "group-b" };
    render();
    release({ success: true, data: [] });
    await pending;
    render();
    expect(current.funds).to.deep.equal([]);
  });
});
