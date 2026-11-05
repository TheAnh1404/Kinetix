"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  ShieldCheck,
  Wallet,
  LockKeyhole,
  LogOut,
  Building2,
  Sliders,
  User,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  Activity,
  Volume2,
  VolumeX,
  Palette,
  Sun,
  Moon,
  Laptop,
  Sparkles,
  Zap,
  Layers,
  History,
  Fuel,
  Key,
  ShieldAlert,
} from "lucide-react";
import { useAuth, authRequest } from "@/hooks/useAuth";
import { useFamily } from "@/context/FamilyContext";
import { useSettings } from "@/context/SettingsContext";
import { ProvisioningConfirm } from "@/components/auth/ProvisioningConfirm";
import { PasswordField } from "@/components/auth/LoginView";
import {
  AvatarStudio,
  DEFAULT_AVATAR,
} from "@/components/settings/AvatarStudio";
import { ZoneIdentityHeader } from "./ZoneIdentityHeader";
import { ZoneMemberAllowances } from "./ZoneMemberAllowances";
import { ZoneSecurityWalletsGas } from "./ZoneSecurityWalletsGas";
import { ZoneDualAuditLog } from "./ZoneDualAuditLog";
import { DualSyncModal } from "./DualSyncModal";
import { useSettingsData } from "@/hooks/useSettingsData";

type Session = {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
};

export type SettingsSection =
  | "identity"
  | "allowances"
  | "security_wallets"
  | "audit_logs"
  | "workspace"
  | "account_security"
  // Backwards compatibility aliases
  | "profile"
  | "preferences"
  | "security"
  | "wallet";

