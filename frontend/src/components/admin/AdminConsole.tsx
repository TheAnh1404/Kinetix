"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createWalletClient, custom, formatEther } from "viem";
import {
  ShieldCheck,
  Users,
  Wallet,
  History,
  FileDown,
  Settings2,
  RefreshCw,
  ArrowUpRight,
  X,
  LockKeyhole,
} from "lucide-react";
import { useAuth, authRequest } from "@/hooks/useAuth";
import { useFamily } from "@/context/FamilyContext";
import { useWorkspaceAccess } from "@/hooks/useWorkspaceAccess";
import { getCoreProvider } from "@/lib/web3/client";
import { MemberManagementModal } from "@/components/dashboard/MemberManagementModal";
import { GuardianView } from "@/components/views/GuardianView";
import "@/components/settings/account.css";

const labels: Record<string, string> = {
  RENAME: "Đổi tên gia đình",
  REVOKE_INVITE: "Thu hồi lời mời",
  PAUSE: "Tạm dừng yêu cầu chi mới",
  RESUME: "Tiếp tục yêu cầu chi",
  MEMBER_ACCESS: "Thay đổi quyền truy cập",
  JAR_LIMIT: "Đổi hạn mức hũ",
  ARCHIVE_JAR: "Lưu trữ hũ",
  ARCHIVE: "Lưu trữ gia đình",
  RESTORE: "Khôi phục gia đình",
  EXPORT: "Xuất sổ giao dịch",
};
const tabs = [
  { id: "overview", label: "Tổng quan", Icon: ShieldCheck },
  { id: "members", label: "Thành viên", Icon: Users },
  { id: "jars", label: "Hũ & chính sách", Icon: Wallet },
  { id: "activity", label: "Nhật ký", Icon: History },
  { id: "reports", label: "Báo cáo", Icon: FileDown },
  { id: "configuration", label: "Cấu hình", Icon: Settings2 },
];
const date = (value: string) => new Date(value).toLocaleString("vi-VN");

export function AdminConsole() {
  const auth = useAuth();
  const family = useFamily();
  const { isOwner, workspace } = useWorkspaceAccess();
  const key = `${auth.user?.id}:${workspace?.id}`;
  return isOwner && workspace ? (
    <OwnerConsole key={key} workspaceId={workspace.id} />
  ) : (
    <div className="account-empty">
      <LockKeyhole />
      <h1>Khu vực dành cho chủ nhà</h1>
      <p>Quyền quản trị chỉ áp dụng trong gia đình bạn tạo.</p>
      <Link href="/dashboard/member">Về không gian thành viên</Link>
    </div>
  );
}

