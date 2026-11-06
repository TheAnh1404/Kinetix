"use client";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HeartHandshake,
  LoaderCircle,
  Phone,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth, authRequest } from "@/hooks/useAuth";
import { useFamily } from "@/context/FamilyContext";
import { useFirstUseStatus } from "@/hooks/useFirstUseStatus";
import { StartShell, startLabels } from "@/components/auth/StartShell";
import { FirstUseChecklist } from "@/components/auth/FirstUseChecklist";
import { MemberManagementModal } from "@/components/dashboard/MemberManagementModal";
import { GuardianAccessPanel } from "@/components/auth/GuardianAccessPanel";
import { ProvisioningPanel } from "@/components/dashboard/ProvisioningPanel";
import { useVaultCreation } from "@/context/VaultCreationContext";
import type { StartProgress, StartStep } from "../../../../shared/startFlow";
import type { FirstUseAction } from "../../../../shared/firstUse";
import "./start.css";

interface StartData {
  workspace: { id: string; name: string };
  role: string;
  canManageMembers: boolean;
  progress: StartProgress;
  steps: StartStep[];
  dashboardUrl: string;
}
function Loading() {
  return (
    <div className="start-loading" role="status">
      <LoaderCircle className="animate-spin" size={28} aria-hidden />
      <p>Đang chuẩn bị khởi đầu của bạn…</p>
    </div>
  );
}

