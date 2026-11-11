"use client";
import React from "react";
import { formatEther, parseEther } from "viem";
import { useFamily } from "@/context/FamilyContext";
import { hubChain, CONTRACT_ADDRESSES, DEPLOYMENT } from "@/contracts/config";
import { vaultMappingIssue } from "../../../../shared/vaultMapping";

export const FamilyStatsCards: React.FC = () => {
  const { dynamicVaults } = useFamily();
  const reconciled = dynamicVaults.filter(
    (vault) =>
      DEPLOYMENT.enabled &&
      !vaultMappingIssue(vault, hubChain.id, CONTRACT_ADDRESSES.familyHub),
  );
  const total = reconciled.reduce(
    (sum, vault) => sum + parseEther(vault.exactTotalBalance || "0"),
    0n,
  );
  const local = reconciled.reduce(
    (sum, vault) => sum + parseEther(vault.exactL1Buffer || "0"),
    0n,
  );
  const cChainYield = total > local ? total - local : 0n;

  // Tính tỷ lệ phần trăm phân bổ thanh khoản
  const totalNum = Number(formatEther(total));
  const localNum = Number(formatEther(local));
  const localPercent = totalNum > 0 ? Math.round((localNum / totalNum) * 100) : 0;
  const yieldPercent = totalNum > 0 ? 100 - localPercent : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* 3 Thẻ Bento Tài Chính Lớn */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Thẻ 1: Tổng số dư đã đối soát */}
        <div className="p-5 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tổng Tài Sản Khả Dụng
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            </div>
          </div>
          <div className="my-3">
            <p className="font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight break-all font-mono">
              {reconciled.length ? `${formatEther(total)}` : "0.00"}{" "}
              <span className="text-sm font-bold text-red-600 dark:text-red-400 font-sans">AVAX</span>
            </p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {reconciled.length} hũ đã đối soát
            </span>
            <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">On-Chain</span>
          </div>
        </div>

        {/* Thẻ 2: Đệm thanh khoản L1 Instant */}
        <div className="p-5 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Đệm Rút Nhanh L1 (0 Gas)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">bolt</span>
            </div>
          </div>
          <div className="my-3">
            <p className="font-extrabold text-2xl sm:text-3xl text-emerald-600 dark:text-emerald-400 tracking-tight break-all font-mono">
              {reconciled.length ? `${formatEther(local)}` : "0.00"}{" "}
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300 font-sans">AVAX</span>
            </p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              ⚡ Rút tức thì &lt;1s cho chi tiêu
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold font-mono text-[10px]">
              {localPercent}% Quỹ
            </span>
          </div>
        </div>

        {/* Thẻ 3: Tích lũy lợi nhuận C-Chain */}
        <div className="p-5 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tích Lũy Lợi Nhuận Fuji
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">trending_up</span>
            </div>
          </div>
          <div className="my-3">
            <p className="font-extrabold text-2xl sm:text-3xl text-blue-600 dark:text-blue-400 tracking-tight break-all font-mono">
              {reconciled.length ? `${formatEther(cChainYield)}` : "0.00"}{" "}
              <span className="text-sm font-bold text-blue-700 dark:text-blue-300 font-sans">AVAX</span>
            </p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              🌊 Lãi suất ~8% APY Avalanche
            </span>
            <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-bold font-mono text-[10px]">
              {yieldPercent}% Quỹ
            </span>
          </div>
        </div>
      </div>

      {/* Thanh Phân Bổ Vốn Trực Quan L1 vs C-Chain (Visual Split Bar) */}
      {totalNum > 0 && (
        <div className="p-4 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-red-600 dark:text-red-400">pie_chart</span>
              Phân Bổ Thanh Khoản Kép (Dual-Chain Liquidity Ratio)
            </span>
            <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
              {localPercent}% L1 Buffer / {yieldPercent}% C-Chain
            </span>
          </div>
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${Math.max(localPercent, 5)}%` }}
              className="h-full bg-emerald-500 transition-all duration-500"
              title={`Đệm rút nhanh L1: ${formatEther(local)} AVAX (${localPercent}%)`}
            />
            <div
              style={{ width: `${Math.min(yieldPercent, 95)}%` }}
              className="h-full bg-blue-500 transition-all duration-500"
              title={`Tích lũy C-Chain: ${formatEther(cChainYield)} AVAX (${yieldPercent}%)`}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Đệm L1 (Rút ngay 0 gas)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Fuji C-Chain (Sinh lời 8% APY)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
