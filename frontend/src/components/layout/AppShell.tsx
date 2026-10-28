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
  const [copiedCode, setCopiedCode] = useState(false);

  // Tính toán tổng tài sản thật của Không gian từ danh sách Dynamic Vaults
  const totalBalanceAVAX = dynamicVaults.reduce((sum, v) => sum + v.cachedTotalBalance, 0);
  const totalL1BufferAVAX = dynamicVaults.reduce((sum, v) => sum + v.cachedL1Buffer, 0);
  const totalCChainYieldAVAX = dynamicVaults.reduce((sum, v) => sum + v.cachedCChainYield, 0);
  const totalCChainPrincipalAVAX = Math.max(0, totalBalanceAVAX - totalL1BufferAVAX);

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
    },
    {
      id: 'kinetix-shield' as ActiveTab,
      label: language === 'vi' ? 'Báo Hiếu & An Sinh' : 'Kinetix Shield (Seniors)',
      shortLabel: language === 'vi' ? 'Báo Hiếu' : 'Shield',
      icon: 'shield',
      description: language === 'vi' ? 'Rút tức thì 0 gas & Chống lừa đảo AI' : 'Instant 0 gas & AI Scam Shield',
    },
    {
      id: 'kinetix-kids' as ActiveTab,
      label: language === 'vi' ? 'Heo Đất & Việc Nhà' : 'Kinetix Kids (Earn)',
      shortLabel: language === 'vi' ? 'Việc Nhà' : 'Kids',
      icon: 'savings',
      description: language === 'vi' ? 'Nhiệm vụ Chore-to-Earn & Tích lũy' : 'Chore-to-Earn Tasks & Savings',
    },
    {
      id: 'quy-rosca' as ActiveTab,
      label: language === 'vi' ? 'Họ Hụi & Mục Tiêu' : 'ROSCA & Shared Goals',
      shortLabel: language === 'vi' ? 'Họ Hụi' : 'ROSCA',
      icon: 'groups',
      description: language === 'vi' ? 'Góp vốn xoay vòng & Mục tiêu chung' : 'Rotating Savings & Shared Goals',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      
      {/* ========================================================================= */}
      {/* 1. UNIFIED STICKY APP HEADER (TOP BAR + SPACE SEGMENTED TABS) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
        {/* Row 1: Global Branding, Workspace Switcher, Quick Wealth Pill & User Controls */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          
          {/* Left: Brand Logo & Workspace Switcher */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <Link
              href="/"
              onClick={() => onTabChange('trang-chu')}
              className="flex items-center gap-2 group cursor-pointer"
              title="Về Trang Chủ Giới Thiệu"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[20px]">
                  account_balance_wallet
                </span>
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="font-bold text-base leading-none text-slate-900 tracking-tight">
                  Kinetix
                </span>
                <span className="text-[10px] font-mono text-red-600 uppercase tracking-wider font-bold">
                  Vault OS
                </span>
              </div>
            </Link>

            {/* Separator */}
            <span className="h-5 w-px bg-slate-200 hidden sm:block" />

            {/* Workspace Selector Dropdown */}
            <WorkspaceSwitcher />

            {/* Workspace Family Code */}
            {(currentWorkspace?.workspaceCode || familyInfo?.familyCode) && (
              <button
                onClick={handleCopyCode}
                className="hidden xl:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/70 text-slate-700 text-[11px] font-mono font-bold transition-colors cursor-pointer border border-slate-200/60"
                title="Bấm để sao chép Mã Không Gian"
                type="button"
              >
                <span>{currentWorkspace?.workspaceCode || familyInfo?.familyCode}</span>
                <span className="material-symbols-outlined text-[13px] text-slate-500">
                  {copiedCode ? 'check' : 'content_copy'}
                </span>
              </button>
            )}
          </div>

          {/* Right: Quick Wealth, Quick Deposit Action, Network, Notifications, Lang & Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            
            {/* Quick Financial Summary Pill (Desktop & Tablet) */}
            <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200/70">
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] uppercase font-bold text-slate-500">Quỹ:</span>
                <span className="font-mono text-xs sm:text-sm font-extrabold text-slate-900">
                  {totalBalanceAVAX.toFixed(2)} AVAX
                </span>
              </div>
              <span className="h-3.5 w-px bg-slate-300" />
              <div className="flex items-center gap-1.5 text-[10px] font-bold">
                <span className="text-slate-600 font-mono">10% L1</span>
                <span className="text-slate-400">•</span>
                <span className="text-emerald-700 font-mono">90% C-Chain</span>
              </div>
            </div>

            {/* Quick Deposit Action Button */}
            <button
              type="button"
              onClick={() => setIsDepositModalOpen(true)}
              className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-[17px] text-amber-300">bolt</span>
              <span>{language === 'vi' ? 'Nạp Quỹ' : 'Deposit'}</span>
            </button>

            {/* Network Indicator Pill */}
            <a
              href={`${SNOWTRACE_TESTNET_URL}/address/${CONTRACT_ADDRESSES.familyHub}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-xs font-mono text-slate-800 transition-all shrink-0"
              title="Xem Smart Contract trên SnowTrace Fuji C-Chain"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-[11px]">Fuji C-Chain</span>
              <span className="text-[10px] text-emerald-700 font-semibold">• 0 Gas L1</span>
            </a>

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
            >
              <span>{language === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}</span>
            </button>

            {/* Role Switcher Avatar Badge */}
            {currentMember && (
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(true)}
                className="flex items-center gap-1.5 p-1 pr-2 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-all cursor-pointer group shrink-0"
                title={`${currentMember.name} • Bấm để đổi vai trò`}
              >
                <div className="w-7 h-7 rounded-full overflow-hidden border border-red-500 shadow-xs">
                  <img
                    src={currentMember.avatar}
                    alt={currentMember.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-[11px] font-bold text-slate-900 leading-tight line-clamp-1">
                    {currentMember.name.split(' ')[0]}
                  </span>
                  <span className="text-[9px] font-mono font-semibold text-red-600 leading-tight">
                    {currentMember.role}
                  </span>
                </div>
                <span className="material-symbols-outlined text-[15px] text-slate-400 group-hover:translate-y-0.5 transition-transform">
                  expand_more
                </span>
              </button>
            )}

            {/* Settings Gear Button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
              title="Cài đặt ứng dụng & Quản lý tài khoản"
            >
              <span className="material-symbols-outlined text-[19px]">settings</span>
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              title={t('nav.logout')}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-slate-600 transition-colors cursor-pointer shrink-0"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>

        {/* Row 2: Space Segmented Tabs (4 Core Spaces + Return to Showcase) */}
        <div className="border-t border-slate-200/70 bg-slate-50/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
            <nav className="flex items-center gap-1 sm:gap-2">
              {spaces.map((sp) => {
                const isActive = activeTab === sp.id;
                return (
                  <button
                    key={sp.id}
                    onClick={() => onTabChange(sp.id)}
                    type="button"
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[18px] ${
                        isActive ? 'text-red-600' : 'text-slate-500'
                      }`}
                    >
                      {sp.icon}
                    </span>
                    <span>{sp.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Link back to Showcase Landing */}
            <button
              onClick={() => onTabChange('trang-chu')}
              type="button"
              className="text-xs font-semibold text-slate-500 hover:text-red-600 flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              <span className="hidden sm:inline">
                {language === 'vi' ? 'Xem Trang Giới Thiệu' : 'Showcase'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN WORKSPACE CONTENT CANVAS */}
      {/* ========================================================================= */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-12">
        {children}
      </main>

      {/* ========================================================================= */}
      {/* 4. MOBILE BOTTOM NAVIGATION */}
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
