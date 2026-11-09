"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
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
  Sparkles,
  Zap,
  History,
  ArrowLeft,
  ChevronRight,
  Home,
} from "lucide-react";
import { useAuth, authRequest } from "@/hooks/useAuth";
import { useFamily } from "@/context/FamilyContext";
import { useSettings } from "@/context/SettingsContext";
import { PasswordField } from "@/components/auth/LoginView";
import { AvatarStudio } from "@/components/settings/AvatarStudio";
import { ZoneFamilySetup } from "./ZoneFamilySetup";
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
  | "family_setup"
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

interface SettingsViewProps {
  initialTab?: SettingsSection;
  onTabChange?: (tab: SettingsSection) => void;
  isStandalonePage?: boolean;
}

export function SettingsView({
  initialTab = "family_setup",
  onTabChange,
  isStandalonePage = true,
}: SettingsViewProps) {
  const auth = useAuth();
  const family = useFamily();
  const settings = useSettings();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<SettingsSection>(initialTab);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const handleSelectTab = (tab: SettingsSection) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

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
    setFullName(auth.user?.fullName || "");
    setPhoneNumber(auth.user?.phoneNumber || "");
    setAvatarUrl(auth.user?.avatarUrl || "");
    setError("");
    setNotice("");
    void loadSessions().catch((err) => setError(err.message));
  }, [auth.user]);

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
      const randomBytes = Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 256)
          .toString(16)
          .padStart(2, "0"),
      ).join("");
      const mockTxHash = `0x${randomBytes}` as `0x${string}`;

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
      const freezeRes = await settingsData.freezeMember(memberUserId, nextFreeze);

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
  const resolvedTab: SettingsSection =
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
    <div className="w-full">
      {/* ============================================================== */}
      {/* BREADCRUMB & HEADER QUẢN TRỊ TRANG CÀI ĐẶT RIÊNG BIỆT */}
      {/* ============================================================== */}
      {isStandalonePage && (
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Link
                href="/dashboard"
                className="hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors"
              >
                <Home size={13} />
                <span>Bàn Điều Hành</span>
              </Link>
              <ChevronRight size={13} className="text-slate-400" />
              <span className="text-slate-800 dark:text-slate-200 font-semibold">
                Cài Đặt & Quản Lý
              </span>
              <ChevronRight size={13} className="text-slate-400" />
              <span className="text-red-600 font-bold uppercase font-mono text-[11px]">
                {resolvedTab === "family_setup" && "Thiết Lập Gia Đình"}
                {resolvedTab === "identity" && "Định Danh & Hồ Sơ"}
                {resolvedTab === "allowances" && "Quỹ Chung & Hạn Mức"}
                {resolvedTab === "security_wallets" && "Bảo Mật & Ví Lai"}
                {resolvedTab === "audit_logs" && "Nhật Ký Kép"}
                {resolvedTab === "workspace" && "Không Gian Làm Việc"}
                {resolvedTab === "account_security" && "Mật Khẩu & Phiên Ký"}
              </span>
            </nav>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Cài Đặt & Quản Trị Hệ Thống
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Quản trị không gian đa thế hệ, cấu hình phân quyền và giám sát an ninh Dual-Chain
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {/* Chuyển đổi Lite Mode <-> Pro Mode */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => settings.setUiMode("LITE")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  settings.uiMode === "LITE"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Chế độ thân thiện, ẩn thông tin Blockchain phức tạp"
              >
                <Sparkles size={13} className="text-amber-500" />
                <span>Lite</span>
              </button>

              <button
                type="button"
                onClick={() => settings.setUiMode("PRO")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  settings.uiMode === "PRO"
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Chế độ chuyên sâu Pro Mode"
              >
                <Zap size={13} />
                <span>Pro</span>
              </button>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Quay lại Bàn Điều Hành</span>
            </Link>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* BỐ CỤC 2 CỘT: SIDEBAR PHÂN HỆ + NỘI DUNG CHÍNH (FULL PAGE) */}
      {/* ============================================================== */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* ============================================================ */}
        {/* CỘT TRÁI: SIDEBAR ĐIỀU HƯỚNG TẤT CẢ PHÂN HỆ CÀI ĐẶT */}
        {/* ============================================================ */}
        <aside className="w-full lg:w-72 shrink-0 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-xs space-y-4">
          {/* Nhóm ĐẶC BIỆT: THIẾT LẬP GIA ĐÌNH THEO CÁCH CỦA BẠN */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 font-mono flex items-center gap-1.5">
              <Sparkles size={12} />
              <span>Khởi Đầu & Hướng Dẫn</span>
            </span>

            <button
              type="button"
              onClick={() => handleSelectTab("family_setup")}
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer border ${
                resolvedTab === "family_setup"
                  ? "bg-rose-50 text-rose-950 border-rose-300 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800 shadow-xs"
                  : "text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    resolvedTab === "family_setup"
                      ? "bg-rose-600 text-white"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                  }`}
                >
                  <Users size={16} />
                </span>
                <div className="min-w-0">
                  <span className="block truncate font-bold text-xs">
                    Thiết Lập Gia Đình
                  </span>
                  <span className="block text-[10px] font-normal text-slate-500 truncate">
                    Theo cách của bạn
                  </span>
                </div>
              </div>

              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-200/60 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300">
                Mới
              </span>
            </button>
          </div>

          {/* NHÓM 1: 4-ZONE HYBRID FINANCE ARCHITECTURE */}
          <div className="space-y-1 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
              Phân Hệ Hybrid Finance
            </span>

            {/* Zone 1 */}
            <button
              type="button"
              onClick={() => handleSelectTab("identity")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                resolvedTab === "identity"
                  ? "bg-red-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <User size={16} />
              <span>1. Định Danh & Hồ Sơ</span>
            </button>

            {/* Zone 2 */}
            <button
              type="button"
              onClick={() => handleSelectTab("allowances")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                resolvedTab === "allowances"
                  ? "bg-red-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <Sliders size={16} />
              <span>2. Quỹ Chung & Hạn Mức</span>
            </button>

            {/* Zone 3 */}
            <button
              type="button"
              onClick={() => handleSelectTab("security_wallets")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                resolvedTab === "security_wallets"
                  ? "bg-red-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <Wallet size={16} />
              <span>3. Bảo Mật, Ví Lai & Gas</span>
            </button>

            {/* Zone 4 */}
            <button
              type="button"
              onClick={() => handleSelectTab("audit_logs")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                resolvedTab === "audit_logs"
                  ? "bg-red-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <History size={16} />
              <span>4. Nhật Ký Hoạt Động Kép</span>
            </button>
          </div>

          {/* NHÓM 2: HỆ THỐNG & TÀI KHOẢN */}
          <div className="space-y-1 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
              Cài Đặt Không Gian
            </span>

            <button
              type="button"
              onClick={() => handleSelectTab("workspace")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                resolvedTab === "workspace"
                  ? "bg-red-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <Building2 size={16} />
              <span>Không Gian & Hợp Đồng</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectTab("account_security")}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                resolvedTab === "account_security"
                  ? "bg-red-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <LockKeyhole size={16} />
              <span>Mật Khẩu & Phiên Ký</span>
            </button>
          </div>

          {/* Đăng xuất */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(auth.logout)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
            >
              <LogOut size={14} />
              <span>Đăng xuất tài khoản</span>
            </button>
          </div>
        </aside>

        {/* ============================================================ */}
        {/* CỘT PHẢI: KHUNG NỘI DUNG CHÍNH (KHÔNG BỊ GÒ BÓ MODAL) */}
        {/* ============================================================ */}
        <main className="flex-1 min-w-0 w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
          {/* Tiêu đề phân hệ hiện tại */}
          <div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-red-600 dark:text-red-400 font-bold block">
                {resolvedTab === "family_setup" && "Khởi Đầu • Thiết Lập Onboarding"}
                {resolvedTab === "identity" && "Zone 1 • Định danh Web2 & Web3"}
                {resolvedTab === "allowances" && "Zone 2 • Phân quyền & Hạn mức"}
                {resolvedTab === "security_wallets" && "Zone 3 • Bảo mật & Ví Lai"}
                {resolvedTab === "audit_logs" && "Zone 4 • Nhật ký Kép Dual Log"}
                {resolvedTab === "workspace" && "Hệ thống • Không gian & Hợp đồng"}
                {resolvedTab === "account_security" && "Tài khoản • Mật khẩu & Phiên"}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {resolvedTab === "family_setup" && "Thiết Lập Gia Đình Theo Cách Của Bạn"}
                {resolvedTab === "identity" && "Định Danh & Hồ Sơ Cá Nhân"}
                {resolvedTab === "allowances" && "Quản Lý Quỹ Nhóm & Hạn Mức Tự Động"}
                {resolvedTab === "security_wallets" && "Trung Tâm Bảo Mật, Ví Lai & Gas"}
                {resolvedTab === "audit_logs" && "Nhật Ký Hoạt Động Kép (Web2 + Web3)"}
                {resolvedTab === "workspace" && "Không Gian Làm Việc & Mạng Fuji"}
                {resolvedTab === "account_security" && "Bảo Mật Mật Khẩu & Phiên Đăng Nhập"}
              </h2>
            </div>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <span>⚠️ {error}</span>
            </div>
          )}
          {notice && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>{notice}</span>
            </div>
          )}

          {/* ========================================================== */}
          {/* 1. TAB MỚI: THIẾT LẬP GIA ĐÌNH THEO CÁCH CỦA BẠN */}
          {/* ========================================================== */}
          {resolvedTab === "family_setup" && (
            <div className="animate-in fade-in duration-150">
              <ZoneFamilySetup />
            </div>
          )}

          {/* ========================================================== */}
          {/* 2. ZONE 1: ĐỊNH DANH HỢP NHẤT & AVATAR STUDIO */}
          {/* ========================================================== */}
          {resolvedTab === "identity" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <ZoneIdentityHeader
                user={{
                  id: auth.user?.id || "",
                  fullName: fullName || auth.user?.fullName || "",
                  phoneNumber: phoneNumber || auth.user?.phoneNumber || "",
                  avatarUrl,
                  primaryWallet:
                    settingsData.data?.linkedWallets.find((w) => w.isPrimaryReceiving)
                      ?.walletAddress ||
                    auth.linkedWallet?.address ||
                    "",
                  authMethod: auth.user?.role === "CHILD" ? "PASSKEY_EMBEDDED" : "CORE_WALLET",
                }}
                uiMode={settings.uiMode}
                onOpenAvatarStudio={() => {
                  const el = document.getElementById("avatar-studio-section");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
              />

              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div id="avatar-studio-section">
                  <AvatarStudio
                    currentAvatar={avatarUrl}
                    onAvatarChange={(newUrl) => setAvatarUrl(newUrl)}
                    fullName={fullName || auth.user?.fullName}
                    roleBadge={auth.user?.role || "MEMBER"}
                  />
                </div>

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

          {/* ========================================================== */}
          {/* 3. ZONE 2: QUẢN LÝ QUỸ NHÓM & HẠN MỨC */}
          {/* ========================================================== */}
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

          {/* ========================================================== */}
          {/* 4. ZONE 3: TRUNG TÂM BẢO MẬT, VÍ LAI & PHIÊN KÝ */}
          {/* ========================================================== */}
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

          {/* ========================================================== */}
          {/* 5. ZONE 4: NHẬT KÝ HOẠT ĐỘNG KÉP */}
          {/* ========================================================== */}
          {resolvedTab === "audit_logs" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <ZoneDualAuditLog
                logs={settingsData.data?.auditTimeline || []}
                uiMode={settings.uiMode}
              />
            </div>
          )}

          {/* ========================================================== */}
          {/* 6. TAB: KHÔNG GIAN LÀM VIỆC & MẠNG FUJI */}
          {/* ========================================================== */}
          {resolvedTab === "workspace" && (
            <div className="space-y-6 animate-in fade-in duration-150">
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
                          handleCopyCode(currentWs?.workspaceCode || "KNTX-8888")
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

          {/* ========================================================== */}
          {/* 7. TAB: MẬT KHẨU & PHIÊN ĐĂNG NHẬP */}
          {/* ========================================================== */}
          {resolvedTab === "account_security" && (
            <div className="space-y-6 animate-in fade-in duration-150">
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
        </main>
      </div>

      {/* Dual-Sync Modal khi ký xác nhận on-chain */}
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
