'use client';

import React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { HomeView } from '@/components/views/HomeView';
import { useFamily } from '@/context/FamilyContext';

/**
 * Trang Chủ Giới Thiệu Kinetix (Landing Page Độc Lập)
 * Dành cho người xem tìm hiểu hệ thống, kiến trúc Avalanche Dual-Chain và 4 bộ quy tắc hũ tiền.
 * Người dùng chỉ vào được không gian ứng dụng chức năng (/dashboard) sau khi đã đăng nhập hợp lệ.
 */
export default function LandingPage() {
  const {
    currentMember,
    setCurrentMember,
    isWalletConnected,
    connectWallet,
    disconnectWallet,
  } = useFamily();

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <Header
        activeTab="trang-chu"
        currentMember={currentMember}
        onMemberChange={setCurrentMember}
        isWalletConnected={isWalletConnected}
        onConnectWallet={() => {
          if (isWalletConnected) disconnectWallet();
          else connectWallet();
        }}
      />

      <main className="w-full pt-20 flex-1">
        <HomeView />
      </main>

      <Footer />
    </div>
  );
}
