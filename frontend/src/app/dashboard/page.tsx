'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ActiveTab, DemoMember } from '@/types';
import { AppShell } from '@/components/layout/AppShell';
import { ElderlyView } from '@/components/views/ElderlyView';
import { GuardianView } from '@/components/views/GuardianView';
import { KidsView } from '@/components/views/KidsView';
import { RoscaView } from '@/components/views/RoscaView';
import { useFamily } from '@/context/FamilyContext';
import { useAuth } from '@/hooks/useAuth';

const VALID_FUNCTIONAL_TABS: ActiveTab[] = [
  'quan-tri-cha-me',
  'kinetix-shield',
  'kinetix-kids',
  'quy-rosca',
];

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabQuery = searchParams.get('tab') as ActiveTab | null;

  const { user, isAuthenticated, isLoading } = useAuth();
  const { currentMember, setCurrentMember } = useFamily();

  // Xác định tab khởi đầu thông minh dựa trên vai trò người dùng
  const getDefaultTab = (): ActiveTab => {
    if (tabQuery && VALID_FUNCTIONAL_TABS.includes(tabQuery)) {
      return tabQuery;
    }
    if (user?.role === 'ELDERLY') return 'kinetix-shield';
    if (user?.role === 'CHILD') return 'kinetix-kids';
    return 'quan-tri-cha-me';
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>(getDefaultTab);

  // Bảo vệ Auth Guard: Chưa đăng nhập sẽ chuyển hướng sang /login
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const returnUrl = tabQuery ? `/dashboard?tab=${tabQuery}` : '/dashboard';
      router.replace(`/login?from=${encodeURIComponent(returnUrl)}`);
    }
  }, [isLoading, isAuthenticated, router, tabQuery]);

  // Đồng bộ activeTab khi query param trên URL thay đổi
  useEffect(() => {
    if (tabQuery && VALID_FUNCTIONAL_TABS.includes(tabQuery) && tabQuery !== activeTab) {
      setActiveTab(tabQuery);
    } else if (!tabQuery && user) {
      const def = getDefaultTab();
      if (def !== activeTab) {
        setActiveTab(def);
      }
    }
  }, [tabQuery, user]);

  // Cập nhật tab và đồng bộ URL mà không làm reload lại toàn trang
  const handleTabChange = (tab: ActiveTab) => {
    if (tab === 'trang-chu') {
      router.push('/');
      return;
    }
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Màn hình chờ kiểm tra quyền truy cập (Loading / Authenticating)
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <h2 className="text-base font-bold text-white tracking-wide">
              Kinetix Family Vault OS
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Đang xác thực phiên đăng nhập an toàn...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // KHÔNG GIAN ỨNG DỤNG THỰC THI CHỨC NĂNG (KINETIX WORKSPACE APP SHELL)
  return (
    <AppShell activeTab={activeTab} onTabChange={handleTabChange}>
      {activeTab === 'quan-tri-cha-me' && <GuardianView />}
      {activeTab === 'kinetix-shield' && <ElderlyView />}
      {activeTab === 'kinetix-kids' && <KidsView />}
      {activeTab === 'quy-rosca' && <RoscaView currentMember={currentMember} />}
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono font-bold text-slate-400">
              Đang khởi tạo không gian Kinetix...
            </span>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
