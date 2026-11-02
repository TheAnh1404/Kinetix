'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ActiveTab } from '@/types';
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
  const { currentMember, setCurrentMember, members } = useFamily();

  // Xác định tab chính xác tương ứng với vai trò đăng nhập
  const getTabForUserRole = (): ActiveTab => {
    const role = user?.role || currentMember?.role;
    if (role === 'ELDERLY') return 'kinetix-shield';
    if (role === 'CHILD') return 'kinetix-kids';
    if (role === 'GUARDIAN') return 'quy-rosca';
    if (tabQuery && VALID_FUNCTIONAL_TABS.includes(tabQuery)) {
      return tabQuery;
    }
    return 'quan-tri-cha-me';
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>(getTabForUserRole);

  // Bảo vệ Auth Guard: Chưa đăng nhập sẽ chuyển hướng sang /login
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const returnUrl = tabQuery ? `/dashboard?tab=${tabQuery}` : '/dashboard';
      router.replace(`/login?from=${encodeURIComponent(returnUrl)}`);
    }
  }, [isLoading, isAuthenticated, router, tabQuery]);

  // Đồng bộ vai trò người dùng vào FamilyContext để các hook contract lấy đúng địa chỉ ví
  useEffect(() => {
    if (user && members.length > 0) {
      const matched = members.find(
        (m) =>
          m.walletAddress.toLowerCase() === user.walletAddress.toLowerCase() ||
          m.role === user.role
      );
      if (matched && matched.id !== currentMember?.id) {
        setCurrentMember(matched);
      }
    }
  }, [user, members, currentMember, setCurrentMember]);

  // Khóa phân luồng theo vai trò: Thành viên thường không bị chuyển sang tab admin
  useEffect(() => {
    if (user) {
      const role = user.role;
      if (role === 'ELDERLY' && activeTab !== 'kinetix-shield') {
        setActiveTab('kinetix-shield');
      } else if (role === 'CHILD' && activeTab !== 'kinetix-kids') {
        setActiveTab('kinetix-kids');
      } else if (role === 'GUARDIAN' && activeTab !== 'quy-rosca') {
        setActiveTab('quy-rosca');
      } else if (role === 'ADMIN' && tabQuery && VALID_FUNCTIONAL_TABS.includes(tabQuery)) {
        if (tabQuery !== activeTab) {
          setActiveTab(tabQuery);
        }
      }
    }
  }, [user, tabQuery, activeTab]);

  // Cập nhật tab cho Admin
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

  // Màn hình chờ xác thực phiên đăng nhập an toàn
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <h2 className="text-base font-bold text-white tracking-wide">
              Kinetix Family Vault OS
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Đang xác thực và phân luồng giao diện gia đình...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // KHÔNG GIAN ỨNG DỤNG ĐÃ PHÂN LUỒNG HOÀN TOÀN
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
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
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
