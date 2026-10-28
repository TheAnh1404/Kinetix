'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useFamily } from '@/context/FamilyContext';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/context/LanguageContext';
import { WorkspaceSwitcher } from '@/components/workspaces/WorkspaceSwitcher';
import { RoleSwitcherModal } from '@/components/RoleSwitcherModal';
import { DepositVaultModal } from '@/components/vaults/DepositVaultModal';
import { CreateVaultModal } from '@/components/vaults/CreateVaultModal';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { MobileNavBar } from '@/components/navigation/MobileNavBar';
import { ActiveTab, DemoMember } from '@/types';
import { SNOWTRACE_TESTNET_URL, CONTRACT_ADDRESSES } from '@/contracts/config';

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
  const {
    currentWorkspace,
    familyInfo,
    currentMember,
    setCurrentMember,
    members,
    dynamicVaults,
    notifications,
    unreadNotificationCount,
    markNotificationRead,
  } = useFamily();

  const { user, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isCreateVaultOpen, setIsCreateVaultOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Tính toán tổng tài sản thật của Không gian từ danh sách Dynamic Vaults
  const totalBalanceAVAX = dynamicVaults.reduce((sum, v) => sum + v.cachedTotalBalance, 0);
  const totalL1BufferAVAX = dynamicVaults.reduce((sum, v) => sum + v.cachedL1Buffer, 0);
  const totalCChainYieldAVAX = dynamicVaults.reduce((sum, v) => sum + v.cachedCChainYield, 0);

  const handleCopyCode = () => {
    const code = currentWorkspace?.workspaceCode || familyInfo?.familyCode;
    if (code) {
      navigator.clipboard?.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const spaces = [
    {
      id: 'quan-tri-cha-me' as ActiveTab,
      label: language === 'vi' ? 'Quản Trị & Hũ Tiền' : 'Parent & Vaults Hub',
      shortLabel: language === 'vi' ? 'Quản Trị' : 'Admin',
      icon: 'dashboard',
      description: language === 'vi' ? 'Đa chữ ký M/N & Danh mục Hũ tiền' : 'Multisig M/N & Vaults Portfolio',
      badge: 'Admin',
    },
    {
      id: 'kinetix-shield' as ActiveTab,
      label: language === 'vi' ? 'Báo Hiếu & An Sinh' : 'Kinetix Shield (Seniors)',
      shortLabel: language === 'vi' ? 'Báo Hiếu' : 'Shield',
      icon: 'shield',
      description: language === 'vi' ? 'Rút tức thì 0 gas & Chống lừa đảo' : 'Instant 0 gas & Safe Shield',
      badge: '0 Gas',
    },
    {
      id: 'kinetix-kids' as ActiveTab,
      label: language === 'vi' ? 'Heo Đất & Việc Nhà' : 'Kinetix Kids (Earn)',
      shortLabel: language === 'vi' ? 'Việc Nhà' : 'Kids',
      icon: 'savings',
      description: language === 'vi' ? 'Nhiệm vụ Chore-to-Earn & Tích lũy' : 'Chore-to-Earn Tasks & Savings',
      badge: 'Earn',
    },
    {
      id: 'quy-rosca' as ActiveTab,
      label: language === 'vi' ? 'Họ Hụi & Mục Tiêu' : 'ROSCA & Shared Goals',
      shortLabel: language === 'vi' ? 'Họ Hụi' : 'ROSCA',
      icon: 'groups',
      description: language === 'vi' ? 'Góp vốn xoay vòng & Mục tiêu chung' : 'Rotating Savings & Goals',
      badge: '8% APY',
    },
  ];

  const currentSpace = spaces.find((s) => s.id === activeTab) || spaces[0];

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      
      {/* ========================================================================= */}
      {/* 1. MOBILE BACKDROP OVERLAY */}
      {/* ========================================================================= */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* ========================================================================= */}
      {/* 2. VERTICAL SIDEBAR (DESKTOP FIXED + MOBILE SLIDE-OVER DRAWER) */}
      {/* ========================================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 shrink-0 h-screen sticky top-0 ${
          isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* A. SIDEBAR BRAND HEADER */}
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 group cursor-pointer"
            title="Kinetix Workspace Dashboard"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
              <span className="material-symbols-outlined text-[20px]">
                account_balance_wallet
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base leading-none text-slate-900 tracking-tight">
                Kinetix
              </span>
              <span className="text-[10px] font-mono text-red-600 uppercase tracking-wider font-bold mt-0.5">
                Vault OS
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            {/* Link quay lại Landing Page giới thiệu */}
            <Link
              href="/"
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
              title="Xem Landing Page"
            >
              <span className="material-symbols-outlined text-[18px]">public</span>
            </Link>

            {/* Nút đóng Sidebar trên màn hình nhỏ */}
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              type="button"
              title="Đóng menu"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* B. WORKSPACE SWITCHER SECTION */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              {language === 'vi' ? 'Không Gian Đang Chọn' : 'Active Workspace'}
            </span>
            {(currentWorkspace?.workspaceCode || familyInfo?.familyCode) && (
              <button
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-slate-600 hover:text-red-600 transition-colors cursor-pointer"
                title="Sao chép Mã Không Gian"
                type="button"
              >
                <span>{currentWorkspace?.workspaceCode || familyInfo?.familyCode}</span>
                <span className="material-symbols-outlined text-[12px]">
                  {copiedCode ? 'check' : 'content_copy'}
                </span>
              </button>
            )}
          </div>
          <WorkspaceSwitcher />
        </div>

        {/* C. VERTICAL NAVIGATION TABS */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
          <div className="px-2 pt-1 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              {language === 'vi' ? 'Bộ 4 Không Gian Hũ Tiền' : 'Multi-Space Vaults'}
            </span>
          </div>

          {spaces.map((sp) => {
            const isActive = activeTab === sp.id;
            return (
              <button
                key={sp.id}
                onClick={() => {
                  onTabChange(sp.id);
                  setIsMobileSidebarOpen(false);
                }}
                type="button"
                className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all cursor-pointer relative group ${
                  isActive
                    ? 'bg-red-50 text-red-950 font-bold border border-red-200/80 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                }`}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-3 bottom-3 w-1.5 bg-red-600 rounded-r-full" />
                )}

                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {sp.icon}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs sm:text-sm font-bold truncate">
                      {sp.label}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                        isActive
                          ? 'bg-red-200/60 text-red-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {sp.badge}
                    </span>
                  </div>
                  <p
                    className={`text-[11px] truncate mt-0.5 ${
                      isActive ? 'text-red-700/80 font-medium' : 'text-slate-400'
                    }`}
                  >
                    {sp.description}
                  </p>
                </div>
              </button>
            );
          })}

          {/* D. QUICK TREASURY WIDGET CARD */}
          <div className="pt-3">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-sm border border-slate-700/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  {language === 'vi' ? 'Tổng Quỹ Không Gian' : 'Treasury Balance'}
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono">
                  8% APY
                </span>
              </div>

              <div className="flex items-baseline gap-1 mb-2">
                <span className="font-mono text-xl font-black text-white">
                  {totalBalanceAVAX.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-slate-400 font-mono">AVAX</span>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-300 py-1.5 px-2 rounded-xl bg-slate-800/80 border border-slate-700/50 mb-3">
                <span className="text-amber-400">10% Đệm L1 (0 Gas)</span>
                <span className="text-slate-500">•</span>
                <span className="text-emerald-400">90% C-Chain</span>
              </div>

              <button
                type="button"
                onClick={() => setIsDepositModalOpen(true)}
                className="w-full py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px] text-amber-300">bolt</span>
                <span>{language === 'vi' ? 'Nạp Quỹ Tức Thì' : 'Deposit Vault'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* E. SIDEBAR FOOTER (USER PROFILE, NETWORK & CONTROLS) */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70 space-y-2 shrink-0">
          {/* Dual-Chain Network SnowTrace Link */}
          <a
            href={`${SNOWTRACE_TESTNET_URL}/address/${CONTRACT_ADDRESSES.familyHub}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-mono text-slate-700 hover:border-slate-300 transition-colors"
            title="Xem Smart Contract trên SnowTrace Fuji C-Chain"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold">Avalanche Fuji</span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-700">0 Gas L1</span>
          </a>

          {/* User Member Card & Switcher */}
          {currentMember && (
            <div className="flex items-center justify-between p-2 rounded-2xl bg-white border border-slate-200/80">
              <div
                onClick={() => setIsRoleModalOpen(true)}
                className="flex items-center gap-2 cursor-pointer group flex-1 min-w-0"
                title="Đổi vai trò thành viên"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden border border-red-500 shadow-xs shrink-0">
                  <img
                    src={currentMember.avatar}
                    alt={currentMember.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {currentMember.name}
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-red-600">
                    {currentMember.role}
                  </span>
                </div>
              </div>

              {/* Quick Actions (Settings & Logout) */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="w-7 h-7 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                  title="Cài đặt ứng dụng & Quản lý tài khoản"
                >
                  <span className="material-symbols-outlined text-[17px]">settings</span>
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="w-7 h-7 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                  title={t('nav.logout')}
                >
                  <span className="material-symbols-outlined text-[17px]">logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 3. MAIN RIGHT CANVAS (TOP BAR + CONTENT BODY) */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* TOP BAR */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 h-16 px-4 sm:px-6 flex items-center justify-between gap-3 shadow-xs">
          
          {/* Left: Mobile Menu Toggle + Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
              title="Mở Menu Điều Hướng"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">
                  {currentSpace.icon}
                </span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-400 hidden sm:inline">
                    {currentWorkspace?.name || 'Không Gian Kinetix'}
                  </span>
                  <span className="text-xs text-slate-300 hidden sm:inline">/</span>
                  <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    {currentSpace.label}
                  </h1>
                </div>
                <span className="text-[11px] text-slate-500 hidden sm:block">
                  {currentSpace.description}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Quick Actions (Deposit, Notifications, Language) */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Quick Deposit Action Button */}
            <button
              type="button"
              onClick={() => setIsDepositModalOpen(true)}
              className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-[17px] text-amber-300">bolt</span>
              <span>{language === 'vi' ? 'Nạp Quỹ' : 'Deposit'}</span>
            </button>

            {/* Notifications Bell */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer relative"
                title="Thông báo hệ thống"
              >
                <span className="material-symbols-outlined text-[19px]">notifications</span>
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white font-mono text-[9px] font-bold flex items-center justify-center shadow-sm">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown Panel */}
              {isNotifOpen && (
                <div className="absolute right-0 top-11 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 px-1">
                    <span className="text-xs font-bold text-slate-900">
                      {language === 'vi' ? 'Thông Báo Gia Đình' : 'Family Notifications'}
                    </span>
                    <button
                      onClick={() => setIsNotifOpen(false)}
                      className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500">
                        Chưa có thông báo mới
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationRead(n.id)}
                          className={`p-2.5 rounded-xl text-xs transition-colors cursor-pointer border ${
                            n.isRead
                              ? 'bg-slate-50 border-transparent text-slate-500'
                              : 'bg-red-50/50 border-red-200 text-slate-900 font-semibold'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="font-bold text-[11px] line-clamp-1">{n.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{n.createdAt}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                            {n.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs font-bold text-slate-800 transition-all cursor-pointer font-mono shrink-0"
              type="button"
              title="Chuyển đổi ngôn ngữ / Switch language"
            >
              <span>{language === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}</span>
            </button>
          </div>
        </header>

        {/* WORKSPACE CONTENT CANVAS */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-12">
          {children}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 4. MOBILE BOTTOM NAVIGATION BAR */}
      {/* ========================================================================= */}
      <MobileNavBar
        activeTab={activeTab}
        onTabChange={onTabChange}
        onOpenDeposit={() => setIsDepositModalOpen(true)}
      />

      {/* ========================================================================= */}
      {/* 5. GLOBAL UNIVERSAL MODALS */}
      {/* ========================================================================= */}
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

      {currentMember && (
        <RoleSwitcherModal
          isOpen={isRoleModalOpen}
          onClose={() => setIsRoleModalOpen(false)}
          currentMember={currentMember}
          onSelectMember={(m: DemoMember) => {
            setCurrentMember(m);
            if (m.role === 'ELDERLY') onTabChange('kinetix-shield');
            else if (m.role === 'CHILD') onTabChange('kinetix-kids');
            else onTabChange('quan-tri-cha-me');
          }}
        />
      )}
    </div>
  );
};
