import { expect } from "chai";
import {
  exactContribution,
  businessLabels,
  paymentLabels,
} from "../shared/vaultExperience";
import { treasuryAmount } from "../shared/treasury";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { assert, uuidInput, textInput } from "../backend/src/auth/security";
describe("Vault experience exact amounts and truthful state vocabulary", () => {
  it("preserves ROSCA contributions beyond three decimals and one wei", () => {
    for (const wei of ["1", "123456789123456", "123456789123456789123456789"])
      expect(treasuryAmount(exactContribution(wei)).toString()).to.equal(wei);
  });
  it("keeps approval and payment states distinct", () => {
    expect(businessLabels.APPROVED).to.equal("Đã đủ duyệt");
    expect(businessLabels.PAID).to.equal("Đã hoàn tất");
    expect(paymentLabels.READY).to.equal("Chờ ký Core");
    expect(paymentLabels.SUBMITTED).not.to.equal(paymentLabels.CONFIRMED);
  });
});

describe("Treasury workflow service authorization and business transitions", () => {
  const id = (n: number) =>
    `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const wallet = `0x${"a".repeat(40)}`;
  const auth = { user: { id: id(1) }, wallet: { address: wallet } };
  let state: any, service: any;
  beforeEach(() => {
    state = {
      role: "GUARDIAN",
      rows: [],
      writes: [],
      transfers: [],
      jar: {
        id: id(5),
        workspaceId: id(9),
        balanceWei: "1000000000000000000",
        reservedWei: "200000000000000000",
      },
      policy: {
        kind: "MILESTONE",
        beneficiaries: [id(3)],
        guardians: [id(1), id(2)],
        quorum: 2,
        dailyLimitWei: "1000000000000000000",
        contributionWei: "123456789123456",
        durationSeconds: 60,
        round: 0,
        roundStartedAt: new Date(Date.now() - 120000).toISOString(),
      },
      people: [
        { id: id(1), role: "GUARDIAN", wallet },
        { id: id(2), role: "GUARDIAN", wallet: `0x${"b".repeat(40)}` },
        { id: id(3), role: "CHILD", wallet },
      ],
    };
    const tables: any = {};
    for (const name of [
      "treasuryJars",
      "treasuryPolicies",
      "treasuryJobs",
      "treasuryAudit",
      "treasuryTransfers",
      "users",
      "userWallets",
      "workspaceMembers",
    ])
      tables[name] = new Proxy(
        { name },
        {
          get: (_target, key) =>
            key === "name" ? name : `${name}.${String(key)}`,
        },
      );
    const store: any = {
      execute: async () => {},
      select: () => {
        const builder: any = {
          from: () => builder,
          where: () => builder,
          innerJoin: () => builder,
          leftJoin: () => builder,
          orderBy: () => builder,
          limit: () => builder,
          then: (resolve: any, reject: any) =>
            Promise.resolve(state.rows.shift() || []).then(resolve, reject),
        };
        return builder;
      },
      update: (table: any) => ({
        set: (values: any) => ({
          where: async () => {
            state.writes.push({ table: table.name, values });
          },
        }),
      }),
      insert: (table: any) => ({
        values: (values: any) => {
          state.writes.push({ table: table.name, values });
          const promise: any = Promise.resolve();
          promise.returning = async () => [{ approvals: [], ...values }];
          return promise;
        },
      }),
      transaction: async (action: any) => {
        const length = state.writes.length;
        try {
          return await action(store);
        } catch (error) {
          state.writes.splice(length);
          throw error;
        }
      },
    };
    const code = ts.transpileModule(
      readFileSync("backend/src/services/treasuryWorkflowService.ts", "utf8"),
      {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.CommonJS,
        },
      },
    ).outputText;
    const module = { exports: {} };
    new Function("require", "module", "exports", code)(
      (name: string) => {
        if (name === "node:crypto") return require("node:crypto");
        if (name === "drizzle-orm")
          return {
            eq() {},
            and() {},
            isNull() {},
            desc() {},
            sql: (strings: unknown, ...values: unknown[]) => ({
              strings,
              values,
            }),
          };
        if (name === "../db") return { db: store, ...tables };
        if (name === "../auth/service")
          return { membership: async () => ({ role: state.role }) };
        if (name === "../auth/security")
          return { assert, uuidInput, textInput };
        if (name.includes("shared/treasury"))
          return require("../shared/treasury");
        if (name === "./proofImage")
          return require("../backend/src/services/proofImage");
        if (name === "viem") return require("viem");
        if (name === "./treasuryService")
          return {
            createTreasuryTransfer: async (...args: any[]) => {
              state.transfers.push(args);
              return {
                id: id(20),
                status: state.internal ? "CONFIRMED" : "READY",
              };
            },
          };
        if (name === "./familyAccess")
          return { requireWorkspaceWrites: async () => {} };
        throw new Error(`Unexpected import ${name}`);
      },
      module,
      module.exports,
    );
    service = module.exports;
  });
  const job = (extra = {}) => ({
    id: id(10),
    jarId: id(5),
    workspaceId: id(9),
    subjectId: id(3),
    recipient: wallet,
    amountWei: "200000000000000000",
    approvals: [],
    status: "SUBMITTED",
    kind: "CHORE",
    round: null,
    transferId: null,
    description: "Task",
    ...extra,
  });
  const actionRows = (row: any) =>
    state.rows.push(
      [row],
      [state.jar],
      [{ config: state.policy }],
      state.people,
    );
  const failure = async (action: () => Promise<unknown>, status: number) => {
    let error: any;
    try {
      await action();
    } catch (caught) {
      error = caught;
    }
    expect(error?.status).to.equal(status);
    expect(state.writes).to.have.length(0);
  };
  it("does not count a guardian twice and keeps an insufficient quorum pending", async () => {
    actionRows(job({ approvals: [auth.user.id] }));
    await service.actWorkflowJob(auth, id(10), { action: "approve" });
    const values = state.writes.find(
      (write: any) => write.table === "treasuryJobs",
    ).values;
    expect(values.approvals).to.deep.equal([auth.user.id]);
    expect(values.status).to.equal("SUBMITTED");
  });
  it("moves a submitted task to approved only at its configured quorum", async () => {
    actionRows(job({ approvals: [id(2)] }));
    await service.actWorkflowJob(auth, id(10), { action: "approve" });
    expect(state.writes[0].values.status).to.equal("APPROVED");
  });
  it("rejects payment before approval", async () => {
    actionRows(job());
    await failure(
      () =>
        service.actWorkflowJob(auth, id(10), {
          action: "pay",
          requestId: id(20),
        }),
      403,
    );
  });
  it("revalidates active reviewers at payment time", async () => {
    state.people = state.people.filter((person: any) => person.id !== id(2));
    actionRows(job({ status: "APPROVED", approvals: [id(1), id(2)] }));
    await failure(
      () =>
        service.actWorkflowJob(auth, id(10), {
          action: "pay",
          requestId: id(20),
        }),
      409,
    );
  });
  it("rejects the old recipient after the beneficiary wallet changes", async () => {
    state.people[2].wallet = `0x${"c".repeat(40)}`;
    actionRows(job({ status: "APPROVED", approvals: [id(1), id(2)] }));
    await failure(
      () =>
        service.actWorkflowJob(auth, id(10), {
          action: "pay",
          requestId: id(20),
        }),
      409,
    );
  });
  it("prepares exactly the approved amount and recipient without marking it paid", async () => {
    actionRows(job({ status: "APPROVED", approvals: [id(1), id(2)] }));
    await service.actWorkflowJob(auth, id(10), {
      action: "pay",
      requestId: id(20),
    });
    expect(state.transfers[0][2]).to.include({
      amount: "0.2",
      recipient: wallet,
      kind: "WITHDRAW",
    });
    expect(
      state.writes.find((write: any) => write.values.transferId)?.values.status,
    ).to.equal("PAYING");
  });
  it("rejects reward allocation to another child's savings jar", async () => {
    actionRows(job({ status: "APPROVED", approvals: [id(1), id(2)] }));
    state.rows.push([{ config: { kind: "SAVINGS", beneficiaries: [id(4)] } }]);
    await failure(
      () =>
        service.actWorkflowJob(auth, id(10), {
          action: "pay",
          requestId: id(20),
          destinationJarId: id(30),
        }),
      403,
    );
    expect(state.transfers).to.have.length(0);
  });
  it("requires assignee identity and valid private proof to submit", async () => {
    actionRows(job({ status: "TODO" }));
    await failure(
      () =>
        service.actWorkflowJob(auth, id(10), {
          action: "submit",
          proof: "invalid",
        }),
      403,
    );
    actionRows(job({ status: "TODO", subjectId: auth.user.id }));
    await failure(
      () =>
        service.actWorkflowJob(auth, id(10), {
          action: "submit",
          proof: "invalid",
        }),
      400,
    );
  });
  it("does not release a reservation twice after rejection", async () => {
    actionRows(job({ status: "REJECTED" }));
    await failure(
      () => service.actWorkflowJob(auth, id(10), { action: "reject" }),
      403,
    );
  });
  it("requires a fresh daily-limit check after a support request was cancelled", async () => {
    actionRows(
      job({
        kind: "SUPPORT",
        status: "CANCELLED",
        transferId: id(19),
        approvals: [id(1), id(2)],
      }),
    );
    await failure(
      () =>
        service.actWorkflowJob(auth, id(10), {
          action: "pay",
          requestId: id(20),
        }),
      409,
    );
    expect(state.transfers).to.have.length(0);
  });
  it("blocks preparing an expired support request before touching reservations", async () => {
    actionRows(
      job({
        kind: "SUPPORT",
        status: "APPROVED",
        approvals: [id(1), id(2)],
        createdAt: new Date(Date.now() - 49 * 3600000),
      }),
    );
    await failure(
      () =>
        service.actWorkflowJob(auth, id(10), {
          action: "pay",
          requestId: id(20),
        }),
      409,
    );
  });
  it("keeps returned work reserved and resets approvals", async () => {
    actionRows(job({ approvals: [id(2)] }));
    await service.actWorkflowJob(auth, id(10), {
      action: "return",
      note: "Con xếp lại sách nhé",
    });
    expect(state.writes[0].values.status).to.equal("RETURNED");
    expect(state.writes[0].values.approvals).to.deep.equal([]);
    expect(
      state.writes.some((write: any) => write.table === "treasuryJars"),
    ).to.equal(false);
  });
  it("denies a different child access to private proof even in the same jar", async () => {
    state.role = "CHILD";
    state.policy.beneficiaries = [auth.user.id, id(3)];
    actionRows(job({ proof: "data:image/png;base64,AAAA", proofExpiresAt: new Date(Date.now() + 10000) }));
    await failure(() => service.readTreasuryProof(auth, id(10)), 403);
  });
  it("does not serve proof after its retention window", async () => {
    actionRows(job({ proof: "data:image/png;base64,AAAA", proofExpiresAt: new Date(Date.now() - 1000) }));
    await failure(() => service.readTreasuryProof(auth, id(10)), 404);
  });
});