function GuardianContacts({ workspaceId }: { workspaceId: string }) {
  const [contacts, setContacts] = useState<
    { fullName: string; phoneNumber?: string }[] | null
  >(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    void authRequest(
      `/api/member/guardians?workspaceId=${workspaceId}`,
      undefined,
      "GET",
    )
      .then((result) => {
        if (active) {
          setContacts(result.data);
          setError("");
        }
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [workspaceId, retry]);
  return (
    <section
      id="start-contacts"
      className="start-info"
      aria-label="Người bảo hộ được phân công"
    >
      <h3 className="font-bold text-slate-900">Người thân đồng hành</h3>
      {error ? (
        <>
          <p role="alert">{error}</p>
          <button
            className="start-text-button"
            onClick={() => setRetry((value) => value + 1)}
          >
            Thử lại
          </button>
        </>
      ) : !contacts ? (
        <p role="status">Đang tìm người bảo hộ…</p>
      ) : !contacts.length ? (
        <p>
          Chưa có liên hệ được phân công. Hãy nhờ quản trị gia đình bổ sung
          người bảo hộ và số điện thoại.
        </p>
      ) : (
        contacts.map((person, index) => {
          const phone = person.phoneNumber?.replace(/[\s().-]/g, "");
          return (
            <div key={index} className="start-contact">
              <strong>{person.fullName}</strong>
              {phone && /^\+?[0-9]{6,15}$/.test(phone) ? (
                <a href={`tel:${phone}`}>
                  <Phone size={17} aria-hidden />
                  {person.phoneNumber}
                </a>
              ) : (
                <p>Chưa có số điện thoại liên hệ.</p>
              )}
            </div>
          );
        })
      )}
    </section>
  );
}

function StartFlow({ workspaceId }: { workspaceId: string }) {
  const auth = useAuth();
  const family = useFamily();
  const [data, setData] = useState<StartData | null>(null);
  const [error, setError] = useState("");
  const [saving, setBusy] = useState(false);
  const [formBusy, setFormBusy] = useState(false);
  const busy = saving || formBusy;
  const [memberModal, setMemberModal] = useState(false);
  const vaultCreation = useVaultCreation();
  const [invites, setInvites] = useState(false);
  const [provisioning, setProvisioning] = useState(0);
  const writing = useRef(false);
  const active = useRef(true);
  const request = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const readiness = useFirstUseStatus(workspaceId);
  const load = useCallback(async () => {
    const revision = ++request.current;
    try {
      const response = await authRequest(
        `/api/workspaces/${workspaceId}/start`,
        undefined,
        "GET",
      );
      if (active.current && revision === request.current) {
        setData(response.data);
        setError("");
      }
    } catch (err) {
      if (active.current && revision === request.current)
        setError(
          err instanceof Error ? err.message : "Chưa tải được hướng dẫn.",
        );
    }
  }, [workspaceId]);
  useEffect(() => {
    active.current = true;
    void load();
    return () => {
      active.current = false;
      ++request.current;
    };
  }, [load]);
  useEffect(() => {
    if (family.currentWorkspace?.id !== workspaceId)
      void family.switchWorkspace(workspaceId);
  }, [workspaceId, family.currentWorkspace?.id]);
  const terminal = !!data && data.progress.status !== "IN_PROGRESS";
  const step = data ? (terminal ? "FINISH" : data.progress.step) : "WELCOME";
  useEffect(() => {
    heading.current?.focus();
  }, [step, !!data]);
  const save = async (
    nextStep: StartStep,
    status: "IN_PROGRESS" | "COMPLETED" | "DEFERRED" = "IN_PROGRESS",
    restart = false,
  ) => {
    if (!data || writing.current) return;
    writing.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await authRequest(
        `/api/workspaces/${workspaceId}/start`,
        {
          step: nextStep,
          status,
          revision: data.progress.revision,
          ...(restart ? { restart: true } : {}),
        },
        "PATCH",
      );
      if (!active.current) return;
      setData(response.data);
      if (status !== "IN_PROGRESS") {
        const identity = await authRequest(
          `/api/auth/me?workspace=${workspaceId}`,
          undefined,
          "GET",
        );
        if (!active.current) return;
        if (identity.user.id !== auth.user!.id)
          throw new Error("Phiên tài khoản đã thay đổi. Hãy đăng nhập lại.");
        document.cookie = `kinetix_workspace=${auth.user!.id}.${workspaceId}; Path=/; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
        window.location.assign(response.data.dashboardUrl);
      }
    } catch (err: any) {
      if (!active.current) return;
      if (err.code === "START_PROGRESS_CHANGED") await load();
      setError(err.message || "Chưa lưu được bước này. Hãy thử lại.");
    } finally {
      writing.current = false;
      if (active.current) setBusy(false);
    }
  };
  const action = async (kind: FirstUseAction) => {
    if (!data || busy) return;
    if (kind === "MANAGE_MEMBERS" && data.canManageMembers) {
      setMemberModal(true);
      return;
    }
    if (kind === "CREATE_VAULT") {
      vaultCreation.open(() => { void readiness.refresh(); });
      return;
    }
    if (kind === "PROVISION" && data.canManageMembers) {
      setProvisioning((value) => value + 1);
      return;
    }
    if (kind === "CONTACT_GUARDIAN") {
      document
        .getElementById("start-contacts")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (kind === "OPEN_VAULTS") {
      await save("FINISH");
      return;
    }
    if (kind === "CONNECT_WORKSPACE") {
      setBusy(true);
      setError("");
      try {
        await authRequest(
          `/api/workspaces/${workspaceId}/first-use/connect`,
          {},
        );
        await auth.checkSession();
        await family.refreshBalances();
        await readiness.refresh();
      } catch (err) {
        if (active.current)
          setError(
            err instanceof Error
              ? err.message
              : "Chưa kết nối được không gian.",
          );
      } finally {
        if (active.current) setBusy(false);
      }
      return;
    }
    await readiness.refresh();
  };
  if (!data)
    return (
      <div className="start-loading">
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button className="start-secondary" onClick={() => void load()}>
              Kiểm tra lại
            </button>
            <button
              className="start-text-button"
              onClick={() =>
                void auth.logout().catch((err) => setError(err.message))
              }
            >
              Đăng xuất
            </button>
          </>
        ) : (
          <Loading />
        )}
      </div>
    );
  const roleNames: Record<string, string> = {
    ADMIN: "Quản trị gia đình",
    GUARDIAN: "Người bảo hộ",
    ELDERLY: "Thành viên được chăm sóc",
    CHILD: "Thành viên nhỏ tuổi",
  };
  const isDependent = data.role === "ELDERLY" || data.role === "CHILD";
  const scoped = family.currentWorkspace?.id === workspaceId;
  const index = data.steps.indexOf(step);
  return (
    <StartShell
      name={auth.user!.fullName}
      familyName={data.workspace.name}
      role={data.role}
      step={step}
      steps={data.steps}
      busy={busy}
      onLogout={() => void auth.logout().catch((err) => setError(err.message))}
    >
      <div className="start-welcome-icon">
        {step === "WELCOME" ? (
          <HeartHandshake size={30} aria-hidden />
        ) : step === "FAMILY" ? (
          <Users size={30} aria-hidden />
        ) : step === "READINESS" ? (
          <Wallet size={30} aria-hidden />
        ) : (
          <ShieldCheck size={30} aria-hidden />
        )}
      </div>
      <span className="start-role">{roleNames[data.role]}</span>
      <h2 ref={heading} tabIndex={-1}>
        {step === "WELCOME"
          ? `Chào ${auth.user!.fullName}, bắt đầu nhé!`
          : step === "FAMILY"
            ? "Những người cùng bạn vun đắp"
            : step === "READINESS"
              ? "Từng bước để an tâm sử dụng"
              : terminal
                ? "Không gian của bạn vẫn ở đây"
                : "Một khởi đầu đã sẵn sàng"}
      </h2>
      {step === "WELCOME" && (
        <>
          <p className="start-description">
            Chào mừng bạn đến với <strong>{data.workspace.name}</strong>. Chúng
            ta sẽ cùng xem những điều cần biết trước khi sử dụng.
          </p>
          <ul className="start-benefits">
            <li>
              <CheckCircle2 size={20} aria-hidden />
              Tài khoản riêng, không gian gia đình chung.
            </li>
            <li>
              <CheckCircle2 size={20} aria-hidden />
              Bạn đã xác minh ví cá nhân. Mở Core khi cần ký giao dịch.
            </li>
            <li>
              <CheckCircle2 size={20} aria-hidden />
              Có thể tiếp tục các bước còn lại sau, không cần nạp tiền lúc này.
            </li>
          </ul>
          <p className="start-info">
            {data.role === "CHILD"
              ? "Con sẽ xem việc nhà, gửi kết quả và theo dõi phần thưởng cùng người bảo hộ."
              : data.role === "ELDERLY"
                ? "Bạn sẽ xem hũ hỗ trợ và luôn được xem lại thông tin trước khi rút tiền."
                : "Bắt đầu từ người thân, sau đó đến các hũ và quy tắc sử dụng phù hợp với gia đình."}
          </p>
        </>
      )}
      {step === "FAMILY" && (
        <>
          <p className="start-description">
            {data.canManageMembers
              ? "Mỗi người có tài khoản và ví riêng. Bạn có thể thêm người thân ngay, hoặc quay lại sau khi đã làm quen."
              : "Bạn đã tham gia gia đình với vai trò người bảo hộ. Quyền quản lý thành viên và quyền ký duyệt hũ được phân công riêng."}
          </p>
          {scoped ? (
            <>
              <div className="start-info">
                <strong>{data.workspace.name}</strong>
                <p>
                  {family.members.length} thành viên trong không gian hiện tại.
                </p>
              </div>
              {data.canManageMembers && (
                <div className="start-actions">
                  <button
                    className="start-secondary"
                    disabled={busy}
                    onClick={() => setMemberModal(true)}
                  >
                    <Users size={18} aria-hidden />
                    Thêm và quản lý người thân
                  </button>
                  {data.role === "ADMIN" && (
                    <button
                      className="start-secondary"
                      disabled={busy}
                      onClick={() => setInvites((value) => !value)}
                    >
                      Mời người bảo hộ
                    </button>
                  )}
                </div>
              )}
              {invites && data.role === "ADMIN" && (
                <GuardianAccessPanel onBusyChange={setFormBusy} />
              )}
            </>
          ) : (
            <p role="status">Đang mở đúng không gian gia đình…</p>
          )}
          <p className="start-description">
            Thêm thành viên vào gia đình chưa tự cấp quyền sử dụng hũ. Người
            nhận tài khoản tạm cần đổi mật khẩu và liên kết Core của mình.
          </p>
        </>
      )}
      {step === "READINESS" && (
        <>
          <p className="start-description">
            Tài khoản đã kích hoạt. Quyền giao dịch, hũ và số tiền sử dụng được
            kiểm riêng. Bạn không cần chờ các bước này để vào xem không gian.
          </p>
          {readiness.error && (
            <p className="start-error" role="alert">
              {readiness.error}
            </p>
          )}
          {readiness.data ? (
            <FirstUseChecklist
              steps={readiness.data.steps.filter((item) =>
                isDependent
                  ? ["permission", "vault", "first-use"].includes(item.id)
                  : !["account", "members"].includes(item.id),
              )}
              busy={busy || !scoped}
              onAction={(kind) => void action(kind)}
            />
          ) : (
            !readiness.error && (
              <p role="status">Đang kiểm tra những bước còn chờ…</p>
            )
          )}
          <button
            className="start-text-button"
            disabled={busy}
            onClick={() => void readiness.refresh()}
          >
            Kiểm tra lại trạng thái
          </button>
          {isDependent && <GuardianContacts workspaceId={workspaceId} />}
          {scoped && !isDependent && <button className="start-secondary" disabled={busy} onClick={() => vaultCreation.open(() => { void readiness.refresh(); })}>Chuẩn bị bản nháp hũ tiền</button>}
          {scoped && data.canManageMembers && provisioning > 0 && (
            <ProvisioningPanel
              openRequest={provisioning}
              onBusyChange={setFormBusy}
            />
          )}
        </>
      )}
      {step === "FINISH" && (
        <>
          <p className="start-description">
            {terminal
              ? "Bạn đã xem hướng dẫn hoặc chọn thiết lập sau. Có thể vào không gian ngay, hoặc mở lại các bước khi cần."
              : "Bạn đã đi qua phần khởi đầu. Tiến độ được lưu theo tài khoản và gia đình, kể cả khi đăng nhập trên thiết bị khác."}
          </p>
          <ul className="start-benefits">
            <li>
              <CheckCircle2 size={20} aria-hidden />
              Tài khoản và ví cá nhân đã xác minh.
            </li>
            <li>
              <CheckCircle2 size={20} aria-hidden />
              Vai trò của bạn: {roleNames[data.role]}.
            </li>
            <li>
              <CheckCircle2 size={20} aria-hidden />
              Những bước chờ người thân hoặc người vận hành có thể làm sau.
            </li>
          </ul>
          <p className="start-info">
            Hoàn tất hướng dẫn không có nghĩa là đã được cấp quyền chi tiền. Mỗi
            thao tác tài chính vẫn được kiểm tra và cần bạn xác nhận đúng ví.
          </p>
          {terminal && (
            <button
              className="start-secondary"
              disabled={busy}
              onClick={() =>
                void save(
                  data.progress.status === "DEFERRED"
                    ? data.progress.step
                    : "WELCOME",
                  "IN_PROGRESS",
                  true,
                )
              }
            >
              {data.progress.status === "DEFERRED"
                ? "Tiếp tục bước còn lại"
                : "Xem lại từ đầu"}
            </button>
          )}
        </>
      )}
      {error && (
        <p className="start-error" role="alert">
          {error}
        </p>
      )}
      <div className="start-bottom">
        {index > 0 && !terminal && (
          <button
            type="button"
            className="start-text-button"
            disabled={busy}
            onClick={() => void save(data.steps[index - 1])}
          >
            <ArrowLeft size={17} aria-hidden />
            Quay lại
          </button>
        )}
        <div className="start-bottom-right">
          <span className="text-xs text-slate-500">{startLabels[step]}</span>
          <button
            type="button"
            className="start-primary"
            disabled={busy}
            onClick={() =>
              terminal
                ? window.location.assign(data.dashboardUrl)
                : void save(
                    step === "FINISH" ? "FINISH" : data.steps[index + 1],
                    step === "FINISH" ? "COMPLETED" : "IN_PROGRESS",
                  )
            }
          >
            {busy ? (
              <LoaderCircle className="animate-spin" size={18} aria-hidden />
            ) : step === "FINISH" ? (
              "Vào không gian của tôi"
            ) : step === "WELCOME" ? (
              "Bắt đầu thiết lập"
            ) : (
              "Tiếp tục"
            )}
            <ArrowRight size={18} aria-hidden />
          </button>
        </div>
      </div>
      {!terminal && step !== "FINISH" && (
        <div className="start-defer">
          <button
            type="button"
            className="start-text-button"
            disabled={busy}
            onClick={() => void save(step, "DEFERRED")}
          >
            Sử dụng trước, thiết lập sau
          </button>
        </div>
      )}
      {scoped && data.canManageMembers && (
        <MemberManagementModal
          isOpen={memberModal}
          onClose={() => {
            setMemberModal(false);
            void readiness.refresh();
          }}
        />
      )}

    </StartShell>
  );
}

function StartEntry() {
  const auth = useAuth();
  const query = useSearchParams();
  const router = useRouter();
  const workspaceId = query.get("workspace") || auth.entryWorkspaceId;
  const allowed = auth.workspaces.some(
    (workspace) => workspace.id === workspaceId,
  );
  useEffect(() => {
    if (auth.isLoading || auth.sessionError) return;
    if (!auth.user) router.replace("/login");
    else if (auth.onboarding !== "READY") router.replace("/activate");
  }, [
    auth.isLoading,
    auth.user?.id,
    auth.onboarding,
    auth.sessionError,
    router,
  ]);
  if (auth.isLoading) return <Loading />;
  if (auth.sessionError)
    return (
      <div className="start-loading">
        <p role="alert">{auth.sessionError}</p>
        <button
          className="start-secondary"
          onClick={() => void auth.checkSession()}
        >
          Kiểm tra lại
        </button>
      </div>
    );
  if (!auth.user || auth.onboarding !== "READY") return <Loading />;
  if (!workspaceId || !allowed)
    return (
      <div className="start-loading">
        <h1>Không tìm thấy không gian đang hoạt động</h1>
        <p>Liên hệ quản trị gia đình để kiểm tra quyền thành viên.</p>
        <button
          className="start-secondary"
          onClick={() => void auth.checkSession()}
        >
          Kiểm tra lại
        </button>
      </div>
    );
  return (
    <StartFlow
      key={`${auth.user.id}:${workspaceId}`}
      workspaceId={workspaceId}
    />
  );
}
export default function StartPage() {
  return (
    <Suspense fallback={<Loading />}>
      <StartEntry />
    </Suspense>
  );
}
