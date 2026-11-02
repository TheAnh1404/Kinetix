'use client';

import React from 'react';
import { useFamily } from '@/context/FamilyContext';
import { useLanguage } from '@/context/LanguageContext';

export const FamilyStatsCards: React.FC = () => {
  const { vaults, totalFamilyWealth, dynamicVaults } = useFamily();
  const { t } = useLanguage();

  const bufferTotal =
    dynamicVaults.length > 0
      ? dynamicVaults.reduce((sum, v) => sum + v.cachedL1Buffer, 0)
      : vaults.retirementShield.localBuffer +
        vaults.kidsSavings.localBuffer +
        vaults.familyRosca.localBuffer;

  const yieldTotal =
    dynamicVaults.length > 0
      ? dynamicVaults.reduce((sum, v) => sum + Math.max(0, v.cachedTotalBalance - v.cachedL1Buffer), 0)
      : vaults.retirementShield.remoteYield +
        vaults.kidsSavings.remoteYield +
        vaults.familyRosca.remoteYield;

  const accruedTotal =
    dynamicVaults.length > 0
      ? dynamicVaults.reduce((sum, v) => sum + v.cachedCChainYield, 0)
      : vaults.retirementShield.accruedYield +
        vaults.kidsSavings.accruedYield +
        vaults.familyRosca.accruedYield;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
      {/* 1. TỔNG QUỸ TÀI SẢN GIA ĐÌNH */}
      <div className="bg-gradient-to-br from-red-600 to-rose-700 text-white p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3 group relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase font-bold tracking-wider font-mono text-red-100">
            {t('dash.kpi.totalWealth')}
          </span>
          <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
          </div>
        </div>

        <div>
          <div className="text-2xl lg:text-3xl font-black font-mono tracking-tight">
            {totalFamilyWealth.toFixed(2)}{' '}
            <span className="text-sm font-sans font-bold text-red-200">AVAX</span>
          </div>

          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold font-mono">
              <span className="material-symbols-outlined text-[13px]">trending_up</span>
              +8.0% APY
            </span>
            <span className="text-[11px] text-red-100/90 font-medium truncate">
              {t('dash.kpi.totalWealthSub')}
            </span>
          </div>
        </div>
      </div>

      {/* 2. ĐỆM THANH KHOẢN TỨC THÌ (FAMILY L1 - 0 GAS) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-3 group">
        <div className="flex items-center justify-between">
          <span className="text-xs text-red-600 uppercase font-bold tracking-wider font-mono">
            {t('dash.kpi.bufferL1')}
          </span>
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <span className="material-symbols-outlined text-[20px]">bolt</span>
          </div>
        </div>

        <div>
          <div className="text-2xl lg:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {bufferTotal.toFixed(2)}{' '}
            <span className="text-sm font-sans font-bold text-red-600">AVAX (L1)</span>
          </div>

          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold font-mono border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              0 Gas • &lt;1s
            </span>
            <span className="text-[11px] text-slate-500 truncate">
              Rút tức thì đi chợ / an sinh
            </span>
          </div>
        </div>
      </div>

      {/* 3. VỐN GỬI SINH LỜI DEFI (FUJI C-CHAIN 8% APY) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-3 group">
        <div className="flex items-center justify-between">
          <span className="text-xs text-emerald-700 uppercase font-bold tracking-wider font-mono">
            {t('dash.kpi.yieldCChain')}
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <span className="material-symbols-outlined text-[20px]">savings</span>
          </div>
        </div>

        <div>
          <div className="text-2xl lg:text-3xl font-extrabold text-emerald-800 font-mono tracking-tight">
            {yieldTotal.toFixed(2)}{' '}
            <span className="text-sm font-sans font-bold text-emerald-600">AVAX (C-Chain)</span>
          </div>

          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold font-mono">
              +{accruedTotal.toFixed(3)} AVAX lãi
            </span>
            <span className="text-[11px] text-slate-500 truncate">
              Tự động tích lũy Lending
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
