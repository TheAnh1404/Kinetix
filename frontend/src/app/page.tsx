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
import { VaultType, SNOWTRACE_TESTNET_URL } from '@/contracts/config';

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
  const [depositAmount, setDepositAmount] = useState<string>('0.02');
  const [selectedVaultId, setSelectedVaultId] = useState<number>(1);
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositResult, setDepositResult] = useState<{
    txHash: string;
    amount: number;
    vaultName: string;
    vaultId: number;
  } | null>(null);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

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
    setDepositError(null);

    const amt = parseFloat(depositAmount) || 0;
    const vId = activeVaultObj ? activeVaultObj.onchainVaultId : 1;
    const res = await depositToVault(vId, amt);

    setIsDepositing(false);
    if (res.success && res.txHash) {
      setDepositResult({
        txHash: res.txHash,
        amount: amt,
        vaultName: activeVaultObj?.name || `Hũ #${vId}`,
        vaultId: vId,
      });
    } else {
      setDepositError(res.error || 'Nạp tiền on-chain thất bại');
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

            {depositResult ? (
              <div className="space-y-4 py-2 animate-in fade-in">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col items-center justify-center gap-2 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                    <span className="material-symbols-outlined text-[28px]">verified</span>
                  </div>
                  <h4 className="font-headline-sm text-base text-emerald-900 font-bold">
                    Nạp Quỹ Vào Hũ Thành Công!
                  </h4>
                  <p className="font-body-sm text-xs text-emerald-700 leading-relaxed">
                    Đã ký duyệt on-chain trên ví Core và xác nhận trên Avalanche Fuji C-Chain.
                  </p>
                </div>

                <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Hũ nhận:</span>
                    <span className="font-bold text-on-surface">{depositResult.vaultName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Số lượng nạp:</span>
                    <span className="font-mono font-bold text-emerald-700 text-sm">+{depositResult.amount} AVAX</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Mạng Blockchain:</span>
                    <span className="font-mono font-semibold text-primary">Avalanche Fuji C-Chain (43113)</span>
                  </div>
                  <div className="pt-2 border-t border-surface-container flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                      Mã Giao Dịch (TxHash Real):
                    </span>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-surface-container font-mono text-[11px] text-on-surface break-all border border-outline-variant/30">
                      <span className="flex-1 select-all">{depositResult.txHash}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(depositResult.txHash);
                          setCopiedHash(true);
                          setTimeout(() => setCopiedHash(false), 2000);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-surface-container-highest hover:bg-surface-container-high text-xs font-bold shrink-0 transition-colors cursor-pointer"
                      >
                        {copiedHash ? "Đã copy!" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <a
                    href={`${SNOWTRACE_TESTNET_URL}/tx/${depositResult.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <span>Tra Cứu Real-time Trên SnowTrace Testnet</span>
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDepositModalOpen(false);
                      setDepositResult(null);
                      setDepositError(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-all cursor-pointer"
                  >
                    Hoàn tất &amp; Đóng
                  </button>
                </div>
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
                        <option value={1}>Hũ Báo Hiếu &amp; Hưu Trí (SHIELD - Đệm 10% L1)</option>
                        <option value={2}>Hũ Tiết Kiệm Trẻ Em (MILESTONE - Đệm 20% L1)</option>
                        <option value={3}>Hũ Tương Trợ Dòng Họ (ROSCA - Đệm 0% L1)</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-on-surface font-semibold">
                    Số Tiền Nạp (AVAX)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.005"
                      min="0.001"
                      max="100"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full p-space-sm pl-4 pr-16 bg-surface-container-low rounded-xl border border-outline-variant/30 text-on-surface font-headline-sm focus:outline-none focus:ring-2 focus:ring-secondary-container font-bold"
                      placeholder="0.02"
                      required
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-label-md text-label-md text-on-surface-variant font-bold">
                      AVAX
                    </span>
                  </div>
                  {/* Quick Select Amount Pills */}
                  <div className="flex items-center gap-2 mt-2">
                    {[0.01, 0.02, 0.05, 0.1].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setDepositAmount(amt.toString())}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          depositAmount === amt.toString()
                            ? "bg-primary text-white shadow-sm"
                            : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                        }`}
                      >
                        +{amt} AVAX
                      </button>
                    ))}
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
                      {(parseFloat(depositAmount || '0') * (bufferRatioPct / 100)).toFixed(4)} AVAX (Rút tức thì)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-body-sm">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {bridgeRatioPct}% Sinh Lời DeFi (Fuji C-Chain):
                    </span>
                    <span className="font-bold text-emerald-700">
                      {(parseFloat(depositAmount || '0') * (bridgeRatioPct / 100)).toFixed(4)} AVAX (8.0% APY)
                    </span>
                  </div>
                </div>

                {/* Error Banner */}
                {depositError && (
                  <div className="p-3 rounded-xl bg-error/10 border border-error/30 text-error text-xs flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                    <div className="flex-1">
                      <p className="font-bold">Lỗi giao dịch:</p>
                      <p className="text-[11px]">{depositError}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-space-sm pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDepositModalOpen(false);
                      setDepositError(null);
                    }}
                    className="px-space-md py-space-sm rounded-xl font-label-md text-on-surface-variant hover:bg-surface-container cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isDepositing}
                    className="px-space-lg py-space-sm bg-primary hover:bg-primary/90 text-white rounded-xl font-label-lg font-bold shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isDepositing ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                        <span>Đang Ký Trên Core Wallet...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">bolt</span>
                        <span>Ký &amp; Nạp Quỹ On-Chain</span>
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
