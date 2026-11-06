"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActiveTab } from "../../types";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";

interface HomeViewProps {
  onNavigate?: (tab: ActiveTab) => void;
  onOpenDeposit?: () => void;
}

/**
 * Trang Chủ Kinetix (Landing Page View)
 * Được thiết kế tối ưu Responsive Mobile (Phone 360px-420px, Tablet, Desktop)
 * Tích hợp bộ mô phỏng tỷ lệ Đệm thanh khoản (Interactive Buffer Simulator),
 * bộ chọn Tab 4 quy tắc thông minh, và sơ đồ dòng chảy liên chuỗi Teleporter ICM.
 */
export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onOpenDeposit,
}) => {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { t, language } = useLanguage();

  // State cho bộ chọn Tab Quy Tắc trên mobile (0: SHIELD, 1: MILESTONE, 2: ROSCA, 3: SHARED_GOAL)
  const [activeRuleTab, setActiveRuleTab] = useState<number>(0);

  // State cho bộ chọn Tab Workspace trên mobile ('all' | '0' | '1' | '2' | '3')
  const [activeWsFilter, setActiveWsFilter] = useState<string>("all");

  // State cho bộ mô phỏng Đệm thanh khoản tương tác (Buffer Ratio Simulator)
  const [bufferRatio, setBufferRatio] = useState<number>(10); // Mặc định 10%
  const [simulatedDeposit] = useState<number>(1000); // 1,000 AVAX giả lập

  // Tính toán phân bổ vốn giả lập theo thời gian thực
  const l1Amount = useMemo(() => {
    return (simulatedDeposit * bufferRatio) / 100;
  }, [simulatedDeposit, bufferRatio]);

  const cchainAmount = useMemo(() => {
    return simulatedDeposit - l1Amount;
  }, [simulatedDeposit, l1Amount]);

  const estYearlyYield = useMemo(() => {
    // 8% APY trên phần vốn gửi sang C-Chain
    return ((cchainAmount * 8) / 100).toFixed(1);
  }, [cchainAmount]);

  const handleStartCTA = () => {
    if (isAuthenticated) {
      if (user?.role === "ELDERLY") router.push("/dashboard?tab=kinetix-shield");
      else if (user?.role === "CHILD") router.push("/dashboard?tab=kinetix-kids");
      else router.push("/dashboard?tab=quan-tri-cha-me");
    } else {
      router.push("/login");
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const headerOffset = 72;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="flex flex-col w-full text-on-surface overflow-x-hidden">
      
      {/* ========================================================================= */}
      {/* SECTION 1: HERO & CORE VALUE PROPOSITION */}
      {/* ========================================================================= */}
      <section id="about" className="relative w-full pt-6 sm:pt-12 pb-14 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        
        {/* Hiệu ứng ánh sáng nền mờ (Ambient Glows) - Khống chế overflow */}
        <div className="absolute -top-24 right-1/4 w-72 sm:w-[500px] h-72 sm:h-[500px] bg-secondary/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/2 -left-20 w-60 sm:w-96 h-60 sm:h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Feature Badges Strip (Dải chip cuộn ngang mượt trên mobile) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 sm:pb-0 sm:flex-wrap sm:justify-center sm:gap-3 mb-6 sm:mb-8">
          <div className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-lowest border border-outline-variant/30 shadow-xs text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span>{t("hero.badge.subnet")}</span>
          </div>

          <div className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-lowest border border-outline-variant/30 shadow-xs text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px] text-amber-500">bolt</span>
            <span>{t("hero.badge.gas")}</span>
          </div>

          <div className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-lowest border border-outline-variant/30 shadow-xs text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px] text-secondary">verified_user</span>
            <span>{t("hero.badge.multisig")}</span>
          </div>

          <div className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-lowest border border-outline-variant/30 shadow-xs text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px] text-emerald-600">sync_alt</span>
            <span>{t("hero.badge.teleporter")}</span>
          </div>
        </div>

        {/* Hero Title & Subtitle */}
        <div className="text-center max-w-4xl mx-auto mb-8 sm:mb-12">
          <h1 className="text-2xl min-[380px]:text-3xl sm:text-5xl lg:text-[54px] lg:leading-[64px] font-bold tracking-tight text-on-surface mb-4 sm:mb-6">
            {t("hero.title")}{" "}
            <span className="bg-gradient-to-r from-secondary via-secondary-container to-amber-500 bg-clip-text text-transparent">
              Avalanche
            </span>
          </h1>

          <p className="text-xs min-[380px]:text-sm sm:text-base lg:text-lg text-on-surface-variant max-w-2xl sm:max-w-3xl mx-auto leading-relaxed px-1">
            {t("hero.subtitle")}
          </p>

          {/* Primary Action Buttons (Xếp dọc trên điện thoại với chiều cao chạm tối ưu) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 mt-6 sm:mt-8 max-w-sm sm:max-w-none mx-auto">
            {isAuthenticated ? (
              <button
                onClick={handleStartCTA}
                className="w-full sm:w-auto px-7 py-3.5 sm:py-4 rounded-2xl bg-secondary-container hover:bg-secondary text-white font-bold text-sm sm:text-base shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                type="button"
              >
                <span>{t("nav.dashboard")}</span>
                <span className="material-symbols-outlined text-[20px]">space_dashboard</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="w-full sm:w-auto px-7 py-3.5 sm:py-4 rounded-2xl bg-secondary-container hover:bg-secondary text-white font-bold text-sm sm:text-base shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{t("hero.cta.start")}</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </Link>
            )}

            <button
              onClick={() => scrollToSection("rules")}
              className="w-full sm:w-auto px-7 py-3.5 sm:py-4 rounded-2xl bg-surface-container-lowest hover:bg-surface-container text-on-surface font-bold text-sm sm:text-base shadow-xs border border-outline-variant/30 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px] text-secondary">explore</span>
              <span>{t("hero.cta.explore")}</span>
            </button>
          </div>
        </div>

        {/* 4 Core Pillars Strip (Lưới 2 cột trên điện thoại, tối ưu typography và padding) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 max-w-5xl mx-auto">
          
          <div className="p-3.5 sm:p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col gap-1 text-left">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] sm:text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                {t("hero.stat.gas")}
              </span>
              <span className="material-symbols-outlined text-[16px] text-secondary">
                local_gas_station
              </span>
            </div>
            <span className="text-base min-[380px]:text-lg sm:text-2xl font-bold text-secondary font-mono leading-tight">
              {t("hero.stat.gasVal")}
            </span>
            <span className="text-[10px] sm:text-[11px] text-on-surface-variant/80 mt-0.5 truncate">
              Custom Fee (0 Gwei)
            </span>
          </div>

          <div className="p-3.5 sm:p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col gap-1 text-left">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] sm:text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                {t("hero.stat.speed")}
              </span>
              <span className="material-symbols-outlined text-[16px] text-emerald-600">
                speed
              </span>
            </div>
            <span className="text-base min-[380px]:text-lg sm:text-2xl font-bold text-emerald-600 font-mono leading-tight">
              {t("hero.stat.speedVal")}
            </span>
            <span className="text-[10px] sm:text-[11px] text-on-surface-variant/80 mt-0.5 truncate">
              Rút đệm L1 tức thì
            </span>
          </div>

          <div className="p-3.5 sm:p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col gap-1 text-left">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] sm:text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                {t("hero.stat.multisig")}
              </span>
              <span className="material-symbols-outlined text-[16px] text-blue-600">
                shield
              </span>
            </div>
            <span className="text-base min-[380px]:text-lg sm:text-2xl font-bold text-blue-600 font-mono leading-tight">
              {t("hero.stat.multisigVal")}
            </span>
            <span className="text-[10px] sm:text-[11px] text-on-surface-variant/80 mt-0.5 truncate">
              Ngưỡng riêng từng Hũ
            </span>
          </div>

          <div className="p-3.5 sm:p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col gap-1 text-left">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] sm:text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                {t("hero.stat.yield")}
              </span>
              <span className="material-symbols-outlined text-[16px] text-amber-600">
                trending_up
              </span>
            </div>
            <span className="text-base min-[380px]:text-lg sm:text-2xl font-bold text-amber-600 font-mono leading-tight">
              {t("hero.stat.yieldVal")}
            </span>
            <span className="text-[10px] sm:text-[11px] text-on-surface-variant/80 mt-0.5 truncate">
              Fuji C-Chain DeFi thực
            </span>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: ĐA KHÔNG GIAN CHIA SẺ (MULTI-SPACE WORKSPACES) */}
      {/* ========================================================================= */}
      <section id="workspaces" className="w-full py-14 sm:py-20 px-4 sm:px-6 lg:px-8 bg-surface-container-low border-y border-outline-variant/20">
        <div className="max-w-7xl mx-auto flex flex-col gap-8 sm:gap-12">
          
          <div className="text-center max-w-3xl mx-auto flex flex-col gap-2.5 sm:gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-secondary font-mono">
              {t("ws.badge")}
            </span>
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-on-surface">
              {t("ws.title")}
            </h2>
            <p className="text-xs sm:text-sm lg:text-base text-on-surface-variant leading-relaxed max-w-2xl mx-auto">
              {t("ws.desc")}
            </p>
          </div>

          {/* Bộ lọc chọn nhanh trên điện thoại di động */}
          <div className="flex md:hidden items-center justify-start gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setActiveWsFilter("all")}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeWsFilter === "all"
                  ? "bg-secondary text-white shadow-xs"
                  : "bg-surface-container-lowest text-on-surface-variant border border-outline-variant/30"
              }`}
              type="button"
            >
              {language === "vi" ? "Tất Cả (4)" : "All Spaces"}
            </button>
            <button
              onClick={() => setActiveWsFilter("0")}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeWsFilter === "0"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-surface-container-lowest text-on-surface-variant border border-outline-variant/30"
              }`}
              type="button"
            >
              {language === "vi" ? "Đại Gia Đình" : "Family"}
            </button>
            <button
              onClick={() => setActiveWsFilter("1")}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeWsFilter === "1"
                  ? "bg-secondary text-white shadow-xs"
                  : "bg-surface-container-lowest text-on-surface-variant border border-outline-variant/30"
              }`}
              type="button"
            >
              {language === "vi" ? "Anh Em Ruột" : "Siblings"}
            </button>
            <button
              onClick={() => setActiveWsFilter("2")}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeWsFilter === "2"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-surface-container-lowest text-on-surface-variant border border-outline-variant/30"
              }`}
              type="button"
            >
              {language === "vi" ? "Hội Bạn Thân" : "Friends"}
            </button>
            <button
              onClick={() => setActiveWsFilter("3")}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeWsFilter === "3"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-surface-container-lowest text-on-surface-variant border border-outline-variant/30"
              }`}
              type="button"
            >
              {language === "vi" ? "CLB / Nhóm" : "Club"}
            </button>
          </div>

          {/* 4 Workspace Types Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            {/* WS 1: Đại Gia Đình */}
            {(activeWsFilter === "all" || activeWsFilter === "0") && (
              <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col justify-between text-left hover:border-primary/50 transition-all group">
                <div className="flex flex-col gap-3.5">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shadow-xs group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[24px]">family_restroom</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-on-surface mb-1.5">
                      {t("ws.family.title")}
                    </h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {t("ws.family.desc")}
                    </p>
                  </div>
                </div>
                <div className="mt-5 pt-3.5 border-t border-surface-container-low text-[11px] font-semibold text-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">verified</span>
                  <span>Hũ đề xuất: SHIELD + MILESTONE</span>
                </div>
              </div>
            )}

            {/* WS 2: Anh Em Ruột */}
            {(activeWsFilter === "all" || activeWsFilter === "1") && (
              <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col justify-between text-left hover:border-secondary/50 transition-all group">
                <div className="flex flex-col gap-3.5">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center font-bold text-lg shadow-xs group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[24px]">diversity_1</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-on-surface mb-1.5">
                      {t("ws.siblings.title")}
                    </h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {t("ws.siblings.desc")}
                    </p>
                  </div>
                </div>
                <div className="mt-5 pt-3.5 border-t border-surface-container-low text-[11px] font-semibold text-secondary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">lock</span>
                  <span>Đa chữ ký M/N phân quyền</span>
                </div>
              </div>
            )}

            {/* WS 3: Hội Bạn Thân */}
            {(activeWsFilter === "all" || activeWsFilter === "2") && (
              <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col justify-between text-left hover:border-indigo-500/50 transition-all group">
                <div className="flex flex-col gap-3.5">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-lg shadow-xs group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[24px]">group</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-on-surface mb-1.5">
                      {t("ws.friends.title")}
                    </h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {t("ws.friends.desc")}
                    </p>
                  </div>
                </div>
                <div className="mt-5 pt-3.5 border-t border-surface-container-low text-[11px] font-semibold text-indigo-600 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">flight_takeoff</span>
                  <span>Hũ đề xuất: SHARED_GOAL</span>
                </div>
              </div>
            )}

            {/* WS 4: CLB Sinh Viên / Cộng Đồng */}
            {(activeWsFilter === "all" || activeWsFilter === "3") && (
              <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col justify-between text-left hover:border-emerald-500/50 transition-all group">
                <div className="flex flex-col gap-3.5">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-lg shadow-xs group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[24px]">hub</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-on-surface mb-1.5">
                      {t("ws.community.title")}
                    </h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {t("ws.community.desc")}
                    </p>
                  </div>
                </div>
                <div className="mt-5 pt-3.5 border-t border-surface-container-low text-[11px] font-semibold text-emerald-600 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                  <span>Minh bạch 100% On-Chain</span>
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: 4 BỘ QUY TẮC TÙY BIẾN (COMPOSABLE RULE TEMPLATES) */}
      {/* ========================================================================= */}
      <section id="rules" className="w-full py-14 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col gap-8 sm:gap-12">
          
          <div className="text-center max-w-3xl mx-auto flex flex-col gap-2.5 sm:gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-secondary font-mono">
              {t("rules.badge")}
            </span>
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-on-surface">
              {t("rules.title")}
            </h2>
            <p className="text-xs sm:text-sm lg:text-base text-on-surface-variant leading-relaxed max-w-2xl mx-auto">
              {t("rules.desc")}
            </p>
          </div>

          {/* Rule Segmented Bar (Trên Mobile: Cho phép chọn chuyển giữa 4 quy tắc dễ dàng) */}
          <div className="flex md:hidden items-center justify-between p-1 bg-surface-container-low rounded-2xl border border-outline-variant/30">
            <button
              onClick={() => setActiveRuleTab(0)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                activeRuleTab === 0
                  ? "bg-white text-error shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">shield</span>
              <span className="text-[10px]">SHIELD</span>
            </button>

            <button
              onClick={() => setActiveRuleTab(1)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                activeRuleTab === 1
                  ? "bg-white text-amber-600 shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">military_tech</span>
              <span className="text-[10px]">TASK</span>
            </button>

            <button
              onClick={() => setActiveRuleTab(2)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                activeRuleTab === 2
                  ? "bg-white text-emerald-600 shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">cached</span>
              <span className="text-[10px]">ROSCA</span>
            </button>

            <button
              onClick={() => setActiveRuleTab(3)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                activeRuleTab === 3
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">flag</span>
              <span className="text-[10px]">GOAL</span>
            </button>
          </div>

          {/* 4 Rule Cards (Hiển thị lưới trên tablet/desktop, hoặc card chọn trên điện thoại) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            {/* Rule 0: SHIELD */}
            <div
              className={`p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between text-left hover:border-error/50 transition-all ${
                activeRuleTab !== 0 ? "hidden md:flex" : "flex"
              }`}
            >
              <div className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-error/10 text-error flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">shield</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-error/10 text-error uppercase font-mono">
                    {t("rules.shield.badge")}
                  </span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-on-surface mb-1.5">
                    {t("rules.shield.title")}
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {t("rules.shield.desc")}
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-3.5 border-t border-surface-container-low text-xs space-y-1.5 font-mono">
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
            <div
              className={`p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between text-left hover:border-amber-500/50 transition-all ${
                activeRuleTab !== 1 ? "hidden md:flex" : "flex"
              }`}
            >
              <div className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">military_tech</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 uppercase font-mono">
                    {t("rules.milestone.badge")}
                  </span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-on-surface mb-1.5">
                    {t("rules.milestone.title")}
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {t("rules.milestone.desc")}
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-3.5 border-t border-surface-container-low text-xs space-y-1.5 font-mono">
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
            <div
              className={`p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between text-left hover:border-emerald-500/50 transition-all ${
                activeRuleTab !== 2 ? "hidden md:flex" : "flex"
              }`}
            >
              <div className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">cached</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 uppercase font-mono">
                    {t("rules.rosca.badge")}
                  </span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-on-surface mb-1.5">
                    {t("rules.rosca.title")}
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {t("rules.rosca.desc")}
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-3.5 border-t border-surface-container-low text-xs space-y-1.5 font-mono">
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
            <div
              className={`p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between text-left hover:border-indigo-500/50 transition-all ${
                activeRuleTab !== 3 ? "hidden md:flex" : "flex"
              }`}
            >
              <div className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">flag</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-700 uppercase font-mono">
                    {t("rules.goal.badge")}
                  </span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-on-surface mb-1.5">
                    {t("rules.goal.title")}
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {t("rules.goal.desc")}
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-3.5 border-t border-surface-container-low text-xs space-y-1.5 font-mono">
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
      {/* SECTION 4: KIẾN TRÚC ĐỆM THANH KHOẢN & BỘ MÔ PHỎNG TƯƠNG TÁC */}
      {/* ========================================================================= */}
      <section id="architecture" className="w-full py-14 sm:py-20 px-4 sm:px-6 lg:px-8 bg-surface-container-low border-y border-outline-variant/20">
        <div className="max-w-7xl mx-auto flex flex-col gap-8 sm:gap-12">
          
          <div className="text-center max-w-3xl mx-auto flex flex-col gap-2.5 sm:gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-secondary font-mono">
              {t("arch.badge")}
            </span>
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-on-surface">
              {t("arch.title")}
            </h2>
            <p className="text-xs sm:text-sm lg:text-base text-on-surface-variant leading-relaxed max-w-2xl mx-auto">
              {t("arch.desc")}
            </p>
          </div>

          {/* INTERACTIVE BUFFER SIMULATOR WIDGET (Mô Phỏng Đệm Tương Tác Cảm Ứng) */}
          <div className="max-w-3xl mx-auto w-full p-5 sm:p-8 rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-md">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">tune</span>
                  <span>{t("arch.calc.title")}</span>
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {t("arch.calc.subtitle")}
                </p>
              </div>

              {/* Preset buttons */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <button
                  onClick={() => setBufferRatio(10)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    bufferRatio === 10
                      ? "bg-secondary text-white"
                      : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                  }`}
                  type="button"
                >
                  10% (Chuẩn)
                </button>
                <button
                  onClick={() => setBufferRatio(20)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    bufferRatio === 20
                      ? "bg-secondary text-white"
                      : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                  }`}
                  type="button"
                >
                  20%
                </button>
                <button
                  onClick={() => setBufferRatio(0)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    bufferRatio === 0
                      ? "bg-secondary text-white"
                      : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                  }`}
                  type="button"
                >
                  0% (100% APY)
                </button>
              </div>
            </div>

            {/* Range Slider */}
            <div className="flex flex-col gap-3 mb-6">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-on-surface-variant">{t("arch.calc.slider")}</span>
                <span className="text-secondary font-mono font-bold text-sm sm:text-base">
                  {bufferRatio}% L1 / {100 - bufferRatio}% C-Chain
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={bufferRatio}
                onChange={(e) => setBufferRatio(Number(e.target.value))}
                className="w-full h-2.5 bg-surface-container rounded-lg appearance-none cursor-pointer accent-secondary transition-all"
              />

              <div className="flex justify-between text-[10px] text-on-surface-variant/70 font-mono">
                <span>0% (Thuần DeFi)</span>
                <span>10% (Khuyến nghị)</span>
                <span>25%</span>
                <span>50% (Đệm tối đa)</span>
              </div>
            </div>

            {/* Split Visualization Bar */}
            <div className="w-full h-4 rounded-full overflow-hidden flex bg-surface-container p-0.5 border border-outline-variant/30 mb-6">
              <div
                style={{ width: `${Math.max(bufferRatio, 3)}%` }}
                className="h-full bg-secondary rounded-l-full transition-all duration-300"
                title={`L1 Buffer: ${bufferRatio}%`}
              />
              <div
                style={{ width: `${100 - Math.max(bufferRatio, 3)}%` }}
                className="h-full bg-emerald-500 rounded-r-full transition-all duration-300"
                title={`C-Chain Staking: ${100 - bufferRatio}%`}
              />
            </div>

            {/* Calculation Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              
              {/* L1 Card */}
              <div className="p-4 rounded-2xl bg-secondary/5 border border-secondary/20 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-secondary mb-1">
                    <span className="material-symbols-outlined text-[16px]">bolt</span>
                    <span>{t("arch.calc.l1Share")}</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-on-surface">
                    {l1Amount} <span className="text-xs font-normal text-on-surface-variant">AVAX ({bufferRatio}%)</span>
                  </div>
                </div>
                <div className="text-[11px] text-on-surface-variant mt-2 pt-2 border-t border-secondary/10 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Giải ngân tức thì 0 gas fee</span>
                </div>
              </div>

              {/* C-Chain Card */}
              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 mb-1">
                    <span className="material-symbols-outlined text-[16px]">trending_up</span>
                    <span>{t("arch.calc.cchainShare")}</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600">
                    {cchainAmount} <span className="text-xs font-normal text-on-surface-variant">AVAX ({100 - bufferRatio}%)</span>
                  </div>
                </div>
                <div className="text-[11px] text-on-surface-variant mt-2 pt-2 border-t border-emerald-500/10 flex items-center justify-between">
                  <span>{t("arch.calc.estYield")}</span>
                  <span className="font-bold font-mono text-emerald-600">+{estYearlyYield} AVAX/năm</span>
                </div>
              </div>

            </div>

          </div>

          {/* 4 Step Process Cards (Lưới trên Desktop, Dòng chảy nối bước trên Mobile) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            {/* Step 1 */}
            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col justify-between text-left">
              <div className="flex flex-col gap-3.5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-base sm:text-lg shadow-xs">
                  1
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface mb-1.5">
                    {t("arch.step1.title")}
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {t("arch.step1.desc")}
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-3.5 border-t border-surface-container-low text-[11px] font-semibold text-secondary flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">account_balance_wallet</span>
                <span>Hợp đồng: FamilyHub.sol</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col justify-between text-left">
              <div className="flex flex-col gap-3.5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs font-mono">
                  0-50%
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface mb-1.5">
                    {t("arch.step2.title")}
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {t("arch.step2.desc")}
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-3.5 border-t border-surface-container-low text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">bolt</span>
                <span>Tốc độ &lt;0.8s • 0 Gwei Gas</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col justify-between text-left">
              <div className="flex flex-col gap-3.5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-base sm:text-lg shadow-xs">
                  <span className="material-symbols-outlined text-[22px]">sync_alt</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface mb-1.5">
                    {t("arch.step3.title")}
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {t("arch.step3.desc")}
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-3.5 border-t border-surface-container-low text-[11px] font-semibold text-blue-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">security</span>
                <span>Giao tiếp Teleporter ICM</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col justify-between text-left">
              <div className="flex flex-col gap-3.5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs font-mono">
                  8% APY
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface mb-1.5">
                    {t("arch.step4.title")}
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {t("arch.step4.desc")}
                  </p>
                </div>
              </div>
              <div className="mt-5 pt-3.5 border-t border-surface-container-low text-[11px] font-semibold text-amber-600 flex items-center gap-1">
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
      <section id="security" className="w-full py-14 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col gap-8 sm:gap-12">
          
          <div className="text-center max-w-3xl mx-auto flex flex-col gap-2.5 sm:gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-secondary font-mono">
              {t("sec.badge")}
            </span>
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-on-surface">
              {t("sec.title")}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col gap-2.5 text-left">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">policy</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-on-surface">
                {t("sec.item1.title")}
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {t("sec.item1.desc")}
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col gap-2.5 text-left">
              <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">vpn_key</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-on-surface">
                {t("sec.item2.title")}
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {t("sec.item2.desc")}
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col gap-2.5 text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">schedule</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-on-surface">
                {t("sec.item3.title")}
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {t("sec.item3.desc")}
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-surface-container-lowest border border-outline-variant/30 shadow-xs flex flex-col gap-2.5 text-left">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">cloud_sync</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-on-surface">
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
      <section className="w-full pb-14 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary via-primary-container to-secondary-container p-6 sm:p-14 text-white text-center shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-60 sm:w-80 h-60 sm:h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl mx-auto flex flex-col gap-3.5 sm:gap-4 items-center">
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              {t("cta.title")}
            </h2>
            <p className="text-xs sm:text-sm lg:text-base opacity-90 leading-relaxed max-w-lg">
              {t("cta.desc")}
            </p>
            <div className="pt-2 sm:pt-4 w-full sm:w-auto">
              {isAuthenticated ? (
                <button
                  onClick={handleStartCTA}
                  className="w-full sm:w-auto px-7 py-3.5 sm:py-4 rounded-2xl bg-white text-primary hover:bg-slate-50 font-bold text-xs sm:text-sm shadow-xl transition-all active:scale-95 inline-flex items-center justify-center gap-2 cursor-pointer"
                  type="button"
                >
                  <span>{t("nav.dashboard")}</span>
                  <span className="material-symbols-outlined text-[18px]">space_dashboard</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-7 py-3.5 sm:py-4 rounded-2xl bg-white text-primary hover:bg-slate-50 font-bold text-xs sm:text-sm shadow-xl transition-all active:scale-95 inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{t("cta.btn")}</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
