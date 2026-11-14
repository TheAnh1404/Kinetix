"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { useSettings } from "@/context/SettingsContext";
import { DepositVaultModal } from "@/components/vaults/DepositVaultModal";
import { useVaultCreation } from "@/context/VaultCreationContext";
import { NotificationDropdown } from "@/components/dashboard/NotificationDropdown";
import { TransactionLedgerModal } from "@/components/dashboard/TransactionLedgerModal";
import { ActiveTab, WorkspaceItem } from "@/types";
import { DemoPersonaBar } from "./DemoPersonaBar";
import { BottomNav } from "./BottomNav";
import { KinetixLogo } from "@/components/ui/KinetixLogo";
import { CreateWorkspaceModal } from "@/components/workspaces/CreateWorkspaceModal";

interface AppShellProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  children: React.ReactNode;
}

interface StandardWorkspacePreset {
  type: "FAMILY" | "SIBLINGS" | "FRIENDS" | "COMMUNITY";
  name: string;
  icon: string;
  defaultBalance: number;
  tagline: string;
}

const PRESET_WORKSPACES: StandardWorkspacePreset[] = [
  {
    type: "FAMILY",
    name: "Đại Gia Đình Bác Ba",
    icon: "👨‍👩‍👧‍👦",
    defaultBalance: 2450,
    tagline: "Bảo hộ hưu trí & Heo đất",
  },
  {
    type: "SIBLINGS",
    name: "Anh Chị Em Nhà Họ Nguyễn",
    icon: "🤝",
    defaultBalance: 1000,
    tagline: "Góp vốn xoay vòng ROSCA",
  },
  {
    type: "FRIENDS",
    name: "Nhóm Bạn Thân Đại Học Bách Khoa",
    icon: "🎒",
    defaultBalance: 750,
    tagline: "Quỹ Phượt & Chia tiền nhóm",
  },
  {
    type: "COMMUNITY",
    name: "CLB Avalanche Campus",
    icon: "🏛️",
    defaultBalance: 350,
    tagline: "Quỹ Minh Bạch & Bounty",
  },
];

/**
 * AppShell: Khung Điều Hướng Thích Ứng Chuẩn Mực Kinetix OS
 * - Hỗ trợ cả 2 chế độ:
 *   + Mobile Mode: Cho màn hình nhỏ (<768px) HOẶC khi bật Viewport Simulator (khung smartphone 400px trung tâm)
 *   + Desktop Fullscreen (>=1024px): Sidebar w-72 cố định hiển thị 4 Không Gian với số dư tabular-nums
 * - Phong cách Editorial Fintech:
 *   + Nền #F8FAFC, Cards #FFFFFF viền subtle border-slate-200/90
 *   + Avalanche Red #E84142 cho active accents / CTA
 *   + Emerald #10B981 cho L1 0-fee và yield
 *   + Amber #F59E0B cho pending actions
 */
