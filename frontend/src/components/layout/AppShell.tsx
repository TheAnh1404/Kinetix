"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { WorkspaceSwitcher } from "@/components/workspaces/WorkspaceSwitcher";
import { DepositVaultModal } from "@/components/vaults/DepositVaultModal";
import { useVaultCreation } from "@/context/VaultCreationContext";
import { MemberResponsiveShell } from "@/components/layout/MemberResponsiveShell";
import { NotificationDropdown } from "@/components/dashboard/NotificationDropdown";
import { TransactionLedgerModal } from "@/components/dashboard/TransactionLedgerModal";
import { MobileNavBar } from "@/components/navigation/MobileNavBar";
import { ActiveTab } from "@/types";

interface AppShellProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  children: React.ReactNode;
}

/**
 * AppShell: Khung Điều Hướng Chuẩn Mực Bàn Chỉ Huy Kinetix OS
 * Thiết kế tối giản, loại bỏ hoàn toàn trùng lặp (No Redundancy, Zero-Clutter):
 * - Desktop: Sidebar bên trái là trục điều hướng không gian chính (Single Source of Navigation)
 * - Topbar: Thanh tiện ích gọn gàng hiển thị tiêu đề ngữ cảnh trang, Telemetry Dual-Chain, Sổ Cái và Nạp Quỹ
 * - Mobile: Tự động thu gọn Topbar và kích hoạt Dock đáy kính mờ (Floating Glass Dock)
 */
