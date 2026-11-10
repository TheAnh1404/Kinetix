import { expect } from "chai";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as viem from "viem";
import * as treasury from "../shared/treasury";
import { assert, uuidInput, textInput } from "../backend/src/auth/security";

describe("Project treasury accounting and receipt boundaries", () => {
  const ws = "00000000-0000-4000-8000-000000000001";
  const jarId = "00000000-0000-4000-8000-000000000002";
  const target = "00000000-0000-4000-8000-000000000003";
  const sender = `0x${"a".repeat(40)}`;
  const hash = `0x${"b".repeat(64)}`;
  const blockHash = `0x${"c".repeat(64)}`;
  const auth = { user: { id: "owner" }, wallet: { address: sender } };
  let service: any, state: any, rpc: any;
  const id = (n: number) =>
    `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const request = (kind = "DEPOSIT", n = 10, extra = {}) => ({
    requestId: id(n),
    kind,
    jarId,
    amount: "1",
    recipient: sender,
    destinationJarId: target,
    ...extra,
  });
  beforeEach(() => {
    state = {
      role: "ADMIN",
      workspace: ws,
      chain: 43113,
      jars: [
        {
          id: jarId,
          workspaceId: ws,
          name: "First",
          balanceWei: "2000000000000000000",
          reservedWei: "0",
        },
        {
          id: target,
          workspaceId: ws,
          name: "Second",
          balanceWei: "0",
          reservedWei: "0",
        },
      ],
      transfers: [],
      entries: [],
    };
    const column = (table: string, key: string) => ({ table, key });
    const tables: any = {};
    state.attempts = []; state.policies = []; state.jobs = [];
    for (const name of ["jars", "transfers", "entries", "attempts", "policies", "jobs"])
      tables[name] = new Proxy(
        { table: name },
        {
          get: (_obj, key) =>
            key === "table" ? name : column(name, String(key)),
        },
      );
    const eq = (col: any, value: any) => (row: any) => row[col.key] === value;
    const sql = (strings: TemplateStringsArray, ...values: any[]) => ({
      strings,
      values,
    });
    const evaluate = (value: any, row: any) => {
      if (!value?.strings) return value;
      const [col, amount] = value.values;
      const base = BigInt(row[col.key]);
      return (
        value.strings.join("").includes(" - ")
          ? base - BigInt(amount)
          : base + BigInt(amount)
      ).toString();
    };
    const store: any = {
      select: (projection: any) => {
        let table: any,
          filter = (_row: any) => true,
          order: any,
          limit = Infinity;
        const builder: any = {
          from: (t: any) => {
            table = t;
            return builder;
          },
          where: (f: any) => {
            filter = f;
            return builder;
          },
          orderBy: (o: any) => {
            order = o;
            return builder;
          },
          limit: (n: number) => {
            limit = n;
            return builder;
          },
          then: (resolve: any, reject: any) => {
            let rows = state[table.table]
              .filter(filter)
              .map((row: any) => ({ ...row }));
            if (order?.key === "nonce")
              rows.sort((a: any, b: any) =>
                Number(BigInt(b.nonce) - BigInt(a.nonce)),
              );
            rows = rows.slice(0, limit);
            if (projection)
              rows = rows.map((row: any) =>
                Object.fromEntries(
                  Object.entries(projection).map(([key, col]: any) => [
                    key,
                    row[col.key],
                  ]),
                ),
              );
            return Promise.resolve(rows).then(resolve, reject);
          },
        };
        return builder;
      },
      insert: (table: any) => ({
        values: (input: any) => {
          const rows = (Array.isArray(input) ? input : [input]).map(
            (row: any) => ({
              chainId: 43113,
              nonce: null,
              txHash: null,
              status: "READY",
              createdAt: new Date(),
              ...row,
            }),
          );
          state[table.table].push(...rows);
          const promise: any = Promise.resolve();
          promise.returning = async () => rows.map((row: any) => ({ ...row }));
          promise.onConflictDoNothing = () => promise;
          return promise;
        },
      }),
      update: (table: any) => ({
        set: (values: any) => ({
          where: async (filter: any) => {
            for (const row of state[table.table].filter(filter))
              for (const [key, value] of Object.entries(values))
                row[key] = evaluate(value, row);
          },
        }),
      }),
      execute: async () => {},
      transaction: async (action: any) => {
        const before = structuredClone(state);
        try {
          return await action(store);
        } catch (error) {
          state = before;
          throw error;
        }
      },
    };
    rpc = {
      getChainId: async () => state.chain,
      getTransactionCount: async () => 0,
      getTransaction: async () => state.transaction,
      getBlock: async () => ({
        number: 10n,
        hash: state.canonicalHash || blockHash,
      }),
      getTransactionReceipt: async () => state.receipt,
    };
    const code = ts.transpileModule(
      readFileSync("backend/src/services/treasuryService.ts", "utf8"),
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
        if (name === "drizzle-orm")
          return {
            eq,
            and:
              (...filters: any[]) =>
              (row: any) =>
                filters.every((f) => f(row)),
            desc: (col: any) => col,
            sql,
            isNotNull: (col: any) => (row: any) => row[col.key] !== null,
            inArray: (col: any, list: any[]) => (row: any) =>
              list.includes(row[col.key]),
          };
        if (name === "../db")
          return {
            db: store,
            treasuryJars: tables.jars,
            treasuryTransfers: tables.transfers,
            treasuryEntries: tables.entries,
            treasuryAttempts: tables.attempts,
            treasuryPolicies: tables.policies,
            treasuryJobs: tables.jobs,
          };
        if (name === "../auth/service")
          return {
            membership: async (_store: any, _auth: any, workspace: string) => {
              assert(workspace === state.workspace, 403, "Wrong workspace");
              return { role: state.role };
            },
          };
        if (name === "../auth/security")
          return { assert, uuidInput, textInput };
        if (name === "viem") return { ...viem, createPublicClient: () => rpc };
        if (name === "./familyAccess")
          return { requireWorkspaceWrites: async () => {} };
        if (name.includes("shared/treasury")) return treasury;
        throw new Error(`Unexpected import ${name}`);
      },
      module,
      module.exports,
    );
    service = module.exports;
  });
  const fails = async (action: () => Promise<unknown>, status: number) => {
    let error: any;
    try {
      await action();
    } catch (caught) {
      error = caught;
    }
    expect(error?.status).to.equal(status);
  };
  const receiptFor = (row: any, status = "success", blockNumber = 9n) => {
    state.transaction = {
      from: row.sender,
      to: row.recipient,
      value: BigInt(row.amountWei),
      input: treasury.treasuryMemo(row.id),
      nonce: Number(row.nonce),
    };
    state.receipt = { transactionHash: hash, status, blockNumber, blockHash };
  };
  it("accepts exact wei and rejects malformed, negative, zero and excess precision", () => {
    expect(treasury.treasuryAmount("0.000000000000000001")).to.equal(1n);
    for (const value of [
      "0",
      "-1",
      "1e3",
      "0.0000000000000000001",
      1,
      "Infinity",
    ])
      expect(() => treasury.treasuryAmount(value)).to.throw();
  });
  it("enforces administrator writes and workspace isolation", async () => {
    state.role = "GUARDIAN";
    await fails(() => service.createTreasuryJar(auth, ws, "Test"), 403);
    await fails(
      () => service.createTreasuryTransfer(auth, ws, request("WITHDRAW")),
      403,
    );
    await fails(
      () => service.createTreasuryTransfer(auth, id(99), request()),
      403,
    );
    expect(state.transfers).to.have.length(0);
  });
  it("creates deposits without credit until a successful finalized canonical receipt; replay is idempotent", async () => {
    const row = await service.createTreasuryTransfer(auth, ws, request());
    receiptFor(row, "success", 11n);
    await service.submitTreasuryHash(auth, row.id, hash);
    expect(state.entries).to.have.length(0);
    expect(state.jars[0].balanceWei).to.equal("2000000000000000000");
    state.receipt.blockNumber = 9n;
    await service.reconcileTreasuryTransfer(row.id);
    await service.reconcileTreasuryTransfer(row.id);
    await service.submitTreasuryHash(auth, row.id, hash);
    expect(state.entries).to.have.length(1);
    expect(state.jars[0].balanceWei).to.equal("3000000000000000000");
    expect(state.transfers[0].status).to.equal("CONFIRMED");
  });
  it("rejects wrong sender, recipient, amount, nonce and intent memo", async () => {
    const row = await service.createTreasuryTransfer(auth, ws, request());
    receiptFor(row);
    const original = { ...state.transaction };
    for (const patch of [
      { from: treasury.TREASURY_ADDRESS },
      { to: sender },
      { value: 2n },
      { nonce: 3 },
      { input: "0x" },
    ]) {
      state.transaction = { ...original, ...patch };
      await fails(() => service.submitTreasuryHash(auth, row.id, hash), 400);
    }
    expect(state.entries).to.have.length(0);
  });
  it("rejects mainnet RPC and noncanonical receipts", async () => {
    state.chain = 43114;
    await fails(() => service.createTreasuryTransfer(auth, ws, request()), 503);
    state.chain = 43113;
    const row = await service.createTreasuryTransfer(auth, ws, request());
    receiptFor(row);
    state.canonicalHash = hash;
    await fails(() => service.submitTreasuryHash(auth, row.id, hash), 409);
    expect(state.entries).to.have.length(0);
  });
  it("reserves withdrawals and prevents overdraw across multiple pending intents", async () => {
    await service.createTreasuryTransfer(auth, ws, request("WITHDRAW"));
    expect(state.jars[0].reservedWei).to.equal("1000000000000000000");
    await fails(
      () =>
        service.createTreasuryTransfer(
          auth,
          ws,
          request("WITHDRAW", 11, { amount: "1.1" }),
        ),
      409,
    );
    const second = await service.createTreasuryTransfer(
      auth,
      ws,
      request("WITHDRAW", 12),
    );
    expect(second.nonce).to.equal("1");
    expect(state.entries).to.have.length(0);
  });
  it("releases a reverted withdrawal reservation without debiting balance", async () => {
    const row = await service.createTreasuryTransfer(
      auth,
      ws,
      request("WITHDRAW"),
    );
    receiptFor(row, "reverted");
    await service.submitTreasuryHash(auth, row.id, hash);
    expect(state.jars[0].reservedWei).to.equal("0");
    expect(state.jars[0].balanceWei).to.equal("2000000000000000000");
    expect(state.entries).to.have.length(0);
    expect(state.transfers[0].status).to.equal("REVERTED");
  });
  it("posts a finalized withdrawal exactly once", async () => {
    const row = await service.createTreasuryTransfer(
      auth,
      ws,
      request("WITHDRAW"),
    );
    receiptFor(row);
    await service.submitTreasuryHash(auth, row.id, hash);
    await service.reconcileTreasuryTransfer(row.id);
    expect(state.jars[0].reservedWei).to.equal("0");
    expect(state.jars[0].balanceWei).to.equal("1000000000000000000");
    expect(state.entries[0].deltaWei).to.equal("-1000000000000000000");
  });
  it("requires a finalized same-nonce cancellation before releasing a withdrawal", async () => {
    const row = await service.createTreasuryTransfer(
      auth,
      ws,
      request("WITHDRAW"),
    );
    receiptFor(row, "success", 11n);
    state.transaction = {
      ...state.transaction,
      to: row.sender,
      value: 0n,
      input: treasury.treasuryCancelMemo(row.id),
    };
    await service.submitTreasuryHash(auth, row.id, hash);
    expect(state.jars[0].reservedWei).to.equal("1000000000000000000");
    state.receipt.blockNumber = 9n;
    await service.reconcileTreasuryTransfer(row.id);
    expect(state.transfers[0].status).to.equal("CANCELLED");
    expect(state.jars[0].reservedWei).to.equal("0");
    expect(state.jars[0].balanceWei).to.equal("2000000000000000000");
    expect(state.entries).to.have.length(0);
  });
  it("moves funds with balanced entries and idempotent request IDs", async () => {
    const body = request("INTERNAL");
    await service.createTreasuryTransfer(auth, ws, body);
    await service.createTreasuryTransfer(auth, ws, body);
    expect(state.entries).to.have.length(2);
    expect(
      state.entries.reduce(
        (sum: bigint, row: any) => sum + BigInt(row.deltaWei),
        0n,
      ),
    ).to.equal(0n);
    expect(state.jars[0].balanceWei).to.equal("1000000000000000000");
    expect(state.jars[1].balanceWei).to.equal("1000000000000000000");
    expect(state.transfers[0].txHash).to.equal(null);
    await fails(
      () =>
        service.createTreasuryTransfer(auth, ws, { ...body, amount: "0.5" }),
      409,
    );
  });
  it("tracks both hashes when a payment wins a race against cancellation", async () => {
    const row = await service.createTreasuryTransfer(
      auth,
      ws,
      request("WITHDRAW"),
    );
    receiptFor(row, "success", 11n);
    const payment = { ...state.transaction };
    await service.submitTreasuryHash(auth, row.id, hash);
    const cancelHash = `0x${"d".repeat(64)}`;
    state.transaction = {
      ...payment,
      to: row.sender,
      value: 0n,
      input: treasury.treasuryCancelMemo(row.id),
    };
    state.receipt = { ...state.receipt, transactionHash: cancelHash };
    await service.submitTreasuryHash(auth, row.id, cancelHash);
    expect(state.transfers[0].txHash).to.equal(cancelHash);
    rpc.getTransactionReceipt = async ({ hash: candidate }: any) => {
      if (candidate === hash)
        return {
          transactionHash: hash,
          blockNumber: 9n,
          blockHash,
          status: "success",
        };
      const error = new Error("not mined");
      error.name = "TransactionReceiptNotFoundError";
      throw error;
    };
    rpc.getTransaction = async () => payment;
    await service.reconcileTreasuryTransfer(row.id);
    expect(state.transfers[0].status).to.equal("CONFIRMED");
    expect(state.transfers[0].txHash).to.equal(hash);
    expect(state.jars[0].balanceWei).to.equal("1000000000000000000");
    expect(state.jars[0].reservedWei).to.equal("0");
    expect(state.entries).to.have.length(1);
  });
  it("rejects internal transfers to another workspace or the same jar", async () => {
    await fails(
      () =>
        service.createTreasuryTransfer(
          auth,
          ws,
          request("INTERNAL", 10, { destinationJarId: jarId }),
        ),
      400,
    );
    state.jars[1].workspaceId = id(99);
    await fails(
      () => service.createTreasuryTransfer(auth, ws, request("INTERNAL")),
      400,
    );
    expect(state.entries).to.have.length(0);
  });
  it("blocks generic spending and unallocated ROSCA deposits on policy jars", async () => {
    state.policies.push({ jarId, config: { kind: "SHIELD", beneficiaries: [], guardians: [] } });
    await fails(() => service.createTreasuryTransfer(auth, ws, request("INTERNAL")), 403);
    state.policies[0].config.kind = "ROSCA";
    await fails(() => service.createTreasuryTransfer(auth, ws, request("DEPOSIT")), 403);
    expect(state.entries).to.have.length(0);
  });
  it("does not expose another child's savings through the generic treasury overview", async () => {
    state.role = "CHILD";
    state.policies.push({ jarId: target, config: { kind: "SAVINGS", beneficiaries: ["other-child"], guardians: [] } });
    const overview = await service.treasuryOverview(auth, ws);
    expect(overview.jars.map((jar: any) => jar.id)).not.to.include(target);
    expect(overview.jars.map((jar: any) => jar.id)).to.include(jarId);
  });
});
