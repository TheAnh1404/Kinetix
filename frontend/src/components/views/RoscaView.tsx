'use client';

import React, { useState } from 'react';
import { Member } from '@/types';

interface RoscaViewProps {
  currentMember: Member;
}

export const RoscaView: React.FC<RoscaViewProps> = ({ currentMember }) => {
  const [copied, setCopied] = useState(false);
  const [isPayingOut, setIsPayingOut] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const handleCopyContract = () => {
    navigator.clipboard?.writeText('0x48a72910BF200e623C82811419B912');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePayout = () => {
    setIsPayingOut(true);
    setTimeout(() => {
      setIsPayingOut(false);
      setPayoutSuccess(true);
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-gutter py-space-xl flex flex-col gap-space-xl">
      {/* Top Identity & Subnet Metadata Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-container p-space-lg shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-space-md border border-outline-variant/30">
        <div className="flex flex-col gap-space-xs max-w-3xl">
          <div className="flex flex-wrap items-center gap-space-xs">
            <span className="px-space-xs py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-caps text-label-caps uppercase">
              Hụi Gia Đình On-Chain
            </span>
            <span className="px-space-xs py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-caps text-label-caps flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-fixed-variant animate-ping" />
              Avalanche L1 Zero-Gas
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
            Quỹ Tương Trợ Dòng Họ Nguyễn - Vòng 1 Năm 2026 🤝
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Hình thức chơi Họ/Hụi tương trợ truyền thống được số hóa minh bạch 100% bằng Smart Contract trên Avalanche Family L1, phí gas 0đ.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-center gap-space-xs p-space-md bg-surface-container-lowest rounded-xl shadow-sm min-w-[280px]">
          <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md">
            <span className="material-symbols-outlined text-[18px] text-secondary">verified_user</span>
            <span>Bảo hiểm đệm thanh khoản:</span>
          </div>
          <span className="font-label-lg text-label-lg text-on-surface font-bold">100% USDC Bảo chứng</span>
          <div className="flex items-center gap-space-xs font-label-caps text-label-caps text-on-surface-variant pt-space-xs">
            <span className="material-symbols-outlined text-[14px]">code</span>
            <span>Contract: 0x48a...9F1</span>
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

      {/* Active Round Summary & Yield Metrics (3 Stat Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        {/* Card 1 */}
        <div className="relative bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm flex flex-col justify-between overflow-hidden border border-outline-variant/20">
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-surface-container-high rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start justify-between gap-space-sm mb-space-md">
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Quy Mô Mỗi Kỳ</span>
              <span className="font-headline-sm text-headline-sm text-on-surface mt-1">$1,000.00 USDC</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-on-surface">
              <span className="material-symbols-outlined text-[24px]">savings</span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm bg-surface-container-low p-space-xs rounded-lg">
            <span className="material-symbols-outlined text-[18px] text-emerald-600">groups</span>
            <span>4 thành viên x $250.00 USDC/tháng</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="relative bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm flex flex-col justify-between overflow-hidden border border-outline-variant/20">
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-secondary-fixed/50 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start justify-between gap-space-sm mb-space-md">
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Lượt Nhận Tháng Này</span>
              <span className="font-headline-sm text-headline-sm text-secondary mt-1">Cô Út (Nguyễn Thị Mai)</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
              <span className="material-symbols-outlined text-[24px]">redeem</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm bg-surface-container-low p-space-xs rounded-lg">
            <span className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              <span>Ngày giải ngân:</span>
            </span>
            <span className="font-label-lg text-label-lg text-on-surface font-bold">01/11/2026</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="relative bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm flex flex-col justify-between overflow-hidden border border-outline-variant/20">
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-100 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start justify-between gap-space-sm mb-space-md">
            <div className="flex flex-col">
              <div className="flex items-center gap-space-xs">
                <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Lãi DeFi Tích Lũy</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-label-caps text-label-caps font-bold">Tự Động</span>
              </div>
              <span className="font-headline-sm text-headline-sm text-emerald-700 mt-1">+$18.50 USDC</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface">
              <span className="material-symbols-outlined text-[24px]">trending_up</span>
            </div>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant bg-surface-container-low p-space-xs rounded-lg">
            Tiền góp nhàn rỗi tự sinh lời trên Avalanche C-Chain trước ngày nhận, chia đều 4 thành viên!
          </p>
        </div>
      </div>

      {/* Interactive Rotation Timeline & Visual Progress */}
      <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm flex flex-col gap-space-lg border border-outline-variant/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
          <div>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Hành Trình Vòng 1</span>
            <h2 className="font-headline-md text-headline-md text-on-surface">Lộ Trình Xoay Vòng 4 Kỳ Hụi</h2>
          </div>
          <div className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-space-xs rounded-full">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="font-label-md text-label-md text-on-surface font-semibold">Kỳ 3/4 Đang Hoạt Động</span>
          </div>
        </div>

        {/* 4 Stages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-space-md relative">
          {/* Step 1 */}
          <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col justify-between gap-space-sm relative border border-outline-variant/10">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-label-caps text-on-surface-variant">Tháng 9/2026 (Kỳ 1)</span>
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>
            </div>
            <div className="flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center font-title-md text-title-md text-on-surface font-bold">
                BB
              </div>
              <div className="flex flex-col">
                <span className="font-title-md text-title-md text-on-surface">Bố Ba</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Nguyễn Văn Bình</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-space-xs rounded-lg mt-space-xs">
              <p className="font-label-md text-label-md text-on-surface">Đã nhận $1,000 + $4.20 tiền lãi ✅</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col justify-between gap-space-sm relative border border-outline-variant/10">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-label-caps text-on-surface-variant">Tháng 10/2026 (Kỳ 2)</span>
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>
            </div>
            <div className="flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center font-title-md text-title-md text-on-surface font-bold">
                AC
              </div>
              <div className="flex flex-col">
                <span className="font-title-md text-title-md text-on-surface">Anh Cả</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Nguyễn Văn Hùng</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-space-xs rounded-lg mt-space-xs">
              <p className="font-label-md text-label-md text-on-surface">Đã nhận $1,000 + $5.10 tiền lãi ✅</p>
            </div>
          </div>

          {/* Step 3 (ACTIVE) */}
          <div className="bg-surface-container-highest p-space-md rounded-xl flex flex-col justify-between gap-space-sm relative shadow-md ring-2 ring-secondary/30">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-label-caps text-secondary font-bold">Tháng 11/2026 (Kỳ 3 - NAY)</span>
              <span className="material-symbols-outlined text-secondary text-[20px] animate-bounce">stars</span>
            </div>
            <div className="flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-title-md text-title-md font-bold">
                CÚ
              </div>
              <div className="flex flex-col">
                <span className="font-title-md text-title-md text-on-surface font-bold">Cô Út</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Nguyễn Thị Mai</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-space-xs rounded-lg mt-space-xs">
              <p className="font-label-md text-label-md text-secondary font-bold">Lượt nhận hiện tại - Quỹ đã sẵn sàng giải ngân 🎯</p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col justify-between gap-space-sm opacity-80 border border-outline-variant/10">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-label-caps text-on-surface-variant">Tháng 12/2026 (Kỳ 4)</span>
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">hourglass_empty</span>
            </div>
            <div className="flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center font-title-md text-title-md text-on-surface font-bold">
                CB
              </div>
              <div className="flex flex-col">
                <span className="font-title-md text-title-md text-on-surface">Chú Bảy</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Nguyễn Văn Tuấn</span>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-space-xs rounded-lg mt-space-xs">
              <p className="font-label-md text-label-md text-on-surface-variant">Lượt tiếp theo (Kỳ cuối vòng 1) ⏳</p>
            </div>
          </div>
        </div>

        {/* Timeline visual meter */}
        <div className="w-full bg-surface-container rounded-full h-3 overflow-hidden">
          <div className="bg-secondary-container h-full rounded-full transition-all duration-700" style={{ width: '75%' }} />
        </div>
      </div>

      {/* Contribution Action Box & Settlement Trigger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
        {/* Left side: Personal Contribution Card */}
        <div className="lg:col-span-5 bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm flex flex-col justify-between gap-space-md border border-outline-variant/20">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Tài Khoản Đang Đăng Nhập</span>
              <span className="px-space-xs py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-caps text-label-caps font-bold">
                {currentMember.name} ({currentMember.address.slice(0, 4)}...{currentMember.address.slice(-2)})
              </span>
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Đóng Góp Tháng 11 Của Bạn</h3>
            <div className="text-[32px] font-bold text-on-surface mt-space-xs leading-none">
              $250.00 <span className="font-headline-sm text-headline-sm text-on-surface-variant">USDC</span>
            </div>
          </div>

          <div className="p-space-md bg-surface-container-low rounded-xl flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-xs text-emerald-700 font-label-lg text-label-lg">
              <span className="material-symbols-outlined text-[20px]">task_alt</span>
              <span className="font-bold">Bạn đã hoàn thành đóng góp lúc 07:15 sáng nay</span>
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
                <span>Định danh giao dịch:</span>
                <span className="text-on-surface font-medium">Block #148,291</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowReceiptModal(true)}
            className="w-full py-space-sm px-space-md bg-surface-container hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg rounded-xl transition-colors flex items-center justify-center gap-space-xs cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            <span>Xem biên lai mật mã on-chain</span>
          </button>
        </div>

        {/* Right side: Pool Readiness Meter & Payout CTA */}
        <div className="lg:col-span-7 bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm flex flex-col justify-between gap-space-md border border-outline-variant/20">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Tiến Độ Gom Quỹ Tháng 11</span>
              <span className="font-label-lg text-label-lg text-emerald-700 font-bold bg-surface-container-low px-space-sm py-0.5 rounded-full">
                4/4 Thành viên (100%)
              </span>
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">Đủ Điều Kiện Kích Hoạt Giải Ngân</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Tất cả 4 anh chị em đã hoàn tất đóng góp tiền định kỳ. Quỹ $1,000 USDC đã được Hợp đồng Thông minh ký quỹ đầy đủ.
            </p>
          </div>

          {/* 4 Members Status Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-xs">
            <div className="p-space-xs bg-surface-container-low rounded-xl flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-on-surface font-semibold">Anh Cả</span>
                <span className="font-label-caps text-label-caps text-on-surface-variant">Đã đóng $250</span>
              </div>
            </div>
            <div className="p-space-xs bg-surface-container-low rounded-xl flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-on-surface font-semibold">Bố Ba (Bạn)</span>
                <span className="font-label-caps text-label-caps text-on-surface-variant">Đã đóng $250</span>
              </div>
            </div>
            <div className="p-space-xs bg-surface-container-low rounded-xl flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-on-surface font-semibold">Chú Bảy</span>
                <span className="font-label-caps text-label-caps text-on-surface-variant">Đã đóng $250</span>
              </div>
            </div>
            <div className="p-space-xs bg-surface-container-low rounded-xl flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-on-surface font-semibold">Cô Út</span>
                <span className="font-label-caps text-label-caps text-on-surface-variant">Đã đóng $250</span>
              </div>
            </div>
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
                  <span>Giải Ngân $1,000 USDC Cho Cô Út</span>
                </>
              )}
            </button>
            <span className="text-on-surface-variant font-label-md text-label-md whitespace-nowrap text-center">
              (Tự động thực thi sau 12h)
            </span>
          </div>
        </div>
      </div>

      {/* Transparent Immutable Ledger (Sổ Cái Minh Bạch On-Chain) */}
      <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm flex flex-col gap-space-md border border-outline-variant/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
          <div>
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">Sổ Cái Bất Biến</span>
            <h2 className="font-headline-md text-headline-md text-on-surface">Lịch Sử Giao Dịch Hụi Minh Bạch Trên Avalanche L1</h2>
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
                <th className="py-space-sm px-space-md">Lãi DeFi Tích Lũy</th>
                <th className="py-space-sm px-space-md rounded-r-lg">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="font-body-sm text-body-sm text-on-surface divide-y divide-surface-container-low">
              <tr className="hover:bg-surface-container-low/50 transition-colors">
                <td className="py-space-md px-space-md font-mono text-secondary font-semibold">0x8ef...31a</td>
                <td className="py-space-md px-space-md font-semibold">Bố Ba (Nguyễn Văn Bình)</td>
                <td className="py-space-md px-space-md font-bold">$250.00 USDC</td>
                <td className="py-space-md px-space-md text-on-surface-variant">07:15 - 01/11/2026</td>
                <td className="py-space-md px-space-md font-mono">#148,291</td>
                <td className="py-space-md px-space-md text-emerald-700 font-semibold">+$4.62 USDC</td>
                <td className="py-space-md px-space-md">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-caps text-label-caps">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Hoàn tất 100%
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-surface-container-low/50 transition-colors">
                <td className="py-space-md px-space-md font-mono text-secondary font-semibold">0x3b1...8fc</td>
                <td className="py-space-md px-space-md font-semibold">Anh Cả (Nguyễn Văn Hùng)</td>
                <td className="py-space-md px-space-md font-bold">$250.00 USDC</td>
                <td className="py-space-md px-space-md text-on-surface-variant">06:40 - 01/11/2026</td>
                <td className="py-space-md px-space-md font-mono">#148,284</td>
                <td className="py-space-md px-space-md text-emerald-700 font-semibold">+$4.62 USDC</td>
                <td className="py-space-md px-space-md">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-caps text-label-caps">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Hoàn tất 100%
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-surface-container-low/50 transition-colors">
                <td className="py-space-md px-space-md font-mono text-secondary font-semibold">0x7c4...02e</td>
                <td className="py-space-md px-space-md font-semibold">Cô Út (Nguyễn Thị Mai)</td>
                <td className="py-space-md px-space-md font-bold">$250.00 USDC</td>
                <td className="py-space-md px-space-md text-on-surface-variant">06:12 - 01/11/2026</td>
                <td className="py-space-md px-space-md font-mono">#148,272</td>
                <td className="py-space-md px-space-md text-emerald-700 font-semibold">+$4.63 USDC</td>
                <td className="py-space-md px-space-md">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-caps text-label-caps">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Hoàn tất 100%
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-surface-container-low/50 transition-colors">
                <td className="py-space-md px-space-md font-mono text-secondary font-semibold">0x12a...77b</td>
                <td className="py-space-md px-space-md font-semibold">Chú Bảy (Nguyễn Văn Tuấn)</td>
                <td className="py-space-md px-space-md font-bold">$250.00 USDC</td>
                <td className="py-space-md px-space-md text-on-surface-variant">05:55 - 01/11/2026</td>
                <td className="py-space-md px-space-md font-mono">#148,260</td>
                <td className="py-space-md px-space-md text-emerald-700 font-semibold">+$4.63 USDC</td>
                <td className="py-space-md px-space-md">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-caps text-label-caps">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Hoàn tất 100%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Explanation Callout Box */}
        <div className="mt-space-sm p-space-md bg-surface-container-high rounded-xl flex items-start gap-space-md">
          <div className="w-10 h-10 rounded-full bg-secondary text-on-secondary flex-shrink-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">shield</span>
          </div>
          <div className="flex flex-col gap-1">
            <h4 className="font-title-md text-title-md text-on-surface">Tại sao ROSCA trên Kinetix an toàn hơn hụi truyền thống?</h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Mọi dòng tiền đều được khóa tự động trong Hợp đồng thông minh của mạng con Avalanche L1. Không chủ hụi nào có thể giật họ, lạm dụng vốn hoặc ôm tiền biến mất. Hệ thống tự động phân phối lợi suất DeFi sinh lời từ thời gian chờ, đem lại sự an tâm và tình gắn kết tuyệt đối cho gia đình.
            </p>
          </div>
        </div>
      </div>

      {/* Cryptographic Receipt Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-2xl p-space-lg shadow-2xl flex flex-col gap-space-md border border-outline-variant/30">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-low">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">verified</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Biên Lai Mật Mã On-Chain</h3>
              </div>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant"
              >
                ✕
              </button>
            </div>
            <div className="bg-surface-container-low p-space-md rounded-xl font-mono text-xs flex flex-col gap-2 text-on-surface">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Mạng:</span>
                <span className="font-bold text-secondary">Avalanche Family L1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Tx Hash:</span>
                <span className="text-xs break-all">0x8ef31a49c2d619fa10bc9318a...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Sender:</span>
                <span>{currentMember.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Contract:</span>
                <span>0x48a72910BF200e623C82811419B912</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Số tiền:</span>
                <span className="font-bold text-emerald-600">250.00 USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Gas Used:</span>
                <span>21,000 (Gas Price: 0 Gwei)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Trạng thái:</span>
                <span className="font-bold text-emerald-600">CONFIRMED (Finality &lt;1s)</span>
              </div>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Dữ liệu được xác thực bất biến bởi cơ chế đồng thuận Avalanche Subnet-EVM, sẵn sàng nộp bằng chứng pháp lý gia đình nếu phát sinh tranh chấp.
            </p>
            <button
              onClick={() => setShowReceiptModal(false)}
              className="w-full py-space-sm bg-primary text-on-primary rounded-xl font-label-lg"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