export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  onTabChange,
  children,
}) => {
  const { currentWorkspace, familyInfo, currentMember, dynamicVaults } = useFamily();
  const { user, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const router = useRouter();

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const telemetryRef = useRef<HTMLDivElement>(null);
  const vaultCreation = useVaultCreation();

  // Đóng popover khi nhấp chuột ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (telemetryRef.current && !telemetryRef.current.contains(event.target as Node)) {
        setIsTelemetryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopyCode = () => {
    const code =
      currentWorkspace?.workspaceCode || familyInfo?.familyCode || "KNTX-8888";
    if (code) {
      navigator.clipboard?.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const userRole =
    currentWorkspace?.role || currentWorkspace?.userRole || "CHILD";
  const isAdmin = userRole === "ADMIN" || userRole === "GUARDIAN";
  const sidebarAvatar = user?.avatarUrl || currentMember?.avatar;
  const sidebarInitial = (user?.fullName || currentMember?.name || "K")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // 4 Không gian cốt lõi tương ứng 4 bộ quy tắc Kinetix
  const adminSpaces = [
    {
      id: "quan-tri-cha-me" as ActiveTab,
      label: language === "vi" ? "Bàn Quản Trị" : "Command Desk",
      fullLabel: language === "vi" ? "Bàn Quản Trị Trung Tâm" : "Master Command Center",
      icon: "dashboard",
      badge: language === "vi" ? "N Hũ & Đa Ký" : "N Vaults & M/N",
      description:
        language === "vi"
          ? "Tổng quan N Hũ, Đa chữ ký M/N & L1 Buffer"
          : "Overview of N Vaults, M/N Multisig & L1 Buffer",
      accent: "text-red-700 bg-red-50 border-red-200",
    },
    {
      id: "kinetix-shield" as ActiveTab,
      label: language === "vi" ? "Hũ An Sinh" : "Shield Vault",
      fullLabel: language === "vi" ? "Hũ An Sinh Ông Bà" : "Elderly Shield Vault",
      icon: "shield",
      badge: language === "vi" ? "Theo hạn mức" : "Policy limits",
      description:
        language === "vi"
          ? "Khoản hỗ trợ gia đình với hạn mức và trạng thái duyệt rõ ràng"
          : "Family support with clear spending limits and approval status",
      accent: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
    {
      id: "kinetix-kids" as ActiveTab,
      label: language === "vi" ? "Heo Đất & Việc Nhà" : "Kids Chores",
      fullLabel: language === "vi" ? "Heo Đất & Việc Nhà Trẻ" : "Kids Chore Vault",
      icon: "savings",
      badge: language === "vi" ? "Chore-to-Earn" : "Chore-to-Earn",
      description:
        language === "vi"
          ? "Giao việc, tích lũy điểm thưởng và mở khóa heo đất"
          : "Assign chores, accumulate rewards and unlock savings",
      accent: "text-purple-700 bg-purple-50 border-purple-200",
    },
    {
      id: "quy-rosca" as ActiveTab,
      label: language === "vi" ? "Quỹ Họ Hụi" : "ROSCA Savings",
      fullLabel: language === "vi" ? "Quỹ Họ Hụi Xoay Vòng" : "ROSCA Savings Vault",
      icon: "groups",
      badge: language === "vi" ? "Góp theo kỳ" : "Round contributions",
      description:
        language === "vi"
          ? "Góp theo kỳ, theo dõi lượt nhận và bằng chứng chi trả"
          : "Rotational contributions with verifiable payout history",
      accent: "text-cyan-700 bg-cyan-50 border-cyan-200",
    },
  ];

  /* ========================================================================= */
  /* PHÂN LUỒNG 1: THÀNH VIÊN GIA ĐÌNH (ÔNG BÀ, CON TRẺ, ANH CẢ) */
  /* ========================================================================= */
  if (!isAdmin) {
    return (
      <MemberResponsiveShell elderly={userRole === "ELDERLY"}>
        {children}
      </MemberResponsiveShell>
    );
  }

  const activeSpaceObj = adminSpaces.find((s) => s.id === activeTab) || adminSpaces[0];

  /* ========================================================================= */
  /* PHÂN LUỒNG 2: CHỦ GIA ĐÌNH / QUẢN TRỊ VIÊN (BỐ BA / GUARDIAN) */
  /* ========================================================================= */
  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-100/70 text-slate-900 font-sans antialiased selection:bg-red-500 selection:text-white">
      <div className="flex-1 flex min-h-screen">
        
        {/* ============================================================== */}
        {/* SIDEBAR BÊN TRÁI: TRỤC ĐIỀU HƯỚNG DUY NHẤT TRÊN DESKTOP */}
        {/* ============================================================== */}
        <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200/80 flex-col shrink-0 sticky top-0 h-screen max-h-screen self-start overflow-hidden z-20">
          
          {/* Header Brand: Logo Lớn Nổi Bật & Nhận Diện Kinetix OS */}
          <div className="h-20 px-5 border-b border-slate-100 flex items-center justify-between shrink-0">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-600 via-rose-600 to-red-700 text-white flex items-center justify-center font-black text-xl shadow-md shadow-red-500/30 group-hover:scale-105 transition-transform shrink-0">
                K
              </div>
              <div className="flex flex-col text-left">
                <span className="font-black text-lg text-slate-900 tracking-tight leading-tight">
                  Kinetix OS
                </span>
                <span className="text-[11px] font-mono text-red-600 font-bold uppercase tracking-wider mt-0.5">
                  Master Desk
                </span>
              </div>
            </Link>
          </div>

          {/* Bộ chọn Không Gian Làm Việc */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <span className="block px-1 text-[10px] font-mono uppercase font-bold text-slate-400 mb-1.5">
              {language === "vi" ? "Không Gian Làm Việc" : "Workspace"}
            </span>
            <WorkspaceSwitcher />
          </div>

          {/* Mã Không Gian Gia Đình (Family / Workspace Code) */}
          <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {language === "vi" ? "Mã mời người thân:" : "Workspace Code:"}
              </span>
              <span className="font-mono font-bold text-slate-800 text-xs truncate">
                {currentWorkspace?.workspaceCode || familyInfo?.familyCode || "KNTX-8888"}
              </span>
            </div>
            <button
              onClick={handleCopyCode}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                copiedCode
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs"
              }`}
              title={
                language === "vi"
                  ? "Gửi mã này cho người thân (ông bà, con trẻ) để tham gia không gian này"
                  : "Send this code to family members to join this workspace"
              }
              type="button"
            >
              <span className="material-symbols-outlined text-[13px]">
                {copiedCode ? "check" : "content_copy"}
              </span>
              <span>{copiedCode ? "Đã chép" : "Sao chép"}</span>
            </button>
          </div>

          {/* Danh mục 4 Không Gian Cốt Lõi */}
          <div className="flex-1 min-h-0 p-3 space-y-1 overflow-y-auto">
            <div className="flex items-center justify-between px-2 py-1 mb-1">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
                {language === "vi" ? "Không Gian" : "Spaces"}
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                {dynamicVaults.length} {language === "vi" ? "Hũ" : "Vaults"}
              </span>
            </div>

            {adminSpaces.map((sp) => {
              const isActive = activeTab === sp.id;
              return (
                <button
                  key={sp.id}
                  onClick={() => onTabChange(sp.id)}
                  type="button"
                  aria-pressed={isActive}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer group ${
                    isActive
                      ? "bg-red-50 text-red-950 font-bold border border-red-200 shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                      isActive
                        ? "bg-red-600 text-white shadow-xs shadow-red-500/25"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {sp.icon}
                    </span>
                  </span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs truncate font-bold">
                      {sp.label}
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal truncate">
                      {sp.badge}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Action: Khởi Tạo Hũ Mới */}
          <div className="p-3 border-t border-slate-100 shrink-0">
            <button
              onClick={() => vaultCreation.open()}
              type="button"
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[17px] text-red-400">
                add_circle
              </span>
              <span>
                {language === "vi"
                  ? "+ Khởi Tạo Hũ Mới"
                  : "+ New Dynamic Vault"}
              </span>
            </button>
          </div>

          {/* User Footer: Avatar, Name, Role, Settings, Logout */}
          <div className="p-3 border-t border-slate-100 flex items-center justify-between bg-white shrink-0 mt-auto">
            <div className="flex items-center gap-2.5 min-w-0">
              {sidebarAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sidebarAvatar}
                  alt={user?.fullName || "User"}
                  className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="w-8 h-8 rounded-full border border-red-200 bg-red-50 text-[11px] font-bold text-red-700 flex items-center justify-center shrink-0"
                >
                  {sidebarInitial || "K"}
                </span>
              )}
              <div className="flex flex-col text-left min-w-0">
                <span className="text-xs font-bold text-slate-800 truncate max-w-[100px]">
                  {user?.fullName || "Chủ Hộ (Admin)"}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Admin Master
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Link
                href="/settings"
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors"
                title="Cài đặt hệ thống"
              >
                <span className="material-symbols-outlined text-[18px]">
                  settings
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                title="Đăng xuất"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">
                  logout
                </span>
              </button>
            </div>
          </div>
        </aside>

        {/* ============================================================== */}
        {/* MAIN WORKSPACE CANVAS WITH CLEAN TOPBAR */}
        {/* ============================================================== */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* ============================================================ */}
          {/* TOPBAR TINH GỌN (CLEAN CONTEXTUAL TOPBAR) */}
          {/* ============================================================ */}
          <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-2xs transition-all">
            
            {/* --- BÊN TRÁI: TIÊU ĐỀ NGỮ CẢNH (DESKTOP) HOẶC LOGO (MOBILE) --- */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile Brand (chỉ hiện khi màn hình nhỏ ẩn sidebar) */}
              <div className="flex lg:hidden items-center gap-2.5 shrink-0">
                <Link
                  href="/dashboard"
                  className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 via-rose-600 to-red-700 text-white flex items-center justify-center font-black text-lg shadow-sm shadow-red-500/25 shrink-0"
                  title="Kinetix OS Dashboard"
                >
                  K
                </Link>
                <div className="max-w-[150px] sm:max-w-[200px]">
                  <WorkspaceSwitcher />
                </div>
              </div>

              {/* Desktop Contextual Title (hiển thị trang đang đứng, không trùng lặp các tab) */}
              <div className="hidden lg:flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[22px] text-slate-700">
                    {activeSpaceObj.icon}
                  </span>
                  <h1 className="text-sm font-bold text-slate-900 tracking-tight">
                    {activeSpaceObj.fullLabel}
                  </h1>
                </div>
                <span className="text-slate-300">|</span>
                <span className="text-xs text-slate-500 font-medium">
                  {activeSpaceObj.description}
                </span>
              </div>
            </div>

            {/* --- BÊN PHẢI: TELEMETRY DUAL-CHAIN, SỔ CÁI, NẠP QUỸ VÀ TIỆN ÍCH --- */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              
              {/* Dual-Chain Telemetry Capsule (Desktop/Tablet) */}
              <div className="relative" ref={telemetryRef}>
                <button
                  type="button"
                  onClick={() => setIsTelemetryOpen(!isTelemetryOpen)}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/90 text-xs font-mono transition-all cursor-pointer group shadow-2xs"
                  title="Xem trạng thái kết nối Avalanche Dual-Chain"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-slate-700">Family L1</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 rounded font-semibold border border-emerald-200">
                      Fuji
                    </span>
                  </div>
                  <span className="text-slate-300 font-sans text-xs">⇄</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="font-bold text-slate-700">Fuji C-Chain</span>
                    <span className="text-[10px] text-red-700 bg-red-50 px-1 rounded font-semibold border border-red-200">
                      AVAX
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[15px] text-slate-400 group-hover:text-slate-600 transition-transform">
                    info
                  </span>
                </button>

                {/* Popover Chi Tiết Dual-Chain Telemetry */}
                {isTelemetryOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-50 text-left animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                        <span className="text-xs font-bold text-slate-900">
                        Thông tin mạng & nguồn tiền
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold border border-emerald-200">
                        Fuji Testnet
                      </span>
                    </div>

                    <div className="mt-3 space-y-2.5 text-xs">
                      {/* L1 Box */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span>⚡ Family L1 (Appchain)</span>
                          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/60 px-1 rounded">
                            Theo cấu hình
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Hũ smart contract kiểm tra hạn mức và quyền trên mạng được triển khai. Xem thông tin xác minh trong từng hũ.
                        </p>
                      </div>

                      {/* C-Chain Box */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span>🌊 Avalanche Fuji C-Chain</span>
                          <span className="text-[10px] font-mono text-red-700 bg-red-100/60 px-1 rounded">
                            Phí mạng AVAX
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Tiền ví chung được giữ trong Core. Nạp và chi trả có tx hash để đối soát, không có lợi suất tự động.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Nút Xem Sổ Cái On-Chain */}
              <button
                type="button"
                onClick={() => setIsLedgerOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 border border-slate-200/60"
                title="Mở Sổ Cái Lịch Sử Giao Dịch Dual-Chain (Audit Log)"
              >
                <span className="material-symbols-outlined text-[17px] text-slate-600">
                  receipt_long
                </span>
                <span className="hidden md:inline">
                  {language === "vi" ? "Sổ Cái On-Chain" : "Audit Ledger"}
                </span>
              </button>

              {/* Primary CTA: Nạp Quỹ (Avalanche Red Gradient) */}
              <button
                type="button"
                onClick={() => setIsDepositModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold shadow-xs shadow-red-500/25 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Nạp tiền vào Hũ tiền"
              >
                <span className="material-symbols-outlined text-[17px]">
                  bolt
                </span>
                <span>{language === "vi" ? "Nạp Quỹ" : "Deposit"}</span>
              </button>

              {/* Chuông Thông Báo Thời Gian Thực */}
              <NotificationDropdown />

              {/* Nút Chuyển Đổi Ngôn Ngữ */}
              <button
                onClick={toggleLanguage}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-xs font-mono font-bold text-slate-700 transition-colors cursor-pointer border border-slate-200/60"
                title="Chuyển đổi ngôn ngữ VI / EN"
                type="button"
              >
                {language === "vi" ? "🇻🇳 VI" : "🇬🇧 EN"}
              </button>

              {/* Menu Tài Khoản chỉ xuất hiện trên Mobile (vì desktop đã có ở đáy sidebar) */}
              <div className="relative lg:hidden" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200/60 transition-all cursor-pointer"
                  title="Tài khoản"
                >
                  {sidebarAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sidebarAvatar}
                      alt={user?.fullName || "User"}
                      className="w-7 h-7 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="w-7 h-7 rounded-lg bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center">
                      {sidebarInitial}
                    </span>
                  )}
                  <span className="material-symbols-outlined text-[15px] text-slate-500">
                    expand_more
                  </span>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50 text-left animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="p-2.5 bg-slate-50 rounded-xl mb-1.5">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {user?.fullName || "Chủ Hộ"}
                      </p>
                      <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-red-100 text-red-700 font-bold">
                        Admin Master
                      </span>
                    </div>

                    <Link
                      href="/settings"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[17px] text-slate-500">
                        settings
                      </span>
                      <span>{language === "vi" ? "Cài Đặt" : "Settings"}</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[17px]">
                        logout
                      </span>
                      <span>{language === "vi" ? "Đăng Xuất" : "Sign Out"}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* ============================================================ */}
          {/* MAIN CONTENT CANVAS */}
          {/* ============================================================ */}
          <main className="flex-1 p-4 sm:p-6 pb-28 lg:pb-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>

      {/* ================================================================ */}
      {/* THANH ĐIỀU HƯỚNG ĐÁY KÍNH MỜ CHO MOBILE (FLOATING GLASS DOCK) */}
      {/* ================================================================ */}
      <MobileNavBar
        activeTab={activeTab}
        onTabChange={onTabChange}
        onOpenDeposit={() => setIsDepositModalOpen(true)}
      />

      {/* ================================================================ */}
      {/* MODALS QUẢN TRỊ TRUNG TÂM */}
      {/* ================================================================ */}
      <DepositVaultModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
      />

      <TransactionLedgerModal
        isOpen={isLedgerOpen}
        onClose={() => setIsLedgerOpen(false)}
      />
    </div>
  );
};
export default AppShell;
