"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  HeartHandshake,
  ShieldCheck,
  PiggyBank,
  ListChecks,
  Users,
  CalendarDays,
  Plus,
  ChevronUp,
  ChevronDown,
  Upload,
  Wallet,
  Target,
  Volume2,
} from "lucide-react";
import { parseEther } from "viem";
import { useAuth } from "@/hooks/useAuth";
import { useMemberPreferences } from "@/components/layout/MemberResponsiveShell";
import {
  useVaultExperience,
  ExperienceJar,
  ExperienceJob,
  ExperiencePayment,
  ExperienceData,
} from "@/hooks/useVaultExperience";
import { TreasuryPurpose } from "../../../../shared/vaultExperience";
import { TREASURY_ADDRESS } from "../../../../shared/treasury";
import {
  Money,
  SourceBadge,
  Status,
  ReviewDialog,
  Review,
  PaymentDetails,
} from "./ExperiencePrimitives";

type Controller = ReturnType<typeof useVaultExperience>;
const themes = {
  SHIELD: {
    title: "Hũ an sinh",
    caption: "AN TÂM MỖI NGÀY",
    description: "Khoản hỗ trợ từ gia đình, rõ ràng trong từng bước.",
    Icon: HeartHandshake,
  },
  MILESTONE: {
    title: "Heo đất & việc nhà",
    caption: "LỚN LÊN TỪ NHỮNG ĐIỀU NHỎ",
    description:
      "Mỗi việc tốt được ghi nhận. Mỗi khoản thưởng có một hành trình.",
    Icon: PiggyBank,
  },
  ROSCA: {
    title: "Quỹ họ hụi",
    caption: "CÙNG GÓP, CÙNG MINH BẠCH",
    description: "Biết phần mình cần góp, lượt nhận và tiến độ của cả nhóm.",
    Icon: Users,
  },
};
const safe = (promise: Promise<unknown>) => {
  void promise.catch(() => {});
};
function parseWei(input: string) {
  if (!/^\d+(\.\d{1,18})?$/.test(input) || parseEther(input) <= 0n)
    throw new Error("Nhập số AVAX lớn hơn 0, tối đa 18 chữ số thập phân.");
  return parseEther(input).toString();
}

