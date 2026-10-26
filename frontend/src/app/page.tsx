'use client';

import React, { useState } from 'react';
import { ActiveTab, DemoMember } from '@/types';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { HomeView } from '@/components/views/HomeView';
import { ElderlyView } from '@/components/views/ElderlyView';
import { GuardianView } from '@/components/views/GuardianView';
import { KidsView } from '@/components/views/KidsView';
import { RoscaView } from '@/components/views/RoscaView';
import { FamilyProvider, useFamily } from '@/context/FamilyContext';
import { VaultType } from '@/contracts/config';
import { DemoPersonaBar } from '@/components/auth/DemoPersonaBar';

function FamilyAppContent() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('trang-chu');
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>('500');
  const [selectedVault, setSelectedVault] = useState<string>('Retirement Shield');
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(false);

  const {
    currentMember,
    setCurrentMember,
    isWalletConnected,
    connectWallet,
    disconnectWallet,
    depositFunds,
  } = useFamily();

  const handleSelectMember = (member: DemoMember) => {
    setCurrentMember(member);
    // Tự động chuyển view tương ứng nếu vai trò đặc thù
    if (member.role === 'ELDERLY') {
      setActiveTab('kinetix-shield');
    } else if (member.role === 'CHILD') {
      setActiveTab('kinetix-kids');
    } else if (member.role === 'ADMIN') {
      setActiveTab('quan-tri-cha-me');
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDepositing(true);

    const vType =
      selectedVault === 'Retirement Shield'
        ? VaultType.RetirementShield
        : selectedVault === 'Kids Savings'
        ? VaultType.KidsSavings
        : VaultType.FamilyROSCA;

    const amt = parseFloat(depositAmount) || 0;
    const success = await depositFunds(vType, amt);

    setIsDepositing(false);
    if (success) {
      setDepositSuccess(true);
      setTimeout(() => {
        setDepositSuccess(false);
        setIsDepositModalOpen(false);
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      {/* Header Điều Hướng Kinetix */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentMember={currentMember}
        onMemberChange={handleSelectMember}
        isWalletConnected={isWalletConnected}
        onConnectWallet={() => {
          if (isWalletConnected) {
            disconnectWallet();
          } else {
            connectWallet();
          }
        }}
      />

      {/* Floating Demo Persona Quick Switcher */}
      <DemoPersonaBar />

      {/* Main Content Render Theo Tab */}
      <main className="w-full pt-20 flex-1">
        {activeTab === 'trang-chu' && (
          <HomeView
            onNavigate={setActiveTab}
            onOpenDeposit={() => setIsDepositModalOpen(true)}
          />
        )}

        {activeTab === 'kinetix-shield' && <ElderlyView />}

        {activeTab === 'quan-tri-cha-me' && <GuardianView />}

        {activeTab === 'kinetix-kids' && <KidsView />}

        {activeTab === 'quy-rosca' && (
          <RoscaView currentMember={currentMember} />
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Modal Nạp Quỹ Gia Đình (10/90 Liquidity Buffer) */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-2xl p-space-lg shadow-2xl flex flex-col gap-space-md border border-outline-variant/30">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-low">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-secondary-container flex items-center justify-center text-on-secondary-container">
                  <span className="material-symbols-outlined text-[20px]">add_circle</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">Nạp Tiền Vào Quỹ Gia Đình</h3>
                  <p className="font-label-caps text-label-caps text-on-surface-variant">
                    Cơ chế đệm 10/90 &amp; Teleporter Cross-chain
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer"
              >
                ✕
              </button>
            </div>

            {depositSuccess ? (
              <div className="p-space-lg bg-emerald-50 rounded-xl flex flex-col items-center justify-center gap-2 text-center">
                <span className="material-symbols-outlined text-[48px] text-emerald-600">check_circle</span>
                <h4 className="font-headline-sm text-headline-sm text-emerald-800">Nạp Quỹ Thành Công!</h4>
                <p className="font-body-sm text-body-sm text-emerald-700">
                  Đã giải ngân on-chain: 10% ({(parseFloat(depositAmount || '0') * 0.1).toFixed(2)} USDC) vào đệm Family L1 và 90% ({(parseFloat(depositAmount || '0') * 0.9).toFixed(2)} USDC) sang Fuji C-Chain sinh lời 8.2% APY.
                </p>
              </div>
            ) : (
              <form onSubmit={handleDepositSubmit} className="flex flex-col gap-space-md">
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-on-surface font-semibold">
                    Chọn Hũ Tài Chính
                  </label>
                  <select
                    value={selectedVault}
                    onChange={(e) => setSelectedVault(e.target.value)}
                    className="p-space-sm bg-surface-container-low rounded-xl border border-outline-variant/30 text-on-surface font-body-md focus:outline-none focus:ring-2 focus:ring-secondary-container"
                  >
                    <option value="Retirement Shield">Hũ Báo Hiếu &amp; Hưu Trí (Retirement Shield)</option>
                    <option value="Kids Savings">Hũ Tiết Kiệm Trẻ Em (Kids Savings)</option>
                    <option value="Family ROSCA">Hũ Tương Trợ Dòng Họ (Family ROSCA)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-on-surface font-semibold">
                    Số Tiền Nạp (USDC)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="10"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full p-space-sm pl-4 pr-16 bg-surface-container-low rounded-xl border border-outline-variant/30 text-on-surface font-headline-sm focus:outline-none focus:ring-2 focus:ring-secondary-container"
                      placeholder="500"
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-label-md text-label-md text-on-surface-variant font-bold">
                      USDC
                    </span>
                  </div>
                </div>

                {/* Phân bổ đệm thanh khoản 10/90 */}
                <div className="p-space-sm bg-surface-container-low rounded-xl flex flex-col gap-2">
                  <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-bold">
                    Tự Động Phân Bổ Vốn Theo Smart Contract:
                  </span>
                  <div className="flex items-center justify-between text-body-sm">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-secondary-container" />
                      10% Đệm Thanh Khoản (Family L1):
                    </span>
                    <span className="font-bold text-on-surface">
                      {(parseFloat(depositAmount || '0') * 0.1).toFixed(2)} USDC (Rút tức thì)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-body-sm">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      90% Sinh Lời DeFi (Fuji C-Chain):
                    </span>
                    <span className="font-bold text-emerald-700">
                      {(parseFloat(depositAmount || '0') * 0.9).toFixed(2)} USDC (8.2% APY)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-space-sm pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDepositModalOpen(false)}
                    className="px-space-md py-space-sm rounded-xl font-label-md text-on-surface-variant hover:bg-surface-container cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isDepositing}
                    className="px-space-lg py-space-sm bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary rounded-xl font-label-lg font-bold shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    {isDepositing ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                        <span>Đang Nạp &amp; Bridge ICM...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">bolt</span>
                        <span>Xác Nhận Nạp Quỹ</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <FamilyProvider>
      <FamilyAppContent />
    </FamilyProvider>
  );
}
