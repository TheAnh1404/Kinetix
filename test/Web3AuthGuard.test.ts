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
    globalThis.fetch = (async (path: any) => {
      state.fetches++;
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
                  user: { id: "member" },
                  workspaces: [{ id: "workspace", role: "CHILD" }],
                },
          ),
          { status: state.revoked ? 401 : 200 },
        );
      return new Response(
        JSON.stringify({
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
      http: () => ({}),
      custom: () => ({}),
      createWalletClient: () => ({
        writeContract: async () => {
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
        name === "viem"
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
        adapter
          .getWalletClient()
          .writeContract({
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
});
