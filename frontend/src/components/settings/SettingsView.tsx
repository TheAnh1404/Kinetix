"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  UserRound,
  ShieldCheck,
  Wallet,
  SlidersHorizontal,
  Home,
  Monitor,
  Copy,
  ArrowUpRight,
  LogOut,
  Sun,
  Moon,
  Bell,
  EyeOff,
  Volume2,
} from "lucide-react";
import { useAuth, authRequest } from "@/hooks/useAuth";
import { useFamily } from "@/context/FamilyContext";
import { useSettings } from "@/context/SettingsContext";
import { useWorkspaceAccess } from "@/hooks/useWorkspaceAccess";
import { isWorkspaceOwner } from "../../../../shared/workspacePermissions";
import "./account.css";

export type SettingsSection =
  | "family_setup"
  | "identity"
  | "allowances"
  | "security_wallets"
  | "audit_logs"
  | "workspace"
  | "account_security"
  | "profile"
  | "preferences"
  | "security"
  | "wallet"
  | "family";
type Tab = "profile" | "security" | "wallet" | "preferences" | "family";
const sections = [
  { id: "profile", title: "Hồ sơ cá nhân", Icon: UserRound },
  { id: "security", title: "Bảo mật", Icon: ShieldCheck },
  { id: "wallet", title: "Ví & mạng lưới", Icon: Wallet },
  { id: "preferences", title: "Tùy chọn", Icon: SlidersHorizontal },
  { id: "family", title: "Gia đình", Icon: Home },
] as const;
function resolveTab(tab?: SettingsSection): Tab {
  return tab === "identity"
    ? "profile"
    : tab === "account_security"
      ? "security"
      : tab === "security_wallets"
        ? "wallet"
        : ["family_setup", "allowances", "audit_logs", "workspace"].includes(
              tab || "",
            )
          ? "family"
          : sections.some((section) => section.id === tab)
            ? (tab as Tab)
            : "profile";
}
type Props = {
  initialTab?: SettingsSection;
  onTabChange?: (tab: SettingsSection) => void;
  isStandalonePage?: boolean;
};
export function SettingsView(props: Props) {
  const auth = useAuth();
  const family = useFamily();
  return (
    <SettingsAccount
      key={`${auth.user?.id}:${family.currentWorkspace?.id}`}
      {...props}
    />
  );
}
function SettingsAccount({ initialTab, onTabChange }: Props) {
  const auth = useAuth();
  const family = useFamily();
  const settings = useSettings();
  const access = useWorkspaceAccess();
  const [tab, setTab] = useState<Tab>(resolveTab(initialTab));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fullName, setFullName] = useState(auth.user?.fullName || "");
  const [phoneNumber, setPhoneNumber] = useState(auth.user?.phoneNumber || "");
  const [avatarUrl, setAvatarUrl] = useState(auth.user?.avatarUrl || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [prefs, setPrefs] = useState<any>(null);
  const [prefError, setPrefError] = useState("");
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    setTab(resolveTab(initialTab));
  }, [initialTab]);
  const loadSessions = async () => {
    const response = await authRequest("/api/auth/sessions", undefined, "GET");
    if (alive.current) {
      setSessions(response.sessions);
      setSessionId(response.currentSessionId);
      setSessionsLoaded(true);
    }
  };
  const loadPrefs = async () => {
    const response = await authRequest(
      `/api/settings/overview${family.currentWorkspace ? `?workspaceId=${family.currentWorkspace.id}` : ""}`,
      undefined,
      "GET",
    );
    if (alive.current) {
      setPrefs(response.data.preferences);
      settings.setPrivacyHideBalance(
        !!response.data.preferences.privacyHideBalance,
      );
      setPrefError("");
    }
  };
  useEffect(() => {
    void loadPrefs().catch((err) => alive.current && setPrefError(err.message));
  }, []);
  useEffect(() => {
    if (tab === "security")
      void loadSessions().catch(
        (err) => alive.current && setError(err.message),
      );
  }, [tab]);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (err: any) {
      if (alive.current)
        setError(err.message || "Chưa thể hoàn tất. Vui lòng thử lại.");
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const select = (id: Tab) => {
    setTab(id);
    setError("");
    setNotice("");
    setCurrentPassword("");
    setNewPassword("");
    setRepeatPassword("");
    onTabChange?.(id);
  };
  const savePrefs = (patch: Record<string, unknown>) =>
    run(async () => {
      const result = await authRequest(
        "/api/settings/preferences",
        { ...patch, workspaceId: family.currentWorkspace?.id },
        "PUT",
      );
      if (!alive.current) return;
      setPrefs(result.preferences);
      if (typeof patch.privacyHideBalance === "boolean")
        settings.setPrivacyHideBalance(patch.privacyHideBalance);
      setNotice("Đã lưu tùy chọn tài khoản.");
    });
  const initials =
    fullName
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "K";
  const uploadAvatar = (file?: File) =>
    run(async () => {
      if (!file) return;
      if (
        !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
        file.size > 5 * 1024 * 1024
      )
        throw new Error("Chọn ảnh PNG, JPG hoặc WebP không quá 5 MB.");
      const bitmap = await createImageBitmap(file);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Trình duyệt chưa hỗ trợ xử lý ảnh.");
        const side = Math.min(bitmap.width, bitmap.height);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, 256, 256);
        context.drawImage(
          bitmap,
          (bitmap.width - side) / 2,
          (bitmap.height - side) / 2,
          side,
          side,
          0,
          0,
          256,
          256,
        );
        if (alive.current) {
          setAvatarUrl(canvas.toDataURL("image/jpeg", 0.85));
          setNotice("Ảnh đã sẵn sàng. Chọn Lưu thay đổi để cập nhật hồ sơ.");
        }
      } finally {
        bitmap.close();
      }
    });
  return (
    <div className="account-ui">
      <header className="account-heading">
        <div>
          <span className="account-eyebrow">TÀI KHOẢN KINETIX</span>
          <h1>Cài đặt</h1>
          <p>
            Thông tin cá nhân, bảo mật và trải nghiệm của bạn, ở cùng một nơi.
          </p>
        </div>
        <span className="account-badge neutral">
          <UserRound size={14} /> Tài khoản cá nhân
        </span>
      </header>
      <div className="account-layout">
        <aside className="account-sidebar">
          <nav className="account-nav" aria-label="Các mục cài đặt">
            {sections.map(({ id, title, Icon }) => (
              <button
                key={id}
                aria-current={tab === id ? "page" : undefined}
                onClick={() => select(id)}
              >
                <Icon size={19} aria-hidden="true" />
                {title}
              </button>
            ))}
          </nav>
          <div className="account-sidebar-note">
            <strong>
              {family.currentWorkspace?.name || "Chưa chọn gia đình"}
            </strong>
            {access.isOwner
              ? "Bạn là chủ nhà trong gia đình này."
              : "Bạn sử dụng quyền thành viên trong gia đình này."}
            <p>Thiết lập tài khoản theo bạn khi chuyển gia đình.</p>
          </div>
        </aside>
        <div className="account-content">
          {error && (
            <p className="account-message error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="account-message success" role="status">
              {notice}
            </p>
          )}
          {tab === "profile" && (
            <>
              <section className="account-card">
                <CardHeading
                  title="Hồ sơ cá nhân"
                  description="Cách bạn xuất hiện với người thân trong các gia đình tham gia."
                />
                <div className="account-row">
                  <span className="account-avatar large">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Ảnh đại diện xem trước" />
                    ) : (
                      initials
                    )}
                  </span>
                  <div className="account-row-body">
                    <strong>{auth.user?.fullName}</strong>
                    <small>
                      @{auth.user?.username || "Chưa thiết lập tên đăng nhập"}
                    </small>
                  </div>
                  <label className="account-avatar-upload">
                    Chọn ảnh mới
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={busy}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        void uploadAvatar(file);
                      }}
                    />
                    <small>PNG, JPG, WebP · Tối đa 5 MB</small>
                  </label>
                  {avatarUrl && (
                    <button
                      className="account-button subtle"
                      disabled={busy}
                      onClick={() => setAvatarUrl("")}
                    >
                      Xóa ảnh
                    </button>
                  )}
                </div>
                <form
                  className="account-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      await authRequest(
                        "/api/user/profile",
                        {
                          fullName: fullName.trim(),
                          phoneNumber: phoneNumber.trim() || null,
                          avatarUrl: avatarUrl.trim() || null,
                        },
                        "PUT",
                      );
                      if (!alive.current) return;
                      await auth.checkSession();
                      if (alive.current) setNotice("Đã lưu hồ sơ cá nhân.");
                    });
                  }}
                >
                  <div className="account-fields">
                    <label>
                      Họ và tên
                      <input
                        className="account-input"
                        autoComplete="name"
                        required
                        maxLength={100}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </label>
                    <label>
                      Số điện thoại <small>Không bắt buộc</small>
                      <input
                        className="account-input"
                        type="tel"
                        autoComplete="tel"
                        maxLength={25}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                    </label>
                  </div>
                  {!avatarUrl.startsWith("data:") && (
                    <label>
                      Đường dẫn ảnh đại diện{" "}
                      <small>Không bắt buộc · URL HTTPS</small>
                      <input
                        className="account-input"
                        type="url"
                        placeholder="https://…"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                      />
                    </label>
                  )}
                  <button
                    className="account-button"
                    disabled={busy || !fullName.trim()}
                  >
                    {busy ? "Đang lưu…" : "Lưu thay đổi"}
                  </button>
                </form>
              </section>
              <section className="account-card">
                <div className="account-row">
                  <LogOut size={21} />
                  <RowText
                    title="Kết thúc phiên trên thiết bị này"
                    description="Bạn có thể đăng nhập lại bằng thông tin tài khoản hoặc Core."
                  />
                  <button
                    className="account-button secondary"
                    disabled={busy}
                    onClick={() => void run(auth.logout)}
                  >
                    Đăng xuất
                  </button>
                </div>
              </section>
            </>
          )}
          {tab === "security" && (
            <>
              <section className="account-card">
                <CardHeading
                  title="Mật khẩu đăng nhập"
                  description="Dùng mật khẩu riêng cho Kinetix. Đổi mật khẩu sẽ kết thúc các phiên đăng nhập."
                />
                <form
                  className="account-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      if (newPassword !== repeatPassword)
                        throw new Error("Mật khẩu xác nhận chưa khớp.");
                      await auth.changePassword(currentPassword, newPassword);
                    });
                  }}
                >
                  <label>
                    Mật khẩu hiện tại
                    <input
                      className="account-input"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </label>
                  <div className="account-fields">
                    <label>
                      Mật khẩu mới
                      <input
                        className="account-input"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={12}
                        maxLength={128}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </label>
                    <label>
                      Nhập lại mật khẩu mới
                      <input
                        className="account-input"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={12}
                        maxLength={128}
                        value={repeatPassword}
                        onChange={(e) => setRepeatPassword(e.target.value)}
                      />
                    </label>
                  </div>
                  <small>
                    Tối thiểu 12 ký tự; kết hợp chữ hoa, chữ thường, số và ký tự
                    đặc biệt.
                  </small>
                  <button className="account-button" disabled={busy}>
                    Đổi mật khẩu
                  </button>
                </form>
              </section>
              <section className="account-card">
                <CardHeading
                  title="Thiết bị & phiên đăng nhập"
                  description="Thu hồi phiên không nhận ra. Các phiên này thuộc tài khoản của bạn."
                />
                <div className="account-row">
                  <button
                    className="account-button secondary"
                    disabled={busy}
                    onClick={() => void run(loadSessions)}
                  >
                    Tải lại danh sách
                  </button>
                </div>
                {!sessionsLoaded && (
                  <p className="account-empty" role="status">
                    Chưa tải được danh sách phiên.
                  </p>
                )}
                {sessions.map((session) => (
                  <div className="account-row" key={session.id}>
                    <Monitor size={21} />
                    <RowText
                      title={
                        session.id === sessionId
                          ? "Thiết bị hiện tại"
                          : "Phiên đăng nhập khác"
                      }
                      description={`Hoạt động: ${new Date(session.lastSeenAt).toLocaleString("vi-VN")} · Hết hạn: ${new Date(session.expiresAt).toLocaleString("vi-VN")}`}
                    />
                    {session.id === sessionId ? (
                      <span className="account-badge">Đang dùng</span>
                    ) : (
                      <button
                        className="account-button secondary"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await authRequest(
                              `/api/auth/sessions/${session.id}`,
                              undefined,
                              "DELETE",
                            );
                            await loadSessions();
                            if (alive.current)
                              setNotice("Đã thu hồi phiên đăng nhập.");
                          })
                        }
                      >
                        Thu hồi
                      </button>
                    )}
                  </div>
                ))}
              </section>
              <section className="account-card">
                <div className="account-row">
                  <ShieldCheck size={22} />
                  <RowText
                    title="Xác thực lại bằng ví Core"
                    description="Xác minh bạn đang giữ ví đã liên kết trước thao tác nhạy cảm."
                  />
                  <button
                    className="account-button secondary"
                    disabled={busy || !auth.linkedWallet}
                    onClick={() =>
                      void run(async () => {
                        await auth.reauthenticate();
                        if (alive.current)
                          setNotice("Đã xác thực lại bằng chữ ký Core.");
                      })
                    }
                  >
                    Xác thực lại
                  </button>
                </div>
              </section>
            </>
          )}
          {tab === "wallet" && (
            <>
              <section className="account-card">
                <CardHeading
                  title="Ví Core đã liên kết"
                  description="Ví được xác minh bằng chữ ký trong quy trình đăng nhập hoặc liên kết."
                />
                <div className="account-row">
                  <span className="account-avatar">
                    <Wallet size={22} />
                  </span>
                  <div className="account-row-body">
                    <strong>Ví tài khoản</strong>
                    <small className="account-address">
                      {auth.linkedWallet?.address || "Chưa liên kết ví"}
                    </small>
                  </div>
                  {auth.linkedWallet && (
                    <button
                      className="account-button secondary"
                      aria-label="Sao chép địa chỉ ví"
                      onClick={() =>
                        void run(async () => {
                          await navigator.clipboard.writeText(
                            auth.linkedWallet!.address,
                          );
                          if (alive.current)
                            setNotice("Đã sao chép địa chỉ ví.");
                        })
                      }
                    >
                      <Copy size={17} />
                    </button>
                  )}
                </div>
                <div className="account-row">
                  <RowText
                    title="Kết nối trên thiết bị này"
                    description={
                      auth.connectedAddress
                        ? `${auth.connectedAddress}${auth.walletMatches ? " · Khớp ví tài khoản" : " · Chưa khớp ví tài khoản"}`
                        : "Kết nối Core khi cần ký giao dịch."
                    }
                  />
                  <button
                    className="account-button secondary"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        if (auth.connectedAddress) auth.disconnectWallet();
                        else await auth.connectWallet();
                      })
                    }
                  >
                    {auth.connectedAddress ? "Ngắt kết nối" : "Kết nối Core"}
                  </button>
                </div>
                <div className="account-card-footer">
                  <Link className="account-text-link" href="/dashboard">
                    Mở khôi phục ví tại gia đình <ArrowUpRight size={16} />
                  </Link>
                </div>
              </section>
              <section className="account-card">
                <CardHeading
                  title="Mạng & phí giao dịch"
                  description="Mạng đang vận hành của các hũ sử dụng ví kho tiền dự án."
                />
                <div className="account-row">
                  <RowText
                    title="Avalanche Fuji C-Chain"
                    description="Chain ID 43113 · Token testnet AVAX"
                  />
                  <span className="account-badge neutral">Testnet</span>
                </div>
                <div className="account-row">
                  <RowText
                    title="Phí mạng bằng AVAX"
                    description="Core hiển thị phí trước khi ký. Địa chỉ nhận và số tiền được kiểm tra theo yêu cầu giao dịch."
                  />
                </div>
              </section>
            </>
          )}
          {tab === "preferences" && (
            <>
              <section className="account-card">
                <CardHeading
                  title="Hiển thị & âm thanh"
                  description="Những tùy chọn này được lưu trên thiết bị bạn đang dùng."
                />
                <ToggleRow
                  Icon={settings.theme === "dark" ? Moon : Sun}
                  title="Giao diện tối"
                  description="Tối ưu độ tương phản cho ban đêm và màn hình OLED."
                  value={settings.theme === "dark"}
                  onChange={() => settings.toggleTheme()}
                />
                <ToggleRow
                  Icon={Volume2}
                  title="Âm thanh thao tác"
                  description="Phản hồi âm thanh cho các thao tác được hỗ trợ."
                  value={settings.soundEnabled}
                  onChange={() =>
                    settings.setSoundEnabled(!settings.soundEnabled)
                  }
                />
              </section>
              <section className="account-card">
                <CardHeading
                  title="Quyền riêng tư & thông báo"
                  description="Đồng bộ theo tài khoản. Cảnh báo bảo mật luôn được giữ bật."
                />
                {prefError ? (
                  <div className="account-empty" role="alert">
                    <p>{prefError}</p>
                    <button
                      className="account-button secondary"
                      onClick={() => void run(loadPrefs)}
                    >
                      Thử lại
                    </button>
                  </div>
                ) : !prefs ? (
                  <p className="account-empty" role="status">
                    Đang tải tùy chọn…
                  </p>
                ) : (
                  <>
                    <ToggleRow
                      Icon={EyeOff}
                      title="Ẩn số dư khi xem"
                      description="Che số tiền trên những màn hình hỗ trợ chế độ riêng tư."
                      value={prefs.privacyHideBalance}
                      disabled={busy}
                      onChange={() =>
                        void savePrefs({
                          privacyHideBalance: !prefs.privacyHideBalance,
                        })
                      }
                    />
                    <ToggleRow
                      Icon={Bell}
                      title="Thông báo giao dịch"
                      description="Lưu lựa chọn nhận thông báo giao dịch trong ứng dụng."
                      value={prefs.notificationConfig?.transactions !== false}
                      disabled={busy}
                      onChange={() =>
                        void savePrefs({
                          notificationConfig: {
                            ...prefs.notificationConfig,
                            transactions:
                              prefs.notificationConfig?.transactions === false,
                          },
                        })
                      }
                    />
                    <ToggleRow
                      Icon={Bell}
                      title="Thông báo việc nhà"
                      description="Lưu lựa chọn nhận cập nhật việc nhà của gia đình."
                      value={prefs.notificationConfig?.chores !== false}
                      disabled={busy}
                      onChange={() =>
                        void savePrefs({
                          notificationConfig: {
                            ...prefs.notificationConfig,
                            chores: prefs.notificationConfig?.chores === false,
                          },
                        })
                      }
                    />
                    <div className="account-row">
                      <RowText
                        title="Đơn vị hiển thị"
                        description="AVAX · Giữ nguyên số tiền, không quy đổi tỷ giá ước tính."
                      />
                      <span className="account-badge neutral">AVAX</span>
                    </div>
                  </>
                )}
              </section>
            </>
          )}
          {tab === "family" && (
            <>
              <div className="account-scope">
                <Home size={21} />
                <p>
                  <strong>
                    Quyền của bạn được kiểm tra riêng ở từng gia đình.
                  </strong>{" "}
                  Tạo gia đình cho bạn quyền chủ nhà tại đó. Tham gia gia đình
                  khác giữ quyền thành viên tại nơi được mời.
                </p>
              </div>
              <section className="account-card">
                <div className="account-card-heading">
                  <div>
                    <h2>Gia đình đang mở</h2>
                    <p>
                      {family.currentWorkspace?.name || "Chưa chọn gia đình"}
                    </p>
                  </div>
                  <span
                    className={`account-badge ${access.isOwner ? "" : "neutral"}`}
                  >
                    {access.isOwner ? "Chủ nhà" : "Thành viên"}
                  </span>
                </div>
                <div className="account-row">
                  <ShieldCheck size={24} />
                  <RowText
                    title={
                      access.isOwner
                        ? "Khu quản trị riêng của gia đình"
                        : "Không gian thành viên"
                    }
                    description={
                      access.isOwner
                        ? "Thành viên, chính sách hũ, kiểm soát vận hành và báo cáo được quản lý tại đây."
                        : "Nạp tiền, yêu cầu nhận tiền và tham gia hụi theo quyền được giao trong từng hũ."
                    }
                  />
                  <Link
                    className="account-button"
                    href={access.isOwner ? "/dashboard/admin" : "/dashboard"}
                  >
                    {access.isOwner ? "Mở quản trị" : "Về gia đình"}
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              </section>
              <section className="account-card">
                <CardHeading
                  title="Các gia đình của bạn"
                  description="Chuyển gia đình để xem đúng quyền và số liệu tương ứng."
                />
                {auth.workspaces.map((workspace) => (
                  <div className="account-row" key={workspace.id}>
                    <span className="account-avatar">
                      <Home size={21} />
                    </span>
                    <RowText
                      title={workspace.name}
                      description={
                        isWorkspaceOwner(auth.user?.id, workspace)
                          ? "Gia đình bạn tạo · Chủ nhà"
                          : "Gia đình tham gia · Thành viên"
                      }
                    />
                    {workspace.id === family.currentWorkspace?.id ? (
                      <span className="account-badge neutral">Đang mở</span>
                    ) : (
                      <button
                        className="account-button secondary"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await family.switchWorkspace(workspace.id);
                          })
                        }
                      >
                        Chuyển đến
                      </button>
                    )}
                  </div>
                ))}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
function CardHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="account-card-heading">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}
function RowText({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="account-row-body">
      <strong>{title}</strong>
      <small>{description}</small>
    </div>
  );
}
function ToggleRow({
  Icon,
  title,
  description,
  value,
  disabled,
  onChange,
}: {
  Icon: typeof Sun;
  title: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <div className="account-row">
      <Icon size={21} aria-hidden="true" />
      <RowText title={title} description={description} />
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={title}
        disabled={disabled}
        className="account-switch"
        onClick={onChange}
      />
    </div>
  );
}
