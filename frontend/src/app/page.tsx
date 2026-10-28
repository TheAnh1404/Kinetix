'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ActiveTab, DemoMember } from '@/types';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AppShell } from '@/components/layout/AppShell';
import { HomeView } from '@/components/views/HomeView';
import { ElderlyView } from '@/components/views/ElderlyView';
import { GuardianView } from '@/components/views/GuardianView';
import { KidsView } from '@/components/views/KidsView';
import { RoscaView } from '@/components/views/RoscaView';
import { DepositVaultModal } from '@/components/vaults/DepositVaultModal';
import { useFamily } from '@/context/FamilyContext';

const VALID_TABS: ActiveTab[] = [
  'trang-chu',
  'kinetix-shield',
  'quan-tri-cha-me',
  'kinetix-kids',
  'quy-rosca',
];

function FamilyAppContent() {
  const searchParams = useSearchParams();
  const tabQuery = searchParams.get('tab') as ActiveTab | null;

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (tabQuery && VALID_TABS.includes(tabQuery)) {
      return tabQuery;
    }
    return 'trang-chu';
  });

  const {
    currentMember,
    setCurrentMember,
    isWalletConnected,
    connectWallet,
    disconnectWallet,
  } = useFamily();

  const [isLandingDepositOpen, setIsLandingDepositOpen] = useState(false);

  // Đồng bộ activeTab khi query param trên URL thay đổi
  useEffect(() => {
    if (tabQuery && VALID_TABS.includes(tabQuery) && tabQuery !== activeTab) {
      setActiveTab(tabQuery);
    }
  }, [tabQuery]);

  // Cập nhật tab và đồng bộ URL mà không làm reload trang
  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (tab === 'trang-chu') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', tab);
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleSelectMember = (member: DemoMember) => {
    setCurrentMember(member);
    if (member.role === 'ELDERLY') {
      handleTabChange('kinetix-shield');
    } else if (member.role === 'CHILD') {
      handleTabChange('kinetix-kids');
    } else if (member.role === 'ADMIN') {
      handleTabChange('quan-tri-cha-me');
    }
  };

  // NẾU ĐANG Ở TRANG GIỚI THIỆU (LANDING SHOWCASE MODE)
  if (activeTab === 'trang-chu') {
    return (
      <div className="min-h-screen flex flex-col bg-surface text-on-surface">
        <Header
          activeTab={activeTab}
          onTabChange={handleTabChange}
          currentMember={currentMember}
          onMemberChange={handleSelectMember}
          isWalletConnected={isWalletConnected}
          onConnectWallet={() => {
            if (isWalletConnected) disconnectWallet();
            else connectWallet();
          }}
        />

        <main className="w-full pt-20 flex-1">
          <HomeView
            onNavigate={handleTabChange}
            onOpenDeposit={() => setIsLandingDepositOpen(true)}
          />
        </main>

        <Footer />

        <DepositVaultModal
          isOpen={isLandingDepositOpen}
          onClose={() => setIsLandingDepositOpen(false)}
        />
      </div>
    );
  }

  // NẾU ĐANG Ở TRONG KHÔNG GIAN ỨNG DỤNG (KINETIX UNIFIED APP SHELL)
  return (
    <AppShell activeTab={activeTab} onTabChange={handleTabChange}>
      {activeTab === 'quan-tri-cha-me' && <GuardianView />}
      {activeTab === 'kinetix-shield' && <ElderlyView />}
      {activeTab === 'kinetix-kids' && <KidsView />}
      {activeTab === 'quy-rosca' && <RoscaView currentMember={currentMember} />}
    </AppShell>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-surface text-on-surface">
          <div className="flex flex-col items-center gap-3">
            <div className="w-9 h-9 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono font-bold text-on-surface-variant">
              Đang tải Kinetix OS...
            </span>
          </div>
        </div>
      }
    >
      <FamilyAppContent />
    </Suspense>
  );
}