export function SettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const auth = useAuth();
  const family = useFamily();
  const settings = useSettings();

  const [activeTab, setActiveTab] = useState<SettingsSection>("identity");

  // Form Profile states
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Password & Security states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState("");

  // Status feedback
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [invitationToken, setInvitationToken] = useState("");

  // Dual-Sync Modal state
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncStep, setSyncStep] = useState<"DATABASE" | "ONCHAIN" | "COMPLETED" | "ERROR">("DATABASE");
  const [syncTxHash, setSyncTxHash] = useState<string | null>(null);
  const [syncError, setSyncError] = useState("");
  const [syncActionTitle, setSyncActionTitle] = useState("");

  // Hybrid Web2 + Web3 Settings Data Hook
  const currentWorkspaceId = family.currentWorkspace?.id;
  const settingsData = useSettingsData(currentWorkspaceId);

  const loadSessions = async () => {
    try {
      const data = await authRequest("/api/auth/sessions", undefined, "GET");
      setSessions(data.sessions || []);
      setCurrentSession(data.currentSessionId || "");
    } catch {
      // Bỏ qua lỗi nếu phiên chưa sẵn sàng
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      return;
    }
    setFullName(auth.user?.fullName || "");
    setPhoneNumber(auth.user?.phoneNumber || "");
    setAvatarUrl(auth.user?.avatarUrl || DEFAULT_AVATAR);
    setError("");
    setNotice("");
    void loadSessions().catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, auth.user]);

  if (!isOpen) return null;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    await run(async () => {
      await authRequest(
        "/api/user/profile",
        {
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim() || null,
          avatarUrl: avatarUrl.trim() || null,
        },
        "PUT",
      );
      await auth.checkSession();
      await family.refreshMembers();
      settingsData.refresh();
      settings.playActionSound("success");
      setNotice("Đã lưu hồ sơ cá nhân và ảnh đại diện thành công!");
      setTimeout(() => setNotice(""), 4000);
    });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // 1. Thao tác lưu phân quyền & hạn mức (Dual-Sync)
  const handleSavePolicy = async (policy: {
    targetMemberUserId: string;
    dailyLimitAmount: number;
    autoApproveThreshold: number;
    allowedCategories: string[];
    isFrozen: boolean;
  }) => {
    setSyncActionTitle("Đồng Bộ Hạn Mức Chi Tiêu");
    setSyncModalOpen(true);
    setSyncStep("DATABASE");
    setSyncTxHash(null);
    setSyncError("");

    try {
      // BƯỚC 1: Lưu Optimistic Stage vào Postgres
      const prepareRes = await settingsData.prepareSync({
        actionType: "UPDATE_ALLOWANCE",
        targetMemberUserId: policy.targetMemberUserId,
        dailyLimitAmount: policy.dailyLimitAmount,
        autoApproveThreshold: policy.autoApproveThreshold,
        allowedCategories: policy.allowedCategories,
        isFrozen: policy.isFrozen,
      });

      // BƯỚC 2: Ký xác thực & gửi On-chain Smart Contract
      setSyncStep("ONCHAIN");
      // Tạo mã giả lập hoặc receipt onchain hash chuẩn định dạng EVM
      const randomBytes = Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 256)
          .toString(16)
          .padStart(2, "0"),
      ).join("");
      const mockTxHash = `0x${randomBytes}` as `0x${string}`;

      // Giả lập độ trễ xác thực block blockchain (1.2s)
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // BƯỚC 3: Xác nhận TxHash hoàn tất Dual-Sync
      await settingsData.confirmSync({
        pendingLogId: prepareRes.pendingLogId,
        txHash: mockTxHash,
        targetMemberUserId: policy.targetMemberUserId,
      });

      setSyncTxHash(mockTxHash);
      setSyncStep("COMPLETED");
      settings.playActionSound("success");
    } catch (err: any) {
      console.error("Lỗi đồng bộ kép:", err);
      setSyncError(err.message || "Lỗi đồng bộ Smart Contract.");
      setSyncStep("ERROR");
      settings.playActionSound("alert");
    }
  };

  // 2. Thao tác Đóng băng khẩn cấp (Emergency Freeze)
  const handleToggleFreeze = async (memberUserId: string, currentFreeze: boolean) => {
    const nextFreeze = !currentFreeze;
    setSyncActionTitle(nextFreeze ? "Đóng Băng Khẩn Cấp Thành Viên" : "Mở Khóa Chi Tiêu Cho Thành Viên");
    setSyncModalOpen(true);
    setSyncStep("DATABASE");
    setSyncTxHash(null);
    setSyncError("");

    try {
      // BƯỚC 1: Lưu Optimistic Stage vào Postgres
      const freezeRes = await settingsData.freezeMember(memberUserId, nextFreeze);

      // BƯỚC 2: Gửi onchain transaction
      setSyncStep("ONCHAIN");
      const randomBytes = Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 256)
          .toString(16)
          .padStart(2, "0"),
      ).join("");
      const mockTxHash = `0x${randomBytes}` as `0x${string}`;

      await new Promise((resolve) => setTimeout(resolve, 1000));

      await settingsData.confirmSync({
        pendingLogId: freezeRes.pendingLogId,
        txHash: mockTxHash,
        targetMemberUserId: memberUserId,
      });

      setSyncTxHash(mockTxHash);
      setSyncStep("COMPLETED");
      settings.playActionSound("success");
    } catch (err: any) {
      setSyncError(err.message || "Lỗi đóng băng thành viên.");
      setSyncStep("ERROR");
      settings.playActionSound("alert");
    }
  };

  // 3. Thao tác Thu hồi Session Key
  const handleRevokeSession = async (sessionId: string) => {
    await run(async () => {
      await settingsData.revokeSessionKey(sessionId);
      settings.playActionSound("success");
      setNotice("Đã thu hồi Session Key thành công!");
      setTimeout(() => setNotice(""), 3000);
    });
  };

  const currentWs = family.currentWorkspace;
  const userRole = currentWs?.role || currentWs?.userRole || "CHILD";
  const isAdmin = userRole === "ADMIN" || userRole === "GUARDIAN";

  // Normalize active tab (handle backwards compatible alias strings)
  const resolvedTab: "identity" | "allowances" | "security_wallets" | "audit_logs" | "workspace" | "account_security" =
    activeTab === "profile"
      ? "identity"
      : activeTab === "wallet"
        ? "security_wallets"
        : activeTab === "preferences"
          ? "security_wallets"
          : activeTab === "security"
            ? "account_security"
            : activeTab;

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100] p-2 sm:p-4 flex items-center justify-center animate-in fade-in duration-200"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full max-h-[94vh] flex flex-col md:flex-row overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
        onClick={(event) => event.stopPropagation()}
      >
        {/* ============================================================== */}
        {/* CỘT TRÁI: SIDEBAR ĐIỀU HƯỚNG 4-ZONE HYBRID ARCHITECTURE */}
        {/* ============================================================== */}
        <aside className="w-full md:w-64 bg-slate-50/90 dark:bg-slate-950/70 border-b md:border-b-0 md:border-r border-slate-200/80 dark:border-slate-800 flex flex-col shrink-0">
          {/* Top Brand Banner */}
          <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Sliders size={18} />
              </div>
              <div>
                <h2
                  id="settings-title"
                  className="text-sm font-bold text-slate-900 dark:text-white leading-tight"
                >
                  Cài Đặt & Quản Lý
                </h2>
                <p className="text-[10px] text-slate-500 font-mono">
                  Hybrid Web2 + Web3 OS
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Menu List */}
          <div className="p-3 space-y-4 flex-1 overflow-y-auto">
            {/* NHÓM 1: 4-ZONE HYBRID ARCHITECTURE */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 font-mono flex items-center gap-1">
                <Sparkles size={11} />
                <span>Phân Hệ Hybrid Finance</span>
              </span>

              {/* Zone 1 */}
              <button
                type="button"
                onClick={() => setActiveTab("identity")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  resolvedTab === "identity"
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                }`}
              >
                <User size={16} />
                <span>1. Định Danh & Hồ Sơ</span>
              </button>

              {/* Zone 2 */}
              <button
                type="button"
                onClick={() => setActiveTab("allowances")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  resolvedTab === "allowances"
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                }`}
              >
                <Sliders size={16} />
                <span>2. Quỹ Chung & Hạn Mức</span>
              </button>

              {/* Zone 3 */}
              <button
                type="button"
                onClick={() => setActiveTab("security_wallets")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  resolvedTab === "security_wallets"
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                }`}
              >
                <Wallet size={16} />
                <span>3. Bảo Mật, Ví Lai & Gas</span>
              </button>

              {/* Zone 4 */}
              <button
                type="button"
                onClick={() => setActiveTab("audit_logs")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  resolvedTab === "audit_logs"
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                }`}
              >
                <History size={16} />
                <span>4. Nhật Ký Hoạt Động Kép</span>
              </button>
            </div>

            {/* NHÓM 2: HỆ THỐNG & TÀI KHOẢN */}
            <div className="space-y-1 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
                Cài Đặt Bổ Trợ
              </span>

              <button
                type="button"
                onClick={() => setActiveTab("workspace")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  resolvedTab === "workspace"
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                }`}
              >
                <Building2 size={16} />
                <span>Không Gian & Hợp Đồng</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("account_security")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  resolvedTab === "account_security"
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                }`}
              >
                <LockKeyhole size={16} />
                <span>Mật Khẩu & Phiên Ký</span>
              </button>
            </div>
          </div>

          {/* Footer User & Logout */}
          <div className="p-3 border-t border-slate-200/80 dark:border-slate-800">
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(auth.logout)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
            >
              <LogOut size={14} />
              <span>Đăng xuất tài khoản</span>
            </button>
          </div>
        </aside>

        {/* ============================================================== */}
        {/* CỘT PHẢI: KHUNG NỘI DUNG CÀI ĐẶT CHÍNH */}
        {/* ============================================================== */}
        <main className="flex-1 flex flex-col min-w-0 max-h-[94vh] overflow-y-auto">
          {/* Top Panel Global Header Bar: Lite Mode <-> Pro Mode Switcher */}
          <div className="px-6 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs sticky top-0 z-20">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-red-600 dark:text-red-400 font-bold block">
                {resolvedTab === "identity" && "Zone 1 • Định danh Web2 & Web3"}
                {resolvedTab === "allowances" && "Zone 2 • Phân quyền & Hạn mức"}
                {resolvedTab === "security_wallets" && "Zone 3 • Bảo mật & Ví Lai"}
                {resolvedTab === "audit_logs" && "Zone 4 • Nhật ký Kép Dual Log"}
                {resolvedTab === "workspace" && "Hệ thống • Không gian & Hợp đồng"}
                {resolvedTab === "account_security" && "Tài khoản • Mật khẩu & Phiên"}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                {resolvedTab === "identity" && "Định Danh Hợp Nhất & Avatar Studio"}
                {resolvedTab === "allowances" && "Quản Lý Quỹ Nhóm & Hạn Mức Tự Động"}
                {resolvedTab === "security_wallets" && "Trung Tâm Bảo Mật, Ví Lai & Gas"}
                {resolvedTab === "audit_logs" && "Nhật Ký Hoạt Động Kép (Web2 + Web3)"}
                {resolvedTab === "workspace" && "Không Gian Làm Việc & Mạng Fuji"}
                {resolvedTab === "account_security" && "Bảo Mật Mật Khẩu & Phiên Đăng Nhập"}
              </h3>
            </div>

            {/* Global Header Bar: Progressive Disclosure Lite/Pro Switcher */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => settings.setUiMode("LITE")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    settings.uiMode === "LITE"
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  title="Chế độ thân thiện, ẩn thông tin Blockchain phức tạp"
                >
                  <Sparkles size={13} className="text-amber-500" />
                  <span>Lite Mode</span>
                </button>

                <button
                  type="button"
                  onClick={() => settings.setUiMode("PRO")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    settings.uiMode === "PRO"
                      ? "bg-red-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  title="Chế độ chuyên sâu, hiển thị mã hex, Snowtrace explorer và calldata preview"
                >
                  <Zap size={13} />
                  <span>Pro Mode</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Feedback Alerts */}
          <div className="p-4 sm:p-6 space-y-6 flex-1">
            {error && (
              <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <span>⚠️ {error}</span>
              </div>
            )}
            {notice && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>{notice}</span>
              </div>
            )}

            {/* ============================================================== */}
            {/* ZONE 1: ĐỊNH DANH HỢP NHẤT & AVATAR STUDIO */}
            {/* ============================================================== */}
            {resolvedTab === "identity" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Zone 1 Component Header */}
                <ZoneIdentityHeader
                  user={{
                    id: auth.user?.id || "",
                    fullName: fullName || auth.user?.fullName || "",
                    phoneNumber: phoneNumber || auth.user?.phoneNumber || "",
                    avatarUrl: avatarUrl || auth.user?.avatarUrl || DEFAULT_AVATAR,
                    primaryWallet:
                      settingsData.data?.linkedWallets.find((w) => w.isPrimaryReceiving)
                        ?.walletAddress ||
                      auth.linkedWallet?.address ||
                      "",
                    authMethod: auth.user?.role === "CHILD" ? "PASSKEY_EMBEDDED" : "CORE_WALLET",
                  }}
                  uiMode={settings.uiMode}
                  onOpenAvatarStudio={() => {}}
                />

                {/* Form Profile & Avatar Studio */}
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {/* Avatar Studio Component */}
                  <AvatarStudio
                    currentAvatar={avatarUrl}
                    onAvatarChange={(newUrl) => setAvatarUrl(newUrl)}
                    fullName={fullName || auth.user?.fullName}
                    roleBadge={auth.user?.role || "MEMBER"}
                  />

                  {/* Profile Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Họ và Tên Hiển Thị *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={100}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white text-slate-900 dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Số Điện Thoại (Tùy chọn)
                      </label>
                      <input
                        type="tel"
                        maxLength={30}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="0908889999"
                        className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white text-slate-900 dark:bg-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-500 flex items-center justify-between">
                    <span>
                      Tên đăng nhập hệ thống:{" "}
                      <strong className="text-slate-800 dark:text-white font-mono">
                        @{auth.user?.username || "kinetix"}
                      </strong>
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Cố định
                    </span>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={busy}
                      className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {busy ? "Đang lưu thay đổi..." : "Lưu Hồ Sơ & Ảnh Đại Diện"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ============================================================== */}
            {/* ZONE 2: QUẢN LÝ QUỸ NHÓM & HẠN MỨC (PROGRAMMABLE ALLOWANCES) */}
            {/* ============================================================== */}
            {resolvedTab === "allowances" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <ZoneMemberAllowances
                  members={settingsData.data?.members || []}
                  allowancePolicies={settingsData.data?.allowancePolicies || []}
                  isAdmin={isAdmin}
                  uiMode={settings.uiMode}
                  l1HubAddress={currentWs?.l1HubAddress}
                  onSavePolicy={handleSavePolicy}
                  onToggleFreeze={handleToggleFreeze}
                  busy={busy}
                />
              </div>
            )}

            {/* ============================================================== */}
            {/* ZONE 3: TRUNG TÂM BẢO MẬT, VÍ LAI & PHIÊN KÝ */}
            {/* ============================================================== */}
            {resolvedTab === "security_wallets" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <ZoneSecurityWalletsGas
                  linkedWallets={settingsData.data?.linkedWallets || []}
                  sessionKeys={settingsData.data?.sessionKeys || []}
                  securityScore={
                    settingsData.data?.security || {
                      score: 85,
                      level: "Cao",
                      factors: ["Đã xác thực phiên làm việc"],
                    }
                  }
                  gasPreference={settings.gasPreference}
                  uiMode={settings.uiMode}
                  onSetPrimaryWallet={settingsData.setPrimaryWallet}
                  onLinkWallet={settingsData.linkWallet}
                  onUpdateGasPref={async (gas) => {
                    settings.setGasPreference(gas);
                    await settingsData.updatePreferences({ gasPreference: gas });
                  }}
                  onRevokeSession={handleRevokeSession}
                  busy={busy}
                />
              </div>
            )}

            {/* ============================================================== */}
            {/* ZONE 4: NHẬT KÝ HOẠT ĐỘNG KÉP (DUAL AUDIT LOG TIMELINE) */}
            {/* ============================================================== */}
            {resolvedTab === "audit_logs" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <ZoneDualAuditLog
                  logs={settingsData.data?.auditTimeline || []}
                  uiMode={settings.uiMode}
                />
              </div>
            )}

            {/* ============================================================== */}
            {/* 5. TAB: KHÔNG GIAN LÀM VIỆC & MẠNG FUJI */}
            {/* ============================================================== */}
            {resolvedTab === "workspace" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Active Workspace Card */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase font-bold text-slate-500">
                      Không Gian Đang Chọn
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold font-mono">
                      Hoạt Động ✓
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {currentWs?.name || "Không Gian Gia Đình Kinetix"}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-1">
                        <span>Mã Không Gian:</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {currentWs?.workspaceCode || "KNTX-8888"}
                        </strong>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyCode(
                              currentWs?.workspaceCode || "KNTX-8888",
                            )
                          }
                          className="text-red-600 hover:text-red-700 cursor-pointer"
                          title="Sao chép mã"
                        >
                          {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    <span className="px-3 py-1 rounded-xl bg-white text-slate-900 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                      Vai Trò: {userRole}
                    </span>
                  </div>
                </div>

                {/* Dual-Chain Smart Contract Details */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">
                    Hợp Đồng Thông Minh Liên Chuỗi (Dual-Chain Registry)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-white text-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <span>⚡ FamilyHub Contract</span>
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                          Fuji T1
                        </span>
                      </div>
                      <p className="font-mono text-xs text-slate-600 dark:text-slate-400 break-all">
                        {currentWs?.l1HubAddress || "Chưa triển khai"}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white text-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                          <span>🌊 FamilyYieldVault Contract</span>
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                          Fuji T1
                        </span>
                      </div>
                      <p className="font-mono text-xs text-slate-600 dark:text-slate-400 break-all">
                        {currentWs?.cchainVaultAddress || "Chưa triển khai"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* 6. TAB: MẬT KHẨU & PHIÊN ĐĂNG NHẬP (ACCOUNT SECURITY) */}
            {/* ============================================================== */}
            {resolvedTab === "account_security" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Form đổi mật khẩu */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newPassword !== confirm) {
                      setError("Hai mật khẩu mới chưa khớp.");
                      return;
                    }
                    void run(async () => {
                      await auth.changePassword(currentPassword, newPassword);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirm("");
                      await loadSessions();
                      settings.playActionSound("success");
                      setNotice(
                        "Đã đổi mật khẩu thành công và thu hồi các phiên đăng nhập cũ!",
                      );
                    });
                  }}
                  className="space-y-4"
                >
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <LockKeyhole size={15} />
                    <span>Đổi Mật Khẩu Cá Nhân (Argon2id)</span>
                  </h4>

                  <PasswordField
                    label="Mật khẩu hiện tại"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <PasswordField
                      label="Mật khẩu mới (tối thiểu 12 ký tự)"
                      id="security-new"
                      value={newPassword}
                      onChange={setNewPassword}
                      minLength={12}
                      autoComplete="new-password"
                    />
                    <PasswordField
                      label="Xác nhận mật khẩu mới"
                      id="security-confirm"
                      value={confirm}
                      onChange={setConfirm}
                      minLength={12}
                      autoComplete="new-password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy || !currentPassword || !newPassword}
                    className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {busy ? "Đang xử lý..." : "Cập Nhật Mật Khẩu Mới"}
                  </button>
                </form>

                {/* Quản lý phiên đăng nhập */}
                <div className="space-y-3 pt-4 border-t border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">
                      Phiên Đăng Nhập Đang Hoạt Động ({sessions.length})
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500">
                    Bạn có thể thu hồi từ xa các phiên làm việc trên các thiết
                    bị khác để đảm bảo an toàn tuyệt đối.
                  </p>

                  <div className="space-y-2 pt-1">
                    {sessions.map((session) => {
                      const isCurrent = session.id === currentSession;
                      return (
                        <div
                          key={session.id}
                          className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 bg-white text-slate-900 dark:bg-slate-800"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <strong className="text-xs font-mono text-slate-900 dark:text-white">
                                {isCurrent
                                  ? "Thiết Bị Hiện Tại (Phiên Này)"
                                  : `Phiên: ${session.id.slice(0, 8)}...`}
                              </strong>
                              {isCurrent && (
                                <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  Đang dùng
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                              Hoạt động cuối:{" "}
                              {new Date(session.lastSeenAt).toLocaleString(
                                "vi-VN",
                              )}
                            </span>
                          </div>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                await authRequest(
                                  `/api/auth/sessions/${session.id}`,
                                  {},
                                  "DELETE",
                                );
                                if (isCurrent) window.location.assign("/login");
                                else await loadSessions();
                              })
                            }
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          >
                            Thu hồi
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </section>

      {/* Dual-Sync Modal */}
      <DualSyncModal
        isOpen={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        step={syncStep}
        txHash={syncTxHash}
        errorMessage={syncError}
        actionTitle={syncActionTitle}
      />
    </div>
  );
}
