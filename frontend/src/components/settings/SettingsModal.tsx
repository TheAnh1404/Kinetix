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
} from "lucide-react";
import { useAuth, authRequest } from "@/hooks/useAuth";
import { useFamily } from "@/context/FamilyContext";
import { useSettings } from "@/context/SettingsContext";
import { ProvisioningConfirm } from "@/components/auth/ProvisioningConfirm";
import { PasswordField } from "@/components/auth/LoginView";
import { AvatarStudio, DEFAULT_AVATAR } from "@/components/settings/AvatarStudio";

type Session = {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
};

type SettingsSection = "workspace" | "preferences" | "profile" | "security" | "wallet";

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

  const [activeTab, setActiveTab] = useState<SettingsSection>("profile");

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
        "PUT"
      );
      await auth.checkSession();
      await family.refreshMembers();
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

  const currentWs = family.currentWorkspace;

  return (
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] p-3 sm:p-5 flex items-center justify-center animate-in fade-in duration-200"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="bg-white text-slate-900 dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col md:flex-row overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
        onClick={(event) => event.stopPropagation()}
      >
        {/* ============================================================== */}
        {/* CỘT TRÁI: SIDEBAR ĐIỀU HƯỚNG PHÂN TẦNG CHUYÊN NGHIỆP */}
        {/* ============================================================== */}
        <aside className="w-full md:w-64 bg-slate-50/80 dark:bg-slate-950/50 border-b md:border-b-0 md:border-r border-slate-200/80 dark:border-slate-800 flex flex-col shrink-0">
          {/* Top Brand Banner */}
          <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Sliders size={18} />
              </div>
              <div>
                <h2 id="settings-title" className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  Cài Đặt & Quản Lý
                </h2>
                <p className="text-[10px] text-slate-500 font-mono">Kinetix OS • Avalanche</p>
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
            {/* NHÓM 1: CÀI ĐẶT TỔNG */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
                1. Cài Đặt Tổng
              </span>
              <button
                type="button"
                onClick={() => setActiveTab("workspace")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === "workspace"
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                }`}
              >
                <Building2 size={16} />
                <span>Không Gian & Mạng</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("preferences")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === "preferences"
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                }`}
              >
                <Palette size={16} />
                <span>Tùy Chọn Hệ Thống</span>
              </button>
            </div>

            {/* NHÓM 2: CÀI ĐẶT TÀI KHOẢN */}
            <div className="space-y-1 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
                2. Cài Đặt Tài Khoản
              </span>
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === "profile"
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                }`}
              >
                <User size={16} />
                <span>Hồ Sơ & Avatar Studio</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("security")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === "security"
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                }`}
              >
                <LockKeyhole size={16} />
                <span>Bảo Mật & Mật Khẩu</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("wallet")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  activeTab === "wallet"
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                }`}
              >
                <Wallet size={16} />
                <span>Ví Core & Web3</span>
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
        <main className="flex-1 flex flex-col min-w-0 max-h-[92vh] overflow-y-auto">
          {/* Top Panel Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs sticky top-0 z-10">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-red-600 dark:text-red-400 font-bold block">
                {activeTab === "workspace" || activeTab === "preferences"
                  ? "Cài Đặt Tổng Hệ Thống"
                  : "Cài Đặt Cá Nhân"}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {activeTab === "workspace" && "Không Gian Làm Việc & Hợp Đồng Dual-Chain"}
                {activeTab === "preferences" && "Tùy Chọn Giao Diện & Kết Nối Mạng"}
                {activeTab === "profile" && "Hồ Sơ Cá Nhân & Avatar Studio"}
                {activeTab === "security" && "Bảo Mật Mật Khẩu & Quản Lý Phiên"}
                {activeTab === "wallet" && "Liên Kết Ví Core Wallet & Web3"}
              </h3>
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

          {/* Feedback Alerts */}
          <div className="p-6 space-y-6 flex-1">
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
            {/* 1. TAB: KHÔNG GIAN & MẠNG (WORKSPACE & CONTRACTS) */}
            {/* ============================================================== */}
            {activeTab === "workspace" && (
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
                          onClick={() => handleCopyCode(currentWs?.workspaceCode || "KNTX-8888")}
                          className="text-red-600 hover:text-red-700 cursor-pointer"
                          title="Sao chép mã"
                        >
                          {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    <span className="px-3 py-1 rounded-xl bg-white text-slate-900 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                      Vai Trò: {currentWs?.userRole || "MEMBER"}
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
                          Family L1 (0 Gas)
                        </span>
                      </div>
                      <p className="font-mono text-xs text-slate-600 dark:text-slate-400 break-all">
                        {currentWs?.l1HubAddress || "0x2873c3B76364E6377912F174e3754AFdfCeae1F6"}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white text-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                          <span>🌊 FamilyYieldVault Contract</span>
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                          Fuji C-Chain (8% APY)
                        </span>
                      </div>
                      <p className="font-mono text-xs text-slate-600 dark:text-slate-400 break-all">
                        {currentWs?.cchainVaultAddress || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Danh sách các Không Gian bạn tham gia */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">
                      Các Không Gian Bạn Đang Tham Gia ({family.workspaces.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {family.workspaces.map((ws) => {
                      const isSelected = family.currentWorkspace?.id === ws.id;
                      return (
                        <div
                          key={ws.id}
                          className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-red-50/40 dark:bg-red-950/20 border-red-300 dark:border-red-900"
                              : "bg-white text-slate-900 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                                isSelected ? "bg-red-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600"
                              }`}
                            >
                              <Building2 size={16} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  {ws.name}
                                </span>
                                {isSelected && (
                                  <span className="text-[10px] font-bold text-red-600 bg-red-100 dark:bg-red-950 px-2 py-0.2 rounded-full">
                                    Đang chọn
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 font-mono">
                                Mã: {ws.workspaceCode || "KNTX-8888"} • {ws.userRole || "MEMBER"}
                              </span>
                            </div>
                          </div>

                          {!isSelected && (
                            <button
                              type="button"
                              onClick={() => {
                                family.switchWorkspace(ws.id);
                                onClose();
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-bold text-slate-800 dark:text-white transition-colors cursor-pointer"
                            >
                              Chuyển đến
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* 2. TAB: TÙY CHỌN HỆ THỐNG (PREFERENCES) */}
            {/* ============================================================== */}
            {activeTab === "preferences" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Theme Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Chế Độ Giao Diện (Theme Mode)
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "light", label: "Sáng", icon: Sun },
                      { id: "dark", label: "Tối", icon: Moon },
                      { id: "system", label: "Hệ Thống", icon: Laptop },
                    ].map((mode) => {
                      const Icon = mode.icon;
                      const isSel = settings.theme === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => settings.setTheme(mode.id as any)}
                          className={`p-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                            isSel
                              ? "border-red-600 bg-red-50/50 dark:bg-red-950/40 text-red-600 dark:text-red-300 shadow-xs"
                              : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          <Icon size={16} />
                          <span>{mode.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Display Currency */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Đơn Vị Tiền Tệ Hiển Thị
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">
                      1 AVAX ≈ 750,000 VNĐ ($30 USD)
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "AVAX", label: "Native AVAX", sub: "Avalanche Network" },
                      { id: "VND", label: "VNĐ (Việt Nam Đồng)", sub: "750,000đ / AVAX" },
                      { id: "USD", label: "USD ($)", sub: "$30.00 / AVAX" },
                    ].map((cur) => {
                      const isSel = settings.displayCurrency === cur.id;
                      return (
                        <button
                          key={cur.id}
                          type="button"
                          onClick={() => settings.setDisplayCurrency(cur.id as any)}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                            isSel
                              ? "border-red-600 bg-red-50/50 dark:bg-red-950/40 text-red-700 dark:text-red-300 shadow-xs"
                              : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-400"
                          }`}
                        >
                          <span className="text-xs font-bold font-mono">{cur.label}</span>
                          <span className="text-[10px] text-slate-400">{cur.sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sound & Haptic toggle */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white text-slate-900 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                      {settings.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Âm Thanh Phản Hồi Giao Dịch
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Phát âm thanh chúc mừng khi nạp quỹ, phê duyệt hoặc rút tiền thành công
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !settings.soundEnabled;
                      settings.setSoundEnabled(next);
                      if (next) settings.playActionSound("success");
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      settings.soundEnabled ? "bg-red-600" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        settings.soundEnabled ? "right-0.5" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* Dual-Chain Latency Inspector */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity size={16} className="text-red-500" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Độ Trễ Mạng Dual-Chain (Network Ping)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={settings.checkLatency}
                      disabled={settings.latency.isChecking}
                      className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                    >
                      {settings.latency.isChecking ? "Đang đo..." : "Kiểm tra lại"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-white text-slate-900 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400">Avalanche Fuji C-Chain</span>
                      <span className="text-sm font-bold font-mono text-emerald-600 mt-0.5">
                        {settings.latency.fujiCChainMs ? `${settings.latency.fujiCChainMs} ms` : "..."}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-white text-slate-900 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400">Avalanche Family L1</span>
                      <span className="text-sm font-bold font-mono text-emerald-600 mt-0.5">
                        {settings.latency.familyL1Ms ? `${settings.latency.familyL1Ms} ms` : "..."}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* 3. TAB: HỒ SƠ & AVATAR STUDIO CHUYÊN NGHIỆP */}
            {/* ============================================================== */}
            {activeTab === "profile" && (
              <form onSubmit={handleSaveProfile} className="space-y-6 animate-in fade-in duration-150">
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
                  <span>Tên đăng nhập hệ thống: <strong className="text-slate-800 dark:text-white font-mono">@{auth.user?.username || "kinetix"}</strong></span>
                  <span className="text-[11px] text-slate-400 font-mono">Cố định</span>
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

                {/* Nhận lời mời tham gia Không gian */}
                <details className="border-t border-slate-200/60 dark:border-slate-800 pt-4">
                  <summary className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Tham gia Không Gian khác theo lời mời của Quản trị viên
                  </summary>
                  <div className="pt-3 flex gap-2">
                    <input
                      type="text"
                      value={invitationToken}
                      onChange={(e) => setInvitationToken(e.target.value.trim())}
                      placeholder="Nhập mã token lời mời gắn với ví Core của bạn"
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white text-slate-900 dark:bg-slate-900 text-xs font-mono"
                    />
                    <button
                      type="button"
                      disabled={busy || !invitationToken}
                      onClick={() =>
                        void run(async () => {
                          await auth.reauthenticate();
                          await authRequest("/api/auth/accept-invitation", { token: invitationToken });
                          setInvitationToken("");
                          await auth.checkSession();
                          setNotice("Đã tham gia Không gian mới thành công!");
                        })
                      }
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black transition-colors disabled:opacity-40"
                    >
                      Nhận lời mời
                    </button>
                  </div>
                </details>
              </form>
            )}

            {/* ============================================================== */}
            {/* 4. TAB: BẢO MẬT & MẬT KHẨU (SECURITY) */}
            {/* ============================================================== */}
            {activeTab === "security" && (
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
                      setNotice("Đã đổi mật khẩu thành công và thu hồi các phiên đăng nhập cũ!");
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
                    Bạn có thể thu hồi từ xa các phiên làm việc trên các thiết bị khác để đảm bảo an toàn tuyệt đối.
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
                                {isCurrent ? "Thiết Bị Hiện Tại (Phiên Này)" : `Phiên: ${session.id.slice(0, 8)}...`}
                              </strong>
                              {isCurrent && (
                                <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  Đang dùng
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                              Hoạt động cuối: {new Date(session.lastSeenAt).toLocaleString("vi-VN")}
                            </span>
                          </div>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                await authRequest(`/api/auth/sessions/${session.id}`, {}, "DELETE");
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

            {/* ============================================================== */}
            {/* 5. TAB: VÍ CORE & WEB3 (WALLET) */}
            {/* ============================================================== */}
            {activeTab === "wallet" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-bold text-slate-500 font-mono">
                      Ví Avalanche Core Cá Nhân Đã Xác Minh
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                        auth.linkedWallet?.address
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {auth.linkedWallet?.address ? "Đã Xác Minh SIWE ✓" : "Chưa Liên Kết"}
                    </span>
                  </div>

                  <code className="text-xs font-mono bg-white text-slate-900 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 block break-all text-slate-900 dark:text-white">
                    {auth.linkedWallet?.address || "Chưa có địa chỉ ví liên kết với tài khoản này"}
                  </code>

                  <p className="text-xs text-slate-500">
                    {!auth.connectedAddress
                      ? "Chưa kết nối ví Core trên thiết bị này. Bạn có thể nhấn 'Kết nối Core' bên dưới khi cần thực hiện giao dịch."
                      : auth.walletMatches
                      ? "✓ Đang kết nối đúng địa chỉ ví Core đã liên kết. Mọi giao dịch ký duyệt đều sẵn sàng."
                      : "⚠️ Địa chỉ ví đang kết nối khác với địa chỉ đã liên kết tài khoản. Vui lòng chuyển đúng tài khoản trong tiện ích Core."}
                  </p>
                </div>

                {/* Provisioning Allowlist Confirmation */}
                <ProvisioningConfirm
                  workspaceId={family.currentWorkspace?.id || ""}
                  requests={auth.onchainPermissions.filter(
                    (request) => request.workspaceId === family.currentWorkspace?.id
                  )}
                />

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void run(auth.connectWallet)}
                    className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Wallet size={15} />
                    <span>Kết Nối Avalanche Core</span>
                  </button>

                  <button
                    type="button"
                    onClick={family.disconnectWallet}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Ngắt kết nối UI
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </section>
    </div>
  );
}
