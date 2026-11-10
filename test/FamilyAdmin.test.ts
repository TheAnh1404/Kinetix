import { expect } from "chai";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as viem from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as security from "../backend/src/auth/security";
import * as permissions from "../shared/workspacePermissions";

// Run the shipped authorization and admin service; isolate only persistence and session refresh.
describe("Family creator ownership and signed administration", () => {
  const id = (n: number) =>
    `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const account = privateKeyToAccount(`0x${"1".repeat(64)}`);
  const stranger = privateKeyToAccount(`0x${"2".repeat(64)}`);
  const owner = id(1),
    guest = id(2),
    ws = id(3),
    otherWs = id(4);
  let state: any, store: any, service: any, authService: any, access: any;
  const auth: any = {
    user: { id: owner, role: "ADMIN" },
    session: { id: id(5), kind: "full" },
    credential: { mustChangePassword: false },
    wallet: { address: account.address },
  };
  function load(file: string, modules: Record<string, any>) {
    const module = { exports: {} as any };
    const code = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText;
    new Function("require", "module", "exports", code)(
      (name: string) => {
        if (!(name in modules)) throw new Error(`Unmocked import ${name}`);
        return modules[name];
      },
      module,
      module.exports,
    );
    return module.exports;
  }
  beforeEach(() => {
    state = {
      workspaces: [
        { id: ws, name: "Family A", creatorUserId: owner },
        { id: otherWs, name: "Family B", creatorUserId: guest },
      ],
      workspaceMembers: [
        {
          userId: owner,
          workspaceId: ws,
          role: "ADMIN",
          accessDisabledAt: null,
        },
        {
          userId: owner,
          workspaceId: otherWs,
          role: "GUARDIAN",
          canManageMembers: true,
          accessDisabledAt: null,
        },
        {
          userId: guest,
          workspaceId: ws,
          role: "GUARDIAN",
          accessDisabledAt: null,
        },
      ],
      familyAdminState: [],
      familyAdminIntents: [],
      treasuryJars: [],
      treasuryPolicies: [],
      treasuryJobs: [],
      treasuryTransfers: [],
      vaults: [],
      auditLogs: [],
      workspaceInvitations: [],
    };
    const tables: any = new Proxy(
      {},
      {
        get: (_target, table: string) =>
          new Proxy(
            { table },
            {
              get: (_value, key: string) =>
                key === "table" ? table : { table, key },
            },
          ),
      },
    );
    const orm: any = {
      eq: (col: any, value: any) => (row: any) => row[col.key] === value,
      isNull: (col: any) => (row: any) => row[col.key] == null,
      and:
        (...filters: any[]) =>
        (row: any) =>
          filters.every((f) => f(row)),
      or:
        (...filters: any[]) =>
        (row: any) =>
          filters.some((f) => f(row)),
      inArray: (col: any, values: any[]) => (row: any) =>
        values.includes(row[col.key]),
      desc: () => null,
      sql:
        (_text: any, ...values: any[]) =>
        (row: any) =>
          values[0]?.key === "balanceWei"
            ? BigInt(row.balanceWei) !== 0n || BigInt(row.reservedWei) !== 0n
            : true,
    };
    store = {
      execute: async () => {},
      select: (projection: any) => {
        let table: string,
          filter = (_row: any) => true;
        const chain: any = {
          from: (t: any) => {
            table = t.table;
            return chain;
          },
          where: (f: any) => {
            filter = f;
            return chain;
          },
          orderBy: () => chain,
          limit: () => chain,
          then: (resolve: any, reject: any) =>
            Promise.resolve(
              (state[table] || [])
                .filter(filter)
                .map((row: any) =>
                  projection
                    ? Object.fromEntries(
                        Object.entries(projection).map(([key, col]: any) => [
                          key,
                          row[col.key],
                        ]),
                      )
                    : row,
                ),
            ).then(resolve, reject),
        };
        return chain;
      },
      insert: (table: any) => ({
        values: (input: any) => {
          const rows = Array.isArray(input) ? input : [input];
          let ignore = false;
          const commit = () =>
            rows.map((row: any) => {
              if (
                ignore &&
                state[table.table].some(
                  (old: any) => old.workspaceId === row.workspaceId,
                )
              )
                return row;
              const added = {
                revision: 0,
                status: "PENDING",
                createdAt: new Date(),
                ...row,
              };
              state[table.table].push(added);
              return added;
            });
          const chain: any = {
            onConflictDoNothing: () => {
              ignore = true;
              return chain;
            },
            returning: async () => commit(),
            then: (resolve: any, reject: any) =>
              Promise.resolve(commit()).then(resolve, reject),
          };
          return chain;
        },
      }),
      update: (table: any) => ({
        set: (patch: any) => ({
          where: async (filter: any) => {
            state[table.table]
              .filter(filter)
              .forEach((row: any) => Object.assign(row, patch));
          },
        }),
      }),
      transaction: async (action: any) => {
        const before = structuredClone(state);
        try {
          return await action(store);
        } catch (err) {
          state = before;
          throw err;
        }
      },
    };
    const modules = {
      "drizzle-orm": orm,
      viem: viem,
      "../db": {
        db: store,
        ...Object.fromEntries(
          [
            "workspaces",
            "workspaceMembers",
            "users",
            "userWallets",
            "workspaceInvitations",
            "familyAdminState",
            "familyAdminIntents",
            "treasuryJars",
            "treasuryPolicies",
            "treasuryJobs",
            "treasuryTransfers",
            "auditLogs",
            "vaults",
          ].map((name) => [name, tables[name]]),
        ),
      },
      "../db/schema": tables,
      "./security": security,
      "../auth/security": security,
      "../../../shared/startFlow": require("../shared/startFlow"),
      "../../../shared/workspacePermissions": permissions,
      "../services/deploymentService": {},
    };
    authService = load("backend/src/auth/service.ts", modules);
    service = load("backend/src/services/familyAdminService.ts", {
      ...modules,
      "../auth/service": {
        membership: authService.membership,
        liveAuth: async (value: any, current: any) => current,
      },
      "../../../shared/treasury": require("../shared/treasury"),
      "./treasuryWorkflowService": {},
    });
    access = load("backend/src/services/familyAccess.ts", modules);
  });
  const fails = async (action: () => Promise<any>, status: number) => {
    let error: any;
    try {
      await action();
    } catch (caught) {
      error = caught;
    }
    expect(error?.status, error?.message || "Expected rejection").to.equal(
      status,
    );
  };
  const prepare = (
    action = "RENAME",
    payload: any = { name: "Family renamed" },
    requestId = id(10),
    revision = 0,
  ) =>
    service.prepareAdminIntent(auth, ws, {
      action,
      payload,
      requestId,
      revision,
    });
  const sign = (intent: any) =>
    account.signMessage({ message: intent.message });
  it("confines a global ADMIN to the family they created", async () => {
    expect(
      (await authService.membership(store, auth, ws, true)).isOwner,
    ).to.equal(true);
    const invited = await authService.membership(store, auth, otherWs);
    expect(invited.role).to.equal("GUARDIAN");
    expect(invited.canManageMembers).to.equal(false);
    await fails(() => authService.membership(store, auth, otherWs, true), 403);
    await fails(() => service.adminOverview(auth, otherWs), 403);
  });
  it("fails closed for forged ADMIN rows, missing creator evidence and disabled owners", async () => {
    state.workspaceMembers[1].role = "ADMIN";
    expect((await authService.membership(store, auth, otherWs)).role).to.equal(
      "GUARDIAN",
    );
    state.workspaces[0].creatorUserId = null;
    await fails(() => authService.membership(store, auth, ws, true), 403);
    state.workspaces[0].creatorUserId = owner;
    state.workspaceMembers[0].accessDisabledAt = new Date();
    await fails(() => authService.membership(store, auth, ws), 403);
    expect(
      permissions.isWorkspaceOwner(owner, {
        creatorUserId: owner,
        role: "GUARDIAN",
      }),
    ).to.equal(false);
  });
  it("binds a five-minute request to workspace, actor, session and revision", async () => {
    const intent = await prepare();
    expect(intent.message)
      .to.include(ws)
      .and.include(owner)
      .and.include(security.digest(auth.session.id));
    expect(intent.expiresAt.getTime() - Date.now()).to.be.within(
      298000,
      300000,
    );
    expect(state.workspaces[0].name).to.equal("Family A");
    await fails(
      async () =>
        service.executeAdminIntent(
          { ...auth, session: { ...auth.session, id: id(99) } },
          ws,
          intent.id,
          await sign(intent),
        ),
      404,
    );
  });
  it("rejects a wrong wallet, a modified message and an expired request", async () => {
    const intent = await prepare();
    await fails(
      async () =>
        service.executeAdminIntent(
          auth,
          ws,
          intent.id,
          await stranger.signMessage({ message: intent.message }),
        ),
      401,
    );
    await fails(
      async () =>
        service.executeAdminIntent(
          auth,
          ws,
          intent.id,
          await account.signMessage({ message: intent.message + "altered" }),
        ),
      401,
    );
    state.familyAdminIntents[0].expiresAt = new Date(Date.now() - 1000);
    await fails(
      async () =>
        service.executeAdminIntent(auth, ws, intent.id, await sign(intent)),
      409,
    );
    expect(state.workspaces[0].name).to.equal("Family A");
  });
  it("applies one signed change exactly once and rejects stale concurrent requests", async () => {
    const first = await prepare();
    const second = await prepare("RENAME", { name: "Stale name" }, id(11));
    const signature = await sign(first);
    await service.executeAdminIntent(auth, ws, first.id, signature);
    expect(state.workspaces[0].name).to.equal("Family renamed");
    expect(state.auditLogs).to.have.length(1);
    expect(
      (await service.executeAdminIntent(auth, ws, first.id, signature))
        .alreadyCompleted,
    ).to.equal(true);
    await fails(
      async () =>
        service.executeAdminIntent(auth, ws, second.id, await sign(second)),
      409,
    );
    expect(state.auditLogs).to.have.length(1);
  });
  it("rejects a stored payload changed after signing and malformed ECDSA input", async () => {
    const intent = await prepare();
    const signature = await sign(intent);
    state.familyAdminIntents[0].payload = { name: "Unsigned name" };
    await fails(
      () => service.executeAdminIntent(auth, ws, intent.id, signature),
      409,
    );
    state.familyAdminIntents[0].payload = { name: "Family renamed" };
    await fails(
      () =>
        service.executeAdminIntent(auth, ws, intent.id, `0x${"0".repeat(130)}`),
      401,
    );
    expect(state.workspaces[0].name).to.equal("Family A");
  });
  it("revokes only a live invitation from the selected family", async () => {
    state.workspaceInvitations.push(
      { id: id(70), workspaceId: ws, expiresAt: new Date(Date.now() + 600000) },
      {
        id: id(71),
        workspaceId: otherWs,
        expiresAt: new Date(Date.now() + 600000),
      },
    );
    await fails(() => prepare("REVOKE_INVITE", { invitationId: id(71) }), 409);
    const intent = await prepare("REVOKE_INVITE", { invitationId: id(70) });
    await service.executeAdminIntent(auth, ws, intent.id, await sign(intent));
    expect(state.workspaceInvitations[0].revokedAt).to.be.instanceOf(Date);
    expect(state.workspaceInvitations[1].revokedAt).to.equal(undefined);
  });
  it("reuses a matching idempotency key and rejects a different payload", async () => {
    const intent = await prepare("MEMBER_ACCESS", {
      userId: guest,
      disabled: true,
    });
    state.familyAdminIntents[0].payload = { disabled: true, userId: guest };
    expect(
      (await prepare("MEMBER_ACCESS", { userId: guest, disabled: true })).id,
    ).to.equal(intent.id);
    await fails(
      () => prepare("MEMBER_ACCESS", { userId: guest, disabled: false }),
      409,
    );
  });
  it("cannot lock the creator or a member of another family", async () => {
    await fails(
      () => prepare("MEMBER_ACCESS", { userId: owner, disabled: true }),
      403,
    );
    await fails(
      () => prepare("MEMBER_ACCESS", { userId: id(98), disabled: true }),
      403,
    );
    expect(state.familyAdminIntents).to.have.length(0);
  });
  it("locks membership only in the selected family and keeps the other family untouched", async () => {
    state.workspaceMembers.push({
      userId: guest,
      workspaceId: otherWs,
      role: "ADMIN",
      accessDisabledAt: null,
    });
    const intent = await prepare("MEMBER_ACCESS", {
      userId: guest,
      disabled: true,
    });
    await service.executeAdminIntent(auth, ws, intent.id, await sign(intent));
    expect(state.workspaceMembers[2].accessDisabledAt).to.be.instanceOf(Date);
    expect(state.workspaceMembers[3].accessDisabledAt).to.equal(null);
  });
  it("pauses outgoing requests while allowing deposits and blocks all new writes after archive", async () => {
    const intent = await prepare("PAUSE", { reason: "Family review" });
    await service.executeAdminIntent(auth, ws, intent.id, await sign(intent));
    await fails(() => access.requireWorkspaceWrites(store, ws, true), 409);
    await access.requireWorkspaceWrites(store, ws, false);
    await access.requireWorkspaceWrites(store, otherWs, true);
    state.familyAdminState[0].archived = true;
    await fails(() => access.requireWorkspaceWrites(store, ws, false), 409);
  });
  it("refuses archive while outstanding work remains and rolls back the intent", async () => {
    state.treasuryJobs.push({ id: id(77), workspaceId: ws, status: "TODO" });
    const intent = await prepare("ARCHIVE", { reason: "Close family" });
    await fails(
      async () =>
        service.executeAdminIntent(auth, ws, intent.id, await sign(intent)),
      409,
    );
    expect(state.familyAdminIntents[0].status).to.equal("PENDING");
    expect(state.familyAdminState[0].revision).to.equal(0);
  });
  it("exports only scoped transfers with exact wei, evidence hashes and CSV formula protection", async () => {
    state.treasuryTransfers.push(
      {
        id: "=formula",
        workspaceId: ws,
        amountWei: "100000000000000001",
        txHash: `0x${"a".repeat(64)}`,
        createdAt: new Date(),
      },
      { id: "PRIVATE", workspaceId: otherWs, createdAt: new Date() },
    );
    const intent = await prepare("EXPORT", {
      from: "2026-01-01",
      to: "2026-12-31",
    });
    const result = await service.executeAdminIntent(
      auth,
      ws,
      intent.id,
      await sign(intent),
    );
    expect(result.csv)
      .to.include("100000000000000001")
      .and.include("'=formula")
      .and.include(`0x${"a".repeat(64)}`)
      .and.not.include("PRIVATE");
  });
});
