import { expect } from "chai";
import { readFileSync } from "fs";
import { resolve } from "path";
import ts from "typescript";

// Exercise the shipped wallet adapter against controlled EIP-1193/RPC boundaries.
// No wallet extension, real key or external chain is used by these tests.
describe("Web3 transaction identity and receipt boundary", function () {
  const address = `0x${"a".repeat(40)}`;
  const hub = `0x${"b".repeat(40)}`;
  const txHash = `0x${"c".repeat(64)}`;
  let adapter: any;
  let state: any;
  let saved: Record<string, string>;
  let originalFetch: typeof fetch;
  let oldWindow: unknown;
  let oldStorage: unknown;
  beforeEach(() => {
    state = {
      address,
      chain: 99999,
      sent: 0,
      simulationFailure: false,
      accountChange: false,
      receipt: "success",
      timeout: false,
      revoked: false,
      fetches: 0,
    };
    saved = {};
    originalFetch = globalThis.fetch;
    oldWindow = (globalThis as any).window;
    oldStorage = (globalThis as any).localStorage;
    (globalThis as any).localStorage = {
      getItem: (key: string) => saved[key] || null,
      setItem: (key: string, value: string) => {
        saved[key] = value;
      },
    };
    (globalThis as any).window = {
      avalanche: {
        request: async ({ method, params }: any) => {
          if (method === "eth_accounts" || method === "eth_requestAccounts")
            return [state.address];
          if (method === "eth_chainId") return `0x${state.chain.toString(16)}`;
          if (method === "wallet_switchEthereumChain") {
            if (state.refuseSwitch) throw new Error("rejected");
            state.chain = Number.parseInt(params[0].chainId, 16);
          }
        },
      },
      dispatchEvent: () => {},
    };
    globalThis.fetch = (async (path: any, options: any) => {
      state.fetches++;
      if (String(path).endsWith("/claim")) {
        state.claims = (state.claims || 0) + 1;
        if (state.claimConflict) return Response.json({ error: "Another tab claimed this draft" }, { status: 409 });
        return Response.json({ intent: { data: state.changedClaim ? "0x9999" : "0x1234" } });
      }
      if (String(path).endsWith("/rejected")) { state.releases = (state.releases || 0) + 1; return Response.json({ success: true }); }
      if (String(path).startsWith("/api/operations?") && state.operations)
        return Response.json({ operations: state.operations });
      if (String(path) === "/api/operations" && state.operation) {
        state.operationWrites = (state.operationWrites || 0) + 1;
        return Response.json({ operation: state.operation });
      }
      if (String(path).endsWith("/reconcile") && state.operation)
        return Response.json({ operation: state.operation });
      if (String(path).endsWith("/complete") && state.operation) {
        state.completions = (state.completions || 0) + 1;
        if (state.completionFailure) return Response.json({ code: "RPC_UNAVAILABLE" }, { status: 503 });
        return Response.json({ operation: { ...state.operation, status: "COMPLETED" } });
      }
      if (String(path) === "/api/vaults") state.businessSyncs = (state.businessSyncs || 0) + 1;
      if (String(path) === "/api/vaults" && state.syncFailure)
        return new Response(JSON.stringify({ code: state.syncFailure, error: "Awaiting finality" }), { status: 409 });
      if (
        String(path).includes("/transaction-context") &&
        state.forbiddenResource
      )
        return new Response(
          JSON.stringify({ error: "Resource is outside the active workspace" }),
          { status: 403 },
        );
      if (String(path) === "/api/auth/me")
        return new Response(
          JSON.stringify(
            state.revoked
              ? { error: "Session revoked" }
              : {
                  onboarding: "READY",
                  linkedWallet: { address },
                  user: { id: state.userId || "member" },
                  workspaces: [{ id: "workspace", role: state.creating ? "ADMIN" : "CHILD" }],
                },
          ),
          { status: state.revoked ? 401 : 200 },
        );
      return new Response(
        JSON.stringify({
          deploymentVersion: "2.1.0-t1",
          creationIntent: { data: state.changedIntent ? "0x9999" : "0x1234" },
          chainId: 99999,
          hub,
          workspace: { l1HubAddress: hub },
          hubChainId: 99999,
          networkAllowlistRequired: !!state.requireNetworkAllowlist,
          vaults: [
            { onchainVaultId: 7, onchainHub: hub, onchainChainId: 99999 },
          ],
        }),
      );
    }) as typeof fetch;
    const mockViem = {
      encodeFunctionData: () => "0x1234",
      http: () => ({}),
      custom: () => ({}),
      createWalletClient: () => ({
        writeContract: async () => {
          if (state.signError) throw state.signError;
          state.sent++;
          return txHash;
        },
      }),
      createPublicClient: ({ chain }: any) => ({
        getChainId: async () => chain.id,
        readContract: async (args: any) =>
          args.functionName === "readAllowList"
            ? (state.networkRole ?? 1n)
            : state.allowlisted !== false,
        simulateContract: async (args: any) => {
          if (state.simulationFailure) throw new Error("NotAllowlisted");
          if (state.accountChange) state.address = `0x${"d".repeat(40)}`;
          if (state.revokeAfterSimulation) state.revoked = true;
          return { request: args };
        },
        waitForTransactionReceipt: async () => {
          if (state.timeout) throw new Error("timeout");
          return { status: state.receipt };
        },
        getTransactionReceipt: async () => ({ status: state.receipt }),
      }),
    };
    const chain = {
      id: 99999,
      rpcUrls: { default: { http: ["http://test.invalid"] } },
    };
    const compiled = ts.transpileModule(
      readFileSync(resolve("frontend/src/lib/web3/client.ts"), "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText;
    const module = { exports: {} };
    new Function("require", "module", "exports", compiled)(
      (name: string) =>
        name.includes("transactionErrors")
          ? require("../shared/transactionErrors")
          : name === "viem"
          ? mockViem
          : name === "@/contracts/abis"
            ? { FAMILY_HUB_ABI: [] }
            : name.includes("networkPermissions")
              ? {
                  TRANSACTION_ALLOWLIST_ADDRESS: hub,
                  TRANSACTION_ALLOWLIST_ABI: [],
                }
              : {
                  avalancheFamilyL1: chain,
                  DEPLOYMENT: { version: "2.1.0-t1" },
                  hubChain: chain,
                  avalancheFuji: { ...chain, id: 43113 },
                },
      module,
      module.exports,
    );
    adapter = module.exports;
    adapter.setTransactionWorkspace("workspace");
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    (globalThis as any).window = oldWindow;
    (globalThis as any).localStorage = oldStorage;
  });
  const write = () =>
    adapter.getWalletClient().writeContract({
      address: hub,
      functionName: "fastWithdraw",
      args: [7n, 1n],
    });
  const create = (onProgress?: (phase: any) => void) => {
    state.creating = true;
    return adapter.getWalletClient().writeContract({ address: hub, functionName: "createCustomVault", args: ["Family fund"], __kinetixSync: { path: "/api/vaults", body: { workspaceId: "workspace", draftId: "00000000-0000-4000-8000-000000000001" } }, __kinetixProgress: onProgress });
  };
  const rejection = async (
    operation: () => Promise<unknown>,
    contains: string,
  ) => {
    let error: any;
    try {
      await operation();
    } catch (caught) {
      error = caught;
    }
    expect(error?.message).to.include(contains);
  };
  it("binds creation calldata before prompting and claims a draft once before broadcast", async () => {
    const phases: string[] = [];
    await create((value) => phases.push(value.status));
    expect(state.claims).to.equal(1);
    expect(state.sent).to.equal(1);
    expect(phases).to.deep.equal(["PRECHECK", "AWAITING_SIGNATURE", "BROADCAST", "CONFIRMED"]);
    expect(adapter.pendingTransactions("member")[0].sync.body.draftId).to.equal("00000000-0000-4000-8000-000000000001");
  });
  it("blocks creation after another tab claims the draft or its intent changes", async () => {
    state.claimConflict = true;
    await rejection(create, "Another tab");
    expect(state.sent).to.equal(0);
    state.claimConflict = false; state.changedIntent = true;
    await rejection(create, "Cấu hình");
    expect(state.sent).to.equal(0);
    state.changedIntent = false; state.changedClaim = true;
    await rejection(create, "Cấu hình");
    expect(state.sent).to.equal(0);
    expect(state.releases).to.equal(1);
  });
  it("releases a rejected signature but retains an uncertain wallet attempt for recovery", async () => {
    state.signError = { message: "Wallet rejected", cause: { code: 4001 } };
    await rejection(create, "Wallet rejected");
    expect(state.releases).to.equal(1);
    state.signError = new Error("Connection lost");
    await rejection(create, "Connection lost");
    expect(state.releases).to.equal(1);
    expect(state.sent).to.equal(0);
  });
  it("blocks a connected account different from the persisted linked wallet", async () => {
    state.address = `0x${"d".repeat(40)}`;
    await rejection(write, "không khớp");
    expect(state.sent).to.equal(0);
  });
  it("blocks wrong network, allowlist/role simulation failures and absent scope", async () => {
    state.chain = 1;
    state.refuseSwitch = true;
    await rejection(write, "Chưa chuyển");
    expect(state.sent).to.equal(0);
    state.chain = 99999;
    state.refuseSwitch = false;
    state.simulationFailure = true;
    await rejection(write, "NotAllowlisted");
    expect(state.sent).to.equal(0);
    adapter.setTransactionWorkspace(null);
    await rejection(write, "chọn không gian");
  });
  it("rechecks accounts and session after asynchronous simulation", async () => {
    state.accountChange = true;
    await rejection(write, "đã thay đổi");
    expect(state.sent).to.equal(0);
    state.address = address;
    state.accountChange = false;
    state.revokeAfterSimulation = true;
    await rejection(write, "Session revoked");
    expect(state.sent).to.equal(0);
  });
  it("does not send inaccessible or unverified vault mappings", async () => {
    await rejection(
      () =>
        adapter.getWalletClient().writeContract({
          address: hub,
          functionName: "fastWithdraw",
          args: [8n, 1n],
        }),
      "chưa có quyền",
    );
    expect(state.sent).to.equal(0);
  });
  it("returns success only after a successful receipt and records a revert", async () => {
    expect(await write()).to.equal(txHash);
    expect(adapter.pendingTransactions("member")[0].status).to.equal(
      "CONFIRMED",
    );
    state.receipt = "reverted";
    await rejection(write, "revert");
    expect(adapter.pendingTransactions("member")[0].status).to.equal(
      "REVERTED",
    );
  });
  it("keeps a broadcast hash through timeout/disconnect and reconciles without the wallet", async () => {
    state.timeout = true;
    await rejection(write, txHash);
    expect(adapter.pendingTransactions("member")[0].status).to.equal("PENDING");
    (globalThis as any).window.avalanche = null;
    await adapter.reconcileTransactions("member");
    expect(adapter.pendingTransactions("member")[0].status).to.equal(
      "CONFIRMED",
    );
    expect(state.sent).to.equal(1);
    expect(adapter.pendingTransactions("another-user")).to.deep.equal([]);
  });
  it("stops using the provider after a UI disconnect", () => {
    adapter.setWalletUseEnabled(false);
    expect(adapter.getWalletClient()).to.equal(null);
  });
  it("checks request and task IDs against the server's active workspace policy before broadcasting", async () => {
    state.forbiddenResource = true;
    await rejection(
      () =>
        adapter.getWalletClient().writeContract({
          address: hub,
          functionName: "approveWithdrawal",
          args: [66n],
        }),
      "outside the active workspace",
    );
    expect(state.sent).to.equal(0);
  });
  it("checks both the Hub allowlist and the optional network precompile", async () => {
    state.allowlisted = false;
    await rejection(write, "chưa được cấp quyền");
    expect(state.sent).to.equal(0);
    state.allowlisted = true;
    state.requireNetworkAllowlist = true;
    state.networkRole = 0n;
    await rejection(write, "Transaction AllowList");
    expect(state.sent).to.equal(0);
  });
  it("reconciles a confirmed transaction through the API without sending it again", async () => {
    const path = "/api/vaults";
    state.timeout = true;
    await rejection(
      () =>
        adapter.getWalletClient().writeContract({
          address: hub,
          functionName: "fastWithdraw",
          args: [7n, 1n],
          __kinetixSync: {
            path,
            body: { vaultId: "known-vault", action: "WITHDRAW" },
            method: "PATCH",
          },
        }),
      txHash,
    );
    expect(adapter.pendingTransactions("member")[0].sync.status).to.equal(
      "PENDING",
    );
    (globalThis as any).window.avalanche = null;
    await adapter.reconcileTransactions("member");
    expect(adapter.pendingTransactions("member")[0].status).to.equal(
      "CONFIRMED",
    );
    expect(adapter.pendingTransactions("member")[0].sync.status).to.equal(
      "DONE",
    );
    expect(state.sent).to.equal(1);
  });
  it("blocks a second send for the same resource after broadcast timeout", async () => {
    state.timeout = true;
    const operation = () =>
      adapter.getWalletClient().writeContract({
        address: hub,
        functionName: "claimChoreCompleted",
        args: [7n],
        __kinetixSync: {
          path: "/api/chores/submit",
          body: { choreId: "task", attachmentId: "private-file" },
        },
      });
    await rejection(operation, txHash);
    await rejection(operation, "Không gửi lại");
    expect(state.sent).to.equal(1);
  });
  it("retries a receipt finality conflict without broadcasting a second transaction", async () => {
    const hash = await adapter.getWalletClient().writeContract({ address: hub, functionName: "fastWithdraw", args: [7n, 1n], __kinetixSync: { path: "/api/vaults", body: { vaultId: "known-vault", action: "WITHDRAW" }, method: "PATCH" } });
    state.syncFailure = "RECEIPT_NOT_FINALIZED";
    await rejection(() => adapter.queueTransactionSync("member", hash, "/api/vaults", { vaultId: "known-vault", action: "WITHDRAW", txHash: hash }, "PATCH"), hash);
    expect(adapter.pendingTransactions("member")[0].sync.status).to.equal("PENDING");
    await adapter.reconcileTransactions("member");
    expect(adapter.pendingTransactions("member")[0].sync.status).to.equal("PENDING");
    state.syncFailure = null;
    await adapter.reconcileTransactions("member");
    expect(adapter.pendingTransactions("member")[0].sync.status).to.equal("DONE");
    expect(state.sent).to.equal(1);
  });
  it("serializes double-click writes before any asynchronous identity request", async () => {
    const first = write();
    await rejection(write, "đang chờ xác nhận");
    await first;
    expect(state.sent).to.equal(1);
  });
  it("retries server journal completion after business sync without repeating the write or sync", async () => {
    state.operation = { id: "operation", status: "SYNC_PENDING" };
    state.completionFailure = true;
    const hash = await write();
    await adapter.queueTransactionSync("member", hash, "/api/vaults", { txHash: hash }, "PATCH");
    expect(state.completions).to.equal(1);
    expect(adapter.pendingTransactions("member")[0].sync.status).to.equal("DONE");
    state.completionFailure = false;
    await adapter.reconcileTransactions("member");
    expect(state.completions).to.equal(2);
    expect(state.businessSyncs).to.equal(1);
    expect(state.sent).to.equal(1);
    expect(adapter.pendingTransactions("member")[0].operationStatus).to.equal("COMPLETED");
    await adapter.reconcileTransactions("member");
    expect(state.completions).to.equal(2);
  });
  it("restores a confirmed operation from the server after loss of local storage and completes it without Core", async () => {
    state.operation = {
      id: "operation", hash: txHash, chainId: 99999, workspaceId: "workspace",
      submittedAt: new Date().toISOString(), status: "SYNC_PENDING",
      sync: { path: "/api/vaults", method: "PATCH", body: { txHash } },
    };
    state.operations = [state.operation];
    (globalThis as any).window.avalanche = null;
    await adapter.restoreOperations("member", "workspace");
    await adapter.reconcileTransactions("member");
    expect(adapter.pendingTransactions("member")[0].operationStatus).to.equal("COMPLETED");
    expect(state.businessSyncs).to.equal(1);
    expect(state.sent).to.equal(0);
  });
  it("uses a server-reported revert without attempting business synchronization", async () => {
    state.operation = { id: "operation", status: "REVERTED" };
    state.timeout = true;
    await rejection(write, txHash);
    await adapter.reconcileTransactions("member");
    expect(adapter.pendingTransactions("member")[0].status).to.equal("REVERTED");
    expect(state.businessSyncs || 0).to.equal(0);
    expect(state.sent).to.equal(1);
  });
  it("does not restore or reconcile an old account's records with a different session", async () => {
    state.timeout = true;
    await rejection(write, txHash);
    state.userId = "another-user";
    const requests: string[] = [];
    const underlying = globalThis.fetch;
    globalThis.fetch = (async (path: any, init: any) => {
      requests.push(String(path));
      return underlying(path, init);
    }) as typeof fetch;
    await adapter.restoreOperations("member", "workspace");
    await adapter.reconcileTransactions("member");
    expect(requests).to.deep.equal(["/api/auth/me", "/api/auth/me"]);
    expect(adapter.pendingTransactions("member")[0].status).to.equal("PENDING");
  });
  it("does not expose another account's queue and expires stale private records", () => {
    saved["kinetix-pending:member"] = JSON.stringify([
      { hash: txHash, submittedAt: "2000-01-01", status: "PENDING" },
    ]);
    expect(adapter.pendingTransactions("member")).to.deep.equal([]);
    expect(adapter.pendingTransactions("other")).to.deep.equal([]);
  });
});
