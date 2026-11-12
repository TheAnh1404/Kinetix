"use client";

import React from "react";
import {
  TrendingUp,
  SlidersHorizontal,
  Sparkles,
  Info,
} from "lucide-react";
import { useFamily } from "@/context/FamilyContext";
import { useLanguage } from "@/context/LanguageContext";

interface DualChainLiquidityBarProps {
  onRebalanceClick?: () => void;
}

export const DualChainLiquidityBar: React.FC<DualChainLiquidityBarProps> = ({
  onRebalanceClick,
}) => {
  const { dynamicVaults } = useFamily();
  const { language } = useLanguage();

  // Tính toán chính xác từ dữ liệu on-chain / database thực tế
  const totalLocalBuffer = dynamicVaults.reduce(
    (acc, v) => acc + (v.l1BufferBalance || v.cachedL1Buffer || 0),
    0,
  );
  const totalRemoteYield = dynamicVaults.reduce(
    (acc, v) => acc + (v.cChainPrincipal || v.cachedCChainYield || 0),
    0,
  );
  const totalBalance = dynamicVaults.reduce(
    (acc, v) =>
      acc +
      (v.totalBalance ||
        v.cachedTotalBalance ||
        (v.l1BufferBalance || 0) + (v.cChainPrincipal || 0)),
    0,
  );

  const localRatio =
    totalBalance > 0 ? Math.round((totalLocalBuffer / totalBalance) * 100) : 0;
  const remoteRatio = totalBalance > 0 ? 100 - localRatio : 0;

  // Tỷ giá AVAX ước lượng
  const usdRate = 30;
  const totalUsd = (totalBalance * usdRate).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* --- CỘT 1: TỔNG TÀI SẢN THỰC TẾ (4 COLS) --- */}
        <div className="lg:col-span-4 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200/90 pb-6 lg:pb-0 lg:pr-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {language === "vi" ? "Tổng Tài Sản Gia Đình" : "Total Family Assets"}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              8.0% APY C-Chain
            </span>
          </div>

          <div className="my-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
                {totalBalance.toFixed(2)}
              </span>
              <span className="text-lg font-bold text-slate-600">AVAX</span>
            </div>
            <div className="text-sm font-semibold text-slate-500 mt-1">
              ≈ ${totalUsd} USD
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              {language === "vi"
                ? "Lãi suất staking 8% tích lũy liên tục theo block thời gian thực."
                : "8% staking yield accrues based on block timestamps."}
            </span>
          </div>
        </div>

        {/* --- CỘT 2: TRỰC QUAN HÓA CƠ CHẾ ĐỆM 2 CHUỖI (8 COLS) --- */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-800">
                {language === "vi"
                  ? "Cơ Chế Đệm Thanh Khoản Đa Chuỗi (Dual-Chain Liquidity)"
                  : "Dual-Chain Liquidity Buffer"}
              </h2>
              <span
                className="text-slate-400 hover:text-slate-600 cursor-help"
                title={
                  language === "vi"
                    ? "Tỷ lệ đệm giúp gia đình rút nhanh 0 gas tại L1, phần còn lại sinh lời 8% APY trên Avalanche C-Chain."
                    : "L1 buffer provides 0-gas instant withdrawals; rest earns 8% APY on C-Chain."
                }
              >
                <Info className="w-4 h-4" />
              </span>
            </div>

            {onRebalanceClick && (
              <button
                type="button"
                onClick={onRebalanceClick}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{language === "vi" ? "Điều chỉnh tỷ lệ" : "Adjust Ratio"}</span>
              </button>
            )}
          </div>

          {/* Thanh trực quan kép (Split Progress Bar) */}
          <div className="w-full">
            {totalBalance > 0 ? (
              <div className="w-full h-5 rounded-full bg-slate-100 p-1 flex overflow-hidden border border-slate-200">
                {/* L1 Buffer Region */}
                <div
                  style={{ width: `${Math.max(localRatio, 5)}%` }}
                  className="h-full rounded-l-full bg-gradient-to-r from-red-500 to-rose-500 transition-all duration-500 relative flex items-center justify-center text-[10px] font-bold text-white overflow-hidden shadow-2xs"
                  title={`L1 Buffer: ${totalLocalBuffer.toFixed(2)} AVAX (${localRatio}%)`}
                >
                  {localRatio >= 15 && `${localRatio}% L1`}
                </div>

                {/* Fuji C-Chain Yield Region */}
                <div
                  style={{ width: `${Math.max(remoteRatio, 5)}%` }}
                  className="h-full rounded-r-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 relative flex items-center justify-center text-[10px] font-bold text-white overflow-hidden shadow-2xs"
                  title={`Fuji C-Chain Staked: ${totalRemoteYield.toFixed(2)} AVAX (${remoteRatio}%)`}
                >
                  {remoteRatio >= 15 && `${remoteRatio}% C-Chain`}
                </div>
              </div>
            ) : (
              <div className="w-full h-5 rounded-full bg-slate-100 flex items-center justify-center text-[11px] text-slate-500 font-medium border border-slate-200">
                Chưa có số dư trong các hũ • Bấm &quot;Nạp Tiền Vào Hũ&quot; để bắt đầu
              </div>
            )}
          </div>

          {/* Chú giải chi tiết 2 chuỗi với số liệu thực */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Thẻ L1 */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-red-50/50 border border-red-100 text-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-md bg-red-500 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800">
                    {language === "vi" ? "Đệm L1 (Rút Tức Thì)" : "L1 Instant Buffer"}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Phí 0 gas • Chi tiêu sinh hoạt
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-sm text-slate-900 block">
                  {totalLocalBuffer.toFixed(2)} AVAX
                </span>
                <span className="text-[11px] font-semibold text-red-600">
                  {localRatio}% tổng quỹ
                </span>
              </div>
            </div>

            {/* Thẻ C-Chain */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 text-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-md bg-emerald-500 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800">
                    {language === "vi" ? "Fuji C-Chain (Sinh Lời)" : "C-Chain Yield Stake"}
                  </span>
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    8.0% APY • Bảo toàn vốn
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-sm text-slate-900 block">
                  {totalRemoteYield.toFixed(2)} AVAX
                </span>
                <span className="text-[11px] font-semibold text-emerald-700">
                  {remoteRatio}% đang stake
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