export function VaultExperience({
  kind,
  legacy,
}: {
  kind: keyof typeof themes;
  legacy: React.ReactNode;
}) {
  const controller = useVaultExperience();
  const preferences = useMemberPreferences();
  const { data, busy, loading, error, message } = controller;
  const query = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [review, setReview] = useState<Review | null>(null);
  const [filter, setFilter] = useState("ALL");
  const source =
    query.get("source") ||
    (pathname.split("/")[4] || pathname.includes("/withdraw")
      ? "contract"
      : "core");
  const setQuery = (key: string, value: string) => {
    const next = new URLSearchParams(query.toString());
    next.set(key, value);
    router.replace(`${pathname}?${next}`, { scroll: false });
  };
  const jars =
    data?.jars.filter(
      (jar) =>
        jar.policy.kind === kind ||
        (kind === "MILESTONE" && jar.policy.kind === "SAVINGS"),
    ) || [];
  const selected = jars.find((jar) => jar.id === query.get("jar")) || jars[0];
  const theme = themes[kind];
  const prepare = (next: Review) =>
    setReview({ ...next, confirm: () => controller.run(next.confirm) });
  return (
    <div
      className={`vault-experience vx-${kind.toLowerCase()}`}
      aria-busy={busy}
    >
      <header className="vx-page-header">
        <div>
          <span className="vx-eyebrow">KINETIX / {theme.caption}</span>
          <h1>
            <theme.Icon size={32} aria-hidden />
            {theme.title}
          </h1>
          <p>{theme.description}</p>
          {preferences.voice && (
            <button
              type="button"
              className="vx-text-link"
              onClick={() =>
                preferences.read(
                  document.getElementById("member-main")?.innerText ||
                    theme.description,
                )
              }
            >
              <Volume2 size={18} aria-hidden />
              Đọc nội dung trang
            </button>
          )}
        </div>
        <SourceBadge contract={source === "contract"} />
      </header>
      <div className="vx-source-tabs" role="group" aria-label="Nguồn giữ tiền">
        <button
          type="button"
          aria-pressed={source === "core"}
          onClick={() => setQuery("source", "core")}
        >
          <Wallet size={18} aria-hidden />
          Ví chung Core
        </button>
        <button
          type="button"
          aria-pressed={source === "contract"}
          onClick={() => setQuery("source", "contract")}
        >
          <ShieldCheck size={18} aria-hidden />
          Hũ smart contract
        </button>
      </div>
      {source === "contract" ? (
        <div className="vx-legacy">{legacy}</div>
      ) : (
        <>
          {error && (
            <div className="vx-alert" role="alert">
              <p>{error}</p>
              <button
                type="button"
                className="vx-button-secondary"
                onClick={() => safe(controller.load())}
              >
                Thử tải lại
              </button>
              {data && (
                <p>
                  Dữ liệu bên dưới là lần tải gần nhất. Kiểm tra lại trước khi
                  thao tác.
                </p>
              )}
            </div>
          )}
          {message && (
            <p className="vx-notice" role="status">
              {message}
            </p>
          )}
          {loading ? (
            <div className="vx-skeleton" role="status">
              Đang mở sổ hũ của gia đình…
            </div>
          ) : !data ? (
            <div className="vx-empty">
              <h2>Chưa kết nối được sổ hũ</h2>
              <p>Thông tin số dư sẽ hiện khi kết nối trở lại.</p>
            </div>
          ) : (
            <>
              {data.canManage && (
                <details className="vx-setup">
                  <summary>
                    <Plus size={18} aria-hidden />
                    Tạo hũ{" "}
                    {kind === "SHIELD"
                      ? "an sinh"
                      : kind === "ROSCA"
                        ? "họ hụi"
                        : "việc nhà hoặc heo đất"}
                  </summary>
                  <CreatePolicyForm
                    controller={controller}
                    kind={kind}
                    prepare={prepare}
                  />
                </details>
              )}
              {!jars.length ? (
                <div className="vx-empty">
                  <theme.Icon size={48} aria-hidden />
                  <h2>Chưa có hũ trong mục này</h2>
                  <p>
                    {data.canManage
                      ? "Tạo hũ, chọn thành viên và người duyệt để bắt đầu."
                      : "Người quản trị cần thêm bạn vào hũ của gia đình."}
                  </p>
                </div>
              ) : (
                <>
                  <div
                    className="vx-jar-picker"
                    role="group"
                    aria-label="Chọn hũ"
                  >
                    {jars.map((jar) => (
                      <button
                        key={jar.id}
                        type="button"
                        className={jar.id === selected?.id ? "selected" : ""}
                        aria-pressed={jar.id === selected?.id}
                        onClick={() => setQuery("jar", jar.id)}
                      >
                        <span>{jar.name}</span>
                        <small>
                          {jar.policy.kind === "SAVINGS"
                            ? "Heo đất cá nhân"
                            : `${jar.policy.beneficiaries.length} người thụ hưởng`}
                        </small>
                      </button>
                    ))}
                  </div>
                  {selected && (
                    <div key={selected.id} className="vx-content">
                      {kind === "ROSCA" ? (
                        <RoscaContent
                          jar={selected}
                          data={data}
                          controller={controller}
                          prepare={prepare}
                        />
                      ) : (
                        <>
                          <div className="vx-overview">
                            <section className="vx-hero">
                              <span className="vx-eyebrow">
                                {selected.policy.kind === "SAVINGS"
                                  ? "HEO ĐẤT HIỆN CÓ"
                                  : "SỐ TIỀN KHẢ DỤNG CỦA HŨ"}
                              </span>
                              <h2>{selected.name}</h2>
                              <Money
                                wei={selected.availableWei}
                                className="vx-hero-money"
                              />
                              <p>
                                {selected.policy.kind === "SAVINGS"
                                  ? "Số dư được phân bổ thực tế, sau khi trừ khoản đang giữ chỗ."
                                  : "Tiền chung của hũ, sau khi trừ các yêu cầu đang giữ chỗ."}
                              </p>
                              <div className="vx-hero-meta">
                                <span>
                                  Tổng <Money wei={selected.balanceWei} />
                                </span>
                                <span>
                                  Giữ chỗ <Money wei={selected.reservedWei} />
                                </span>
                              </div>
                            </section>
                            <aside className="vx-card">
                              <div className="vx-card-icon">
                                <ShieldCheck aria-hidden />
                              </div>
                              <h2>
                                {kind === "SHIELD"
                                  ? "Gia đình luôn đồng hành"
                                  : "Mỗi khoản thưởng đều rõ ràng"}
                              </h2>
                              <p>
                                {selected.policy.quorum} /{" "}
                                {selected.policy.guardians.length} người duyệt
                                trước khi chủ ví ký chi.
                              </p>
                              {kind === "SHIELD" && selected.beneficiary && (
                                <p>
                                  Hạn mức còn hôm nay (UTC):{" "}
                                  <Money wei={selected.remainingTodayWei} />
                                </p>
                              )}
                              <p className="vx-muted">
                                Phê duyệt trong ứng dụng. Người giữ ví Core kiểm
                                soát khoản tiền thực tế.
                              </p>
                              <Link
                                className="vx-text-link"
                                href={
                                  kind === "SHIELD"
                                    ? "/dashboard/elderly/family"
                                    : "/dashboard/kids/profile"
                                }
                              >
                                Nhờ người thân hỗ trợ{" "}
                                <ArrowRight size={18} aria-hidden />
                              </Link>
                            </aside>
                          </div>
                          {selected.policy.kind === "SAVINGS" ? (
                            <SavingsGoal
                              jar={selected}
                              controller={controller}
                              prepare={prepare}
                            />
                          ) : kind === "SHIELD" ? (
                            selected.beneficiary && (
                              <SupportForm
                                jar={selected}
                                controller={controller}
                                prepare={prepare}
                              />
                            )
                          ) : (
                              selected.reviewer && data.canManage && (
                              <ChoreForm
                                jar={selected}
                                data={data}
                                controller={controller}
                                prepare={prepare}
                              />
                            )
                          )}
                          {kind === "MILESTONE" && (
                            <div className="vx-metrics">
                              <div>
                                <ListChecks aria-hidden />
                                <strong>
                                  {
                                    selected.jobs.filter((job) =>
                                      ["TODO", "RETURNED"].includes(job.status),
                                    ).length
                                  }
                                </strong>
                                <span>Việc cần làm</span>
                              </div>
                              <div>
                                <CalendarDays aria-hidden />
                                <strong>
                                  {
                                    selected.jobs.filter((job) =>
                                      [
                                        "SUBMITTED",
                                        "APPROVED",
                                        "PAYING",
                                      ].includes(job.status),
                                    ).length
                                  }
                                </strong>
                                <span>Chờ người thân</span>
                              </div>
                              <div>
                                <PiggyBank aria-hidden />
                                <Money
                                  wei={data.jars
                                    .flatMap((jar) => jar.jobs)
                                    .filter(
                                      (job) =>
                                        job.kind === "CHORE" &&
                                        job.status === "PAID" &&
                                        job.subjectId === data.userId,
                                    )
                                    .reduce(
                                      (sum, job) => sum + BigInt(job.amountWei),
                                      0n,
                                    )
                                    .toString()}
                                />
                                <span>
                                  Tổng thưởng đã nhận · không phải số dư ví
                                </span>
                              </div>
                            </div>
                          )}
                          {selected.policy.kind === "SAVINGS" &&
                            selected.beneficiary && (
                              <SupportForm
                                jar={selected}
                                controller={controller}
                                prepare={prepare}
                              />
                            )}
                        </>
                      )}
                      <div className="vx-section-heading">
                        <h2>
                          {kind === "MILESTONE"
                            ? "Việc nhỏ, bước trưởng thành"
                            : kind === "ROSCA"
                              ? "Yêu cầu theo kỳ"
                              : "Yêu cầu của gia đình"}
                        </h2>
                        <label>
                          Lọc trạng thái
                          <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                          >
                            <option value="ALL">Tất cả</option>
                            <option value="OPEN">Đang xử lý</option>
                            <option value="PAID">Đã hoàn tất</option>
                          </select>
                        </label>
                      </div>
                      <div className="vx-job-grid">
                        {selected.jobs
                          .filter((job) =>
                            filter === "ALL" || filter === "PAID"
                              ? filter === "ALL" || job.status === "PAID"
                              : ![
                                  "PAID",
                                  "REJECTED",
                                  "CANCELLED",
                                  "EXPIRED",
                                ].includes(job.status),
                          )
                          .map((job) => (
                            <JobCard
                              key={job.id}
                              job={job}
                              jar={selected}
                              data={data}
                              controller={controller}
                              prepare={prepare}
                            />
                          ))}
                      </div>
                      {!selected.jobs.length && (
                        <div className="vx-empty">
                          <ListChecks size={34} aria-hidden />
                          <h3>Mọi hành trình đều có bước đầu tiên</h3>
                          <p>
                            Yêu cầu và hoạt động của hũ sẽ xuất hiện tại đây.
                          </p>
                        </div>
                      )}
                      {selected.policy.kind !== "ROSCA" && (
                        <FundingForm
                          jar={selected}
                          controller={controller}
                          prepare={prepare}
                        />
                      )}
                      <section className="vx-card">
                        <div className="vx-section-heading">
                          <h2>Dòng tiền & bằng chứng</h2>
                          <span className="vx-muted">
                            {new Date(data.checkedAt).toLocaleString("vi-VN")}
                          </span>
                        </div>
                        <div className="vx-ledger">
                          {selected.activity.slice(0, 30).map((payment) => (
                            <PaymentCard
                              key={payment.id}
                              payment={payment}
                              controller={controller}
                              prepare={prepare}
                            />
                          ))}
                          {!selected.activity.length && (
                            <p className="vx-muted">
                              Chưa có giao dịch. Khoản nạp chỉ được ghi nhận sau
                              khi mạng xác nhận.
                            </p>
                          )}
                        </div>
                      </section>
                      <details className="vx-card">
                        <summary>Nhật ký thao tác của hũ</summary>
                        {data.audit
                          .filter(
                            (row) =>
                              row.entityId === selected.id ||
                              selected.jobs.some(
                                (job) => job.id === row.entityId,
                              ),
                          )
                          .map((row) => (
                            <p key={row.id}>
                              {data.people.find(
                                (person) => person.id === row.actorId,
                              )?.name || "Thành viên"}{" "}
                              · {row.action} ·{" "}
                              {new Date(row.createdAt).toLocaleString("vi-VN")}
                            </p>
                          ))}
                      </details>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
      <ReviewDialog review={review} close={() => setReview(null)} busy={busy} />
    </div>
  );
}
type ActionProps = {
  jar: ExperienceJar;
  controller: Controller;
  prepare: (review: Review) => void;
};
function SupportForm({ jar, controller, prepare }: ActionProps) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="vx-card vx-form"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          const wei = parseWei(amount);
          setError("");
          prepare({
            title: "Xem lại yêu cầu nhận tiền",
            detail: `${jar.name} · ${reason}. Gia đình duyệt trước khi chủ ví ký chi.`,
            amountWei: wei,
            confirm: async () => {
              await controller.post(`/api/treasury/jars/${jar.id}/jobs`, {
                amount,
                title: reason,
              });
              setAmount("");
              setReason("");
            },
          });
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      <h2>
        {jar.policy.kind === "SAVINGS"
          ? "Yêu cầu rút từ heo đất"
          : "Hôm nay bạn cần hỗ trợ gì?"}
      </h2>
      <div className="vx-fields">
        <label>
          Số AVAX
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="Ví dụ 0.01"
          />
        </label>
        <label>
          Lý do
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            maxLength={160}
            placeholder="Thuốc, sinh hoạt hoặc nhu cầu khác"
          />
        </label>
      </div>
      {error && (
        <p className="vx-alert" role="alert">
          {error}
        </p>
      )}
      <button className="vx-button" disabled={controller.busy}>
        Xem lại yêu cầu <ArrowRight size={18} aria-hidden />
      </button>
    </form>
  );
}
function ChoreForm({
  jar,
  data,
  controller,
  prepare,
}: ActionProps & { data: ExperienceData }) {
  const [form, setForm] = useState({
    subjectId: jar.policy.beneficiaries[0],
    title: "",
    description: "",
    amount: "0.01",
  });
  const [error, setError] = useState("");
  return (
    <details className="vx-card">
      <summary>Giao một việc mới</summary>
      <form
        className="vx-form"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            prepare({
              title: "Giao việc và giữ chỗ tiền thưởng",
              detail: form.title,
              amountWei: parseWei(form.amount),
              confirm: async () => {
                await controller.post(
                  `/api/treasury/jars/${jar.id}/jobs`,
                  form,
                );
                setForm({ ...form, title: "", description: "" });
              },
            });
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <div className="vx-fields">
          <label>
            Giao cho
            <select
              value={form.subjectId}
              onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
            >
              {jar.policy.beneficiaries.map((id) => (
                <option key={id} value={id}>
                  {data.people.find((p) => p.id === id)?.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tiền thưởng (AVAX)
            <input
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </label>
          <label>
            Tên việc
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              maxLength={160}
            />
          </label>
          <label>
            Hướng dẫn
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              maxLength={2000}
              required
            />
          </label>
        </div>
        {error && (
          <p className="vx-alert" role="alert">
            {error}
          </p>
        )}
        <button className="vx-button" disabled={controller.busy}>
          Xem lại việc mới
        </button>
      </form>
    </details>
  );
}
function SavingsGoal({ jar, controller, prepare }: ActionProps) {
  const [name, setName] = useState(jar.policy.goalName);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const goal = BigInt(jar.policy.goalWei);
  const progress =
    goal > 0n ? Number((BigInt(jar.balanceWei) * 100n) / goal) : 0;
  return (
    <section className="vx-card vx-goal">
      <PiggyBank size={64} aria-hidden />
      <div>
        <h2>{jar.policy.goalName || "Một mục tiêu nhỏ, một bước tiến mới"}</h2>
        {goal > 0n && (
          <>
            <p>
              Mục tiêu <Money wei={jar.policy.goalWei} />
            </p>
            <progress
              max={100}
              value={Math.min(progress, 100)}
              aria-label="Tiến độ tiết kiệm"
            />
            <p>
              {progress >= 100
                ? "Con đã đạt mục tiêu tiết kiệm!"
                : `Đã đạt ${progress}% mục tiêu`}
            </p>
          </>
        )}
        {jar.beneficiary && (
          <form
            className="vx-form"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                prepare({
                  title: "Lưu mục tiêu tiết kiệm",
                  detail: name,
                  amountWei: parseWei(amount),
                  confirm: async () => {
                    await controller.post(`/api/treasury/jars/${jar.id}/goal`, {
                      name,
                      amount,
                    });
                  },
                });
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <div className="vx-fields">
              <label>
                Tên mục tiêu
                <input
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Chiếc xe đạp đầu tiên"
                />
              </label>
              <label>
                Số AVAX cần tiết kiệm
                <input
                  required
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
            </div>
            {error && <p role="alert">{error}</p>}
            <button className="vx-button-secondary" disabled={controller.busy}>
              <Target size={18} aria-hidden />
              Lưu mục tiêu
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
function FundingForm({ jar, controller, prepare }: ActionProps) {
  const [amount, setAmount] = useState("0.01");
  const [error, setError] = useState("");
  return (
    <details className="vx-card">
      <summary>Nạp thêm tiền vào hũ</summary>
      <form
        className="vx-form"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            prepare({
              title: "Nạp từ ví cá nhân",
              detail: `Phân bổ khoản nạp vào ${jar.name}. Core sẽ yêu cầu ký trên Fuji.`,
              amountWei: parseWei(amount),
              recipient: TREASURY_ADDRESS,
              confirm: async () => {
                const payment = await controller.post(
                  `/api/workspaces/${controller.workspaceId}/treasury/transfers`,
                  { jarId: jar.id, kind: "DEPOSIT", amount },
                );
                await controller.sign(payment);
              },
            });
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <label>
          Số AVAX
          <input
            required
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button className="vx-button" disabled={controller.busy}>
          Xem lại khoản nạp
        </button>
      </form>
    </details>
  );
}
function RoscaContent({
  jar,
  data,
  controller,
  prepare,
}: ActionProps & { data: ExperienceData }) {
  const policy = jar.policy;
  const ended = policy.round >= policy.beneficiaries.length;
  const current = jar.jobs.filter((job) => job.round === policy.round);
  const paid = current.filter(
    (job) => job.kind === "CONTRIBUTION" && job.status === "PAID",
  );
  const mine = current.find(
    (job) => job.kind === "CONTRIBUTION" && job.subjectId === data.userId,
  );
  const recipientId = policy.beneficiaries[policy.round];
  const recipient = data.people.find((p) => p.id === recipientId);
  const payoutAt =
    Date.parse(policy.roundStartedAt) + policy.durationSeconds * 1000;
  const missing = policy.beneficiaries.length - paid.length;
  const ready = !ended && missing === 0 && Date.now() >= payoutAt;
  return (
    <>
      <div className="vx-overview">
        <section className="vx-hero">
          <span className="vx-eyebrow">
            {ended
              ? "CHU KỲ ĐÃ HOÀN TẤT"
              : `KỲ ${policy.round + 1} / ${policy.beneficiaries.length}`}
          </span>
          <h2>{jar.name}</h2>
          <Money
            wei={(
              BigInt(policy.contributionWei) * BigInt(paid.length)
            ).toString()}
            className="vx-hero-money"
          />
          <p>
            Đã góp trong kỳ · {paid.length}/{policy.beneficiaries.length} thành
            viên
          </p>
          <progress
            max={Math.max(1, policy.beneficiaries.length)}
            value={paid.length}
            aria-label="Thành viên đã góp"
          />
          <p>
            Người nhận:{" "}
            <strong>{recipient?.name || "Đã kết thúc chu kỳ"}</strong>
          </p>
        </section>
        <aside className="vx-card">
          <h2>Phần của bạn</h2>
          <Money wei={policy.contributionWei} className="vx-large-money" />
          <p>Mức góp cố định mỗi kỳ</p>
          {mine ? (
            <Status value={mine.status} />
          ) : (
            <p>
              {jar.beneficiary
                ? "Bạn chưa tạo khoản góp kỳ này."
                : "Bạn đang xem với quyền quản lý."}
            </p>
          )}
          {jar.beneficiary && !ended && !mine && (
            <button
              className="vx-button"
              disabled={controller.busy}
              onClick={() =>
                prepare({
                  title: "Tạo khoản góp kỳ này",
                  detail: `Kỳ ${policy.round + 1} · ${jar.name}. Sau khi tạo, mở Core tại thẻ yêu cầu để ký.`,
                  amountWei: policy.contributionWei,
                  confirm: async () => {
                    await controller.post(`/api/treasury/jars/${jar.id}/jobs`, {
                      kind: "CONTRIBUTION",
                    });
                  },
                })
              }
            >
              Góp kỳ này <ArrowRight size={18} aria-hidden />
            </button>
          )}
          <p className="vx-muted">
            Sớm nhất chi trả: {new Date(payoutAt).toLocaleString("vi-VN")}. Mạng
            và server kiểm tra lại điều kiện.
          </p>
          {jar.reviewer && !ended && (
            <>
              <button
                className="vx-button-secondary"
                disabled={!ready || controller.busy}
                onClick={() =>
                  prepare({
                    title: "Đề nghị chi trả kỳ họ hụi",
                    detail: `Người nhận ${recipient?.name}. Gia đình duyệt trước khi chủ ví ký.`,
                    amountWei: (
                      BigInt(policy.contributionWei) *
                      BigInt(policy.beneficiaries.length)
                    ).toString(),
                    confirm: async () => {
                      await controller.post(
                        `/api/treasury/jars/${jar.id}/jobs`,
                        { kind: "PAYOUT" },
                      );
                    },
                  })
                }
              >
                Đề nghị giải ngân
              </button>
              {!ready && (
                <p>
                  {missing > 0
                    ? `Còn ${missing} người chưa góp đủ.`
                    : "Chưa đến thời điểm chi trả."}
                </p>
              )}
            </>
          )}
        </aside>
      </div>
      <div className="vx-two-columns">
        <section className="vx-card">
          <h2>Ai đã góp kỳ này?</h2>
          <div className="vx-roster">
            {policy.beneficiaries.map((id) => {
              const person = data.people.find((p) => p.id === id);
              const contribution = current.find(
                (job) => job.kind === "CONTRIBUTION" && job.subjectId === id,
              );
              return (
                <div key={id}>
                  <span className="vx-avatar">{person?.name.slice(0, 1)}</span>
                  <div>
                    <strong>{person?.name || "Thành viên"}</strong>
                    <small className="vx-address">
                      {person?.wallet?.slice(0, 6)}…{person?.wallet?.slice(-4)}
                    </small>
                  </div>
                  <span>
                    {contribution ? (
                      <Status value={contribution.status} />
                    ) : (
                      "Chưa góp"
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
        <section className="vx-card">
          <h2>Lịch nhận luân phiên</h2>
          <ol className="vx-schedule">
            {policy.beneficiaries.map((id, index) => (
              <li key={id} className={index === policy.round ? "active" : ""}>
                <span>{index + 1}</span>
                <div>
                  <strong>
                    {data.people.find((p) => p.id === id)?.name || "Thành viên"}
                  </strong>
                  <p>
                    {index < policy.round
                      ? "Đã chi trả"
                      : index === policy.round
                        ? "Người nhận kỳ hiện tại"
                        : "Lượt nhận dự kiến"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="vx-muted">
            Thứ tự đã cố định khi tạo quỹ. Kỳ tiếp theo bắt đầu khi khoản chi
            hiện tại hoàn tất.
          </p>
        </section>
      </div>
    </>
  );
}
function JobCard({
  job,
  jar,
  data,
  controller,
  prepare,
}: ActionProps & { job: ExperienceJob; data: ExperienceData }) {
  const [proof, setProof] = useState("");
  const [proofOpen, setProofOpen] = useState(false);
  const [proofError, setProofError] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [destination, setDestination] = useState("");
  const own = job.subjectId === data.userId;
  const action = (name: string, extra = {}) =>
    controller.post(`/api/treasury/jobs/${job.id}/action`, {
      action: name,
      ...extra,
    });
  const approve = () =>
    prepare({
      title: "Duyệt yêu cầu",
      detail: job.title,
      amountWei: job.amountWei,
      recipient: job.recipient,
      confirm: async () => {
        await action("approve");
      },
    });
  const pay = () =>
    prepare({
      title: destination
        ? "Phân bổ thưởng vào heo đất"
        : "Chuẩn bị khoản thanh toán",
      detail: `${job.title}. ${destination ? "Ghi hai bút toán nội bộ, không phát sinh phí mạng." : "Sau bước này chủ ví ký tại thẻ giao dịch bên dưới."}`,
      amountWei: job.amountWei,
      recipient: job.recipient,
      confirm: async () => {
        await action(
          "pay",
          destination ? { destinationJarId: destination } : {},
        );
      },
    });
  const upload = async (file?: File) => {
    if (!file) return;
    setProcessing(true);
    setError("");
    try {
      if (
        !/^image\/(png|jpeg|webp)$/.test(file.type) ||
        file.size > 10 * 1024 * 1024
      )
        throw new Error("Chọn PNG/JPEG/WebP tối đa 10 MB.");
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas
        .getContext("2d")!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const output = canvas.toDataURL("image/png").split(",")[1];
      if (output.length > 900000)
        throw new Error(
          "Ảnh còn quá lớn. Hãy chọn ảnh đơn giản hơn hoặc chụp gần việc cần minh chứng.",
        );
      setProof(output);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcessing(false);
    }
  };
  return (
    <article className="vx-card vx-job">
      <div className="vx-heading">
        <span className="vx-card-icon">
          {job.kind === "CHORE" ? (
            <ListChecks aria-hidden />
          ) : job.kind === "SUPPORT" ? (
            <HeartHandshake aria-hidden />
          ) : (
            <Users aria-hidden />
          )}
        </span>
        <Status value={job.status} />
      </div>
      <h3>{job.title}</h3>
      <p className="vx-muted">
        {data.people.find((p) => p.id === job.subjectId)?.name} ·{" "}
        {new Date(job.createdAt).toLocaleDateString("vi-VN")}
        {job.round !== null && ` · Kỳ ${job.round + 1}`}
      </p>
      <p className="vx-description">{job.description}</p>
      <Money wei={job.amountWei} className="vx-large-money" />
      <p className="vx-muted">
        {job.status === "PAID"
          ? "Đã hoàn tất khoản tiền"
          : job.kind === "CHORE"
            ? "Phần thưởng dự kiến"
            : "Số tiền yêu cầu"}
      </p>
      {job.kind !== "CONTRIBUTION" && (
        <p>
          {job.approvals.length}/{jar.policy.quorum} người duyệt
        </p>
      )}
      {(job.hasProof || job.proof) && (
        <details onToggle={(event) => setProofOpen(event.currentTarget.open)}>
          <summary>Ảnh minh chứng đã gửi</summary>
          {proofOpen && !proofError && (
            <img
              className="vx-proof"
              src={job.proof || `/api/treasury/jobs/${job.id}/proof`}
              alt={`Minh chứng ${job.title}`}
              onError={() => setProofError(true)}
            />
          )}
          {proofError && (
            <p role="status">
              Ảnh đã hết thời hạn lưu hoặc chưa tải được. Tải lại trang để kiểm
              tra quyền và kết nối.
            </p>
          )}
        </details>
      )}
      {own &&
        job.kind === "CHORE" &&
        ["TODO", "RETURNED"].includes(job.status) && (
          <div className="vx-form">
            <label className="vx-upload">
              <Upload size={20} aria-hidden />
              {processing ? "Đang xử lý ảnh…" : "Chọn ảnh việc con đã làm"}
              <input
                aria-label="Ảnh minh chứng việc đã làm"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={controller.busy || processing}
                onChange={(e) => safe(upload(e.target.files?.[0]))}
              />
            </label>
            <p className="vx-muted">
              Ảnh được bảo vệ theo quyền và giữ tối đa 7 ngày. Không chụp giấy
              tờ hay thông tin riêng tư.
            </p>
            {proof && (
              <img
                className="vx-proof"
                src={`data:image/png;base64,${proof}`}
                alt="Xem trước ảnh sẽ gửi"
              />
            )}
            {error && <p role="alert">{error}</p>}
            <button
              className="vx-button"
              disabled={!proof || processing || controller.busy}
              onClick={() =>
                prepare({
                  title: "Gửi việc cho người thân",
                  detail:
                    "Ảnh đã chọn sẽ được gửi để người thân kiểm tra. Chưa cộng tiền thưởng ở bước này.",
                  confirm: async () => {
                    await action("submit", { proof });
                    setProof("");
                  },
                })
              }
            >
              Con đã làm xong <ArrowRight size={18} aria-hidden />
            </button>
          </div>
        )}
      {jar.reviewer &&
        ["PENDING", "SUBMITTED", "APPROVED"].includes(job.status) &&
        !job.approvals.includes(data.userId) &&
        job.kind !== "CONTRIBUTION" && (
          <button
            className="vx-button-secondary"
            disabled={controller.busy}
            onClick={approve}
          >
            Duyệt yêu cầu
          </button>
        )}
      {jar.reviewer && job.kind === "CHORE" && job.status === "SUBMITTED" && (
        <details>
          <summary>Góp ý để con làm lại</summary>
          <label>
            Góp ý
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
            />
          </label>
          <button
            className="vx-button-secondary"
            disabled={!note.trim() || controller.busy}
            onClick={() =>
              prepare({
                title: "Yêu cầu làm lại",
                detail: note,
                confirm: async () => {
                  await action("return", { note });
                },
              })
            }
          >
            Gửi góp ý
          </button>
        </details>
      )}
      {((jar.reviewer && job.kind !== "CONTRIBUTION") ||
        (own && job.kind === "CONTRIBUTION")) &&
        ["APPROVED", "CANCELLED"].includes(job.status) &&
        !(job.kind === "SUPPORT" && job.status === "CANCELLED") && (
          <div className="vx-form">
            {job.kind === "CHORE" && (
              <label>
                Chuyển thưởng đến
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                >
                  <option value="">Ví cá nhân của trẻ</option>
                  {data.jars
                    .filter(
                      (target) =>
                        target.policy.kind === "SAVINGS" &&
                        target.policy.beneficiaries.includes(job.subjectId),
                    )
                    .map((target) => (
                      <option key={target.id} value={target.id}>
                        {target.name}
                      </option>
                    ))}
                </select>
              </label>
            )}
            <button
              className="vx-button"
              disabled={controller.busy}
              onClick={pay}
            >
              {job.kind === "CONTRIBUTION"
                ? "Chuẩn bị giao dịch góp"
                : "Chuẩn bị thanh toán"}
            </button>
          </div>
        )}
      {own &&
        job.kind === "SUPPORT" &&
        ["PENDING", "APPROVED"].includes(job.status) &&
        !job.payment && (
          <button
            type="button"
            className="vx-text-link"
            disabled={controller.busy}
            onClick={() =>
              prepare({
                title: "Hủy yêu cầu nhận tiền",
                detail:
                  "Giải phóng khoản giữ chỗ. Bạn có thể tạo yêu cầu mới nếu cần.",
                confirm: async () => {
                  await action("cancel");
                },
              })
            }
          >
            Hủy yêu cầu
          </button>
        )}
      {job.kind === "SUPPORT" && (
        <p className="vx-muted">
          Hạn chuẩn bị chi:{" "}
          {new Date(Date.parse(job.createdAt) + 48 * 3600000).toLocaleString(
            "vi-VN",
          )}
          . Yêu cầu chưa chuyển sang thanh toán sẽ tự hết hạn.
        </p>
      )}
      {jar.reviewer &&
        ["PENDING", "TODO", "RETURNED", "SUBMITTED", "APPROVED"].includes(
          job.status,
        ) &&
        !job.payment &&
        job.kind !== "CONTRIBUTION" && (
          <button
            className="vx-text-link"
            disabled={controller.busy}
            onClick={() =>
              prepare({
                title: "Từ chối yêu cầu",
                detail:
                  "Khoản giữ chỗ sẽ được giải phóng. Thao tác được lưu trong nhật ký.",
                confirm: async () => {
                  await action("reject");
                },
              })
            }
          >
            Từ chối và hoàn giữ chỗ
          </button>
        )}
      {job.payment && (
        <PaymentCard
          payment={job.payment}
          controller={controller}
          prepare={prepare}
        />
      )}
    </article>
  );
}
function PaymentCard({
  payment,
  controller,
  prepare,
}: {
  payment: ExperiencePayment;
  controller: Controller;
  prepare: (review: Review) => void;
}) {
  const [hash, setHash] = useState("");
  const auth = useAuth();
  const signer =
    auth.user?.walletAddress?.toLowerCase() === payment.sender?.toLowerCase();
  const pending = ["READY", "SUBMITTED"].includes(payment.status);
  return (
    <div className="vx-transaction">
      <Money wei={payment.amountWei} />
      <PaymentDetails payment={payment} />
      {pending && (
        <>
          <div className="vx-actions">
            {payment.status === "READY" && signer && (
              <button
                className="vx-button"
                disabled={controller.busy}
                onClick={() =>
                  prepare({
                    title: "Xem lại trước khi ký Core",
                    detail: `Fuji · nonce ${payment.nonce}. Số dư chỉ cập nhật sau finalized.`,
                    amountWei: payment.amountWei,
                    recipient: payment.recipient,
                    confirmLabel: "Mở Core để ký",
                    confirm: () => controller.sign(payment),
                  })
                }
              >
                Ký bằng Core <ArrowUpRight size={17} aria-hidden />
              </button>
            )}
            {signer && (
              <button
                className="vx-button-secondary"
                disabled={controller.busy}
                onClick={() =>
                  prepare({
                    title: "Ký hủy giao dịch",
                    detail:
                      "Gửi 0 AVAX về chính ví ký, cùng nonce. Tốn gas. Khoản giữ chỗ được giải phóng sau khi lệnh hủy finalized; nếu thanh toán thắng trước, khoản chi vẫn được ghi nhận.",
                    confirmLabel: "Mở Core để hủy",
                    confirm: () => controller.sign(payment, true),
                  })
                }
              >
                Ký hủy
              </button>
            )}
            {!signer && (
              <p className="vx-muted">
                Đang chờ người giữ ví nguồn ký giao dịch.
              </p>
            )}
          </div>
          <details>
            <summary>Đã gửi nhưng chưa đồng bộ?</summary>
            <form
              className="vx-form"
              onSubmit={(e) => {
                e.preventDefault();
                safe(
                  controller.run(() =>
                    controller.sign(
                      payment,
                      false,
                      hash || payment.txHash || undefined,
                    ),
                  ),
                );
              }}
            >
              <label>
                Tx hash đã gửi
                <input
                  value={hash}
                  onChange={(e) => setHash(e.target.value)}
                  placeholder={payment.txHash || "0x…"}
                  required={!payment.txHash}
                  pattern="0x[0-9a-fA-F]{64}"
                />
              </label>
              <button
                className="vx-button-secondary"
                disabled={controller.busy}
              >
                Đối soát tx hash
              </button>
            </form>
          </details>
        </>
      )}
    </div>
  );
}
function CreatePolicyForm({
  controller,
  kind,
  prepare,
}: {
  controller: Controller;
  kind: keyof typeof themes;
  prepare: (review: Review) => void;
}) {
  const data = controller.data!;
  const [purpose, setPurpose] = useState<TreasuryPurpose>(kind);
  const [name, setName] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [guardians, setGuardians] = useState<string[]>([]);
  const [quorum, setQuorum] = useState(1);
  const [amount, setAmount] = useState("0.01");
  const [days, setDays] = useState("7");
  const [error, setError] = useState("");
  const toggle = (
    id: string,
    list: string[],
    setter: (ids: string[]) => void,
  ) =>
    setter(
      list.includes(id) ? list.filter((item) => item !== id) : [...list, id],
    );
  return (
    <form
      className="vx-form"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          const wei = parseWei(amount);
          setError("");
          prepare({
            title: "Xem lại chính sách trước khi tạo hũ",
            detail: `${name} · ${purpose}\nNgười thụ hưởng / thứ tự nhận: ${members.map((id) => data.people.find((p) => p.id === id)?.name).join(" → ")}\nNgười duyệt: ${guardians.map((id) => data.people.find((p) => p.id === id)?.name).join(", ")} · ngưỡng ${quorum}/${guardians.length}${purpose === "ROSCA" ? `\nThời lượng mỗi kỳ: ${days} ngày` : "\nHạn mức nhận mỗi ngày UTC"}\nChính sách cố định sau khi tạo. Hũ bắt đầu từ 0 AVAX.`,
            amountWei: wei,
            confirmLabel: "Tạo hũ theo chính sách này",
            confirm: async () => {
              await controller.post(
                `/api/workspaces/${controller.workspaceId}/vault-experience`,
                {
                  name,
                  kind: purpose,
                  beneficiaries: members,
                  guardians,
                  quorum,
                  dailyLimit: amount,
                  contribution: amount,
                  durationSeconds: Math.round(Number(days) * 86400),
                },
              );
              setName("");
              setMembers([]);
            },
          });
        } catch (e) {
          setError((e as Error).message);
        }
      }}
    >
      <div className="vx-fields">
        <label>
          Tên hũ
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
        </label>
        {kind === "MILESTONE" && (
          <label>
            Mục đích
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as TreasuryPurpose)}
            >
              <option value="MILESTONE">Quỹ thưởng việc nhà</option>
              <option value="SAVINGS">Heo đất cá nhân</option>
            </select>
          </label>
        )}
        <label>
          {purpose === "ROSCA"
            ? "Mức góp mỗi kỳ (AVAX)"
            : "Hạn mức nhận mỗi ngày (AVAX)"}
          <input
            required
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        {purpose === "ROSCA" && (
          <label>
            Thời lượng mỗi kỳ (ngày)
            <input
              required
              type="number"
              min="0.001"
              step="0.001"
              max="366"
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </label>
        )}
        <label>
          Số người cần duyệt
          <input
            required
            type="number"
            min="1"
            max={guardians.length || 1}
            value={quorum}
            onChange={(e) => setQuorum(Number(e.target.value))}
          />
        </label>
      </div>
      <fieldset>
        <legend>
          {purpose === "ROSCA"
            ? "Thành viên theo thứ tự nhận"
            : purpose === "SAVINGS"
              ? "Chọn một chủ heo đất"
              : "Người thụ hưởng"}
        </legend>
        <div className="vx-checkboxes">
          {data.people
            .filter((p) => p.wallet)
            .map((person) => (
              <label key={person.id}>
                <input
                  type="checkbox"
                  checked={members.includes(person.id)}
                  onChange={() =>
                    purpose === "SAVINGS"
                      ? setMembers(
                          members.includes(person.id) ? [] : [person.id],
                        )
                      : toggle(person.id, members, setMembers)
                  }
                />
                {person.name}
              </label>
            ))}
        </div>
        {purpose === "ROSCA" && (
          <ol className="vx-order">
            {members.map((id, index) => (
              <li key={id}>
                <span>
                  {index + 1}. {data.people.find((p) => p.id === id)?.name}
                </span>
                <button
                  type="button"
                  className="vx-icon-button"
                  aria-label="Chuyển lượt lên"
                  disabled={index === 0}
                  onClick={() => {
                    const next = [...members];
                    [next[index - 1], next[index]] = [
                      next[index],
                      next[index - 1],
                    ];
                    setMembers(next);
                  }}
                >
                  <ChevronUp size={18} />
                </button>
                <button
                  type="button"
                  className="vx-icon-button"
                  aria-label="Chuyển lượt xuống"
                  disabled={index === members.length - 1}
                  onClick={() => {
                    const next = [...members];
                    [next[index + 1], next[index]] = [
                      next[index],
                      next[index + 1],
                    ];
                    setMembers(next);
                  }}
                >
                  <ChevronDown size={18} />
                </button>
              </li>
            ))}
          </ol>
        )}
      </fieldset>
      <fieldset>
        <legend>Người duyệt</legend>
        <div className="vx-checkboxes">
          {data.people
            .filter((p) => ["ADMIN", "GUARDIAN"].includes(p.role))
            .map((person) => (
              <label key={person.id}>
                <input
                  type="checkbox"
                  checked={guardians.includes(person.id)}
                  onChange={() => toggle(person.id, guardians, setGuardians)}
                />
                {person.name}
              </label>
            ))}
        </div>
      </fieldset>
      <p className="vx-muted">
        Chính sách và thứ tự nhận cố định sau khi tạo. Ví chung do chủ ví Core
        giữ; các bước duyệt được ghi nhận trong ứng dụng.
      </p>
      <button
        className="vx-button"
        disabled={
          controller.busy || !members.length || guardians.length < quorum
        }
      >
        Xem lại chính sách hũ
      </button>
      {error && (
        <p className="vx-alert" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
