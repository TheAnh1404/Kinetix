'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
    depositFunds,
    dynamicVaults,
    depositToVault,
    currentWorkspace,
  } = useFamily();

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>('500');
  const [selectedVaultId, setSelectedVaultId] = useState<number>(0);
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(false);

  // Cập nhật selectedVaultId mặc định khi dynamicVaults tải xong
  useEffect(() => {
    if (dynamicVaults.length > 0 && selectedVaultId === 0) {
      setSelectedVaultId(dynamicVaults[0].onchainVaultId);
    }
  }, [dynamicVaults, selectedVaultId]);

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

  const activeVaultObj =
    dynamicVaults.find((v) => v.onchainVaultId === selectedVaultId) || dynamicVaults[0];

  const bufferRatioPct = activeVaultObj ? activeVaultObj.bufferRatioBps / 100 : 10;
  const bridgeRatioPct = 100 - bufferRatioPct;

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDepositing(true);

    const amt = parseFloat(depositAmount) || 0;
    let success = false;

    if (activeVaultObj) {
      success = await depositToVault(activeVaultObj.onchainVaultId, amt);
    } else {
      success = await depositFunds(VaultType.RetirementShield, amt);
    }

    setIsDepositing(false);
    if (success) {
      setDepositSuccess(true);
      setTimeout(() => {
        setDepositSuccess(false);
        setIsDepositModalOpen(false);
      }, 1800);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      {/* Header Điều Hướng Kinetix */}
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
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

      {/* Main Content Render Theo Tab */}
      <main className="w-full pt-20 flex-1">
        {activeTab === 'trang-chu' && (
          <HomeView
            onNavigate={handleTabChange}
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

      {/* Modal Nạp Quỹ Gia Đình (Dynamic Liquidity Buffer) */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-2xl p-space-lg shadow-2xl flex flex-col gap-space-md border border-outline-variant/30">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-low">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-secondary-container flex items-center justify-center text-on-secondary-container">
                  <span className="material-symbols-outlined text-[20px]">add_circle</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Nạp Tiền Vào Hũ Động
                  </h3>
                  <p className="font-label-caps text-label-caps text-on-surface-variant">
                    {currentWorkspace ? `${currentWorkspace.name} • ` : ''}Đệm L1 &amp; C-Chain Teleporter
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer"
                type="button"
              >
                ✕
              </button>
            </div>

            {depositSuccess ? (
              <div className="p-space-lg bg-emerald-50 rounded-xl flex flex-col items-center justify-center gap-2 text-center animate-in fade-in">
                <span className="material-symbols-outlined text-[48px] text-emerald-600">check_circle</span>
                <h4 className="font-headline-sm text-headline-sm text-emerald-800 font-bold">
                  Nạp Quỹ Vào Hũ Thành Công!
                </h4>
                <p className="font-body-sm text-body-sm text-emerald-700 leading-relaxed">
                  Đã giải ngân on-chain: {bufferRatioPct}% (
                  {(parseFloat(depositAmount || '0') * (bufferRatioPct / 100)).toFixed(2)} USDC) vào đệm Family L1 và {bridgeRatioPct}% (
                  {(parseFloat(depositAmount || '0') * (bridgeRatioPct / 100)).toFixed(2)} USDC) sang Fuji C-Chain sinh lời 8% APY.
                </p>
              </div>
            ) : (
              <form onSubmit={handleDepositSubmit} className="flex flex-col gap-space-md">
                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-on-surface font-semibold">
                    Chọn Hũ Tiền Trong Không Gian
                  </label>
                  <select
                    value={selectedVaultId}
                    onChange={(e) => setSelectedVaultId(Number(e.target.value))}
                    className="p-space-sm bg-surface-container-low rounded-xl border border-outline-variant/30 text-on-surface font-body-md focus:outline-none focus:ring-2 focus:ring-secondary-container font-medium"
                  >
                    {dynamicVaults.length > 0 ? (
                      dynamicVaults.map((vault) => (
                        <option key={vault.id} value={vault.onchainVaultId}>
                          {vault.name} ({vault.ruleTemplate} - Đệm {vault.bufferRatioBps / 100}% L1)
                        </option>
                      ))
                    ) : (
                      <>
                        <option value={0}>Hũ Báo Hiếu &amp; Hưu Trí (SHIELD - Đệm 10% L1)</option>
                        <option value={1}>Hũ Tiết Kiệm Trẻ Em (MILESTONE - Đệm 20% L1)</option>
                        <option value={2}>Hũ Tương Trợ Dòng Họ (ROSCA - Đệm 0% L1)</option>
                      </>
                    )}
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
                      className="w-full p-space-sm pl-4 pr-16 bg-surface-container-low rounded-xl border border-outline-variant/30 text-on-surface font-headline-sm focus:outline-none focus:ring-2 focus:ring-secondary-container font-bold"
                      placeholder="500"
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-label-md text-label-md text-on-surface-variant font-bold">
                      USDC
                    </span>
                  </div>
                </div>

                {/* Phân bổ đệm thanh khoản theo cấu hình của hũ */}
                <div className="p-space-sm bg-surface-container-low rounded-xl flex flex-col gap-2">
                  <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-bold">
                    Tự Động Phân Bổ Vốn Theo Smart Contract ({bufferRatioPct}% L1 / {bridgeRatioPct}% C-Chain):
                  </span>
                  <div className="flex items-center justify-between text-body-sm">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-secondary-container" />
                      {bufferRatioPct}% Đệm Thanh Khoản (Family L1):
                    </span>
                    <span className="font-bold text-on-surface">
                      {(parseFloat(depositAmount || '0') * (bufferRatioPct / 100)).toFixed(2)} USDC (Rút tức thì)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-body-sm">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {bridgeRatioPct}% Sinh Lời DeFi (Fuji C-Chain):
                    </span>
                    <span className="font-bold text-emerald-700">
                      {(parseFloat(depositAmount || '0') * (bridgeRatioPct / 100)).toFixed(2)} USDC (8.0% APY)
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
                    className="px-space-lg py-space-sm bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary rounded-xl font-label-lg font-bold shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isDepositing ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                        <span>Đang Nạp &amp; Bridge Teleporter...</span>
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
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-surface text-on-surface">
            <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <FamilyAppContent />
      </Suspense>
    </FamilyProvider>
  );
}
