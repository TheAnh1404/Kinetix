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
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      
      {/* ========================================================================= */}
      {/* 1. TOP GLOBAL APP HEADER */}
      {/* ========================================================================= */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-surface-container/70 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-3">
          
          {/* Left: Brand Logo & Workspace Switcher */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              onClick={() => onTabChange('trang-chu')}
              className="flex items-center gap-2 group cursor-pointer"
              title="Về Trang Chủ Giới Thiệu"
            >
              <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[22px] text-secondary-container">
                  family_restroom
                </span>
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="font-bold text-base leading-none text-on-surface tracking-tight">
                  Kinetix
                </span>
                <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider font-semibold">
                  Vault OS
                </span>
              </div>
            </Link>

            {/* Separator */}
            <span className="h-6 w-px bg-surface-container-high hidden sm:block" />

            {/* Workspace Selector Dropdown */}
            <WorkspaceSwitcher />
          </div>

          {/* Right: Quick Actions, Network Badge, Role Switcher, Language & Logout */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            
            {/* Quick Deposit Action Button */}
            <button
              type="button"
              onClick={() => setIsDepositModalOpen(true)}
              className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[17px] text-amber-300">bolt</span>
              <span className="hidden sm:inline">{language === 'vi' ? 'Nạp Quỹ' : 'Deposit'}</span>
            </button>

            {/* Network Indicator Pill */}
            <a
              href={`${SNOWTRACE_TESTNET_URL}/address/${CONTRACT_ADDRESSES.familyHub}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-xs font-mono text-on-surface transition-all"
              title="Xem Smart Contract trên SnowTrace Fuji C-Chain"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-[11px]">Fuji C-Chain</span>
              <span className="text-[10px] text-emerald-700 font-semibold">• 0 Gas L1</span>
            </a>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="w-8.5 h-8.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer relative"
                title="Thông báo hệ thống"
              >
                <span className="material-symbols-outlined text-[19px]">notifications</span>
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-error text-white font-mono text-[9px] font-bold flex items-center justify-center shadow-sm">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown Panel */}
              {isNotifOpen && (
                <div className="absolute right-0 top-11 w-80 sm:w-96 bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 p-3 z-50 animate-in fade-in space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-surface-container px-1">
                    <span className="text-xs font-bold text-on-surface">
                      {language === 'vi' ? 'Thông Báo Gia Đình' : 'Family Notifications'}
                    </span>
                    <button
                      onClick={() => setIsNotifOpen(false)}
                      className="text-xs text-on-surface-variant hover:text-on-surface"
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markNotificationRead(n.id)}
                        className={`p-2.5 rounded-xl text-xs transition-colors cursor-pointer border ${
                          n.isRead
                            ? 'bg-surface-container-low/50 border-transparent text-on-surface-variant'
                            : 'bg-surface-container-low border-primary/20 text-on-surface font-semibold'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-bold text-[11px] line-clamp-1">{n.title}</span>
                          <span className="text-[10px] text-on-surface-variant font-mono">{n.createdAt}</span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant leading-relaxed line-clamp-2">
                          {n.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-xs font-bold text-on-surface transition-all cursor-pointer font-mono"
              type="button"
            >
              <span>{language === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}</span>
            </button>

            {/* Role Switcher Avatar Badge */}
            {currentMember && (
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(true)}
                className="flex items-center gap-1.5 p-1 pr-2 rounded-full bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 transition-all cursor-pointer group"
                title={`${currentMember.name} • Bấm để đổi vai trò`}
              >
                <div className="w-7 h-7 rounded-full overflow-hidden border border-secondary shadow-sm">
                  <img
                    src={currentMember.avatar}
                    alt={currentMember.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-[11px] font-bold text-on-surface leading-tight line-clamp-1">
                    {currentMember.name.split(' ')[0]}
                  </span>
                  <span className="text-[9px] font-mono font-semibold text-secondary leading-tight">
                    {currentMember.role}
                  </span>
                </div>
                <span className="material-symbols-outlined text-[15px] text-on-surface-variant group-hover:translate-y-0.5 transition-transform">
                  expand_more
                </span>
              </button>
            )}

            {/* Logout */}
            <button
              onClick={logout}
              title={t('nav.logout')}
              className="w-8.5 h-8.5 rounded-xl bg-surface-container-low hover:bg-error-container hover:text-error flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. SUB-HEADER: PERSISTENT WEALTH BAR & 4-SPACE NAVIGATION TABS */}
      {/* ========================================================================= */}
      <div className="pt-18 bg-surface-container-lowest border-b border-surface-container/60 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          
          {/* Row A: Workspace Identity & Financial Status Overview */}
          <div className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-surface-container/50">
            {/* Left: Current Workspace Title & Code */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-on-surface tracking-tight">
                    {currentWorkspace?.name || familyInfo?.name || 'Không Gian Gia Đình'}
                  </h1>
                  <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-mono text-[10px] font-bold uppercase">
                    {currentWorkspace?.type || 'FAMILY'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-on-surface-variant font-mono mt-0.5">
                  <span>Mã Không Gian:</span>
                  <button
                    onClick={handleCopyCode}
                    className="font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    type="button"
                  >
                    <span>{currentWorkspace?.workspaceCode || familyInfo?.familyCode || 'KNTX-8888'}</span>
                    <span className="material-symbols-outlined text-[13px]">
                      {copiedCode ? 'check' : 'content_copy'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Total Wealth & Liquid Buffer Visualizer */}
            <div className="flex items-center gap-3 sm:gap-6 bg-surface-container-low/70 px-4 py-2 rounded-2xl border border-outline-variant/20">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                  Tổng Tài Sản Quỹ
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-base sm:text-lg font-extrabold text-on-surface">
                    {totalBalanceAVAX.toFixed(2)} AVAX
                  </span>
                  <span className="text-[11px] font-mono text-emerald-700 font-bold">
                    ≈ ${(totalBalanceAVAX * 30).toLocaleString()} USD
                  </span>
                </div>
              </div>

              <div className="h-8 w-px bg-surface-container-high hidden sm:block" />

              <div className="hidden sm:flex flex-col gap-1 min-w-[180px]">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-primary font-mono">Đệm L1: {totalL1BufferAVAX.toFixed(2)} AVAX</span>
                  <span className="text-emerald-700 font-mono">C-Chain: {totalCChainPrincipalAVAX.toFixed(2)} AVAX</span>
                </div>
                <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden flex">
                  <div
                    style={{
                      width: `${totalBalanceAVAX > 0 ? (totalL1BufferAVAX / totalBalanceAVAX) * 100 : 10}%`,
                    }}
                    className="bg-primary h-full"
                    title="Đệm L1 0 gas"
                  />
                  <div
                    style={{
                      width: `${totalBalanceAVAX > 0 ? (totalCChainPrincipalAVAX / totalBalanceAVAX) * 100 : 90}%`,
                    }}
                    className="bg-secondary-container h-full"
                    title="C-Chain 8% APY"
                  />
                </div>
                <span className="text-[9px] text-emerald-700 font-mono text-right font-semibold">
                  +{(totalCChainYieldAVAX).toFixed(3)} AVAX Lãi Tích Lũy
                </span>
              </div>
            </div>
          </div>

          {/* Row B: Space Navigator Tabs (4 Core Spaces + Return to Landing) */}
          <div className="flex items-center justify-between overflow-x-auto py-2 gap-1.5 scrollbar-none">
            <div className="flex items-center gap-1 sm:gap-2">
              {spaces.map((sp) => {
                const isActive = activeTab === sp.id;
                return (
                  <button
                    key={sp.id}
                    onClick={() => onTabChange(sp.id)}
                    type="button"
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-primary text-white shadow-sm ring-1 ring-primary'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {sp.icon}
                    </span>
                    <span>{sp.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Link back to Showcase Landing */}
            <button
              onClick={() => onTabChange('trang-chu')}
              type="button"
              className="text-xs font-semibold text-on-surface-variant hover:text-primary flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              <span className="hidden lg:inline">{language === 'vi' ? 'Xem Trang Giới Thiệu' : 'Showcase Page'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN WORKSPACE CONTENT CANVAS */}
      {/* ========================================================================= */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-8">
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
