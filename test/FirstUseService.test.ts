import { expect } from "chai";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { assert, uuidInput } from "../backend/src/auth/security";

// Execute the shipped service at controlled database/auth/RPC boundaries. This
// does not replace the disposable PostgreSQL + real receipt acceptance suite.
describe("First-use service authorization and evidence boundaries", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const hub = `0x${"b".repeat(40)}`;
  const address = `0x${"a".repeat(40)}`;
  let service: any;
  let state: any;
  const auth = { user: { id: "user" }, wallet: { address } };
  beforeEach(() => {
    state = {
      role: "ADMIN",
      transactionRole: "ADMIN",
      canManageMembers: true,
      enabled: false,
      ws: { id, l1HubAddress: null },
      rows: [],
      writes: [],
      rpcCalls: 0,
      vaults: [],
      allowlisted: true,
      paused: false,
    };
    const store: any = {
      select: () => {
        const builder: any = {
          from: () => builder,
          where: () => builder,
          for: () => builder,
          then: (resolve: any, reject: any) =>
            state.dbError
              ? Promise.reject(state.dbError).then(resolve, reject)
              : Promise.resolve(state.rows.shift() || []).then(resolve, reject),
        };
        return builder;
      },
      update: (table: any) => ({
        set: (value: any) => ({
          where: async () => {
            state.writes.push({ table, value });
          },
        }),
      }),
      insert: (table: any) => ({
        values: async (value: any) => {
          state.writes.push({ table, value });
        },
      }),
      transaction: async (action: any) => action(store),
    };
    const manifest = () => ({
      enabled: state.enabled,
      version: "2.1.0-t1",
      admin: address,
      chainId: 43113,
      contracts: { hub: { address: hub }, cashflow: { address: hub } },
    });
    const client = {
      getBlock: async () => ({ number: 7n }),
      readContract: async (request: any) => {
        expect(request.blockNumber).to.equal(7n);
        if (request.functionName === "isAllowlisted") return state.allowlisted;
        if (request.functionName === "paused") return state.paused;
        return state.chainVault;
      },
    };
    const mockDb: any = { db: store };
    for (const name of [
      "vaults",
      "workspaceMembers",
      "users",
      "userWallets",
      "chores",
      "auditLogs",
      "workspaces",
    ])
      mockDb[name] = new Proxy(
        {},
        { get: (_target, key) => `${name}.${String(key)}` },
      );
    const code = ts.transpileModule(
      readFileSync("backend/src/services/firstUseService.ts", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText;
    const module = { exports: {} };
    new Function("require", "module", "exports", code)(
      (name: string) => {
        if (name === "drizzle-orm") return { eq() {}, and() {}, isNull() {} };
        if (name === "../db") return mockDb;
        if (name === "../auth/security") return { assert, uuidInput };
        if (name === "../auth/service")
          return {
            requireFull() {},
            membership: async () => ({ role: state.transactionRole }),
          };
        if (name === "./workspaceAccess")
          return {
            workspace: async (_auth: unknown, target: string) => {
              assert(target === id, 403, "Wrong workspace");
              return {
                ws: state.ws,
                member: {
                  role: state.role,
                  canManageMembers: state.canManageMembers,
                },
              };
            },
            visibleVaults: async () => state.vaults,
          };
        if (name === "./deploymentService")
          return {
            deploymentManifest: manifest,
            verifiedDeployment: async () => {
              state.rpcCalls++;
              if (state.rpcError) throw state.rpcError;
              assert(state.enabled, 503, "Not deployed");
              return { manifest: manifest(), client };
            },
          };
        if (name.includes("shared/firstUse"))
          return require("../shared/firstUse");
        if (name.includes("shared/abis")) return { FAMILY_HUB_ABI: [] };
        if (name === "../db/errors") return require("../backend/src/db/errors");
        if (name === "viem") return { parseAbi: () => [] };
        throw new Error(`Unexpected test import ${name}`);
      },
      module,
      module.exports,
    );
    service = module.exports;
  });
  const failure = async (
    run: () => Promise<unknown>,
    code: string | number,
  ) => {
    let error: any;
    try {
      await run();
    } catch (caught) {
      error = caught;
    }
    expect(typeof code === "number" ? error?.status : error?.code).to.equal(
      code,
    );
  };
  it("returns a useful fresh-account guide without contacting disabled infrastructure", async () => {
    state.rows = [[{ id: "user" }]];
    const result = await service.firstUseStatus(auth, id);
    expect(result.facts.deployment).to.equal("DISABLED");
    expect(result.facts.vaults).to.equal(0);
    expect(
      result.steps.find((step: any) => step.id === "members").action,
    ).to.equal("MANAGE_MEMBERS");
    expect(state.rpcCalls).to.equal(0);
    expect(state.writes).to.deep.equal([]);
  });
  it("does not request RPC or mutate data for a workspace outside the session scope", async () => {
    await failure(
      () =>
        service.firstUseStatus(auth, "00000000-0000-4000-8000-000000000002"),
      403,
    );
    expect(state.rpcCalls).to.equal(0);
    expect(state.writes).to.deep.equal([]);
  });
  it("distinguishes RPC unavailability from an allowlist denial", async () => {
    state.enabled = true;
    state.rpcError = Object.assign(new Error("private RPC detail"), {
      code: "RPC_UNAVAILABLE",
    });
    const result = await service.firstUseStatus(auth, id);
    expect(result.facts.deployment).to.equal("UNAVAILABLE");
    expect(result.facts.allowlisted).to.equal(null);
    expect(JSON.stringify(result)).not.to.include("private RPC detail");
  });
  it("never treats an unrelated beneficiary vault or a seed mapping as the child's first vault", async () => {
    state.enabled = true;
    state.role = "CHILD";
    state.canManageMembers = false;
    state.ws.l1HubAddress = hub;
    state.vaults = [
      { id: "seed", onchainVaultId: 0 },
      {
        id: "mapped",
        onchainVaultId: 1,
        onchainHub: hub,
        onchainChainId: 43113,
        onchainCreationTx: "receipt",
        onchainCreationLogIndex: 0,
      },
    ];
    state.chainVault = {
      vaultId: 1n,
      ruleType: 1,
      isActive: true,
      beneficiaries: [`0x${"c".repeat(40)}`],
      totalBalance: 1n,
    };
    const result = await service.firstUseStatus(auth, id);
    expect(result.facts.vaults).to.equal(0);
    expect(result.facts.tasks).to.equal(0);
    expect(result.asOfBlock).to.equal("7");
  });
  it("does not give a Guardian workspace-connection authority", async () => {
    state.role = "GUARDIAN";
    await failure(() => service.connectFirstUseWorkspace(auth, id), 403);
    expect(state.rpcCalls).to.equal(0);
  });
  it("requires verified deployment and rechecks Admin membership inside the transaction", async () => {
    await failure(() => service.connectFirstUseWorkspace(auth, id), 503);
    state.enabled = true;
    state.transactionRole = "GUARDIAN";
    await failure(() => service.connectFirstUseWorkspace(auth, id), 403);
    expect(state.writes).to.deep.equal([]);
  });
  it("connects only workspace metadata, preserves unverified vaults and is idempotent", async () => {
    state.enabled = true;
    state.rows = [[state.ws], [{ onchainHub: null, onchainChainId: null }]];
    await service.connectFirstUseWorkspace(auth, id);
    expect(state.writes).to.have.length(2);
    expect(state.writes[0].value).to.deep.equal({ l1HubAddress: hub });
    state.rows = [[{ ...state.ws, l1HubAddress: hub }], []];
    state.writes = [];
    await service.connectFirstUseWorkspace(auth, id);
    expect(state.writes).to.deep.equal([]);
  });
  it("refuses conflicting Hub or vault deployment without editing any ledger", async () => {
    state.enabled = true;
    state.rows = [[{ ...state.ws, l1HubAddress: address }]];
    await failure(
      () => service.connectFirstUseWorkspace(auth, id),
      "WORKSPACE_HUB_CONFLICT",
    );
    state.rows = [[state.ws], [{ onchainHub: hub, onchainChainId: 99999 }]];
    await failure(
      () => service.connectFirstUseWorkspace(auth, id),
      "WORKSPACE_VAULT_DEPLOYMENT_CONFLICT",
    );
    expect(state.writes).to.deep.equal([]);
  });
});
