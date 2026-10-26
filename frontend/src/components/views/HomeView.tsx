"use client";

import React from "react";
import Link from "next/link";
import { ActiveTab } from "../../types";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";

interface HomeViewProps {
  onNavigate: (tab: ActiveTab) => void;
  onOpenDeposit: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onOpenDeposit,
}) => {
  const { dynamicVaults, currentWorkspace } = useFamily();
  const { isAuthenticated, user } = useAuth();
  const { t } = useLanguage();

  const handleStartCTA = () => {
    if (isAuthenticated) {
      if (user?.role === "ELDERLY") onNavigate("kinetix-shield");
      else if (user?.role === "CHILD") onNavigate("kinetix-kids");
      else onNavigate("quan-tri-cha-me");
    }
  };

  return (
    <div className="flex flex-col w-full text-on-surface">
      
      {/* ========================================================================= */}
      {/* SECTION 1: HERO & CORE VALUE PROPOSITION */}
      {/* ========================================================================= */}
      <section id="about" className="relative w-full pt-12 pb-20 px-gutter max-w-7xl mx-auto overflow-hidden">
        {/* Ambient lighting effects */}
        <div className="absolute -top-32 right-1/4 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/2 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Feature Badges Strip */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-lowest border border-outline-variant/30 shadow-sm text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span>{t("hero.badge.subnet")}</span>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-lowest border border-outline-variant/30 shadow-sm text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px] text-amber-500">bolt</span>
            <span>{t("hero.badge.gas")}</span>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-lowest border border-outline-variant/30 shadow-sm text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px] text-secondary">verified_user</span>
            <span>{t("hero.badge.multisig")}</span>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-lowest border border-outline-variant/30 shadow-sm text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px] text-emerald-600">sync_alt</span>
            <span>{t("hero.badge.teleporter")}</span>
          </div>
        </div>

        {/* Hero Title & Subtitle */}
        <div className="text-center max-w-4xl mx-auto mb-12">
          <h1 className="font-display-lg text-3xl sm:text-5xl lg:text-[54px] lg:leading-[64px] font-bold tracking-tight text-on-surface mb-6">
            {t("hero.title")}{" "}
            <span className="bg-gradient-to-r from-secondary via-secondary-container to-amber-500 bg-clip-text text-transparent">
              Avalanche
            </span>
          </h1>

          <p className="font-body-lg text-base sm:text-lg text-on-surface-variant max-w-3xl mx-auto leading-relaxed">
            {t("hero.subtitle")}
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            {isAuthenticated ? (
              <button
                onClick={handleStartCTA}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-secondary-container hover:bg-secondary text-white font-headline-sm text-base font-bold shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                type="button"
              >
                <span>{t("nav.dashboard")}</span>
                <span className="material-symbols-outlined text-[20px]">space_dashboard</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-secondary-container hover:bg-secondary text-white font-headline-sm text-base font-bold shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{t("hero.cta.start")}</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </Link>
            )}

            <a
              href="#rules"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-surface-container-lowest hover:bg-surface-container text-on-surface font-headline-sm text-base font-bold shadow-sm border border-outline-variant/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px] text-secondary">explore</span>
              <span>{t("hero.cta.explore")}</span>
            </a>
          </div>
        </div>

        {/* 4 Core Pillars Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col gap-1 text-left">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              {t("hero.stat.gas")}
            </span>
            <span className="text-xl sm:text-2xl font-bold text-secondary font-mono">
              {t("hero.stat.gasVal")}
            </span>
            <span className="text-[11px] text-on-surface-variant/80 mt-1">
              Custom Fee Config (0 Gwei)
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col gap-1 text-left">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              {t("hero.stat.speed")}
            </span>
            <span className="text-xl sm:text-2xl font-bold text-emerald-600 font-mono">
              {t("hero.stat.speedVal")}
            </span>
            <span className="text-[11px] text-on-surface-variant/80 mt-1">
              Giải ngân đệm L1 tức thì
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col gap-1 text-left">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              {t("hero.stat.multisig")}
            </span>
            <span className="text-xl sm:text-2xl font-bold text-blue-600 font-mono">
              {t("hero.stat.multisigVal")}
            </span>
            <span className="text-[11px] text-on-surface-variant/80 mt-1">
              Ngưỡng duyệt riêng cho từng Hũ
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col gap-1 text-left">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              {t("hero.stat.yield")}
            </span>
            <span className="text-xl sm:text-2xl font-bold text-amber-600 font-mono">
              {t("hero.stat.yieldVal")}
            </span>
            <span className="text-[11px] text-on-surface-variant/80 mt-1">
              Fuji C-Chain DeFi 8% APY
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: ĐA KHÔNG GIAN CHIA SẺ (MULTI-SPACE WORKSPACES) */}
      {/* ========================================================================= */}
      <section id="workspaces" className="w-full py-20 px-gutter bg-surface-container-low border-y border-outline-variant/20">
        <div className="max-w-7xl mx-auto flex flex-col gap-12">
          
          <div className="text-center max-w-3xl mx-auto flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-secondary font-mono">
              {t("ws.badge")}
            </span>
            <h2 className="font-headline-lg text-2xl sm:text-4xl font-bold tracking-tight text-on-surface">
              {t("ws.title")}
            </h2>
            <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
              {t("ws.desc")}
            </p>
          </div>

          {/* 4 Workspace Types Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* WS 1: Đại Gia Đình */}
            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between text-left hover:border-primary/50 transition-all group">
              <div className="flex flex-col gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[26px]">family_restroom</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface mb-2">
                    {t("ws.family.title")}
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {t("ws.family.desc")}
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-surface-container-low text-[11px] font-semibold text-primary flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">verified</span>
                <span>Hũ đề xuất: SHIELD + MILESTONE</span>
              </div>
            </div>

            {/* WS 2: Anh Em Ruột */}
            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between text-left hover:border-secondary/50 transition-all group">
              <div className="flex flex-col gap-4">
                <div className="w-12 h-12 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[26px]">diversity_1</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface mb-2">
                    {t("ws.siblings.title")}
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {t("ws.siblings.desc")}
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-surface-container-low text-[11px] font-semibold text-secondary flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">lock</span>
                <span>Đa chữ ký M/N phân quyền</span>
              </div>
            </div>

            {/* WS 3: Hội Bạn Thân */}
            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between text-left hover:border-indigo-500/50 transition-all group">
              <div className="flex flex-col gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[26px]">group</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface mb-2">
                    {t("ws.friends.title")}
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {t("ws.friends.desc")}
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-surface-container-low text-[11px] font-semibold text-indigo-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">flight_takeoff</span>
                <span>Hũ đề xuất: SHARED_GOAL</span>
              </div>
            </div>

            {/* WS 4: CLB Sinh Viên / Cộng Đồng */}
            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between text-left hover:border-emerald-500/50 transition-all group">
              <div className="flex flex-col gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[26px]">hub</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface mb-2">
                    {t("ws.community.title")}
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {t("ws.community.desc")}
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-surface-container-low text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                <span>Minh bạch 100% On-Chain</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: 4 BỘ QUY TẮC TÙY BIẾN (COMPOSABLE RULE TEMPLATES) */}
      {/* ========================================================================= */}
      <section id="rules" className="w-full py-20 px-gutter max-w-7xl mx-auto">
        <div className="flex flex-col gap-12">
          
          <div className="text-center max-w-3xl mx-auto flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-secondary font-mono">
              {t("rules.badge")}
            </span>
            <h2 className="font-headline-lg text-2xl sm:text-4xl font-bold tracking-tight text-on-surface">
              {t("rules.title")}
            </h2>
            <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
              {t("rules.desc")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Rule 0: SHIELD */}
            <div className="p-7 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-md flex flex-col justify-between text-left hover:border-error/50 transition-all group">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-error/10 text-error flex items-center justify-center">
                    <span className="material-symbols-outlined text-[26px]">shield</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-error/10 text-error uppercase">
                    {t("rules.shield.badge")}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface mb-2">
                    {t("rules.shield.title")}
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {t("rules.shield.desc")}
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-surface-container-low text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Rút nhanh:</span>
                  <span className="font-bold text-on-surface">≤ 50 AVAX (0 gas)</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Rút lớn:</span>
                  <span className="font-bold text-error">Cần M/N Guardians</span>
                </div>
              </div>
            </div>

            {/* Rule 1: MILESTONE */}
            <div className="p-7 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-md flex flex-col justify-between text-left hover:border-amber-500/50 transition-all group">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[26px]">military_tech</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 uppercase">
                    {t("rules.milestone.badge")}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface mb-2">
                    {t("rules.milestone.title")}
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {t("rules.milestone.desc")}
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-surface-container-low text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Vốn sinh lãi:</span>
                  <span className="font-bold text-emerald-600">8.0% APY C-Chain</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Mở thưởng:</span>
                  <span className="font-bold text-amber-600">Nghiệm thu ảnh chụp</span>
                </div>
              </div>
            </div>

            {/* Rule 2: ROSCA */}
            <div className="p-7 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-md flex flex-col justify-between text-left hover:border-emerald-500/50 transition-all group">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[26px]">cached</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 uppercase">
                    {t("rules.rosca.badge")}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface mb-2">
                    {t("rules.rosca.title")}
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {t("rules.rosca.desc")}
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-surface-container-low text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Đệm L1:</span>
                  <span className="font-bold text-on-surface">0% (100% Sinh lời)</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Kỳ giải ngân:</span>
                  <span className="font-bold text-emerald-600">Gốc + Chia đều lãi</span>
                </div>
              </div>
            </div>

            {/* Rule 3: SHARED_GOAL */}
            <div className="p-7 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-md flex flex-col justify-between text-left hover:border-indigo-500/50 transition-all group">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[26px]">flag</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-700 uppercase">
                    {t("rules.goal.badge")}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface mb-2">
                    {t("rules.goal.title")}
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {t("rules.goal.desc")}
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-surface-container-low text-xs space-y-1.5 font-mono">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Mục tiêu:</span>
                  <span className="font-bold text-on-surface">Theo Target dự án</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Giải ngân:</span>
                  <span className="font-bold text-indigo-600">Đủ tiền & Đủ chữ ký</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4: KIẾN TRÚC ĐỆM THANH KHOẢN LINH HOẠT & TELEPORTER */}
      {/* ========================================================================= */}
      <section id="architecture" className="w-full py-20 px-gutter bg-surface-container-low border-y border-outline-variant/20">
        <div className="max-w-7xl mx-auto flex flex-col gap-12">
          
          <div className="text-center max-w-3xl mx-auto flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-secondary font-mono">
              {t("arch.badge")}
            </span>
            <h2 className="font-headline-lg text-2xl sm:text-4xl font-bold tracking-tight text-on-surface">
              {t("arch.title")}
            </h2>
            <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
              {t("arch.desc")}
            </p>
          </div>

          {/* 4 Step Process Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Step 1 */}
            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between text-left">
              <div className="flex flex-col gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  1
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface mb-2">
                    {t("arch.step1.title")}
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {t("arch.step1.desc")}
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-surface-container-low text-[11px] font-semibold text-secondary flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">account_balance_wallet</span>
                <span>Hợp đồng: FamilyHub.sol</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between text-left">
              <div className="flex flex-col gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  0-50%
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface mb-2">
                    {t("arch.step2.title")}
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {t("arch.step2.desc")}
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-surface-container-low text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">bolt</span>
                <span>Tốc độ &lt;0.8s • 0 Gwei Gas</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between text-left">
              <div className="flex flex-col gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  <span className="material-symbols-outlined text-[24px]">sync_alt</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface mb-2">
                    {t("arch.step3.title")}
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {t("arch.step3.desc")}
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-surface-container-low text-[11px] font-semibold text-blue-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">security</span>
                <span>Giao tiếp Teleporter ICM/ICTT</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between text-left">
              <div className="flex flex-col gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  8% APY
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface mb-2">
                    {t("arch.step4.title")}
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {t("arch.step4.desc")}
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-surface-container-low text-[11px] font-semibold text-amber-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">trending_up</span>
                <span>FamilyYieldVault.sol</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 5: BẢO MẬT CẤP DOANH NGHIỆP */}
      {/* ========================================================================= */}
      <section id="security" className="w-full py-20 px-gutter max-w-7xl mx-auto">
        <div className="flex flex-col gap-12">
          
          <div className="text-center max-w-3xl mx-auto flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-secondary font-mono">
              {t("sec.badge")}
            </span>
            <h2 className="font-headline-lg text-2xl sm:text-4xl font-bold tracking-tight text-on-surface">
              {t("sec.title")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">policy</span>
              </div>
              <h3 className="text-base font-bold text-on-surface">
                {t("sec.item1.title")}
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {t("sec.item1.desc")}
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">vpn_key</span>
              </div>
              <h3 className="text-base font-bold text-on-surface">
                {t("sec.item2.title")}
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {t("sec.item2.desc")}
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">schedule</span>
              </div>
              <h3 className="text-base font-bold text-on-surface">
                {t("sec.item3.title")}
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {t("sec.item3.desc")}
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">cloud_sync</span>
              </div>
              <h3 className="text-base font-bold text-on-surface">
                {t("sec.item4.title")}
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {t("sec.item4.desc")}
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 6: CALL TO ACTION BANNER */}
      {/* ========================================================================= */}
      <section className="w-full pb-20 px-gutter max-w-7xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-br from-primary via-primary-container to-secondary-container p-8 sm:p-14 text-white text-center shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl mx-auto flex flex-col gap-4 items-center">
            <h2 className="font-display-sm text-2xl sm:text-4xl font-extrabold tracking-tight">
              {t("cta.title")}
            </h2>
            <p className="text-sm sm:text-base opacity-90 leading-relaxed">
              {t("cta.desc")}
            </p>
            <div className="pt-4">
              <Link
                href="/login"
                className="px-8 py-4 rounded-2xl bg-white text-primary hover:bg-slate-50 font-bold text-sm shadow-xl transition-all active:scale-95 inline-flex items-center gap-2 cursor-pointer"
              >
                <span>{t("cta.btn")}</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