function OwnerConsole({ workspaceId }: { workspaceId: string }) {
  const auth = useAuth();
  const family = useFamily();
  const { isOwner } = useWorkspaceAccess();
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState("overview");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [intent, setIntent] = useState<any>(null);
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [from, setFrom] = useState(
    new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const scope = useRef(workspaceId);
  scope.current = family.currentWorkspace?.id || "";
  const ensureScope = () => {
    if (!alive.current || scope.current !== workspaceId)
      throw new Error(
        "Gia đình đã thay đổi. Mở lại yêu cầu trong đúng gia đình.",
      );
  };
  const load = useCallback(async () => {
    const result = await authRequest(
      `/api/workspaces/${workspaceId}/admin/overview`,
      undefined,
      "GET",
    );
    if (alive.current && scope.current === workspaceId) {
      setData(result.data);
      setName(result.data.workspace.name);
    }
  }, [workspaceId]);
  useEffect(() => {
    void load().catch((err) => alive.current && setError(err.message));
  }, [load]);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      ensureScope();
      await action();
    } catch (err: any) {
      if (alive.current) setError(err.message);
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const prepare = (action: string, payload: Record<string, unknown>) =>
    run(async () => {
      const result = await authRequest(
        `/api/workspaces/${workspaceId}/admin/intents`,
        {
          action,
          payload,
          revision: data.state.revision,
          requestId: crypto.randomUUID(),
        },
      );
      ensureScope();
      setIntent(result.data);
    });
  const execute = () =>
    run(async () => {
      if (!isOwner || !intent) throw new Error("Không còn quyền chủ nhà.");
      if (Date.parse(intent.expiresAt) <= Date.now())
        throw new Error("Yêu cầu đã hết hạn. Đóng và chuẩn bị yêu cầu mới.");
      const provider = getCoreProvider();
      if (!provider) throw new Error("Mở Core Wallet để xác nhận.");
      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });
      ensureScope();
      if (
        accounts[0]?.toLowerCase() !== auth.linkedWallet?.address?.toLowerCase()
      )
        throw new Error("Chọn ví Core đã liên kết với chủ nhà.");
      const signature = await createWalletClient({
        transport: custom(provider),
      }).signMessage({ account: accounts[0], message: intent.message });
      ensureScope();
      const result = await authRequest(
        `/api/workspaces/${workspaceId}/admin/intents/${intent.id}/execute`,
        { signature },
      );
      ensureScope();
      if (result.csv) {
        const url = URL.createObjectURL(
          new Blob([result.csv], { type: "text/csv;charset=utf-8" }),
        );
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = result.filename;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setIntent(null);
      setNotice("Đã xác nhận thao tác và lưu nhật ký quản trị.");
      await load();
      await auth.checkSession();
    });
  if (!data)
    return (
      <div className="account-empty" role="status">
        <ShieldCheck />
        <h1>Quản trị gia đình</h1>
        <p>{error || "Đang kiểm tra quyền chủ nhà và tải dữ liệu…"}</p>
        {error && <button onClick={() => void run(load)}>Thử lại</button>}
      </div>
    );
  const jars = data.experience.jars as any[];
  const total = jars.reduce((sum, jar) => sum + BigInt(jar.balanceWei), 0n);
  return (
    <div className="account-ui admin-console">
      <header className="account-heading">
        <div>
          <span className="account-eyebrow">KHÔNG GIAN CHỦ NHÀ</span>
          <h1>{data.workspace.name}</h1>
          <p>Quản lý gia đình của bạn, với mọi thay đổi đều có dấu vết.</p>
        </div>
        <div className="account-heading-actions">
          <span className="account-badge">
            <ShieldCheck size={15} /> Chủ nhà
          </span>
          <button
            className="account-button secondary"
            disabled={busy}
            onClick={() => void run(load)}
            aria-label="Tải lại dữ liệu"
          >
            <RefreshCw size={17} />
          </button>
        </div>
      </header>
      <div className="account-scope">
        <ShieldCheck size={19} />
        <p>
          <strong>Quyền quản trị thuộc gia đình này.</strong> Khi tham gia gia
          đình hoặc hụi khác, bạn sử dụng quyền thành viên ở đó.
        </p>
        <span>Phiên bản {data.state.revision}</span>
      </div>
      <nav className="account-tabs" aria-label="Quản trị gia đình">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => {
              setTab(id);
              setError("");
            }}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </nav>
      {error && (
        <p role="alert" className="account-message error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="account-message success">
          {notice}
        </p>
      )}
      {(data.state.outgoingPaused || data.state.archived) && (
        <div className="account-message warning">
          <strong>
            {data.state.archived
              ? "Gia đình đang được lưu trữ"
              : "Đang tạm dừng yêu cầu chi mới"}
          </strong>
          <p>{data.state.pauseReason}</p>
          <small>
            Giao dịch đã ký vẫn được đối soát. Ví Core và quyền trong smart
            contract được vận hành riêng.
          </small>
        </div>
      )}
      {tab === "overview" && (
        <>
          <div className="account-metrics">
            <div>
              <span>Thành viên</span>
              <strong>{data.members.length}</strong>
              <small>Trong gia đình này</small>
            </div>
            <div>
              <span>Số hũ trong sổ cái</span>
              <strong>{jars.filter((jar) => !jar.isArchived).length}</strong>
              <small>Hũ AVAX đang hoạt động</small>
            </div>
            <div>
              <span>Tổng tiền ghi sổ</span>
              <strong>
                {formatEther(total)} <small>AVAX</small>
              </strong>
              <small>Không phải tổng số dư ví chung</small>
            </div>
          </div>
          <section className="account-card">
            <div className="account-card-heading">
              <div>
                <h2>Điều hành hằng ngày</h2>
                <p>Tạo hũ, theo dõi yêu cầu và các khoản tiền của gia đình.</p>
              </div>
            </div>
            <GuardianView />
          </section>
        </>
      )}
      {tab === "members" && (
        <section className="account-card">
          <div className="account-card-heading">
            <div>
              <h2>Thành viên & quyền truy cập</h2>
              <p>
                Chủ nhà duy nhất là người tạo gia đình. Khóa truy cập chỉ áp
                dụng tại đây.
              </p>
            </div>
            <button
              className="account-button"
              onClick={() => setMembersOpen(true)}
            >
              Thêm & quản lý tài khoản
            </button>
          </div>
          <div className="account-list">
            {data.members.map((member: any) => (
              <div className="account-row" key={member.id}>
                <span className="account-avatar">{member.fullName?.[0]}</span>
                <div className="account-row-body">
                  <strong>{member.fullName}</strong>
                  <small>
                    {member.isOwner
                      ? "Chủ nhà · Người tạo gia đình"
                      : member.role === "GUARDIAN"
                        ? "Thành viên"
                        : member.role === "ELDERLY"
                          ? "Ông bà"
                          : "Con trẻ"}{" "}
                    · {member.disabledAt ? "Đang khóa" : "Đang hoạt động"}
                  </small>
                </div>
                {!member.isOwner && (
                  <button
                    className="account-button secondary"
                    disabled={busy}
                    onClick={() =>
                      void prepare("MEMBER_ACCESS", {
                        userId: member.id,
                        disabled: !member.disabledAt,
                      })
                    }
                  >
                    {member.disabledAt ? "Mở truy cập" : "Khóa truy cập"}
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="account-card-heading">
            <div>
              <h2>Lời mời tham gia</h2>
              <p>
                Thu hồi lời mời chưa sử dụng bằng chữ ký Core. Mã mời được hiển
                thị một lần khi tạo.
              </p>
            </div>
          </div>
          {data.invitations.length === 0 && (
            <p className="account-empty">Chưa có lời mời.</p>
          )}
          {data.invitations.map((invite: any) => (
            <div className="account-row" key={invite.id}>
              <div className="account-row-body">
                <strong className="account-address">{invite.wallet}</strong>
                <small>
                  {invite.acceptedAt
                    ? "Đã tham gia"
                    : invite.revokedAt
                      ? "Đã thu hồi"
                      : Date.parse(invite.expiresAt) < Date.now()
                        ? "Hết hạn"
                        : `Hiệu lực đến ${date(invite.expiresAt)}`}
                </small>
              </div>
              {!invite.acceptedAt &&
                !invite.revokedAt &&
                Date.parse(invite.expiresAt) > Date.now() && (
                  <button
                    className="account-button secondary"
                    disabled={busy}
                    onClick={() =>
                      void prepare("REVOKE_INVITE", { invitationId: invite.id })
                    }
                  >
                    Thu hồi lời mời
                  </button>
                )}
            </div>
          ))}
        </section>
      )}
      {tab === "jars" && (
        <section className="account-card">
          <div className="account-card-heading">
            <div>
              <h2>Hũ & chính sách nhận tiền</h2>
              <p>
                Hạn mức thuộc sổ cái ứng dụng; thay đổi không sửa cấu hình smart
                contract.
              </p>
            </div>
          </div>
          {!jars.length && (
            <p className="account-empty">
              Chưa có hũ. Tạo hũ tại Tổng quan để bắt đầu.
            </p>
          )}
          <div className="account-list">
            {jars.map((jar) => (
              <div className="account-row account-wrap" key={jar.id}>
                <div className="account-row-body">
                  <strong>
                    {jar.name} {jar.isArchived && "· Đã lưu trữ"}
                  </strong>
                  <small>
                    {jar.policy.kind} · {formatEther(BigInt(jar.balanceWei))}{" "}
                    AVAX · Giữ chỗ {formatEther(BigInt(jar.reservedWei))} AVAX
                  </small>
                </div>
                {!jar.isArchived && (
                  <div className="account-inline">
                    {["SHIELD", "SAVINGS"].includes(jar.policy.kind) && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void prepare("JAR_LIMIT", {
                            jarId: jar.id,
                            dailyLimit:
                              limits[jar.id] ??
                              formatEther(BigInt(jar.policy.dailyLimitWei)),
                          });
                        }}
                      >
                        <label
                          className="account-sr-only"
                          htmlFor={`limit-${jar.id}`}
                        >
                          Hạn mức AVAX của {jar.name}
                        </label>
                        <input
                          id={`limit-${jar.id}`}
                          aria-label={`Hạn mức AVAX của ${jar.name}`}
                          className="account-input compact"
                          inputMode="decimal"
                          required
                          value={
                            limits[jar.id] ??
                            formatEther(BigInt(jar.policy.dailyLimitWei))
                          }
                          onChange={(e) =>
                            setLimits({ ...limits, [jar.id]: e.target.value })
                          }
                        />
                        <button
                          className="account-button secondary"
                          disabled={busy}
                        >
                          Đổi hạn mức
                        </button>
                      </form>
                    )}
                    <button
                      className="account-button subtle"
                      disabled={busy}
                      onClick={() =>
                        void prepare("ARCHIVE_JAR", { jarId: jar.id })
                      }
                    >
                      Lưu trữ hũ
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      {tab === "activity" && (
        <section className="account-card">
          <div className="account-card-heading">
            <div>
              <h2>Nhật ký quản trị</h2>
              <p>
                200 yêu cầu gần nhất của gia đình này. Dữ liệu giao dịch nằm
                trong từng hũ.
              </p>
            </div>
          </div>
          {!data.history.length && (
            <p className="account-empty">Chưa có thao tác quản trị.</p>
          )}
          {data.history.map((item: any) => (
            <div className="account-row" key={item.id}>
              <History size={20} />
              <div className="account-row-body">
                <strong>{labels[item.action] || item.action}</strong>
                <small>
                  {date(item.createdAt)} ·{" "}
                  {item.status === "COMPLETED"
                    ? "Đã xác nhận"
                    : Date.parse(item.expiresAt) < Date.now()
                      ? "Hết hạn"
                      : "Chờ ký"}
                </small>
                <code>{item.id}</code>
              </div>
              <span className="account-badge neutral">v{item.revision}</span>
            </div>
          ))}
        </section>
      )}
      {tab === "reports" && (
        <section className="account-card">
          <div className="account-card-heading">
            <div>
              <h2>Xuất sổ giao dịch</h2>
              <p>
                CSV gồm trạng thái, số tiền wei chính xác và tx hash. Tối đa 366
                ngày hoặc 10.000 giao dịch.
              </p>
            </div>
          </div>
          <form
            className="account-form"
            onSubmit={(e) => {
              e.preventDefault();
              void prepare("EXPORT", {
                from: `${from}T00:00:00+07:00`,
                to: `${to}T23:59:59.999+07:00`,
              });
            }}
          >
            <div className="account-fields">
              <label>
                Từ ngày
                <input
                  className="account-input"
                  type="date"
                  required
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label>
                Đến hết ngày
                <input
                  className="account-input"
                  type="date"
                  required
                  min={from}
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
            </div>
            <button className="account-button" disabled={busy}>
              <FileDown size={17} />
              Xem lại & xuất CSV
            </button>
          </form>
        </section>
      )}
      {tab === "configuration" && (
        <>
          <section className="account-card">
            <div className="account-card-heading">
              <div>
                <h2>Thông tin gia đình</h2>
                <p>Mọi thay đổi yêu cầu chữ ký của ví chủ nhà đã xác minh.</p>
              </div>
              <Link className="account-text-link" href="/settings">
                Cài đặt cá nhân <ArrowUpRight size={16} />
              </Link>
            </div>
            <form
              className="account-form"
              onSubmit={(e) => {
                e.preventDefault();
                void prepare("RENAME", { name });
              }}
            >
              <label>
                Tên gia đình
                <input
                  className="account-input"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <button
                className="account-button"
                disabled={busy || name.trim() === data.workspace.name}
              >
                Xem lại thay đổi
              </button>
            </form>
          </section>
          <section className="account-card">
            <div className="account-card-heading">
              <div>
                <h2>Kiểm soát vận hành</h2>
                <p>
                  Tạm dừng chặn yêu cầu chi mới trong sổ cái ứng dụng. Lưu trữ
                  yêu cầu gia đình không còn tiền, nghĩa vụ hoặc hũ contract
                  hoạt động.
                </p>
              </div>
            </div>
            <label className="account-field">
              Lý do thao tác
              <textarea
                className="account-input"
                required
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ghi rõ lý do để gia đình cùng theo dõi"
              />
            </label>
            <div className="account-card-footer">
              <button
                className="account-button secondary"
                disabled={busy || !reason.trim() || data.state.archived}
                onClick={() =>
                  void prepare(data.state.outgoingPaused ? "RESUME" : "PAUSE", {
                    reason,
                  })
                }
              >
                {data.state.outgoingPaused
                  ? "Tiếp tục yêu cầu chi"
                  : "Tạm dừng yêu cầu chi"}
              </button>
              <button
                className="account-button danger"
                disabled={busy || !reason.trim()}
                onClick={() =>
                  void prepare(data.state.archived ? "RESTORE" : "ARCHIVE", {
                    reason,
                  })
                }
              >
                {data.state.archived
                  ? "Khôi phục gia đình"
                  : "Lưu trữ gia đình"}
              </button>
            </div>
          </section>
        </>
      )}
      {membersOpen && (
        <MemberManagementModal
          isOpen
          onClose={() => {
            setMembersOpen(false);
            void run(load);
          }}
        />
      )}
      {intent && (
        <div className="account-overlay">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-intent-title"
            className="account-dialog"
            onKeyDown={(e) => {
              if (e.key === "Escape" && !busy) setIntent(null);
              if (e.key === "Tab") {
                const nodes = Array.from(
                  e.currentTarget.querySelectorAll<HTMLButtonElement>(
                    "button:not(:disabled)",
                  ),
                );
                if (e.shiftKey && document.activeElement === nodes[0]) {
                  e.preventDefault();
                  nodes.at(-1)?.focus();
                } else if (
                  !e.shiftKey &&
                  document.activeElement === nodes.at(-1)
                ) {
                  e.preventDefault();
                  nodes[0]?.focus();
                }
              }
            }}
          >
            <div className="account-card-heading">
              <div>
                <span className="account-eyebrow">XEM LẠI TRƯỚC KHI KÝ</span>
                <h2 id="admin-intent-title">{labels[intent.action]}</h2>
              </div>
              <button
                autoFocus
                aria-label="Đóng xác nhận"
                className="account-button secondary"
                disabled={busy}
                onClick={() => setIntent(null)}
              >
                <X size={19} />
              </button>
            </div>
            <p>
              Gia đình: <strong>{data.workspace.name}</strong>
            </p>
            <p>
              Yêu cầu hết hạn lúc {date(intent.expiresAt)}. Chữ ký xác nhận thay
              đổi trong ứng dụng.
            </p>
            <IntentReview intent={intent} data={data} />
            <details className="account-review-details">
              <summary>Nội dung chữ ký đầy đủ</summary>
              <pre className="account-sign-message">{intent.message}</pre>
            </details>
            {error && (
              <p className="account-message error" role="alert">
                {error}
              </p>
            )}
            <div className="account-card-footer">
              <button
                className="account-button secondary"
                disabled={busy}
                onClick={() => setIntent(null)}
              >
                Quay lại
              </button>
              <button
                className="account-button"
                disabled={busy}
                onClick={() => void execute()}
              >
                {busy ? "Đang xử lý…" : "Ký xác nhận bằng Core"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function IntentReview({ intent, data }: { intent: any; data: any }) {
  const p = intent.payload;
  const jar = data.experience.jars.find((item: any) => item.id === p.jarId);
  const member = data.members.find((item: any) => item.id === p.userId);
  return (
    <div className="account-intent-review">
      {intent.action === "RENAME" && (
        <>
          <span>Tên hiện tại</span>
          <strong>{data.workspace.name}</strong>
          <span>Tên mới</span>
          <strong>{p.name}</strong>
        </>
      )}
      {intent.action === "MEMBER_ACCESS" && (
        <>
          <span>Thành viên</span>
          <strong>{member?.fullName}</strong>
          <span>Thay đổi</span>
          <strong>
            {p.disabled
              ? "Khóa truy cập gia đình này"
              : "Mở lại truy cập gia đình này"}
          </strong>
        </>
      )}
      {jar && (
        <>
          <span>Hũ</span>
          <strong>{jar.name}</strong>
        </>
      )}
      {intent.action === "JAR_LIMIT" && (
        <>
          <span>Hạn mức hiện tại</span>
          <strong>
            {formatEther(BigInt(jar?.policy.dailyLimitWei || "0"))} AVAX/ngày
          </strong>
          <span>Hạn mức mới</span>
          <strong>{formatEther(BigInt(p.dailyLimitWei))} AVAX/ngày</strong>
        </>
      )}
      {p.reason && (
        <>
          <span>Lý do</span>
          <strong>{p.reason}</strong>
        </>
      )}
      {intent.action === "EXPORT" && (
        <>
          <span>Thời gian báo cáo</span>
          <strong>
            {date(p.from)} – {date(p.to)}
          </strong>
        </>
      )}
      {intent.action === "REVOKE_INVITE" && (
        <>
          <span>Ví được mời</span>
          <strong className="account-address">
            {
              data.invitations.find((item: any) => item.id === p.invitationId)
                ?.wallet
            }
          </strong>
        </>
      )}
      {intent.action === "RESTORE" && (
        <p>
          Gia đình sẽ được khôi phục với yêu cầu chi vẫn tạm dừng. Chủ nhà cần
          xác nhận tiếp tục riêng.
        </p>
      )}
      {intent.action === "ARCHIVE_JAR" && (
        <p>
          Chỉ lưu trữ khi hũ không còn tiền, giao dịch hoặc yêu cầu đang xử lý.
        </p>
      )}
    </div>
  );
}
