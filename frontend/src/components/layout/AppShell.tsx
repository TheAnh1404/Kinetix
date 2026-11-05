"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { WorkspaceSwitcher } from "@/components/workspaces/WorkspaceSwitcher";
import { DepositVaultModal } from "@/components/vaults/DepositVaultModal";
import { CreateVaultModal } from "@/components/vaults/CreateVaultModal";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { MemberResponsiveShell } from "@/components/layout/MemberResponsiveShell";
import { NotificationDropdown } from "@/components/dashboard/NotificationDropdown";
import { TransactionLedgerModal } from "@/components/dashboard/TransactionLedgerModal";
import { ActiveTab } from "@/types";

interface AppShellProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  onTabChange,
  children,
}) => {
  const { currentWorkspace, familyInfo, currentMember } = useFamily();

  const { user, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const router = useRouter();

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isCreateVaultOpen, setIsCreateVaultOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

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

  // Thông tin hiển thị cho từng vai diễn thành viên
  const adminSpaces = [
    {
      id: "quan-tri-cha-me" as ActiveTab,
      label:
        language === "vi" ? "Bàn Quản Trị Trung Tâm" : "Master Command Center",
      icon: "dashboard",
      description: "Tổng quan N Hũ, Đa chữ ký M/N & L1 Buffer",
    },
    {
      id: "kinetix-shield" as ActiveTab,
      label: language === "vi" ? "Hũ An Sinh Ông Bà" : "Elderly Shield Vault",
      icon: "shield",
      description: "Xem trước giao diện Ông Bà (phí mạng Fuji)",
    },
    {
      id: "kinetix-kids" as ActiveTab,
      label: language === "vi" ? "Heo Đất & Việc Nhà Trẻ" : "Kids Chore Vault",
      icon: "savings",
      description: "Xem trước heo đất & thưởng việc nhà",
    },
    {
      id: "quy-rosca" as ActiveTab,
      label: language === "vi" ? "Quỹ Họ Hụi Xoay Vòng" : "ROSCA Savings Vault",
      icon: "groups",
      description: "Xem trước quỹ góp vốn",
    },
  ];

  /* ========================================================================= */
  /* PHÂN LUỒNG 1: THÀNH VIÊN GIA ĐÌNH (ÔNG BÀ, CON TRẺ, ANH CẢ) */
  /* Giao diện Smartphone tối giản, không hiển thị thanh quản trị của Admin */
  /* ========================================================================= */
  if (!isAdmin)
    return (
      <MemberResponsiveShell elderly={userRole === "ELDERLY"}>
        {children}
      </MemberResponsiveShell>
    );

  /* ========================================================================= */
  /* PHÂN LUỒNG 2: CHỦ GIA ĐÌNH / QUẢN TRỊ VIÊN (BỐ BA) */
  /* Giao diện Bàn Chỉ Huy Laptop Màn Hình Rộng (Master Command Center) */
  /* ========================================================================= */
  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-100 text-slate-900 font-sans">
      {/* KHÔNG GIAN BÀN CHỈ HUY LAPTOP */}
      <div className="flex-1 flex min-h-screen">
        {/* SIDEBAR BÊN TRÁI THU GỌN (WIDESCREEN DESKTOP) */}
        <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200/80 flex-col shrink-0">
          {/* Header Brand */}
          <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                K
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-sm text-slate-900 tracking-tight">
                  Kinetix OS
                </span>
                <span className="text-[10px] font-mono text-red-600 font-bold uppercase">
                  Master Desk
                </span>
              </div>
            </Link>

            <button
              onClick={handleCopyCode}
              className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              title="Sao chép Family Code"
              type="button"
            >
              {copiedCode
                ? "✓ Copied"
                : currentWorkspace?.workspaceCode || "KNTX-8888"}
            </button>
          </div>

          {/* Workspace Selector */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/60">
            <WorkspaceSwitcher />
          </div>

          {/* Navigation Spaces */}
          <div className="flex-1 p-3 space-y-1.5 overflow-y-auto">
            <span className="px-2 text-[10px] font-mono uppercase font-bold text-slate-400">
              {language === "vi" ? "Quản Trị Các Hũ Tiền" : "Vault Management"}
            </span>

            {adminSpaces.map((sp) => {
              const isActive = activeTab === sp.id;
              return (
                <button
                  key={sp.id}
                  onClick={() => onTabChange(sp.id)}
                  type="button"
                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    isActive
                      ? "bg-red-50 text-red-950 font-bold border border-red-200 shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                      isActive
                        ? "bg-red-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {sp.icon}
                    </span>
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs truncate font-bold">
                      {sp.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Action: Tạo Hũ Mới */}
          <div className="p-3 border-t border-slate-100">
            <button
              onClick={() => setIsCreateVaultOpen(true)}
              type="button"
              className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">
                add_circle
              </span>
              <span>
                {language === "vi"
                  ? "+ Khởi Tạo Hũ Mới"
                  : "+ New Dynamic Vault"}
              </span>
            </button>
          </div>

          {/* User Footer with Logout */}
          <div className="p-3 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={
                  user?.avatarUrl ||
                  currentMember?.avatar ||
                  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"
                }
                alt="Avatar"
                className="w-7 h-7 rounded-full object-cover border border-slate-200"
              />
              <div className="flex flex-col text-left min-w-0">
                <span className="text-xs font-bold text-slate-800 truncate">
                  {user?.fullName || "Bố Ba (Chủ Hộ)"}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Admin Master
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
                title="Cài đặt"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">
                  settings
                </span>
              </button>
              <button
                onClick={handleLogout}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 flex items-center justify-center transition-colors"
                title="Đăng xuất"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">
                  logout
                </span>
              </button>
            </div>
          </div>
        </aside>

        {/* MAIN WIDESCREEN WORKSPACE */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Workspace Bar */}
          <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 h-14 px-4 sm:px-6 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                {language === "vi"
                  ? "Bàn Điều Hành Chủ Gia Đình"
                  : "Family Master Command Center"}
              </span>
              <span className="text-xs text-slate-400">/</span>
              <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-slate-500">
                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ⚡ Family L1
                </span>
                <span>⇄</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  🌊 Fuji T1 · lợi suất chưa bật
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsLedgerOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="Xem Sổ Cái Lịch Sử Giao Dịch Dual-Chain"
              >
                <span className="material-symbols-outlined text-[16px]">
                  receipt_long
                </span>
                <span className="hidden md:inline">
                  {language === "vi" ? "Sổ Cái On-Chain" : "Ledger"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsCreateVaultOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  add
                </span>
                <span className="hidden sm:inline">
                  {language === "vi" ? "Tạo Hũ" : "New Vault"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsDepositModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">
                  bolt
                </span>
                <span>{language === "vi" ? "Nạp Quỹ" : "Deposit"}</span>
              </button>

              {/* Chuông Thông Báo Thời Gian Thực */}
              <NotificationDropdown />

              <button
                onClick={toggleLanguage}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-mono font-bold text-slate-800 transition-colors"
                type="button"
              >
                {language === "vi" ? "🇻🇳 VI" : "🇬🇧 EN"}
              </button>

              <button
                onClick={handleLogout}
                className="px-2.5 py-1 rounded-xl bg-red-50 hover:bg-red-100 text-xs font-bold text-red-600 transition-colors flex items-center gap-1"
                title="Đăng xuất"
                type="button"
              >
                <span className="material-symbols-outlined text-[15px]">
                  logout
                </span>
                <span className="hidden sm:inline">
                  {language === "vi" ? "Thoát" : "Exit"}
                </span>
              </button>
            </div>
          </header>

          <nav
            aria-label="Điều hướng quản trị trên điện thoại"
            className="lg:hidden flex flex-wrap gap-2 p-3 bg-white border-b border-slate-200"
          >
            <div className="w-full">
              <WorkspaceSwitcher />
            </div>
            {adminSpaces.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => onTabChange(item.id)}
                aria-pressed={activeTab === item.id}
                className="min-h-12 rounded-xl bg-slate-100 px-3 text-sm font-semibold"
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              className="min-h-12 rounded-xl px-3 border"
              onClick={() => setIsSettingsOpen(true)}
            >
              Cài đặt
            </button>
          </nav>
          {/* Content Canvas */}
          <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>

      {/* MODALS QUẢN TRỊ */}
      <DepositVaultModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
      />

      <CreateVaultModal
        isOpen={isCreateVaultOpen}
        onClose={() => setIsCreateVaultOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <TransactionLedgerModal
        isOpen={isLedgerOpen}
        onClose={() => setIsLedgerOpen(false)}
      />
    </div>
  );
};
