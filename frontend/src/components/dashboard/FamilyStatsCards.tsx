"use client";

import React from "react";
import { useFamily } from "@/context/FamilyContext";
import { useLanguage } from "@/context/LanguageContext";

export const FamilyStatsCards: React.FC = () => {
  const { vaults, totalFamilyWealth, dynamicVaults } = useFamily();
  const { t } = useLanguage();

  const bufferTotal = dynamicVaults.length > 0
    ? dynamicVaults.reduce((sum, v) => sum + v.cachedL1Buffer, 0)
    : vaults.retirementShield.localBuffer +
      vaults.kidsSavings.localBuffer +
      vaults.familyRosca.localBuffer;

  const yieldTotal = dynamicVaults.length > 0
    ? dynamicVaults.reduce((sum, v) => sum + Math.max(0, v.cachedTotalBalance - v.cachedL1Buffer), 0)
    : vaults.retirementShield.remoteYield +
      vaults.kidsSavings.remoteYield +
      vaults.familyRosca.remoteYield;

  const accruedTotal = dynamicVaults.length > 0
    ? dynamicVaults.reduce((sum, v) => sum + v.cachedCChainYield, 0)
    : vaults.retirementShield.accruedYield +
      vaults.kidsSavings.accruedYield +
      vaults.familyRosca.accruedYield;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {/* 1. Tổng Tài Sản Gia Đình */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-3 group">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider font-mono">
            {t("dash.kpi.totalWealth")}
          </span>
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
          </div>
        </div>
        <div>
          <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {totalFamilyWealth.toFixed(3)} <span className="text-sm font-sans font-bold text-slate-500">AVAX</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold font-mono">
              <span className="material-symbols-outlined text-[13px]">trending_up</span>
              +8.0% APY
            </span>
            <span className="text-[11px] text-slate-500">
              {t("dash.kpi.totalWealthSub")}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Quỹ Đệm Thanh Khoản 10% (L1) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-3 group">
        <div className="flex items-center justify-between">
          <span className="text-xs text-red-600 uppercase font-bold tracking-wider font-mono">
            {t("dash.kpi.bufferL1")}
          </span>
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[20px]">bolt</span>
          </div>
        </div>
        <div>
          <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {bufferTotal.toFixed(3)} <span className="text-sm font-sans font-bold text-red-600 font-semibold">AVAX (L1)</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[11px] font-bold font-mono border border-red-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
              0 Gwei
            </span>
            <span className="text-[11px] text-slate-500 truncate">
              {t("dash.kpi.bufferL1Sub")}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Vốn Sinh Lời DeFi 90% (C-Chain) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-3 group">
        <div className="flex items-center justify-between">
          <span className="text-xs text-emerald-700 uppercase font-bold tracking-wider font-mono">
            {t("dash.kpi.yieldCChain")}
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[20px]">savings</span>
          </div>
        </div>
        <div>
          <div className="text-2xl lg:text-3xl font-extrabold text-emerald-800 font-mono tracking-tight">
            {yieldTotal.toFixed(3)} <span className="text-sm font-sans font-bold text-emerald-600">AVAX (C-Chain)</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold font-mono">
              +{accruedTotal.toFixed(4)} AVAX lãi
            </span>
            <span className="text-[11px] text-slate-500 truncate">
              {t("dash.kpi.yieldCChainSub")}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Chỉ Số An Toàn Anti-Scam */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-3 group">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider font-mono">
            {t("dash.kpi.securityScore")}
          </span>
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[20px]">verified_user</span>
          </div>
        </div>
        <div>
          <div className="text-2xl lg:text-3xl font-extrabold text-blue-800 font-mono tracking-tight">
            100% <span className="text-sm font-sans font-bold text-blue-600">Safe</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              Multisig 2/3
            </span>
            <span className="text-[11px] text-slate-500 truncate">
              {t("dash.kpi.securityScoreSub")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
