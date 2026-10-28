'use client';

import React, { useState } from 'react';
import { Member } from '@/types';
import { CONTRACT_ADDRESSES } from '@/contracts/config';
import { useFamily } from '@/context/FamilyContext';
import { useLanguage } from '@/context/LanguageContext';

interface RoscaViewProps {
  currentMember?: Member;
}

export const RoscaView: React.FC<RoscaViewProps> = ({ currentMember: propMember }) => {
  const {
    dynamicVaults,
    currentWorkspace,
    depositToVault,
    requestVaultWithdrawal,
    payoutRoscaRound,
    currentMember: contextMember,
    members,
    isLiveWeb3,
  } = useFamily();

  const { language, t } = useLanguage();
  const activeMember = propMember || contextMember;

  // Lọc tất cả các Hũ tiền có Rule Template là ROSCA hoặc SHARED_GOAL
  const roscaVaults = dynamicVaults.filter(
    (v) => v.ruleTemplate === 'ROSCA' || v.ruleTemplate === 'SHARED_GOAL'
  );

  const [selectedVaultId, setSelectedVaultId] = useState<number | null>(
    roscaVaults.length > 0 ? roscaVaults[0].onchainVaultId : null
  );

  const [copied, setCopied] = useState(false);
  const [contributionAmount, setContributionAmount] = useState<number>(250);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isPayingOut, setIsPayingOut] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const selectedVault =
    roscaVaults.find((v) => v.onchainVaultId === selectedVaultId) || roscaVaults[0];

  const hubAddress = CONTRACT_ADDRESSES.familyHub;

  const handleCopyContract = () => {
    navigator.clipboard?.writeText(hubAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Nạp tiền góp định kỳ vào hũ on-chain
  const handleContribute = async () => {
    if (!selectedVault) return;
    setIsDepositing(true);
    try {
      const ok = await depositToVault(selectedVault.onchainVaultId, contributionAmount);
      if (ok) {
        setDepositSuccess(true);
        setTimeout(() => setDepositSuccess(false), 4000);
      }
    } finally {
      setIsDepositing(false);
    }
  };

  // Kích hoạt giải ngân định kỳ (ROSCA hoặc SHARED_GOAL)
  const handlePayout = async () => {
    if (!selectedVault) return;
    setIsPayingOut(true);
    try {
      if (selectedVault.ruleTemplate === 'ROSCA') {
        // Gọi trực tiếp cơ chế giải ngân theo kỳ của Hũ ROSCA
        const ok = await payoutRoscaRound(selectedVault.onchainVaultId, selectedVault.id);
        if (ok) {
          setPayoutSuccess(true);
          setTimeout(() => setPayoutSuccess(false), 5000);
        }
      } else {
        // Với SHARED_GOAL, tạo phiếu yêu cầu đa chữ ký giải ngân quỹ mục tiêu
        const res = await requestVaultWithdrawal(
          selectedVault.onchainVaultId,
          selectedVault.totalBalance > 0 ? selectedVault.totalBalance : 1000,
          `Giải ngân quỹ mục tiêu - ${selectedVault.name}`
        );
        if (res.success) {
          setPayoutSuccess(true);
          setTimeout(() => setPayoutSuccess(false), 5000);
        }
      }
    } finally {
      setIsPayingOut(false);
    }
  };

  // Tính toán lãi dự kiến từ C-Chain (8% APY trên C-Chain principal)
  const cChainYield = selectedVault
    ? ((selectedVault.cChainPrincipal * 0.08 * 30) / 365).toFixed(2)
    : '18.50';

  return (
    <div className="max-w-7xl mx-auto w-full px-gutter py-space-xl flex flex-col gap-space-xl">
      {/* Top Identity & Subnet Metadata Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-container p-space-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md border border-outline-variant/30">
        <div className="flex flex-col gap-space-xs max-w-3xl">
          <div className="flex flex-wrap items-center gap-space-xs">
            <span className="px-space-xs py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-caps text-label-caps uppercase font-bold">
              {selectedVault ? `Bộ Quy Tắc: ${selectedVault.ruleTemplate}` : 'ROSCA / SHARED_GOAL'}
            </span>
            <span className="px-space-xs py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-caps text-label-caps flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-fixed-variant animate-ping" />
              Avalanche Family L1 (0 Gas Fee)
            </span>
            {currentWorkspace && (
              <span className="px-space-xs py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-caps text-label-caps font-medium">
                🏢 {currentWorkspace.name}
              </span>
            )}
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
            {selectedVault ? selectedVault.name : 'Quỹ Góp Vốn Xoay Vòng & Mục Tiêu Chung'} 🤝
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {language === 'vi'
              ? 'Mô hình Hụi tương trợ & Quỹ mục tiêu chung được bảo chứng minh bạch 100% bằng Smart Contract trên Avalanche Family L1, vốn nhàn rỗi sinh lời 8% APY trên Fuji C-Chain.'
              : 'Decentralized rotating savings and shared goal vaults secured by Smart Contracts on Avalanche Family L1 with 8% APY idle capital yield on Fuji C-Chain.'}
          </p>

          {/* Vault Selector Pills if workspace has multiple ROSCA/Goal vaults */}
          {roscaVaults.length > 1 && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-outline-variant/20 flex-wrap">
              <span className="text-xs font-bold text-on-surface-variant">Chọn Hũ:</span>
              {roscaVaults.map((vault) => (
                <button
                  key={vault.id}
                  onClick={() => setSelectedVaultId(vault.onchainVaultId)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedVault?.onchainVaultId === vault.onchainVaultId
                      ? 'bg-secondary text-white shadow-sm'
                      : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
                  }`}
                  type="button"
                >
                  {vault.name} ({vault.ruleTemplate})
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-center gap-space-xs p-space-md bg-surface-container-lowest rounded-xl shadow-sm min-w-[280px]">
          <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md">
            <span className="material-symbols-outlined text-[18px] text-secondary">verified_user</span>
            <span>Bảo hiểm đệm thanh khoản:</span>
          </div>
          <span className="font-label-lg text-label-lg text-on-surface font-bold">
            {selectedVault
              ? `${(selectedVault.bufferRatioBps / 100).toFixed(0)}% L1 / ${(
                  100 -
                  selectedVault.bufferRatioBps / 100
                ).toFixed(0)}% C-Chain`
              : '100% Bảo Chứng On-Chain'}
          </span>
          <div className="flex items-center gap-space-xs font-label-caps text-label-caps text-on-surface-variant pt-space-xs">
            <span className="material-symbols-outlined text-[14px]">code</span>
            <span>Contract: {hubAddress.slice(0, 6)}...{hubAddress.slice(-4)}</span>
            <button
              onClick={handleCopyContract}
              className="text-secondary hover:underline cursor-pointer font-bold"
              type="button"
            >
              {copied ? 'Đã chép ✓' : 'Sao chép'}
            </button>
          </div>
        </div>
      </div>

      {/* Empty State Banner if no ROSCA / Goal vault exists */}
      {roscaVaults.length === 0 ? (
        <div className="bg-surface-container-lowest p-space-xl rounded-2xl shadow-sm border border-dashed border-outline-variant/40 flex flex-col items-center justify-center text-center gap-space-md py-16">
          <div className="w-16 h-16 rounded-2xl bg-secondary-container/10 flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-[36px]">diversity_3</span>
          </div>
          <div className="max-w-md">
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              Chưa Có Hũ Góp Vốn Xoay Vòng (ROSCA)
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Không gian <strong>{currentWorkspace?.name || 'hiện tại'}</strong> chưa có Hũ tiền cấu hình theo bộ quy tắc ROSCA hoặc SHARED_GOAL. Hãy chuyển sang Tab Hũ Tiền Động để khởi tạo ngay!
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Active Round Summary & Yield Metrics (3 Stat Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
            {/* Card 1: Total Vault Balance */}
            <div className="relative bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm flex flex-col justify-between overflow-hidden border border-outline-variant/20">
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-surface-container-high rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-start justify-between gap-space-sm mb-space-md">
                <div className="flex flex-col">
                  <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                    Quy Mô Hũ Hiện Tại
                  </span>
                  <span className="font-headline-sm text-headline-sm text-on-surface mt-1 font-bold">
                    ${selectedVault ? selectedVault.totalBalance.toLocaleString() : '1,000.00'} USDC
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-on-surface">
                  <span className="material-symbols-outlined text-[24px]">savings</span>
                </div>
              </div>
              <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm bg-surface-container-low p-space-xs rounded-lg">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">groups</span>
                <span>
                  {members.length > 0 ? `${members.length} thành viên tham gia` : '4 thành viên'} • $
                  {contributionAmount}.00 USDC/kỳ
                </span>
              </div>
            </div>

            {/* Card 2: Next Rotation / Recipient */}
            <div className="relative bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm flex flex-col justify-between overflow-hidden border border-outline-variant/20">
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-secondary-fixed/50 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-start justify-between gap-space-sm mb-space-md">
                <div className="flex flex-col">
                  <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                    Lượt Nhận Kỳ Này
                  </span>
                  <span className="font-headline-sm text-headline-sm text-secondary mt-1 font-bold">
                    {members[1]?.name || 'Cô Út (Nguyễn Thị Mai)'}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
                  <span className="material-symbols-outlined text-[24px]">redeem</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm bg-surface-container-low p-space-xs rounded-lg">
                <span className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                  <span>Giải ngân định kỳ:</span>
                </span>
                <span className="font-label-lg text-label-lg text-on-surface font-bold">01/11/2026</span>
              </div>
            </div>

            {/* Card 3: C-Chain DeFi Yield */}
            <div className="relative bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm flex flex-col justify-between overflow-hidden border border-outline-variant/20">
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-100 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-start justify-between gap-space-sm mb-space-md">
                <div className="flex flex-col">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                      Lãi DeFi Tích Lũy (8% APY)
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-label-caps text-label-caps font-bold">
                      Teleporter ICM
                    </span>
                  </div>
                  <span className="font-headline-sm text-headline-sm text-emerald-700 mt-1 font-bold">
                    +${cChainYield} USDC
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface">
                  <span className="material-symbols-outlined text-[24px]">trending_up</span>
                </div>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant bg-surface-container-low p-space-xs rounded-lg">
                Tiền nhàn rỗi (${selectedVault?.cChainPrincipal.toLocaleString() || '3,000'} USDC) tự động sinh lời trên Fuji C-Chain trước ngày nhận!
              </p>
            </div>
          </div>

          {/* Interactive Rotation Timeline & Visual Progress */}
          <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm flex flex-col gap-space-lg border border-outline-variant/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
              <div>
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                  Hành Trình Xoay Vòng
                </span>
                <h2 className="font-headline-md text-headline-md text-on-surface">
                  Lộ Trình Giải Ngân 4 Kỳ Hụi
                </h2>
              </div>
              <div className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-space-xs rounded-full">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span className="font-label-md text-label-md text-on-surface font-semibold">
                  Kỳ 3/4 Đang Hoạt Động
                </span>
              </div>
            </div>

            {/* 4 Stages Grid mapped to workspace members */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-space-md relative">
              {/* Step 1 */}
              <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col justify-between gap-space-sm relative border border-outline-variant/10">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">
                    Tháng 9/2026 (Kỳ 1)
                  </span>
                  <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>
                </div>
                <div className="flex items-center gap-space-sm">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center font-title-md text-title-md text-on-surface font-bold">
                    BB
                  </div>
                  <div className="flex flex-col">
                    <span className="font-title-md text-title-md text-on-surface">
                      {members[0]?.name || 'Bố Ba'}
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {members[0]?.role || 'Admin Không Gian'}
                    </span>
                  </div>
                </div>
                <div className="bg-surface-container-lowest p-space-xs rounded-lg mt-space-xs">
                  <p className="font-label-md text-label-md text-on-surface">Đã nhận $1,000 + $4.20 tiền lãi ✅</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col justify-between gap-space-sm relative border border-outline-variant/10">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">
                    Tháng 10/2026 (Kỳ 2)
                  </span>
                  <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>
                </div>
                <div className="flex items-center gap-space-sm">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center font-title-md text-title-md text-on-surface font-bold">
                    AC
                  </div>
                  <div className="flex flex-col">
                    <span className="font-title-md text-title-md text-on-surface">Anh Cả</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Guardian Quỹ</span>
                  </div>
                </div>
                <div className="bg-surface-container-lowest p-space-xs rounded-lg mt-space-xs">
                  <p className="font-label-md text-label-md text-on-surface">Đã nhận $1,000 + $5.10 tiền lãi ✅</p>
                </div>
              </div>

              {/* Step 3 (ACTIVE) */}
              <div className="bg-surface-container-highest p-space-md rounded-xl flex flex-col justify-between gap-space-sm relative shadow-md ring-2 ring-secondary/30">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-label-caps text-secondary font-bold">
                    Tháng 11/2026 (Kỳ 3 - NAY)
                  </span>
                  <span className="material-symbols-outlined text-secondary text-[20px] animate-bounce">
                    stars
                  </span>
                </div>
                <div className="flex items-center gap-space-sm">
                  <div className="w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-title-md text-title-md font-bold">
                    CÚ
                  </div>
                  <div className="flex flex-col">
                    <span className="font-title-md text-title-md text-on-surface font-bold">
                      {members[1]?.name || 'Cô Út'}
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Thành Viên Hũ</span>
                  </div>
                </div>
                <div className="bg-surface-container-lowest p-space-xs rounded-lg mt-space-xs">
                  <p className="font-label-md text-label-md text-secondary font-bold">
                    Lượt nhận hiện tại - Quỹ đã sẵn sàng giải ngân 🎯
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col justify-between gap-space-sm opacity-80 border border-outline-variant/10">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">
                    Tháng 12/2026 (Kỳ 4)
                  </span>
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                    hourglass_empty
                  </span>
                </div>
                <div className="flex items-center gap-space-sm">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center font-title-md text-title-md text-on-surface font-bold">
                    CB
                  </div>
                  <div className="flex flex-col">
                    <span className="font-title-md text-title-md text-on-surface">Chú Bảy</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Kỳ Cuối Cùng</span>
                  </div>
                </div>
                <div className="bg-surface-container-lowest p-space-xs rounded-lg mt-space-xs">
                  <p className="font-label-md text-label-md text-on-surface-variant">
                    Lượt tiếp theo (Kỳ cuối vòng 1) ⏳
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline visual meter */}
            <div className="w-full bg-surface-container rounded-full h-3 overflow-hidden">
              <div
                className="bg-secondary-container h-full rounded-full transition-all duration-700"
                style={{ width: '75%' }}
              />
            </div>
          </div>

          {/* Contribution Action Box & Settlement Trigger */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
            {/* Left side: Personal Contribution Card */}
            <div className="lg:col-span-5 bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm flex flex-col justify-between gap-space-md border border-outline-variant/20">
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                    Tài Khoản Đang Đăng Nhập
                  </span>
                  <span className="px-space-xs py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-caps text-label-caps font-bold">
                    {activeMember.name} ({activeMember.address.slice(0, 4)}...
                    {activeMember.address.slice(-2)})
                  </span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Đóng Góp Kỳ Này Cho Hũ
                </h3>
                
                {/* Input for contribution */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={contributionAmount}
                      onChange={(e) => setContributionAmount(Number(e.target.value))}
                      className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-2xl font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
                      min={10}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-on-surface-variant">
                      USDC
                    </span>
                  </div>
                </div>

                {/* Quick preset buttons */}
                <div className="flex items-center gap-2 mt-1">
                  {[50, 100, 250, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setContributionAmount(amt)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        contributionAmount === amt
                          ? 'bg-secondary text-white'
                          : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              {depositSuccess && (
                <div className="p-space-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 rounded-xl flex items-center gap-2 text-xs font-bold">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>Đã đóng góp thành công {contributionAmount} USDC vào Smart Contract!</span>
                </div>
              )}

              <div className="p-space-md bg-surface-container-low rounded-xl flex flex-col gap-space-xs">
                <div className="flex items-center gap-space-xs text-emerald-700 font-label-lg text-label-lg">
                  <span className="material-symbols-outlined text-[20px]">task_alt</span>
                  <span className="font-bold">Đệm thanh khoản L1 & Sinh lời C-Chain</span>
                </div>
                <div className="flex flex-col gap-1 pt-space-xs text-on-surface-variant font-label-md text-label-md">
                  <div className="flex justify-between">
                    <span>Hạ tầng mạng:</span>
                    <span className="text-on-surface font-medium">Avalanche Family L1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gas Fee:</span>
                    <span className="text-emerald-600 font-bold">0 Gwei ($0.00 Miễn Phí)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Chuyển tiếp Teleporter:</span>
                    <span className="text-on-surface font-medium">Fuji C-Chain (8% APY)</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleContribute}
                disabled={isDepositing}
                className="w-full py-space-sm px-space-md bg-secondary text-white hover:bg-secondary-container font-label-lg text-label-lg rounded-xl transition-all shadow-md flex items-center justify-center gap-space-xs cursor-pointer disabled:opacity-60"
                type="button"
              >
                {isDepositing ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    <span>Đang nạp vào Smart Contract...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">payments</span>
                    <span>Xác Nhận Đóng Góp {contributionAmount} USDC (0 Gas)</span>
                  </>
                )}
              </button>
            </div>

            {/* Right side: Pool Readiness Meter & Payout CTA */}
            <div className="lg:col-span-7 bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm flex flex-col justify-between gap-space-md border border-outline-variant/20">
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                    Tiến Độ Gom Quỹ Kỳ Này
                  </span>
                  <span className="font-label-lg text-label-lg text-emerald-700 font-bold bg-surface-container-low px-space-sm py-0.5 rounded-full">
                    {selectedVault?.totalBalance || 1000} USDC Sẵn Sàng
                  </span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Đủ Điều Kiện Kích Hoạt Giải Ngân
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Quỹ ${selectedVault?.totalBalance || 1000} USDC đã được Smart Contract ký quỹ đầy đủ. Người đến kỳ nhận sẽ nhận toàn bộ vốn góp kèm lãi sinh sôi từ Fuji C-Chain.
                </p>
              </div>

              {/* Members Status Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-xs">
                {members.slice(0, 4).map((member, idx) => (
                  <div key={member.id} className="p-space-xs bg-surface-container-low rounded-xl flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                    <div className="flex flex-col">
                      <span className="font-label-md text-label-md text-on-surface font-semibold truncate">
                        {member.name}
                      </span>
                      <span className="font-label-caps text-label-caps text-on-surface-variant">
                        Đã đóng ${contributionAmount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Big Execution Action */}
              <div className="flex flex-col sm:flex-row items-center gap-space-md pt-space-xs">
                <button
                  onClick={handlePayout}
                  disabled={isPayingOut || payoutSuccess}
                  className={`w-full sm:w-auto flex-1 py-space-md px-space-lg font-headline-sm text-headline-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-space-sm cursor-pointer ${
                    payoutSuccess
                      ? 'bg-emerald-700 text-white cursor-default'
                      : 'bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary'
                  }`}
                  type="button"
                >
                  {isPayingOut ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[24px]">progress_activity</span>
                      <span>Đang tương tác Smart Contract...</span>
                    </>
                  ) : payoutSuccess ? (
                    <>
                      <span className="material-symbols-outlined text-[24px]">verified</span>
                      <span>Đã Ký Lệnh Giải Ngân Thành Công!</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[24px]">payments</span>
                      <span>Giải Ngân ${selectedVault?.totalBalance || 1000} USDC Cho Lượt Nhận</span>
                    </>
                  )}
                </button>
                <span className="text-on-surface-variant font-label-md text-label-md whitespace-nowrap text-center">
                  (Bảo mật Đa Chữ Ký Multisig)
                </span>
              </div>
            </div>
          </div>

          {/* Transparent Immutable Ledger (Sổ Cái Minh Bạch On-Chain) */}
          <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm flex flex-col gap-space-md border border-outline-variant/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
              <div>
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                  Sổ Cái Bất Biến
                </span>
                <h2 className="font-headline-md text-headline-md text-on-surface">
                  Lịch Sử Giao Dịch Hũ Minh Bạch Trên Avalanche L1
                </h2>
              </div>
              <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md">
                <span className="material-symbols-outlined text-[16px]">sync</span>
                <span>Đồng bộ theo thời gian thực (Teleporter ICM)</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant font-label-caps text-label-caps uppercase">
                    <th className="py-space-sm px-space-md rounded-l-lg">Tx Hash</th>
                    <th className="py-space-sm px-space-md">Thành Viên</th>
                    <th className="py-space-sm px-space-md">Số Tiền Góp</th>
                    <th className="py-space-sm px-space-md">Thời Gian</th>
                    <th className="py-space-sm px-space-md">Block L1</th>
                    <th className="py-space-sm px-space-md">Lãi C-Chain</th>
                    <th className="py-space-sm px-space-md rounded-r-lg">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm text-on-surface divide-y divide-surface-container-low">
                  <tr className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-space-md px-space-md font-mono text-secondary font-semibold">0x8ef...31a</td>
                    <td className="py-space-md px-space-md font-semibold">{activeMember.name}</td>
                    <td className="py-space-md px-space-md font-bold">${contributionAmount}.00 USDC</td>
                    <td className="py-space-md px-space-md text-on-surface-variant">07:15 - Hôm nay</td>
                    <td className="py-space-md px-space-md font-mono">#148,291</td>
                    <td className="py-space-md px-space-md text-emerald-600 font-bold">+${cChainYield}</td>
                    <td className="py-space-md px-space-md">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                        Thành Công ✓
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-space-md px-space-md font-mono text-secondary font-semibold">0x4bc...91e</td>
                    <td className="py-space-md px-space-md font-semibold">{members[1]?.name || 'Cô Út'}</td>
                    <td className="py-space-md px-space-md font-bold">$250.00 USDC</td>
                    <td className="py-space-md px-space-md text-on-surface-variant">08:30 - Hôm nay</td>
                    <td className="py-space-md px-space-md font-mono">#148,299</td>
                    <td className="py-space-md px-space-md text-emerald-600 font-bold">+$12.30</td>
                    <td className="py-space-md px-space-md">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                        Thành Công ✓
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
