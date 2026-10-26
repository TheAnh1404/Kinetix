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
  const { vaults } = useFamily();
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
              href="#architecture"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-surface-container-lowest hover:bg-surface-container text-on-surface font-headline-sm text-base font-bold shadow-sm border border-outline-variant/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px] text-secondary">explore</span>
              <span>{t("hero.cta.explore")}</span>
            </a>
          </div>
        </div>

        {/* 4 Core Pillars Strip (Clean, Focused, High-Trust) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col gap-1 text-left">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              {t("hero.stat.gas")}
            </span>
            <span className="text-xl sm:text-2xl font-bold text-secondary font-mono">
              {t("hero.stat.gasVal")}
            </span>
            <span className="text-[11px] text-on-surface-variant/80 mt-1">
              Family L1 Zero-Gas Fee Config
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
              Giải ngân tức thì cho người già
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
              Chống lừa đảo lệnh rút &gt;50$
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
              Fuji C-Chain DeFi Compound
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: KIẾN TRÚC ĐỆM THANH KHOẢN 10/90 */}
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
                <span>Smart Contract: FamilyHub</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between text-left">
              <div className="flex flex-col gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  10%
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
                <span>Mã hóa Avalanche Teleporter</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between text-left">
              <div className="flex flex-col gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  90%
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
                <span>~8.2% APY Fuji C-Chain</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: 3 GIẢI PHÁP CHO 3 THẾ HỆ */}
      {/* ========================================================================= */}
      <section id="solutions" className="w-full py-20 px-gutter max-w-7xl mx-auto">
        <div className="flex flex-col gap-12">
          
          <div className="text-center max-w-3xl mx-auto flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-secondary font-mono">
              {t("solutions.badge")}
            </span>
            <h2 className="font-headline-lg text-2xl sm:text-4xl font-bold tracking-tight text-on-surface">
              {t("solutions.title")}
            </h2>
            <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
              {t("solutions.desc")}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Card 1: Ông Bà */}
            <div className="p-8 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-md flex flex-col justify-between text-left hover:border-secondary/50 transition-all group">
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[32px]">elderly</span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 text-xs font-bold uppercase">
                    {t("gen1.badge")}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-on-surface mb-2">
                    {t("gen1.title")}
                  </h3>
                  <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-6">
                    {t("gen1.desc")}
                  </p>

                  <div className="flex flex-col gap-3 text-xs leading-relaxed">
                    <div className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">check_circle</span>
                      <span className="text-on-surface">{t("gen1.feature1")}</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">check_circle</span>
                      <span className="text-on-surface">{t("gen1.feature2")}</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">check_circle</span>
                      <span className="text-on-surface">{t("gen1.feature3")}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-surface-container-low">
                <button
                  onClick={() => onNavigate("kinetix-shield")}
                  className="w-full py-3 rounded-xl bg-surface-container hover:bg-secondary hover:text-white text-on-surface text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  type="button"
                >
                  <span>Khám Phá Kinetix Shield</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* Card 2: Bố Mẹ / Guardians */}
            <div className="p-8 rounded-3xl bg-slate-900 text-white shadow-xl flex flex-col justify-between text-left relative overflow-hidden border border-slate-800">
              <div className="absolute top-0 right-0 w-48 h-48 bg-secondary/20 rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-col gap-6 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 text-secondary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-[32px]">admin_panel_settings</span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-secondary-container text-white text-xs font-bold uppercase">
                    {t("gen2.badge")}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {t("gen2.title")}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
                    {t("gen2.desc")}
                  </p>

                  <div className="flex flex-col gap-3 text-xs leading-relaxed">
                    <div className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">check_circle</span>
                      <span className="text-slate-200">{t("gen2.feature1")}</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">check_circle</span>
                      <span className="text-slate-200">{t("gen2.feature2")}</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">check_circle</span>
                      <span className="text-slate-200">{t("gen2.feature3")}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-800 relative z-10">
                <button
                  onClick={() => onNavigate("quan-tri-cha-me")}
                  className="w-full py-3 rounded-xl bg-secondary-container hover:bg-secondary text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  type="button"
                >
                  <span>Vào Trạm Quản Trị</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* Card 3: Con Trẻ */}
            <div className="p-8 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-md flex flex-col justify-between text-left hover:border-secondary/50 transition-all group">
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[32px]">savings</span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-xs font-bold uppercase">
                    {t("gen3.badge")}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-on-surface mb-2">
                    {t("gen3.title")}
                  </h3>
                  <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-6">
                    {t("gen3.desc")}
                  </p>

                  <div className="flex flex-col gap-3 text-xs leading-relaxed">
                    <div className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">check_circle</span>
                      <span className="text-on-surface">{t("gen3.feature1")}</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">check_circle</span>
                      <span className="text-on-surface">{t("gen3.feature2")}</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">check_circle</span>
                      <span className="text-on-surface">{t("gen3.feature3")}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-surface-container-low">
                <button
                  onClick={() => onNavigate("kinetix-kids")}
                  className="w-full py-3 rounded-xl bg-surface-container hover:bg-emerald-600 hover:text-white text-on-surface text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  type="button"
                >
                  <span>Khám Phá Heo Đất Bé</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4: BẢO MẬT & CÔNG NGHỆ NỀN TẢNG */}
      {/* ========================================================================= */}
      <section id="security" className="w-full py-20 px-gutter bg-surface-container-low border-t border-outline-variant/20">
        <div className="max-w-7xl mx-auto flex flex-col gap-12">
          
          <div className="text-center max-w-3xl mx-auto flex flex-col gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-secondary font-mono">
              {t("sec.badge")}
            </span>
            <h2 className="font-headline-lg text-2xl sm:text-4xl font-bold tracking-tight text-on-surface">
              {t("sec.title")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            
            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col gap-3">
              <span className="material-symbols-outlined text-[28px] text-secondary">lan</span>
              <h3 className="text-base font-bold text-on-surface">
                {t("sec.item1.title")}
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {t("sec.item1.desc")}
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col gap-3">
              <span className="material-symbols-outlined text-[28px] text-blue-600">key</span>
              <h3 className="text-base font-bold text-on-surface">
                {t("sec.item2.title")}
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {t("sec.item2.desc")}
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col gap-3">
              <span className="material-symbols-outlined text-[28px] text-emerald-600">schedule</span>
              <h3 className="text-base font-bold text-on-surface">
                {t("sec.item3.title")}
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {t("sec.item3.desc")}
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col gap-3">
              <span className="material-symbols-outlined text-[28px] text-amber-600">database</span>
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
      {/* SECTION 5: CALL TO ACTION BANNER */}
      {/* ========================================================================= */}
      <section className="w-full py-16 px-gutter max-w-7xl mx-auto">
        <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-r from-primary via-slate-900 to-primary text-white shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-8 text-center sm:text-left relative overflow-hidden">
          <div className="max-w-2xl flex flex-col gap-3 relative z-10">
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
              {t("cta.title")}
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {t("cta.desc")}
            </p>
          </div>

          <div className="relative z-10 shrink-0">
            <Link
              href="/login"
              className="px-8 py-4 rounded-2xl bg-secondary hover:bg-secondary-container text-white font-headline-sm text-sm sm:text-base font-bold shadow-xl transition-all active:scale-95 inline-flex items-center gap-2"
            >
              <span>{t("cta.btn")}</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};
