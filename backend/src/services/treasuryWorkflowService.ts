import { randomUUID } from "node:crypto";
import {
  and,
  eq,
  isNull,
  desc,
  sql,
  lt,
  inArray,
  getTableColumns,
  isNotNull,
} from "drizzle-orm";
import {
  db,
  treasuryJars as jars,
  treasuryPolicies as policies,
  treasuryJobs as jobs,
  treasuryAudit as audit,
  treasuryTransfers as transfers,
  users,
  userWallets,
  workspaceMembers,
} from "../db";
import { AuthContext, membership } from "../auth/service";
import { assert, uuidInput, textInput } from "../auth/security";
import { treasuryAmount } from "../../../shared/treasury";
import { TreasuryPolicy } from "../../../shared/vaultExperience";
import { createTreasuryTransfer } from "./treasuryService";
import { requireWorkspaceWrites } from "./familyAccess";

type Store = Parameters<Parameters<typeof db.transaction>[0]>[0];
const lock = (tx: Store) =>
  tx.execute(
    sql`select pg_advisory_xact_lock(hashtext('kinetix:fuji-treasury'))`,
  );
const event = (
  tx: Store,
  auth: AuthContext,
  workspaceId: string,
  entityId: string,
  action: string,
) =>
  tx
    .insert(audit)
    .values({ actorId: auth.user.id, workspaceId, entityId, action });
const available = (jar: typeof jars.$inferSelect) =>
  BigInt(jar.balanceWei) - BigInt(jar.reservedWei);