export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  onTabChange,
  children,
}) => {
  const {
    workspaces,
    currentWorkspace,
    switchWorkspace,
    createWorkspace,
    familyInfo,
    currentMember,
    dynamicVaults,
  } = useFamily();
  const { user, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useSettings();
  const router = useRouter();

  // Trạng thái Viewport Simulator 400px
  const [isMobileSimulator, setIsMobileSimulator] = useState<boolean>(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState<boolean>(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState<boolean>(false);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState<boolean>(false);
  const [isWorkspaceDrawerOpen, setIsWorkspaceDrawerOpen] = useState<boolean>(false);
  const [newWsName, setNewWsName] = useState<string>("");
  const [newWsType, setNewWsType] = useState<"FAMILY" | "SIBLINGS" | "FRIENDS" | "COMMUNITY">("FAMILY");
  const [isCreatingWs, setIsCreatingWs] = useState<boolean>(false);

  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState<boolean>(false);

  const telemetryRef = useRef<HTMLDivElement>(null);
  const vaultCreation = useVaultCreation();

  // Đọc cấu hình simulator từ localStorage khi tải trang
  useEffect(() => {
    try {
      const saved = localStorage.getItem("kinetix_viewport_simulator");
      if (saved === "true") {
        setIsMobileSimulator(true);
      }
    } catch {}
  }, []);

  // Đóng popover khi nhấp chuột ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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

  const handleSwitchWorkspace = async (preset: StandardWorkspacePreset) => {
    const matched = workspaces.find((w) => w.type === preset.type);
    if (matched) {
      if (matched.id !== currentWorkspace?.id) {
        await switchWorkspace(matched.id);
      }
    } else {
      // Nếu chưa có trong danh sách, tự động tạo mới
      const res = await createWorkspace(preset.name, preset.type);
      if (res.success && res.workspace?.id) {
        await switchWorkspace(res.workspace.id);
      }
    }
  };

  const handleCreateNewWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    setIsCreatingWs(true);
    try {
      const res = await createWorkspace(newWsName.trim(), newWsType);
      if (res.success && res.workspace?.id) {
        await switchWorkspace(res.workspace.id);
        setIsCreateWorkspaceOpen(false);
        setNewWsName("");
      } else {
        alert(res.error || "Không thể tạo không gian mới");
      }
    } finally {
      setIsCreatingWs(false);
    }
  };

  // Tính số dư cho từng không gian (tổng từ dynamic vaults hoặc số dư mẫu chuẩn)
  const getWorkspaceBalance = (type: string, wsId?: string): number => {
    if (wsId) {
      const vaults = dynamicVaults.filter((v) => v.workspaceId === wsId);
      if (vaults.length > 0) {
        const total = vaults.reduce((acc, v) => acc + (Number(v.totalBalance) || 0), 0);
        if (total > 0) return total;
      }
    }
    const preset = PRESET_WORKSPACES.find((p) => p.type === type);
    return preset ? preset.defaultBalance : 500;
  };

  const sidebarAvatar = user?.avatarUrl || currentMember?.avatar;
  const sidebarInitial = (user?.fullName || currentMember?.name || "K")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // 4 Không gian con tương ứng 4 bộ quy tắc Kinetix
  const ruleTabs = [
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
    },
    {
      id: "kinetix-shield" as ActiveTab,
      label: language === "vi" ? "Hũ An Sinh" : "Shield Vault",
      fullLabel: language === "vi" ? "Hũ An Sinh Ông Bà" : "Elderly Shield Vault",
      icon: "shield",
      badge: "SHIELD",
      description:
        language === "vi"
          ? "Rút nhanh 0 gas <= limit, rút lớn cần M/N chữ ký bảo hộ"
          : "Fast withdraw 0-fee, large withdraw requires M/N multisig",
    },
    {
      id: "kinetix-kids" as ActiveTab,
      label: language === "vi" ? "Heo Đất & Việc Nhà" : "Kids Chores",
      fullLabel: language === "vi" ? "Heo Đất & Việc Nhà Trẻ" : "Kids Chore Vault",
      icon: "savings",
      badge: "MILESTONE",
      description:
        language === "vi"
          ? "Vốn C-Chain sinh lời 8%, mở khóa thưởng khi xong việc"
          : "C-Chain yield 8% APY, unlock rewards on task verification",
    },
    {
      id: "quy-rosca" as ActiveTab,
      label: language === "vi" ? "Quỹ Họ Hụi" : "ROSCA Savings",
      fullLabel: language === "vi" ? "Quỹ Họ Hụi Xoay Vòng" : "ROSCA Savings Vault",
      icon: "groups",
      badge: "ROSCA",
      description:
        language === "vi"
          ? "Góp theo kỳ, tiền nhàn rỗi sinh lời DeFi, giải ngân minh bạch"
          : "Periodic contributions, idle capital yields DeFi APY",
    },
  ];

  const activeSpaceObj = ruleTabs.find((s) => s.id === activeTab) || ruleTabs[0];

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#F8FAFC] dark:bg-[#0b111d] text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-[#E84142] selection:text-white transition-colors duration-200">
      
      {/* ============================================================== */}
      {/* 1. DEMO PERSONA BAR & VIEWPORT SIMULATOR TOGGLE TRÊN CÙNG       */}
      {/* ============================================================== */}
      <DemoPersonaBar
        isMobileSimulator={isMobileSimulator}
        onToggleSimulator={(enabled) => setIsMobileSimulator(enabled)}
        onTabChange={onTabChange}
      />

      {/* ============================================================== */}
      {/* 2. NỘI DUNG CHÍNH (PHÂN NHÁNH: SIMULATOR HOẶC DESKTOP FULL)     */}
      {/* ============================================================== */}
      {isMobileSimulator ? (
        /* ============================================================ */
        /* CHẾ ĐỘ MOBILE SIMULATOR: KHUNG SMARTPHONE 400PX SẮC SẢO      */
        /* ============================================================ */
        <div className="flex-1 flex flex-col items-center justify-center p-3 sm:py-6 bg-[#F1F5F9]/60 dark:bg-[#070b13]">
          {/* Vỏ ngoài Smartphone 400px với bezel và nút vật lý */}
          <div className="w-full max-w-[400px] bg-slate-900 rounded-[50px] p-3 shadow-2xl border-4 border-slate-700/80 ring-1 ring-white/10 relative transition-all">
            
            {/* Nút vật lý bên hông */}
            <div className="absolute -left-[7px] top-24 w-[3px] h-10 bg-slate-600 rounded-l-md" />
            <div className="absolute -left-[7px] top-38 w-[3px] h-12 bg-slate-600 rounded-l-md" />
            <div className="absolute -right-[7px] top-28 w-[3px] h-16 bg-slate-600 rounded-r-md" />

            {/* Màn hình điện thoại (Screen Canvas) */}
            <div className="w-full bg-[#F8FAFC] dark:bg-[#0b111d] text-slate-900 dark:text-slate-100 rounded-[40px] overflow-hidden flex flex-col h-[740px] shadow-inner relative">
              
              {/* Status Bar */}
              <div className="h-10 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-between shrink-0 select-none border-b border-slate-200/50 dark:border-slate-800 z-30">
                <span className="text-[12px] font-bold font-mono text-slate-800 dark:text-slate-200">
                  9:41
                </span>

                {/* Dynamic Island */}
                <div className="w-20 h-4 bg-black rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-slate-900 mr-2" />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-900/60" />
                </div>

                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <span className="material-symbols-outlined text-[13px]">signal_cellular_alt</span>
                  <span className="material-symbols-outlined text-[13px]">wifi</span>
                  <span className="material-symbols-outlined text-[15px]">battery_full</span>
                </div>
              </div>

              {/* Top Header Gọn Gàng (h-14) Bên Trong Màn Hình Điện Thoại */}
              <div className="h-14 px-3 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 z-30">
                {/* Bên trái: Nút bấm mở Bottom Sheet Chọn Không Gian */}
                <button
                  type="button"
                  onClick={() => setIsWorkspaceDrawerOpen(true)}
                  className="flex items-center gap-1.5 px-2 py-1 -ml-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/70 dark:border-slate-700 transition cursor-pointer max-w-[190px]"
                  title="Bấm để chọn không gian khác"
                >
                  <span className="text-base leading-none" aria-hidden="true">
                    {currentWorkspace?.type === "SIBLINGS"
                      ? "🤝"
                      : currentWorkspace?.type === "FRIENDS"
                        ? "🎒"
                        : currentWorkspace?.type === "COMMUNITY"
                          ? "🏛️"
                          : "👨‍👩‍👧‍👦"}
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {currentWorkspace?.name || "Đại Gia Đình Bác Ba"}
                  </span>
                  <span className="material-symbols-outlined text-[15px] text-slate-400">
                    expand_more
                  </span>
                </button>

                {/* Bên phải: Huy hiệu nhỏ 0đ Gas + Nút chuyển nhanh góc nhìn */}
                <div className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-[#10B981] border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-[#10B981] animate-pulse" />
                    0đ Gas
                  </span>

                  {currentWorkspace?.type === "FAMILY" ? (
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => onTabChange("quan-tri-cha-me")}
                        className={`px-1.5 py-0.5 rounded cursor-pointer transition ${
                          activeTab === "quan-tri-cha-me"
                            ? "bg-white dark:bg-slate-900 text-[#E84142] shadow-2xs font-bold"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                        title="Bố Mẹ (Quản trị)"
                      >
                        Bố Mẹ
                      </button>
                      <button
                        type="button"
                        onClick={() => onTabChange("kinetix-shield")}
                        className={`px-1.5 py-0.5 rounded cursor-pointer transition ${
                          activeTab === "kinetix-shield"
                            ? "bg-white dark:bg-slate-900 text-[#E84142] shadow-2xs font-bold"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                        title="Ông Bà (WCAG AAA)"
                      >
                        Ông Bà
                      </button>
                      <button
                        type="button"
                        onClick={() => onTabChange("kinetix-kids")}
                        className={`px-1.5 py-0.5 rounded cursor-pointer transition ${
                          activeTab === "kinetix-kids"
                            ? "bg-white dark:bg-slate-900 text-[#E84142] shadow-2xs font-bold"
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                        title="Con Nhỏ (Heo đất)"
                      >
                        Con
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsDepositModalOpen(true)}
                      className="px-2 py-1 rounded-lg bg-[#E84142] hover:bg-red-700 text-white text-[10px] font-bold shadow-2xs transition-all active:scale-95"
                      type="button"
                      title="Nạp Quỹ"
                    >
                      + Nạp
                    </button>
                  )}
                </div>
              </div>

              {/* Vùng nội dung ứng dụng di động cuộn độc lập */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-4 pb-20 no-scrollbar">
                {children}
              </div>

              {/* Working BottomNav bám đáy khung điện thoại */}
              <BottomNav
                activeTab={activeTab}
                onTabChange={onTabChange}
                onOpenLedger={() => setIsLedgerOpen(true)}
                isSimulator={true}
              />

              {/* Bottom Sheet Drawer Bên Trong Khung Simulator */}
              {isWorkspaceDrawerOpen && (
                <div
                  className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150"
                  onClick={() => setIsWorkspaceDrawerOpen(false)}
                >
                  <div
                    className="w-full bg-white dark:bg-slate-900 rounded-t-3xl p-4 border-t border-slate-200 dark:border-slate-800 shadow-2xl space-y-3 max-h-[80%] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto" />
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          Chọn Không Gian Kinetix
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          Chuyển đổi 1-click (0đ phí gas)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsWorkspaceDrawerOpen(false)}
                        className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {PRESET_WORKSPACES.map((preset) => {
                        const matchedWs = workspaces.find((w) => w.type === preset.type);
                        const isActive =
                          currentWorkspace?.type === preset.type ||
                          (matchedWs && currentWorkspace?.id === matchedWs.id);
                        const balance = getWorkspaceBalance(preset.type, matchedWs?.id);

                        return (
                          <button
                            key={preset.type}
                            type="button"
                            onClick={async () => {
                              await handleSwitchWorkspace(preset);
                              setIsWorkspaceDrawerOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition cursor-pointer ${
                              isActive
                                ? "bg-red-50 dark:bg-red-950/40 border border-[#E84142]"
                                : "bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xl leading-none">{preset.icon}</span>
                              <div className="min-w-0">
                                <div className="text-xs font-bold truncate text-slate-900 dark:text-white">
                                  {matchedWs?.name || preset.name}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  {preset.tagline}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0 pl-2">
                              <span className="block font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-white">
                                {balance.toLocaleString()} USDC
                              </span>
                              {isActive && (
                                <span className="text-[9px] font-mono text-emerald-600 font-bold block">
                                  ● Đang mở
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsWorkspaceDrawerOpen(false);
                        setIsCreateWorkspaceOpen(true);
                      }}
                      className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#E84142] flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px] text-[#E84142]">
                        add_circle
                      </span>
                      <span>+ Tạo Không Gian Mới</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dòng trạng thái Telemetry dưới khung điện thoại */}
          <div className="mt-3 text-center text-[11px] text-slate-500 font-mono flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span>Family L1 Appchain: 0đ Gas</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-[#E84142]">Avalanche Teleporter ICM: Kết nối</span>
          </div>
        </div>
      ) : (
        /* ============================================================ */
        /* CHẾ ĐỘ DESKTOP FULLSCREEN & MOBILE NATIVE RESPONSIVE         */
        /* ============================================================ */
        <div className="flex-1 flex min-h-screen">
          
          {/* ============================================================ */}
          {/* SIDEBAR BÊN TRÁI: W-72 CỐ ĐỊNH VỚI 4 WORKSPACES & BALANCES   */}
          {/* ============================================================ */}
          <aside className="hidden lg:flex w-72 bg-white dark:bg-[#111927] border-r border-slate-200/90 dark:border-slate-800 flex-col shrink-0 sticky top-0 h-screen max-h-screen self-start overflow-hidden z-20 transition-colors duration-200">
            
            {/* Header Brand: Kinetix OS */}
            <div className="h-16 px-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <Link href="/dashboard" className="flex items-center gap-2.5 group">
                <KinetixLogo size="md" subtitle="Multi-Space OS" />
              </Link>
            </div>

            {/* Infrastructure Telemetry Indicators */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 shrink-0">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-2xs space-y-1.5 text-xs font-mono">
                {/* L1 Indicator */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">Family L1</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-50 dark:bg-emerald-950/40 text-[#10B981] border border-emerald-200 dark:border-emerald-900/60">
                    0đ Gas
                  </span>
                </div>
                {/* Teleporter ICM Indicator */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#E84142]" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">Teleporter ICM</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-red-50 dark:bg-red-950/40 text-[#E84142] border border-red-200 dark:border-red-900/60">
                    Kết nối Fuji
                  </span>
                </div>
              </div>
            </div>

            {/* Scrollable middle container: 4 Workspaces + Spaces Tabs */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
              
              {/* --- DANH SÁCH 4 KHÔNG GIAN (WORKSPACES) VỚI SỐ DƯ TABULAR-NUMS --- */}
              <div>
                <div className="flex items-center justify-between px-1 mb-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                    Không Gian Hoạt Động (4)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    8% APY
                  </span>
                </div>

                <div className="space-y-1.5">
                  {PRESET_WORKSPACES.map((preset) => {
                    const matchedWs = workspaces.find((w) => w.type === preset.type);
                    const isActive =
                      currentWorkspace?.type === preset.type ||
                      (matchedWs && currentWorkspace?.id === matchedWs.id);
                    const balance = getWorkspaceBalance(preset.type, matchedWs?.id);

                    return (
                      <button
                        key={preset.type}
                        type="button"
                        onClick={() => handleSwitchWorkspace(preset)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer group ${
                          isActive
                            ? "bg-red-50/80 dark:bg-red-950/40 text-slate-900 dark:text-white border-2 border-[#E84142] shadow-xs"
                            : "bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-lg leading-none" aria-hidden="true">
                            {preset.icon}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold truncate leading-tight">
                              {matchedWs?.name || preset.name}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                              {preset.tagline}
                            </span>
                          </div>
                        </div>

                        {/* Số dư Tabular Nums */}
                        <div className="text-right shrink-0 pl-2">
                          <span
                            className={`block font-mono text-xs font-bold tabular-nums ${
                              isActive
                                ? "text-[#E84142] dark:text-red-400"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {balance.toLocaleString("en-US", {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}{" "}
                            <span className="text-[10px] font-normal">USDC</span>
                          </span>
                          {isActive && (
                            <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold block">
                              ● Đang xem
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Nút Tạo Không Gian Mới */}
                <button
                  type="button"
                  onClick={() => setIsCreateWorkspaceOpen(true)}
                  className="w-full mt-2 py-2 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-[#E84142] hover:bg-red-50/40 dark:hover:bg-red-950/20 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-[#E84142] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#E84142]">
                    add_circle
                  </span>
                  <span>+ Tạo Không Gian Mới</span>
                </button>
              </div>

              {/* --- DANH MỤC 4 HỆ THỐNG QUY TẮC CỐT LÕI (SPACES TABS) --- */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between px-1 mb-1.5">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                    Hũ Tiền & Đa Ký
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {dynamicVaults.length} Hũ
                  </span>
                </div>

                <div className="space-y-1">
                  {ruleTabs.map((sp) => {
                    const isActive = activeTab === sp.id;
                    return (
                      <button
                        key={sp.id}
                        onClick={() => onTabChange(sp.id)}
                        type="button"
                        aria-pressed={isActive}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer group ${
                          isActive
                            ? "bg-red-50 dark:bg-red-950/40 text-red-950 dark:text-red-200 font-bold border border-red-200 dark:border-red-900/60 shadow-2xs"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white border border-transparent"
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                            isActive
                              ? "bg-[#E84142] text-white shadow-xs"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[17px]">
                            {sp.icon}
                          </span>
                        </span>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs truncate font-bold">
                            {sp.label}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal truncate">
                            {sp.badge}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Action: Khởi Tạo Hũ Mới */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                onClick={() => vaultCreation.open()}
                type="button"
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-[#E84142] hover:bg-slate-800 dark:hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[17px] text-[#E84142] dark:text-white">
                  add_circle
                </span>
                <span>
                  {language === "vi" ? "+ Khởi Tạo Hũ Mới" : "+ New Dynamic Vault"}
                </span>
              </button>
            </div>

            {/* User Footer */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#111927] shrink-0 mt-auto">
              <div className="flex items-center gap-2.5 min-w-0">
                {sidebarAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sidebarAvatar}
                    alt={user?.fullName || "User"}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="w-8 h-8 rounded-full border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 text-[11px] font-bold text-[#E84142] flex items-center justify-center shrink-0"
                  >
                    {sidebarInitial || "K"}
                  </span>
                )}
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[110px]">
                    {user?.fullName || currentMember?.name || "Chủ Hộ (Admin)"}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    {currentMember?.title || "Admin Master"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Link
                  href="/settings"
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                  title="Cài đặt hệ thống"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    settings
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-[#E84142] dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center transition-colors cursor-pointer"
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

          {/* ============================================================ */}
          {/* MAIN WORKSPACE CANVAS WITH CLEAN TOPBAR                      */}
          {/* ============================================================ */}
          <div className="flex-1 flex flex-col min-w-0">
            
            {/* Topbar */}
            <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#111927]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-2xs transition-colors duration-200">
              
              {/* Bên trái: Tiêu đề Ngữ cảnh */}
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Brand / Bottom Sheet trigger (chỉ hiện khi màn hình nhỏ ẩn sidebar) */}
                <button
                  type="button"
                  onClick={() => setIsWorkspaceDrawerOpen(true)}
                  className="flex lg:hidden items-center gap-2 px-2.5 py-1.5 -ml-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 transition cursor-pointer max-w-[200px]"
                  title="Bấm để chọn không gian khác"
                >
                  <span className="text-lg leading-none" aria-hidden="true">
                    {currentWorkspace?.type === "SIBLINGS"
                      ? "🤝"
                      : currentWorkspace?.type === "FRIENDS"
                        ? "🎒"
                        : currentWorkspace?.type === "COMMUNITY"
                          ? "🏛️"
                          : "👨‍👩‍👧‍👦"}
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {currentWorkspace?.name || "Đại Gia Đình Bác Ba"}
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-slate-400">
                    expand_more
                  </span>
                </button>

                {/* Desktop Contextual Title */}
                <div className="hidden lg:flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-slate-700 dark:text-slate-300">
                      {activeSpaceObj.icon}
                    </span>
                    <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                      {activeSpaceObj.fullLabel}
                    </h1>
                  </div>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {activeSpaceObj.description}
                  </span>
                </div>
              </div>

              {/* Bên phải: Tiện ích, Sổ cái, Nạp quỹ */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                
                {/* Dual-Chain Telemetry Capsule */}
                <div className="relative" ref={telemetryRef}>
                  <button
                    type="button"
                    onClick={() => setIsTelemetryOpen(!isTelemetryOpen)}
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-xs font-mono transition-all cursor-pointer group shadow-2xs text-slate-700 dark:text-slate-200"
                    title="Xem trạng thái kết nối Avalanche Dual-Chain"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                      <span className="font-bold">L1: 0đ Gas</span>
                    </div>
                    <span className="text-slate-300 dark:text-slate-600 font-sans text-xs">⇄</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#E84142]" />
                      <span className="font-bold">Fuji APY 8%</span>
                    </div>
                  </button>

                  {/* Popover Chi Tiết Dual-Chain Telemetry */}
                  {isTelemetryOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-4 z-50 text-left animate-in fade-in slide-in-from-top-2 duration-150 text-slate-900 dark:text-slate-100">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-ping" />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            Avalanche Dual-Chain Telemetry
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded font-bold border border-emerald-200 dark:border-emerald-900/60">
                          Live
                        </span>
                      </div>

                      <div className="mt-3 space-y-2.5 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                          <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                            <span>⚡ Family L1 (Appchain)</span>
                            <span className="text-[10px] font-mono text-[#10B981] bg-emerald-100/60 dark:bg-emerald-950/50 px-1 rounded">
                              0đ Gas Fee
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            Rút nhanh &lt;= hạn mức hũ tức thì trong 1 giây. Không tốn phí gas.
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                          <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                            <span>🌊 Avalanche Fuji C-Chain</span>
                            <span className="text-[10px] font-mono text-[#E84142] bg-red-100/60 dark:bg-red-950/50 px-1 rounded">
                              DeFi 8% APY
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            Vốn nhàn rỗi được tự động gửi qua Teleporter ICM sinh lời hàng ngày.
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
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs border border-slate-200/60 dark:border-slate-700"
                  title="Mở Sổ Cái Lịch Sử Giao Dịch Dual-Chain"
                >
                  <span className="material-symbols-outlined text-[17px] text-slate-600 dark:text-slate-300">
                    receipt_long
                  </span>
                  <span className="hidden md:inline">
                    {language === "vi" ? "Sổ Cái On-Chain" : "Audit Ledger"}
                  </span>
                </button>

                {/* Theme Toggle */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-amber-400 flex items-center justify-center transition-all cursor-pointer shadow-2xs border border-slate-200/60 dark:border-slate-700"
                  title="Chuyển giao diện Sáng / Tối"
                  aria-label="Chuyển giao diện Sáng / Tối"
                >
                  <span className="material-symbols-outlined text-[19px]">
                    {theme === "dark" ? "light_mode" : "dark_mode"}
                  </span>
                </button>

                {/* Primary CTA: Nạp Quỹ */}
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#E84142] hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="Nạp tiền vào Hũ tiền"
                >
                  <span className="material-symbols-outlined text-[17px]">
                    bolt
                  </span>
                  <span>{language === "vi" ? "Nạp Quỹ" : "Deposit"}</span>
                </button>

                {/* Chuông Thông Báo */}
                <NotificationDropdown />

                {/* Chuyển Ngôn Ngữ */}
                <button
                  onClick={toggleLanguage}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700"
                  title="Chuyển đổi ngôn ngữ VI / EN"
                  type="button"
                >
                  {language === "vi" ? "🇻🇳 VI" : "🇬🇧 EN"}
                </button>
              </div>
            </header>

            {/* Main Content Canvas */}
            <main className="flex-1 p-4 sm:p-6 pb-28 lg:pb-8 max-w-7xl w-full mx-auto">
              {children}
            </main>
          </div>

          {/* Fixed BottomNav cho native mobile (<1024px) */}
          <BottomNav
            activeTab={activeTab}
            onTabChange={onTabChange}
            onOpenLedger={() => setIsLedgerOpen(true)}
            isSimulator={false}
          />
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. MODALS QUẢN TRỊ TRUNG TÂM                                   */}
      {/* ============================================================== */}
      <DepositVaultModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
      />

      <TransactionLedgerModal
        isOpen={isLedgerOpen}
        onClose={() => setIsLedgerOpen(false)}
      />

      {/* Modal Tạo Không Gian Mới Chuẩn Anti-AI Slop */}
      <CreateWorkspaceModal
        isOpen={isCreateWorkspaceOpen}
        onClose={() => setIsCreateWorkspaceOpen(false)}
        onCreated={async (ws) => {
          if (ws?.id) {
            await switchWorkspace(ws.id);
          }
          setIsCreateWorkspaceOpen(false);
        }}
      />

      {/* Bottom Sheet Drawer Chọn Không Gian Cho Native Mobile (<1024px) */}
      {!isMobileSimulator && isWorkspaceDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsWorkspaceDrawerOpen(false)}
        >
          <div
            className="w-full max-w-lg mx-auto bg-white dark:bg-slate-900 rounded-t-3xl p-5 border-t border-slate-200/90 dark:border-slate-800 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-1" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Chọn Không Gian Kinetix
                </h3>
                <p className="text-xs text-slate-500">
                  Chuyển đổi tức thì giữa các hội nhóm tài chính (0đ gas)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsWorkspaceDrawerOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-2">
              {PRESET_WORKSPACES.map((preset) => {
                const matchedWs = workspaces.find((w) => w.type === preset.type);
                const isActive =
                  currentWorkspace?.type === preset.type ||
                  (matchedWs && currentWorkspace?.id === matchedWs.id);
                const balance = getWorkspaceBalance(preset.type, matchedWs?.id);

                return (
                  <button
                    key={preset.type}
                    type="button"
                    onClick={async () => {
                      await handleSwitchWorkspace(preset);
                      setIsWorkspaceDrawerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left transition cursor-pointer ${
                      isActive
                        ? "bg-red-50/80 dark:bg-red-950/40 border-2 border-[#E84142] shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl leading-none">{preset.icon}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {matchedWs?.name || preset.name}
                        </div>
                        <div className="text-xs text-slate-500 truncate mt-0.5">
                          {preset.tagline}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-3">
                      <span className="block font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                        {balance.toLocaleString("en-US", { minimumFractionDigits: 0 })}{" "}
                        <span className="text-xs text-slate-500 font-normal">USDC</span>
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-mono text-emerald-600 font-bold block mt-0.5">
                          ● Đang mở
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setIsWorkspaceDrawerOpen(false);
                setIsCreateWorkspaceOpen(true);
              }}
              className="w-full py-3 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-[#E84142] text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#E84142] flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-[#E84142]">
                add_circle
              </span>
              <span>+ Tạo Không Gian Mới</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppShell;
