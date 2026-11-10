import { randomUUID } from "node:crypto";
import { strict as check } from "node:assert";
import { eq } from "drizzle-orm";
import type { AuthContext } from "../backend/src/auth/service";

const { assertIsolatedDatabase } = require("./auth-test-safety.cjs");
assertIsolatedDatabase(
  process.env.TEST_DATABASE_URL,
  process.env.DATABASE_URL,
  process.env.AUTH_TEST_ALLOW_RESET,
);
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.NODE_ENV = "test";
const {
  db,
  pool,
  users,
  userWallets,
  workspaces,
  workspaceMembers,
  treasuryJars,
  treasuryJobs,
  treasuryEntries,
  treasuryPolicies,
} = require("../backend/src/db") as typeof import("../backend/src/db");
const { applyDatabaseMigrations } =
  require("../backend/src/db/migrations") as typeof import("../backend/src/db/migrations");
const flow =
  require("../backend/src/services/treasuryWorkflowService") as typeof import("../backend/src/services/treasuryWorkflowService");
const { createTreasuryTransfer } =
  require("../backend/src/services/treasuryService") as typeof import("../backend/src/services/treasuryService");
async function rejects(action: () => Promise<unknown>, status: number) {
  await check.rejects(action, (error: any) => error.status === status);
}
async function main() {
  await applyDatabaseMigrations();
  const [workspace] = await db
    .insert(workspaces)
    .values({ name: `Treasury acceptance ${randomUUID()}` })
    .returning();
  const people: AuthContext[] = [];
  for (const [index, role] of (
    ["ADMIN", "GUARDIAN", "CHILD", "ELDERLY"] as const
  ).entries()) {
    const [user] = await db
      .insert(users)
      .values({ fullName: `Fixture ${role}`, role })
      .returning();
    const address = `0x${randomUUID().replace(/-/g, "")}${String(index).padStart(8, "0")}`;
    const [wallet] = await db
      .insert(userWallets)
      .values({ userId: user.id, address })
      .returning();
    await db
      .insert(workspaceMembers)
      .values({ workspaceId: workspace.id, userId: user.id, role });
    people.push({
      user,
      wallet,
      session: { kind: "full" },
      credential: { mustChangePassword: false },
    } as AuthContext);
  }
  const [admin, guardian, child, elder] = people;
  await db.update(workspaces).set({ creatorUserId: admin.user.id }).where(eq(workspaces.id, workspace.id));
  const config = (kind: string, beneficiaries: string[]) => ({
    requestId: randomUUID(),
    name: `Fixture ${kind}`,
    kind,
    beneficiaries,
    guardians: [admin.user.id, guardian.user.id],
    quorum: 2,
    dailyLimit: "2",
    contribution: "0.000123456789123456",
    durationSeconds: 60,
  });
  const shield = await flow.createPolicyJar(
    admin,
    workspace.id,
    config("SHIELD", [elder.user.id]),
  );
  const chores = await flow.createPolicyJar(
    admin,
    workspace.id,
    config("MILESTONE", [child.user.id]),
  );
  const savings = await flow.createPolicyJar(
    admin,
    workspace.id,
    config("SAVINGS", [child.user.id]),
  );
  await rejects(
    () =>
      flow.createPolicyJar(
        child,
        workspace.id,
        config("SHIELD", [child.user.id]),
      ),
    403,
  );
  await db
    .update(treasuryJars)
    .set({ balanceWei: "3000000000000000000" })
    .where(eq(treasuryJars.id, shield.id));
  await db
    .update(treasuryJars)
    .set({ balanceWei: "1000000000000000000" })
    .where(eq(treasuryJars.id, chores.id));
  const supportBody = {
    requestId: randomUUID(),
    amount: "1.5",
    title: "Thuốc và sinh hoạt",
  };
  const [a, b] = await Promise.all([
    flow.createWorkflowJob(elder, shield.id, supportBody),
    flow.createWorkflowJob(elder, shield.id, supportBody),
  ]);
  check.equal(a.id, b.id);
  check.equal(
    (
      await db.select().from(treasuryJars).where(eq(treasuryJars.id, shield.id))
    )[0].reservedWei,
    "1500000000000000000",
  );
  await rejects(
    () =>
      flow.createWorkflowJob(elder, shield.id, {
        requestId: randomUUID(),
        amount: "0.6",
      }),
    409,
  );
  await rejects(
    () =>
      createTreasuryTransfer(admin, workspace.id, {
        requestId: randomUUID(),
        kind: "INTERNAL",
        jarId: shield.id,
        destinationJarId: savings.id,
        amount: "0.1",
      }),
    403,
  );
  await flow.actWorkflowJob(admin, a.id, { action: "approve" });
  await rejects(
    () =>
      flow.actWorkflowJob(admin, a.id, {
        action: "pay",
        requestId: randomUUID(),
      }),
    403,
  );
  await flow.actWorkflowJob(guardian, a.id, { action: "approve" });
  check.equal(
    (await db.select().from(treasuryJobs).where(eq(treasuryJobs.id, a.id)))[0]
      .status,
    "APPROVED",
  );
  await flow.actWorkflowJob(admin, a.id, { action: "reject" });
  check.equal(
    (
      await db.select().from(treasuryJars).where(eq(treasuryJars.id, shield.id))
    )[0].reservedWei,
    "0",
  );
  const chore = await flow.createWorkflowJob(admin, chores.id, {
    requestId: randomUUID(),
    subjectId: child.user.id,
    amount: "0.2",
    title: "Sắp xếp góc học tập",
    description: "Gửi ảnh góc học tập sau khi hoàn thành.",
  });
  await rejects(
    () =>
      flow.actWorkflowJob(elder, chore.id, {
        action: "submit",
        proof: "not an image",
      }),
    403,
  );
  await rejects(
    () =>
      flow.actWorkflowJob(child, chore.id, {
        action: "submit",
        proof: "not an image",
      }),
    400,
  );
  // The PNG sanitizer has its own binary/CRC suite. Start this payment acceptance case after submission.
  await db
    .update(treasuryJobs)
    .set({ status: "SUBMITTED" })
    .where(eq(treasuryJobs.id, chore.id));
  await flow.actWorkflowJob(admin, chore.id, { action: "approve" });
  await flow.actWorkflowJob(guardian, chore.id, { action: "approve" });
  const payBody = {
    action: "pay",
    requestId: randomUUID(),
    destinationJarId: savings.id,
  };
  await flow.actWorkflowJob(admin, chore.id, payBody);
  await flow.actWorkflowJob(admin, chore.id, payBody).catch((error) => {
    check.equal(error.status, 403);
  });
  check.equal(
    (
      await db
        .select()
        .from(treasuryJars)
        .where(eq(treasuryJars.id, savings.id))
    )[0].balanceWei,
    "200000000000000000",
  );
  check.equal(
    (await db.select().from(treasuryEntries)).filter(
      (entry) => entry.jarId === savings.id,
    ).length,
    1,
  );
  await flow.saveSavingsGoal(child, savings.id, {
    name: "Xe đạp",
    amount: "1",
  });
  await rejects(
    () =>
      flow.saveSavingsGoal(elder, savings.id, { name: "Other", amount: "1" }),
    403,
  );
  const overview = await flow.workflowOverview(child, workspace.id);
  check(overview.jars.some((jar) => jar.id === savings.id));
  check(!overview.jars.some((jar) => jar.id === shield.id));
  const rosca = await flow.createPolicyJar(
    admin,
    workspace.id,
    config("ROSCA", [elder.user.id, child.user.id]),
  );
  const contribution = await flow.createWorkflowJob(elder, rosca.id, {
    requestId: randomUUID(),
    kind: "CONTRIBUTION",
  });
  check.equal(contribution.amountWei, "123456789123456");
  const duplicate = await flow.createWorkflowJob(elder, rosca.id, {
    requestId: randomUUID(),
    kind: "CONTRIBUTION",
  });
  check.equal(duplicate.id, contribution.id);
  await rejects(
    () =>
      flow.createWorkflowJob(admin, rosca.id, {
        requestId: randomUUID(),
        kind: "PAYOUT",
      }),
    409,
  );
  const [policy] = await db
    .select()
    .from(treasuryPolicies)
    .where(eq(treasuryPolicies.jarId, rosca.id));
  await db
    .update(treasuryPolicies)
    .set({
      config: {
        ...policy.config,
        roundStartedAt: new Date(Date.now() - 120000).toISOString(),
      },
    })
    .where(eq(treasuryPolicies.jarId, rosca.id));
  await rejects(
    () =>
      flow.createWorkflowJob(admin, rosca.id, {
        requestId: randomUUID(),
        kind: "PAYOUT",
      }),
    409,
  );
  console.log(
    "Treasury PostgreSQL acceptance passed: policy permissions, concurrent idempotency, daily limits, reservations, quorum, generic bypass, internal reward, savings ownership, ROSCA exact contribution and readiness.",
  );
}
main()
  .catch((error: any) => {
    console.error("Treasury acceptance failed:", error.code || error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