function amount(input: unknown) {
  try {
    return treasuryAmount(input).toString();
  } catch (error) {
    assert(false, 400, (error as Error).message);
  }
}
async function roster(tx: typeof db | Store, workspaceId: string) {
  return tx
    .select({
      id: users.id,
      name: users.fullName,
      avatar: users.avatarUrl,
      role: workspaceMembers.role,
      wallet: userWallets.address,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .leftJoin(userWallets, eq(userWallets.userId, users.id))
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        isNull(workspaceMembers.accessDisabledAt),
        isNull(users.suspendedAt),
      ),
    );
}
async function scope(tx: Store, auth: AuthContext, jarId: string) {
  const [jar] = await tx
    .select()
    .from(jars)
    .where(eq(jars.id, uuidInput(jarId)));
  assert(jar, 404, "Không tìm thấy hũ.");
  const member = await membership(tx, auth, jar.workspaceId);
  const [policy] = await tx
    .select()
    .from(policies)
    .where(eq(policies.jarId, jar.id));
  assert(policy, 409, "Hũ chưa có chính sách nghiệp vụ.");
  const people = await roster(tx, jar.workspaceId);
  const reviewer =
    policy.config.guardians.includes(auth.user.id) &&
    ["ADMIN", "GUARDIAN"].includes(member.role);
  assert(
    member.role === "ADMIN" ||
      reviewer ||
      policy.config.beneficiaries.includes(auth.user.id),
    403,
    "Bạn không có quyền trên hũ này.",
  );
  return { jar, policy: policy.config, member, people, reviewer };
}
async function reserve(tx: Store, jar: typeof jars.$inferSelect, wei: string) {
  assert(
    available(jar) >= BigInt(wei),
    409,
    "Hũ không đủ tiền khả dụng để giữ chỗ.",
  );
  await tx
    .update(jars)
    .set({ reservedWei: sql`${jars.reservedWei} + ${wei}` })
    .where(eq(jars.id, jar.id));
}
export async function createPolicyJar(
  auth: AuthContext,
  workspaceId: string,
  body: any,
) {
  return db.transaction(async (tx) => {
    await lock(tx);
    await requireWorkspaceWrites(tx, workspaceId);
    assert(
      (await membership(tx, auth, uuidInput(workspaceId))).role === "ADMIN",
      403,
      "Chỉ admin được tạo hũ nghiệp vụ.",
    );
    const requestId = uuidInput(body.requestId);
    const [existing] = await tx
      .select()
      .from(jars)
      .where(eq(jars.id, requestId));
    if (existing) {
      assert(
        existing.workspaceId === workspaceId &&
          existing.createdBy === auth.user.id &&
          existing.name === body.name?.trim(),
        409,
        "Mã tạo hũ đã được dùng.",
      );
      return existing;
    }
    assert(
      ["SHIELD", "MILESTONE", "ROSCA", "SAVINGS"].includes(body.kind),
      400,
      "Loại hũ không hợp lệ.",
    );
    const people = await roster(tx, workspaceId);
    const beneficiaries: string[] = [
      ...new Set<string>(
        (body.beneficiaries || []).map((id: string) => uuidInput(id)),
      ),
    ];
    const guardians: string[] = [
      ...new Set<string>(
        (body.guardians || []).map((id: string) => uuidInput(id)),
      ),
    ];
    assert(
      beneficiaries.length > 0 &&
        beneficiaries.length <= 50 &&
        beneficiaries.every((id) =>
          people.some((p) => p.id === id && p.wallet),
        ),
      400,
      "Người thụ hưởng phải có ví và còn trong không gian (tối đa 50).",
    );
    assert(
      body.kind !== "SAVINGS" || beneficiaries.length === 1,
      400,
      "Mỗi heo đất thuộc một người.",
    );
    assert(
      guardians.length > 0 &&
        guardians.every((id) =>
          people.some(
            (p) => p.id === id && ["ADMIN", "GUARDIAN"].includes(p.role),
          ),
        ),
      400,
      "Chọn người duyệt có quyền admin hoặc guardian.",
    );
    const quorum = Number(body.quorum);
    assert(
      Number.isInteger(quorum) && quorum >= 1 && quorum <= guardians.length,
      400,
      "Ngưỡng duyệt phải từ 1 đến số người duyệt.",
    );
    const durationSeconds = Number(body.durationSeconds || 86400);
    assert(
      Number.isInteger(durationSeconds) &&
        durationSeconds >= 60 &&
        durationSeconds <= 366 * 86400,
      400,
      "Kỳ góp phải từ một phút đến 366 ngày.",
    );
    const config: TreasuryPolicy = {
      kind: body.kind,
      beneficiaries,
      guardians,
      quorum,
      dailyLimitWei: amount(body.dailyLimit || "1"),
      contributionWei: amount(body.contribution || "0.01"),
      durationSeconds,
      round: 0,
      roundStartedAt: new Date().toISOString(),
      goalName: "",
      goalWei: "0",
    };
    const [jar] = await tx
      .insert(jars)
      .values({
        id: requestId,
        workspaceId,
        name: textInput(body.name, 100),
        createdBy: auth.user.id,
      })
      .returning();
    await tx.insert(policies).values({ jarId: jar.id, config });
    await event(tx, auth, workspaceId, jar.id, `CREATE_${config.kind}`);
    return jar;
  });
}
export async function workflowOverview(auth: AuthContext, workspaceId: string) {
  const member = await membership(db, auth, uuidInput(workspaceId));
  const people = await roster(db, workspaceId);
  const rows = await db
    .select({ jar: jars, policy: policies.config })
    .from(jars)
    .innerJoin(policies, eq(policies.jarId, jars.id))
    .where(eq(jars.workspaceId, workspaceId));
  const visible = rows.filter(
    ({ policy }) =>
      member.role === "ADMIN" ||
      policy.beneficiaries.includes(auth.user.id) ||
      policy.guardians.includes(auth.user.id),
  );
  const { proof: _privateProof, ...jobColumns } = getTableColumns(jobs);
  const allJobs = await db
    .select({
      ...jobColumns,
      hasProof: sql<boolean>`${jobs.proof} IS NOT NULL AND ${jobs.proofExpiresAt} > now()`,
    })
    .from(jobs)
    .where(eq(jobs.workspaceId, workspaceId))
    .orderBy(desc(jobs.createdAt));
  const allTransfers = await db
    .select()
    .from(transfers)
    .where(eq(transfers.workspaceId, workspaceId));
  const today = new Date().toISOString().slice(0, 10);
  const data = visible.map(({ jar, policy }) => {
    const reviewer =
      policy.guardians.includes(auth.user.id) &&
      ["ADMIN", "GUARDIAN"].includes(member.role);
    const visibleJobs = allJobs.filter(
      (job) =>
        job.jarId === jar.id &&
        (member.role === "ADMIN" ||
          reviewer ||
          job.subjectId === auth.user.id ||
          policy.kind === "ROSCA"),
    );
    const spent = allJobs
      .filter(
        (job) =>
          job.jarId === jar.id &&
          job.subjectId === auth.user.id &&
          job.kind === "SUPPORT" &&
          job.createdAt.toISOString().startsWith(today) &&
          !["CANCELLED", "REJECTED", "EXPIRED"].includes(job.status),
      )
      .reduce((sum, row) => sum + BigInt(row.amountWei), 0n);
    return {
      ...jar,
      policy,
      availableWei: available(jar).toString(),
      remainingTodayWei: (BigInt(policy.dailyLimitWei) > spent
        ? BigInt(policy.dailyLimitWei) - spent
        : 0n
      ).toString(),
      reviewer,
      beneficiary: policy.beneficiaries.includes(auth.user.id),
      activity: allTransfers
        .filter(
          (transfer) =>
            transfer.jarId === jar.id || transfer.destinationJarId === jar.id,
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      jobs: visibleJobs.map((job) => ({
        ...job,
        proof: null,
        hasProof:
          job.hasProof &&
          (job.subjectId === auth.user.id ||
            reviewer ||
            member.role === "ADMIN"),
        payment:
          allTransfers.find((transfer) => transfer.id === job.transferId) ||
          null,
      })),
    };
  });
  const history = await db
    .select()
    .from(audit)
    .where(eq(audit.workspaceId, workspaceId))
    .orderBy(desc(audit.createdAt))
    .limit(200);
  const ids = new Set(
    data.flatMap((jar) => [jar.id, ...jar.jobs.map((job) => job.id)]),
  );
  return {
    userId: auth.user.id,
    canManage: member.role === "ADMIN",
    people,
    jars: data,
    audit: history.filter((row) => ids.has(row.entityId)),
    checkedAt: new Date().toISOString(),
  };
}
export async function createWorkflowJob(
  auth: AuthContext,
  jarId: string,
  body: any,
) {
  return db.transaction(async (tx) => {
    await lock(tx);
    const { jar, policy, reviewer, people } = await scope(tx, auth, jarId);
    assert(!jar.isArchived, 409, "Hũ đã được lưu trữ.");
    const id = uuidInput(body.requestId);
    const [previous] = await tx.select().from(jobs).where(eq(jobs.id, id));
    if (previous) {
      assert(
        previous.jarId === jar.id &&
          previous.createdBy === auth.user.id &&
          (!body.amount || previous.amountWei === amount(body.amount)) &&
          (!body.title || previous.title === body.title.trim()) &&
          (!body.subjectId || previous.subjectId === body.subjectId),
        409,
        "Mã yêu cầu đã được sử dụng với nội dung khác.",
      );
      return previous;
    }
    const kind =
      policy.kind === "ROSCA"
        ? body.kind === "PAYOUT"
          ? "PAYOUT"
          : "CONTRIBUTION"
        : policy.kind === "MILESTONE"
          ? "CHORE"
          : "SUPPORT";
    const subjectId =
      kind === "CHORE"
        ? uuidInput(body.subjectId)
        : kind === "PAYOUT"
          ? policy.beneficiaries[policy.round]
          : auth.user.id;
    const subject = people.find((person) => person.id === subjectId);
    assert(
      subject?.wallet && policy.beneficiaries.includes(subjectId),
      403,
      "Người nhận chưa có ví hoặc không được cấp quyền.",
    );
    const jobRows = await tx.select().from(jobs).where(eq(jobs.jarId, jar.id));
    await requireWorkspaceWrites(tx, jar.workspaceId, kind !== "CONTRIBUTION");
    let wei =
      kind === "CONTRIBUTION"
        ? policy.contributionWei
        : kind === "PAYOUT"
          ? (
              BigInt(policy.contributionWei) *
              BigInt(policy.beneficiaries.length)
            ).toString()
          : amount(body.amount);
    if (kind === "CHORE")
      assert((await membership(tx, auth, jar.workspaceId)).role === "ADMIN", 403, "Chỉ chủ nhà được giao việc.");
    if (kind === "SUPPORT") {
      const today = new Date().toISOString().slice(0, 10);
      const used = jobRows
        .filter(
          (j) =>
            j.kind === "SUPPORT" &&
            j.subjectId === subjectId &&
            j.createdAt.toISOString().startsWith(today) &&
            !["CANCELLED", "REJECTED", "EXPIRED"].includes(j.status),
        )
        .reduce((sum, j) => sum + BigInt(j.amountWei), 0n);
      assert(
        used + BigInt(wei) <= BigInt(policy.dailyLimitWei),
        409,
        "Yêu cầu vượt hạn mức trong ngày (UTC).",
      );
    }
    if (kind === "CONTRIBUTION" || kind === "PAYOUT") {
      assert(
        policy.round < policy.beneficiaries.length,
        409,
        "Chu kỳ đã kết thúc.",
      );
      const existing = jobRows.find(
        (j) =>
          j.kind === kind &&
          j.round === policy.round &&
          (kind === "PAYOUT" || j.subjectId === subjectId),
      );
      if (existing) {
        assert(existing.status !== "PAID", 409, "Khoản kỳ này đã hoàn tất.");
        if (kind === "PAYOUT" && existing.status === "REJECTED") {
          assert(
            reviewer &&
              Date.now() >=
                Date.parse(policy.roundStartedAt) +
                  policy.durationSeconds * 1000 &&
              policy.beneficiaries.every((person) =>
                jobRows.some(
                  (j) =>
                    j.kind === "CONTRIBUTION" &&
                    j.round === policy.round &&
                    j.subjectId === person &&
                    j.status === "PAID",
                ),
              ),
            409,
            "Kỳ chưa đủ điều kiện mở lại yêu cầu chi.",
          );
          await reserve(tx, jar, existing.amountWei);
          const [reopened] = await tx
            .update(jobs)
            .set({ status: "PENDING", approvals: [], transferId: null })
            .where(eq(jobs.id, existing.id))
            .returning();
          await event(tx, auth, jar.workspaceId, existing.id, "REOPEN_PAYOUT");
          return reopened;
        }
        return existing;
      }
    }
    if (kind === "PAYOUT") {
      assert(reviewer, 403, "Chỉ người duyệt được đề nghị giải ngân.");
      assert(
        Date.now() >=
          Date.parse(policy.roundStartedAt) + policy.durationSeconds * 1000,
        409,
        "Chưa đến thời điểm giải ngân.",
      );
      assert(
        policy.beneficiaries.every((person) =>
          jobRows.some(
            (j) =>
              j.kind === "CONTRIBUTION" &&
              j.round === policy.round &&
              j.subjectId === person &&
              j.status === "PAID",
          ),
        ),
        409,
        "Chưa đủ thành viên góp kỳ này.",
      );
    }
    if (kind !== "CONTRIBUTION") await reserve(tx, jar, wei);
    const [job] = await tx
      .insert(jobs)
      .values({
        id,
        workspaceId: jar.workspaceId,
        jarId,
        subjectId,
        kind,
        title: textInput(
          body.title ||
            (kind === "SUPPORT"
              ? "Yêu cầu nhận tiền"
              : kind === "PAYOUT"
                ? "Chi trả kỳ họ hụi"
                : "Góp kỳ họ hụi"),
          160,
        ),
        description:
          typeof body.description === "string"
            ? body.description.slice(0, 2000)
            : "",
        amountWei: wei,
        recipient: subject.wallet.toLowerCase(),
        status:
          kind === "CHORE"
            ? "TODO"
            : kind === "CONTRIBUTION"
              ? "APPROVED"
              : "PENDING",
        round: policy.kind === "ROSCA" ? policy.round : null,
        createdBy: auth.user.id,
      })
      .returning();
    await event(tx, auth, jar.workspaceId, id, `CREATE_${kind}`);
    return job;
  });
}
export async function actWorkflowJob(auth: AuthContext, id: string, body: any) {
  return db.transaction(async (tx) => {
    await lock(tx);
    const [job] = await tx
      .select()
      .from(jobs)
      .where(eq(jobs.id, uuidInput(id)));
    assert(job, 404, "Không tìm thấy yêu cầu.");
    const { jar, policy, reviewer, people } = await scope(tx, auth, job.jarId);
    if (
      ["approve", "pay"].includes(body.action) &&
      job.kind === "SUPPORT" &&
      !job.transferId
    )
      assert(
        job.createdAt.getTime() + 48 * 3600000 > Date.now(),
        409,
        "Yêu cầu đã hết hạn 48 giờ. Khoản giữ chỗ sẽ được tự động giải phóng.",
      );
    if (body.action === "pay" && job.status === "PAID" && job.transferId) {
      assert(
        reviewer ||
          (job.kind === "CONTRIBUTION" && job.subjectId === auth.user.id),
        403,
        "Không có quyền xem khoản thanh toán.",
      );
      return (
        await tx
          .select()
          .from(transfers)
          .where(eq(transfers.id, job.transferId))
      )[0];
    }
    if (body.action === "submit") {
      assert(
        job.kind === "CHORE" &&
          job.subjectId === auth.user.id &&
          ["TODO", "RETURNED"].includes(job.status),
        403,
        "Bạn không thể nộp việc này.",
      );
      const { sanitizeProofImage } = await import("./proofImage");
      const proof = sanitizeProofImage(body.proof);
      await tx
        .update(jobs)
        .set({
          status: "SUBMITTED",
          proof: `data:image/png;base64,${proof}`,
          proofExpiresAt: new Date(Date.now() + 7 * 86400000),
          approvals: [],
        })
        .where(eq(jobs.id, id));
    } else if (body.action === "approve") {
      assert(
        reviewer && ["PENDING", "SUBMITTED", "APPROVED"].includes(job.status),
        403,
        "Không thể duyệt yêu cầu này.",
      );
      const approvals = [...new Set([...job.approvals, auth.user.id])];
      await tx
        .update(jobs)
        .set({
          approvals,
          status: approvals.length >= policy.quorum ? "APPROVED" : job.status,
        })
        .where(eq(jobs.id, id));
    } else if (body.action === "return") {
      assert(
        reviewer && job.kind === "CHORE" && job.status === "SUBMITTED",
        403,
        "Không thể yêu cầu làm lại.",
      );
      await tx
        .update(jobs)
        .set({
          status: "RETURNED",
          approvals: [],
          description: `${job.description}\nGóp ý: ${textInput(body.note, 500)}`,
        })
        .where(eq(jobs.id, id));
    } else if (body.action === "reject" || body.action === "cancel") {
      assert(
        (reviewer ||
          (body.action === "cancel" &&
            job.kind === "SUPPORT" &&
            job.subjectId === auth.user.id)) &&
          ["PENDING", "TODO", "RETURNED", "SUBMITTED", "APPROVED"].includes(
            job.status,
          ) &&
          !job.transferId,
        403,
        "Yêu cầu đã thanh toán hoặc bạn không có quyền.",
      );
      assert(
        job.kind !== "CONTRIBUTION",
        400,
        "Dùng giao dịch hủy cho khoản góp.",
      );
      await tx
        .update(jars)
        .set({ reservedWei: sql`${jars.reservedWei} - ${job.amountWei}` })
        .where(eq(jars.id, jar.id));
      await tx
        .update(jobs)
        .set({
          status: body.action === "cancel" ? "CANCELLED" : "REJECTED",
          proof: null,
        })
        .where(eq(jobs.id, id));
    } else if (body.action === "pay") {
      assert(!jar.isArchived, 409, "Hũ đã lưu trữ.");
      await requireWorkspaceWrites(tx, jar.workspaceId, job.kind !== "CONTRIBUTION");
      assert(
        !(job.kind === "SUPPORT" && job.status === "CANCELLED"),
        409,
        "Yêu cầu hỗ trợ đã hủy. Tạo yêu cầu mới để kiểm tra lại hạn mức ngày.",
      );
      assert(
        (reviewer ||
          (job.kind === "CONTRIBUTION" && job.subjectId === auth.user.id)) &&
          ["APPROVED", "PAYING", "CANCELLED"].includes(job.status),
        403,
        "Yêu cầu chưa đủ duyệt.",
      );
      if (job.transferId && job.status !== "CANCELLED")
        return (
          await tx
            .select()
            .from(transfers)
            .where(eq(transfers.id, job.transferId))
        )[0];
      assert(
        job.kind === "CONTRIBUTION" ||
          job.approvals.filter(
            (id) =>
              policy.guardians.includes(id) &&
              people.some(
                (p) => p.id === id && ["ADMIN", "GUARDIAN"].includes(p.role),
              ),
          ).length >= policy.quorum,
        409,
        "Chưa đủ người duyệt đang hoạt động.",
      );
      assert(
        people.some(
          (p) =>
            p.id === job.subjectId && p.wallet?.toLowerCase() === job.recipient,
        ),
        409,
        "Ví người nhận đã thay đổi. Cần tạo yêu cầu mới để đối soát.",
      );
      assert(
        job.round === null || job.round === policy.round,
        409,
        "Kỳ họ hụi đã thay đổi.",
      );
      if (job.status === "CANCELLED" && job.kind !== "CONTRIBUTION")
        await reserve(tx, jar, job.amountWei);
      await tx
        .update(jobs)
        .set({ status: "APPROVED", transferId: null })
        .where(eq(jobs.id, id));
      if (job.kind !== "CONTRIBUTION")
        await tx
          .update(jars)
          .set({ reservedWei: sql`${jars.reservedWei} - ${job.amountWei}` })
          .where(eq(jars.id, jar.id));
      const transferId = uuidInput(body.requestId);
      let destinationJarId: string | undefined;
      if (body.destinationJarId) {
        assert(
          job.kind === "CHORE",
          400,
          "Chỉ thưởng việc nhà được phân bổ vào heo đất.",
        );
        const [target] = await tx
          .select()
          .from(policies)
          .where(eq(policies.jarId, uuidInput(body.destinationJarId)));
        assert(
          target?.config.kind === "SAVINGS" &&
            target.config.beneficiaries.length === 1 &&
            target.config.beneficiaries[0] === job.subjectId,
          403,
          "Heo đất phải thuộc trẻ được nhận thưởng.",
        );
        destinationJarId = body.destinationJarId;
      }
      const result = await createTreasuryTransfer(
        auth,
        job.workspaceId,
        {
          requestId: transferId,
          jarId: jar.id,
          kind:
            job.kind === "CONTRIBUTION"
              ? "DEPOSIT"
              : destinationJarId
                ? "INTERNAL"
                : "WITHDRAW",
          recipient: job.recipient,
          destinationJarId,
          amount: (await import("viem")).formatEther(BigInt(job.amountWei)),
        },
        { jobId: id },
        tx,
      );
      await tx
        .update(jobs)
        .set({
          status: result.status === "CONFIRMED" ? "PAID" : "PAYING",
          transferId: result.id,
        })
        .where(eq(jobs.id, id));
      await event(
        tx,
        auth,
        jar.workspaceId,
        id,
        destinationJarId ? "ALLOCATE_SAVINGS" : "PAYMENT_PREPARED",
      );
      return result;
    } else assert(false, 400, "Thao tác không hợp lệ.");
    await event(tx, auth, jar.workspaceId, id, body.action.toUpperCase());
    return { id };
  });
}
export async function saveSavingsGoal(
  auth: AuthContext,
  jarId: string,
  body: any,
) {
  return db.transaction(async (tx) => {
    await lock(tx);
    const { jar, policy } = await scope(tx, auth, jarId);
    assert(
      policy.kind === "SAVINGS" && policy.beneficiaries.includes(auth.user.id),
      403,
      "Chỉ chủ heo đất được đặt mục tiêu.",
    );
    await tx
      .update(policies)
      .set({
        config: {
          ...policy,
          goalName: textInput(body.name, 100),
          goalWei: amount(body.amount),
        },
      })
      .where(eq(policies.jarId, jarId));
    await event(tx, auth, jar.workspaceId, jar.id, "SET_SAVINGS_GOAL");
  });
}
export async function expireTreasuryRequests() {
  await db.transaction(async (tx) => {
    await lock(tx);
    const expired = await tx
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.kind, "SUPPORT"),
          inArray(jobs.status, ["PENDING", "APPROVED"]),
          isNull(jobs.transferId),
          lt(jobs.createdAt, new Date(Date.now() - 48 * 3600000)),
        ),
      )
      .limit(100);
    for (const job of expired) {
      await tx
        .update(jars)
        .set({ reservedWei: sql`${jars.reservedWei} - ${job.amountWei}` })
        .where(eq(jars.id, job.jarId));
      await tx
        .update(jobs)
        .set({ status: "EXPIRED" })
        .where(eq(jobs.id, job.id));
      await tx.insert(audit).values({
        workspaceId: job.workspaceId,
        entityId: job.id,
        action: "REQUEST_EXPIRED",
      });
    }
    await tx
      .update(jobs)
      .set({ proof: null })
      .where(and(isNotNull(jobs.proof), lt(jobs.proofExpiresAt, new Date())));
  });
}
export async function readTreasuryProof(auth: AuthContext, id: string) {
  return db.transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(jobs)
      .where(eq(jobs.id, uuidInput(id)));
    assert(job, 404, "Không tìm thấy ảnh.");
    const { member, reviewer } = await scope(tx, auth, job.jarId);
    assert(
      job.subjectId === auth.user.id || reviewer || member.role === "ADMIN",
      403,
      "Bạn không có quyền xem ảnh này.",
    );
    assert(
      job.proof && job.proofExpiresAt && job.proofExpiresAt > new Date(),
      404,
      "Ảnh đã hết thời hạn lưu hoặc chưa được gửi.",
    );
    return Buffer.from(job.proof.split(",")[1], "base64");
  });
}
