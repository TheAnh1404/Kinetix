import { expect } from "chai";
import { readFileSync } from "node:fs";
import ts from "typescript";

describe("Workspace tools, API envelopes and signature journeys", () => {
  const React = require("../frontend/node_modules/react");
  let slots: any[], cursor: number, Component: any, value: any, props: any;
  let auth: any,
    family: any,
    calls: any[],
    api: any,
    query: URLSearchParams,
    transaction: any;
  const wallet = `0x${"1".repeat(40)}`;
  const hub = `0x${"2".repeat(40)}`;
  const signature = `0x${"a".repeat(130)}`;
  const hash = `0x${"b".repeat(64)}`;
  const nodes = (node: any, predicate: (item: any) => boolean): any[] =>
    Array.isArray(node)
      ? node.flatMap((item) => nodes(item, predicate))
      : !node || typeof node !== "object"
        ? []
        : [
            ...(predicate(node) ? [node] : []),
            ...nodes(node.props?.children, predicate),
          ];
  const text = (node: any): string =>
    node == null || typeof node === "boolean"
      ? ""
      : Array.isArray(node)
        ? node.map(text).join(" ")
        : typeof node === "object"
          ? text(node.props?.children)
          : String(node);
  const button = (label: string) =>
    nodes(
      value,
      (node) => node.type === "button" && text(node).includes(label),
    )[0];
  const render = () => {
    cursor = 0;
    value = Component(props);
    return value;
  };
  const ReviewStub = () => null;
  const PanelStub = () => null;
  const renderReview = () =>
    nodes(value, (node) => node.type === ReviewStub)[0].props.review;
  function load(file: string, name: string) {
    slots = [];
    const hooks = {
      ...React,
      useState: (initial: any) => {
        const i = cursor++;
        if (!(i in slots))
          slots[i] = typeof initial === "function" ? initial() : initial;
        return [
          slots[i],
          (next: any) => {
            slots[i] = typeof next === "function" ? next(slots[i]) : next;
          },
        ];
      },
      useRef: (initial: any) => {
        const i = cursor++;
        return (slots[i] ||= { current: initial });
      },
      useEffect() {},
      useCallback: (callback: any) => callback,
    };
    const code = ts.transpileModule(
      readFileSync(`frontend/src/${file}`, "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
      },
    ).outputText;
    const module = { exports: {} as any };
    new Function("require", "module", "exports", code)(
      (path: string) => {
        if (path === "react") return hooks;
        if (path === "react/jsx-runtime")
          return require("../frontend/node_modules/react/jsx-runtime");
        if (path === "lucide-react")
          return require("../frontend/node_modules/lucide-react");
        if (path === "next/link")
          return (p: any) => React.createElement("a", p, p.children);
        if (path === "next/navigation") return { useSearchParams: () => query };
        if (path.includes("useAuth"))
          return {
            useAuth: () => auth,
            authRequest: (...args: any[]) => {
              calls.push(["api", ...args]);
              return api(...args);
            },
          };
        if (path.includes("FamilyContext")) return { useFamily: () => family };
        if (path.includes("useWorkspaceAccess"))
          return { useWorkspaceAccess: () => ({ role: auth.role }) };
        if (path.includes("useMemberTransaction"))
          return { useMemberTransaction: () => transaction };
        if (path.includes("web3/client"))
          return {
            restoreOperations: async (...args: any[]) => {
              calls.push(["restore", ...args]);
            },
            reconcileTransactions: async (...args: any[]) => {
              calls.push(["reconcile", ...args]);
            },
            getCoreProvider: () => ({
              request: async ({ method }: any) =>
                method === "eth_requestAccounts"
                  ? [wallet]
                  : method === "eth_chainId"
                    ? "0xa869"
                    : null,
            }),
          };
        if (path.includes("contracts/config"))
          return { DEPLOYMENT: { enabled: true }, hubChain: { id: 43113 } };
        if (path.includes("ExperiencePrimitives"))
          return { ReviewDialog: ReviewStub };
        if (path.includes("VaultWorkflowPanel"))
          return { VaultWorkflowPanel: PanelStub };
        if (path.includes("ContractVaultFunding"))
          return { ContractVaultFunding: PanelStub };
        if (path.includes("TreasuryPanel")) return { TreasuryPanel: PanelStub };
        if (path.includes("FinancialActivity"))
          return { FinancialActivity: PanelStub };
        if (path.includes("MemberNotifications"))
          return { MemberNotifications: PanelStub };
        if (path === "viem")
          return {
            ...require("viem"),
            createWalletClient: () => ({
              signTypedData: async (data: any) => {
                calls.push(["signature", data]);
                return signature;
              },
            }),
          };
        if (path.includes("shared/treasury"))
          return require("../shared/treasury");
        return require(path);
      },
      module,
      module.exports,
    );
    Component = module.exports[name];
    render();
  }
  beforeEach(() => {
    cursor = 0;
    calls = [];
    query = new URLSearchParams();
    auth = {
      user: { id: "guardian" },
      role: "GUARDIAN",
      linkedWallet: { address: wallet },
      walletMatches: true,
    };
    family = {
      currentWorkspace: { id: "family-1", name: "Gia đình" },
      withdrawalRequests: [{ id: "request-1", onchainRequestId: 7 }],
    };
    transaction = {
      busy: false,
      execute: async (data: any) => {
        calls.push(["execute", data]);
        return true;
      },
    };
    props = {
      vault: {
        id: "vault-1",
        onchainVaultId: 3,
        onchainHub: hub,
        name: "Hũ chung",
      },
      request: {
        id: "request-1",
        recipient: wallet,
        amountWei: "1",
        deadline: "9999999999",
        expired: false,
        stale: false,
        executed: false,
        signed: false,
      },
      canSign: true,
      canExecute: true,
      onComplete: async () => {},
    };
    api = async (path: string) => {
      if (path === "/api/auth/me")
        return { user: auth.user, linkedWallet: auth.linkedWallet };
      if (path.endsWith("/state"))
        return {
          data: {
            requests: [props.request],
            capabilities: { approveWithdrawal: { allowed: true } },
          },
        };
      return { operations: [] };
    };
  });
  it("accepts the actual treasury transfer envelope instead of passing undefined to Core", async () => {
    const payment = {
      id: "payment-1",
      sender: wallet,
      recipient: hub,
      nonce: "1",
      amountWei: "1",
      status: "READY",
    };
    api = async () => ({ success: true, transfer: payment });
    load("hooks/useVaultExperience.ts", "useVaultExperience");
    expect(
      await value.post("/api/workspaces/family-1/treasury/transfers", {
        kind: "DEPOSIT",
      }),
    ).to.deep.equal(payment);
  });
  it("rejects a malformed payment before opening Core", async () => {
    load("hooks/useVaultExperience.ts", "useVaultExperience");
    let error = "";
    try {
      await value.sign(undefined);
    } catch (cause) {
      error = (cause as Error).message;
    }
    expect(error).to.include("hợp lệ");
    expect(calls).to.have.length(0);
  });
  it("blocks a stale Core action after switching families", async () => {
    load("hooks/useVaultExperience.ts", "useVaultExperience");
    const previous = value;
    family.currentWorkspace = { id: "family-2" };
    render();
    let error = "";
    try {
      await previous.post("/api/workspaces/family-1/treasury/transfers", {});
    } catch (cause) {
      error = (cause as Error).message;
    }
    expect(error).to.include("thay đổi");
    expect(calls).to.have.length(0);
  });
  it("records and reconciles a hash without requesting a wallet transaction", async () => {
    load("hooks/useFinancialOperations.ts", "useFinancialOperations");
    await value.record(hash);
    expect(calls[0]).to.deep.equal([
      "api",
      "/api/operations",
      { workspaceId: "family-1", txHash: hash },
    ]);
    expect(calls.some((call) => call[0] === "restore")).to.equal(true);
    expect(calls.some((call) => call[0] === "reconcile")).to.equal(true);
    expect(
      calls.some((call) => ["execute", "signature"].includes(call[0])),
    ).to.equal(false);
  });
  it("rejects invalid hashes before calling the server", async () => {
    load("hooks/useFinancialOperations.ts", "useFinancialOperations");
    await value.record("0xbad");
    render();
    expect(calls).to.have.length(0);
    expect(value.error).to.include("64");
  });
  it("discards an old family's delayed operation response", async () => {
    let finish: (data: any) => void = () => {};
    api = () =>
      new Promise((resolve) => {
        finish = resolve;
      });
    load("hooks/useFinancialOperations.ts", "useFinancialOperations");
    const loading = value.load();
    family.currentWorkspace = { id: "family-2" };
    render();
    finish({ operations: [{ id: "private-to-family-1" }] });
    await loading;
    render();
    expect(value.operations).to.deep.equal([]);
  });
  it("hides the approval tool from a child even with a direct section URL", () => {
    auth.role = "CHILD";
    query.set("section", "approvals");
    load("components/member/WorkspaceTools.tsx", "WorkspaceTools");
    expect(text(value)).to.include("không có sẵn");
    expect(nodes(value, (node) => node.type === PanelStub)).to.have.length(0);
  });
  it("gives guardians a reachable on-chain approval panel", () => {
    query.set("section", "approvals");
    load("components/member/WorkspaceTools.tsx", "WorkspaceTools");
    expect(nodes(value, (node) => node.type === PanelStub)).to.have.length(1);
    expect(text(value)).to.include("Duyệt việc nhà");
  });
  it("filters the shared-goal control panel to SHARED_GOAL vaults", () => {
    auth.role = "CHILD";
    query.set("section", "goals");
    load("components/member/WorkspaceTools.tsx", "WorkspaceTools");
    expect(
      nodes(value, (node) => node.props?.ruleTemplates)[0].props.ruleTemplates,
    ).to.deep.equal(["SHARED_GOAL"]);
  });
  it("shows both Core treasury and smart-contract operations in the activity tool", () => {
    query.set("section", "activity");
    load("components/member/WorkspaceTools.tsx", "WorkspaceTools");
    expect(nodes(value, (node) => node.type === PanelStub)).to.have.length(2);
  });
  it("offers Core signing and cancellation only to the transfer's source wallet", () => {
    load("components/vaults/TreasuryPanel.tsx", "TreasuryPanel");
    slots[0] = {
      address: hub,
      chainId: 43113,
      canManage: false,
      jars: [{ id: "jar", name: "Hũ Core", balance: "1", available: "1", reservedWei: "0" }],
      transfers: [
        {
          id: "transfer-1",
          jarId: "jar",
          sender: wallet,
          recipient: hub,
          kind: "DEPOSIT",
          amount: "1",
          status: "READY",
          transaction: { nonce: "1" },
        },
      ],
      reconciliation: null,
    };
    render();
    expect(button("Ký bằng Core")).to.exist;
    expect(button("Ký hủy bằng Core")).to.exist;
    auth.linkedWallet.address = hub;
    render();
    expect(button("Ký bằng Core")).not.to.exist;
    expect(button("Ký hủy bằng Core")).not.to.exist;
  });
  it("signs only the finalized request fields and exact wei, with the right hub domain", async () => {
    load(
      "components/vaults/WithdrawalSignatureActions.tsx",
      "WithdrawalSignatureActions",
    );
    button("Tạo chữ ký").props.onClick();
    render();
    await renderReview().confirm();
    render();
    const signed = calls.find((call) => call[0] === "signature")[1];
    expect(signed.domain.verifyingContract).to.equal(hub);
    expect(signed.domain.chainId).to.equal(43113);
    expect(signed.message).to.deep.equal({
      requestId: 7n,
      vaultId: 3n,
      recipient: wallet,
      amount: 1n,
      nonce: 7n,
    });
    expect(calls.some((call) => call[0] === "execute")).to.equal(false);
  });
  it("does not sign when the latest request is expired", async () => {
    load(
      "components/vaults/WithdrawalSignatureActions.tsx",
      "WithdrawalSignatureActions",
    );
    button("Tạo chữ ký").props.onClick();
    render();
    api = async () => ({
      data: {
        requests: [{ ...props.request, expired: true }],
        capabilities: { approveWithdrawal: { allowed: true } },
      },
    });
    let error = "";
    try {
      await renderReview().confirm();
    } catch (cause) {
      error = (cause as Error).message;
    }
    expect(error).to.include("thay đổi");
    expect(calls.some((call) => call[0] === "signature")).to.equal(false);
  });
  it("rejects duplicate signature input before preparing a payment", () => {
    load(
      "components/vaults/WithdrawalSignatureActions.tsx",
      "WithdrawalSignatureActions",
    );
    nodes(value, (node) => node.type === "textarea")[0].props.onChange({
      target: { value: `${signature}\n${signature}` },
    });
    render();
    button("Xem lại & gửi").props.onClick();
    render();
    expect(text(value)).to.include("không trùng lặp");
    expect(renderReview()).to.equal(null);
  });
  it("executes reviewed signatures against the mapped request and reconciliation endpoint", async () => {
    load(
      "components/vaults/WithdrawalSignatureActions.tsx",
      "WithdrawalSignatureActions",
    );
    nodes(value, (node) => node.type === "textarea")[0].props.onChange({
      target: { value: signature },
    });
    render();
    button("Xem lại & gửi").props.onClick();
    render();
    expect(calls).to.have.length(0);
    await renderReview().confirm();
    expect(calls[0]).to.deep.equal([
      "execute",
      {
        functionName: "executeWithdrawalWithSignatures",
        args: [7n, [signature]],
        path: "/api/withdrawals/execute-signatures",
        body: { requestId: "request-1" },
      },
    ]);
  });
});
