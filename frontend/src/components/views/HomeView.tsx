"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActiveTab } from "../../types";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";

interface HomeViewProps {
  onNavigate?: (tab: ActiveTab) => void;
  onOpenDeposit?: () => void;
}

/**
 * Trang Chủ Kinetix (Landing Page) Đẳng Cấp Web3 Fintech
 * Thiết kế theo chuẩn UI/UX Pro Max:
 * - Minimalism & Swiss Style kết hợp Bento Box Grid hiện đại
 * - Bộ mô phỏng phân bổ đệm thanh khoản tương tác (Interactive Dual-Chain Buffer Simulator)
 * - 4 Bộ Quy Tắc Hũ Tiền (SHIELD, MILESTONE, ROSCA, SHARED_GOAL) kèm thẻ trực quan sống động
 * - Sơ đồ kiến trúc liên chuỗi Avalanche Teleporter (ICM) tương tác từng bước
 * - Thiết kế tối ưu cho mọi lứa tuổi từ Trẻ nhỏ đến Người cao tuổi
 */
export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, onOpenDeposit }) => {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { t, language } = useLanguage();

  // State cho bộ chọn Tab Quy Tắc (0: SHIELD, 1: MILESTONE, 2: ROSCA, 3: SHARED_GOAL)
  const [activeRuleTab, setActiveRuleTab] = useState<number>(0);

  // State cho bộ mô phỏng Đệm thanh khoản (Interactive Buffer Simulator)
  const [bufferRatio, setBufferRatio] = useState<number>(10); // Mặc định 10%
  const [simulatedDeposit, setSimulatedDeposit] = useState<number>(1000); // 1,000 AVAX mặc định

  // State cho bước kiến trúc Teleporter ICM đang chọn
  const [activeTeleporterStep, setActiveTeleporterStep] = useState<number>(1);

  // Tính toán phân bổ vốn giả lập theo thời gian thực (chuẩn công thức FamilyHub.sol)
  const l1Amount = useMemo(() => {
    return (simulatedDeposit * bufferRatio) / 100;
  }, [simulatedDeposit, bufferRatio]);

  const cchainAmount = useMemo(() => {
    return simulatedDeposit - l1Amount;
  }, [simulatedDeposit, l1Amount]);

  const estYearlyYield = useMemo(() => {
    // 8% APY cố định trên phần vốn gửi sang C-Chain
    return ((cchainAmount * 8) / 100).toFixed(2);
  }, [cchainAmount]);

  const estDailyYield = useMemo(() => {
    return (((cchainAmount * 8) / 100) / 365).toFixed(4);
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
      const headerOffset = 76;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="flex flex-col w-full text-slate-900 overflow-x-hidden bg-[#F8FAFC]">
      
      {/* ========================================================================= */}
      {/* SECTION 1: HERO & CORE VALUE PROPOSITION */}
      {/* ========================================================================= */}
      <section id="about" className="relative w-full pt-8 sm:pt-16 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        
        {/* Ambient Glows mờ phía sau */}
        <div className="absolute -top-20 right-1/4 w-80 sm:w-[540px] h-80 sm:h-[540px] bg-red-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/3 -left-20 w-72 sm:w-[420px] h-72 sm:h-[420px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Live Network Pill Strip */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 sm:pb-0 sm:flex-wrap sm:justify-center sm:gap-3 mb-6 sm:mb-8">
          <div className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-xs text-xs font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span>{t("hero.badge.subnet")}</span>
          </div>

          <div className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-xs text-xs font-semibold text-slate-700">
            <span className="material-symbols-outlined text-[16px] text-amber-500">bolt</span>
            <span>{t("hero.badge.gas")}</span>
          </div>

          <div className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-xs text-xs font-semibold text-slate-700">
            <span className="material-symbols-outlined text-[16px] text-red-600">verified_user</span>
            <span>{t("hero.badge.multisig")}</span>
          </div>

          <div className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-xs text-xs font-semibold text-slate-700">
            <span className="material-symbols-outlined text-[16px] text-emerald-600">sync_alt</span>
            <span>{t("hero.badge.teleporter")}</span>
          </div>
        </div>

        {/* Hero Title & Subtitle */}
        <div className="text-center max-w-4xl mx-auto mb-10 sm:mb-14">
          <h1 className="text-3xl min-[400px]:text-4xl sm:text-6xl lg:text-[62px] lg:leading-[70px] font-black tracking-tight text-slate-900 mb-5 sm:mb-6">
            {t("hero.title")}{" "}
            <span className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 bg-clip-text text-transparent">
              Avalanche
            </span>
          </h1>

          <p className="text-sm min-[400px]:text-base sm:text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed px-2 font-normal">
            {t("hero.subtitle")}
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 mt-8 sm:mt-10 max-w-md sm:max-w-none mx-auto">
            {isAuthenticated ? (
              <button
                onClick={handleStartCTA}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-red-600/25 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                type="button"
              >
                <span>{t("nav.dashboard")}</span>
                <span className="material-symbols-outlined text-[20px]">space_dashboard</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-red-600/25 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{t("hero.cta.start")}</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </Link>
            )}

            <button
              onClick={() => scrollToSection("simulator")}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm sm:text-base shadow-xs border border-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px] text-red-600">tune</span>
              <span>Trải Nghiệm Bộ Mô Phỏng Hũ Tiền</span>
            </button>
          </div>
        </div>

        {/* 4 Core Pillars Bento Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-5xl mx-auto">
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col gap-1 text-left hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t("hero.stat.gas")}
              </span>
              <span className="material-symbols-outlined text-[18px] text-red-600">
                local_gas_station
              </span>
            </div>
            <span className="text-lg sm:text-2xl font-black text-slate-900 font-mono">
              {t("hero.stat.gasVal")}
            </span>
            <span className="text-[11px] text-slate-500 font-medium truncate">
              ⚡ Phí mạng 0 Gwei (Family L1)
            </span>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col gap-1 text-left hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t("hero.stat.speed")}
              </span>
              <span className="material-symbols-outlined text-[18px] text-emerald-600">
                bolt
              </span>
            </div>
            <span className="text-lg sm:text-2xl font-black text-emerald-600 font-mono">
              {t("hero.stat.speedVal")}
            </span>
            <span className="text-[11px] text-slate-500 font-medium truncate">
              Chạm là nhận từ đệm L1
            </span>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col gap-1 text-left hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t("hero.stat.multisig")}
              </span>
              <span className="material-symbols-outlined text-[18px] text-blue-600">
                group_add
              </span>
            </div>
            <span className="text-lg sm:text-2xl font-black text-slate-900 font-mono">
              {t("hero.stat.multisigVal")}
            </span>
            <span className="text-[11px] text-slate-500 font-medium truncate">
              Phân tầng độc lập theo từng hũ
            </span>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col gap-1 text-left hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t("hero.stat.yield")}
              </span>
              <span className="material-symbols-outlined text-[18px] text-amber-600">
                trending_up
              </span>
            </div>
            <span className="text-lg sm:text-2xl font-black text-amber-600 font-mono">
              {t("hero.stat.yieldVal")}
            </span>
            <span className="text-[11px] text-slate-500 font-medium truncate">
              Fuji C-Chain Yield Engine
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: BỘ MÔ PHỎNG ĐỆM THANH KHOẢN TƯƠNG TÁC (INTERACTIVE SIMULATOR) */}
      {/* ========================================================================= */}
      <section id="simulator" className="w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white border-y border-slate-200/80">
        <div className="max-w-6xl mx-auto flex flex-col gap-8 sm:gap-12">
          
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold font-mono uppercase mb-3">
              <span className="material-symbols-outlined text-[16px]">calculate</span>
              Interactive Liquidity Engine
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {t("arch.calc.title")}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed">
              {t("arch.calc.subtitle")}
            </p>
          </div>

          {/* Hộp điều khiển mô phỏng Bento Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200 shadow-sm flex flex-col gap-8">
            
            {/* 1. Chọn số tiền nạp giả lập (Quick Amount Chips) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-200/80">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  {t("arch.calc.deposit")}
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono" suppressHydrationWarning>
                    {simulatedDeposit.toLocaleString("en-US")}
                  </span>
                  <span className="text-base font-bold text-red-600 font-mono">AVAX</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {[100, 500, 1000, 2500, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setSimulatedDeposit(amt)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                      simulatedDeposit === amt
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                    suppressHydrationWarning
                  >
                    {amt.toLocaleString("en-US")} AVAX
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Thanh kéo tỷ lệ đệm thanh khoản L1 (Buffer Slider) */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                <span className="text-slate-800 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-red-600">tune</span>
                  {t("arch.calc.slider")} (bufferRatioBps):
                </span>
                <span className="px-3 py-1 rounded-xl bg-red-100 text-red-900 font-mono text-xs font-extrabold">
                  {bufferRatio}% L1 ({bufferRatio * 100} BPS) / {100 - bufferRatio}% C-Chain
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={bufferRatio}
                onChange={(e) => setBufferRatio(Number(e.target.value))}
                className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-600"
              />

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>0% (100% C-Chain sinh lời)</span>
                <span className="font-bold text-red-600">Khuyến nghị: 10% (Rút nhanh 0 gas)</span>
                <span>50% (Đệm tối đa)</span>
              </div>
            </div>

            {/* 3. Visual Split Deck: Hai bình thông nhau L1 vs C-Chain */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Bình L1 Instant Buffer */}
              <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">bolt</span>
                      Family L1 Instant Cushion
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-mono font-bold">
                      {bufferRatio}%
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono my-2">
                    {l1Amount.toFixed(1)} <span className="text-sm font-bold font-sans">AVAX</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Sẵn sàng giải ngân tức thì <strong>&lt;0.8 giây</strong>, <strong>0 gas fee</strong> cho các chi tiêu an sinh thường nhật của Ông Bà & Con Nhỏ.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Phí rút tiền:</span>
                  <span className="font-mono font-bold text-emerald-600">0.00đ Miễn phí</span>
                </div>
              </div>

              {/* Bình C-Chain Yield Engine */}
              <div className="p-5 rounded-2xl bg-white border border-blue-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-blue-600">trending_up</span>
                      Fuji C-Chain Yield Engine
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-mono font-bold">
                      {100 - bufferRatio}%
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-blue-700 font-mono my-2">
                    {cchainAmount.toFixed(1)} <span className="text-sm font-bold font-sans">AVAX</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Tự động chuyển tiếp qua Avalanche Teleporter để stake vào Vault nhận lợi nhuận thực tế <strong>8.0% APY</strong>.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Lợi nhuận ước tính:</span>
                  <span className="font-mono font-bold text-blue-600">
                    +{estYearlyYield} AVAX/năm (~{estDailyYield} AVAX/ngày)
                  </span>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: 4 BỘ QUY TẮC TÙY BIẾN (COMPOSABLE RULES SHOWCASE) */}
      {/* ========================================================================= */}
      <section id="rules" className="w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col gap-10 sm:gap-14">
          
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold font-mono uppercase mb-3">
              <span className="material-symbols-outlined text-[16px]">widgets</span>
              4 Composable Rule Templates
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {t("rules.title")}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed">
              {t("rules.desc")}
            </p>
          </div>

          {/* Tab Selector Cho 4 Bộ Quy Tắc */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 max-w-4xl mx-auto w-full">
            {[
              { id: 0, key: "SHIELD", label: "SHIELD", desc: "Bảo Vệ & Trợ Cấp", icon: "shield" },
              { id: 1, key: "MILESTONE", label: "MILESTONE", desc: "Việc Nhà & Thưởng", icon: "savings" },
              { id: 2, key: "ROSCA", label: "ROSCA", desc: "Góp Vốn Họ Hụi", icon: "groups" },
              { id: 3, key: "SHARED_GOAL", label: "SHARED_GOAL", desc: "Mục Tiêu Nhóm", icon: "flag" },
            ].map((rule) => {
              const active = activeRuleTab === rule.id;
              return (
                <button
                  key={rule.id}
                  type="button"
                  onClick={() => setActiveRuleTab(rule.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                    active
                      ? "bg-white border-red-500 shadow-md ring-2 ring-red-500/10"
                      : "bg-slate-50 border-slate-200 hover:bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-[18px] ${active ? "text-red-600 font-bold" : "text-slate-400"}`}>
                      {rule.icon}
                    </span>
                    <span className="font-mono text-xs font-extrabold">{rule.label}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 truncate">{rule.desc}</span>
                </button>
              );
            })}
          </div>

          {/* Visual Interactive Preview Cho Quy Tắc Đang Chọn */}
          <div className="max-w-4xl mx-auto w-full p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm">
            
            {/* 1. SHIELD PREVIEW */}
            {activeRuleTab === 0 && (
              <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 uppercase font-mono">
                      Quy Tắc 0 • SHIELD
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                      {t("rules.shield.title")}
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold font-mono self-start sm:self-auto">
                    Dành cho Ông Bà & Người Cao Tuổi
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {t("rules.shield.desc")}
                </p>

                {/* Mockup Thao Tác Của Ông Bà */}
                <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-sm">
                      👵
                    </div>
                    <div>
                      <span className="text-xs font-bold text-emerald-900">Bà Nội (Thụ hưởng)</span>
                      <p className="text-xs text-slate-500">Đệm L1 khả dụng: <strong>15.00 AVAX</strong> · Rút nhanh &le; 1.0 AVAX</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => alert("Mô phỏng: Ông Bà bấm 1 chạm → Hợp đồng giải ngân tức thì 0.5 AVAX từ đệm L1 về ví trong 0.8 giây, 0 phí gas!")}
                      className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95"
                    >
                      ⚡ Rút Nhanh 0.5 AVAX (0 Gas)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. MILESTONE PREVIEW */}
            {activeRuleTab === 1 && (
              <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-purple-700 uppercase font-mono">
                      Quy Tắc 1 • MILESTONE
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                      {t("rules.milestone.title")}
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-800 text-xs font-bold font-mono self-start sm:self-auto">
                    Dành cho Con Trẻ (Chore-to-Earn)
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {t("rules.milestone.desc")}
                </p>

                {/* Mockup Việc Nhà & Thưởng Heo Đất */}
                <div className="p-5 rounded-2xl bg-purple-50/60 border border-purple-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold text-xl shadow-sm">
                      🧒
                    </div>
                    <div>
                      <span className="text-xs font-bold text-purple-900">Bé Na · Nhiệm vụ: Rửa bát & dọn phòng</span>
                      <p className="text-xs text-slate-500">Phần thưởng giữ chỗ trong Hũ: <strong>+0.20 AVAX</strong></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => alert("Mô phỏng: Bé Na tải ảnh chứng cứ lên → Bố Mẹ bấm Duyệt → Phần thưởng tự động chuyển từ Hũ sang Heo đất của bé!")}
                      className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95"
                    >
                      ✓ Duyệt Việc & Nhận Thưởng
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. ROSCA PREVIEW */}
            {activeRuleTab === 2 && (
              <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-amber-700 uppercase font-mono">
                      Quy Tắc 2 • ROSCA
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                      {t("rules.rosca.title")}
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold font-mono self-start sm:self-auto">
                    Hội Anh Em & Bạn Thân (Họ Hụi Minh Bạch)
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {t("rules.rosca.desc")}
                </p>

                {/* Mockup Chu Kỳ Góp Vốn */}
                <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold text-xl shadow-sm">
                      🔄
                    </div>
                    <div>
                      <span className="text-xs font-bold text-amber-950">Kỳ 2/4 · Mỗi người góp: 2.0 AVAX</span>
                      <p className="text-xs text-slate-500">Người nhận kỳ này: <strong>Ví Bác Ba (0x7099...79C8)</strong></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => alert("Mô phỏng: 4 thành viên nạp đủ 8 AVAX → Tiền sinh lời C-Chain → Đến hạn hợp đồng tự động giải ngân gốc + chia lãi đều cho cả nhóm!")}
                      className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95"
                    >
                      💰 Giải Ngân Kỳ 2 (8.0 AVAX)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4. SHARED_GOAL PREVIEW */}
            {activeRuleTab === 3 && (
              <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-blue-700 uppercase font-mono">
                      Quy Tắc 3 • SHARED_GOAL
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                      {t("rules.goal.title")}
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-bold font-mono self-start sm:self-auto">
                    Quỹ Du Lịch & Mua Sắm Gia Đình
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {t("rules.goal.desc")}
                </p>

                {/* Mockup Tiến Trình Mục Tiêu */}
                <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200/80 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-blue-900">Mục tiêu: Chuyến du lịch Đà Lạt cả nhà (50 AVAX)</span>
                    <span className="font-mono text-blue-700">85% Hoàn Thành (42.5 / 50 AVAX)</span>
                  </div>
                  <div className="w-full h-3 bg-blue-200 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full w-[85%] rounded-full" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Sinh lời C-Chain liên tục đến ngày mở quỹ</span>
                    <span>Cần 2/3 Guardians ký duyệt giải ngân</span>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4: ĐA KHÔNG GIAN QUẢN TRỊ (MULTI-SPACE WORKSPACES) */}
      {/* ========================================================================= */}
      <section id="workspaces" className="w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto flex flex-col gap-10 sm:gap-14">
          
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold font-mono uppercase mb-3">
              <span className="material-symbols-outlined text-[16px]">domain</span>
              {t("ws.badge")}
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {t("ws.title")}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed">
              {t("ws.desc")}
            </p>
          </div>

          {/* 4 Card Bento Grid cho các Không Gian */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold mb-4">
                  <span className="material-symbols-outlined text-[26px]">family_restroom</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{t("ws.family.title")}</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {t("ws.family.desc")}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-200/80 text-[11px] font-mono text-slate-500 font-bold">
                Quy tắc khuyên dùng: SHIELD & MILESTONE
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-4">
                  <span className="material-symbols-outlined text-[26px]">diversity_1</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{t("ws.siblings.title")}</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {t("ws.siblings.desc")}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-200/80 text-[11px] font-mono text-slate-500 font-bold">
                Quy tắc khuyên dùng: SHIELD & SHARED_GOAL
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold mb-4">
                  <span className="material-symbols-outlined text-[26px]">group</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{t("ws.friends.title")}</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {t("ws.friends.desc")}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-200/80 text-[11px] font-mono text-slate-500 font-bold">
                Quy tắc khuyên dùng: ROSCA & SHARED_GOAL
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-4">
                  <span className="material-symbols-outlined text-[26px]">hub</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{t("ws.community.title")}</h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {t("ws.community.desc")}
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-200/80 text-[11px] font-mono text-slate-500 font-bold">
                Quy tắc khuyên dùng: SHARED_GOAL & ROSCA
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 5: KIẾN TRÚC AVALANCHE TELEPORTER ICM (INTERACTIVE ARCHITECTURE) */}
      {/* ========================================================================= */}
      <section id="architecture" className="w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col gap-10 sm:gap-14">
          
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold font-mono uppercase mb-3">
              <span className="material-symbols-outlined text-[16px]">account_tree</span>
              Avalanche Dual-Chain Teleporter Flow
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {t("arch.title")}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed">
              {t("arch.desc")}
            </p>
          </div>

          {/* Sơ đồ 5 bước liên chuỗi tương tác */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 max-w-6xl mx-auto w-full">
            {[
              { step: 1, title: "1. Nạp Quỹ L1", desc: "Nạp AVAX vào Hũ trên Family L1 với 0 phí gas." },
              { step: 2, title: "2. Tách Đệm L1", desc: "Giữ 10% ở đệm L1 phục vụ rút tức thì <0.8s." },
              { step: 3, title: "3. Teleporter ICM", desc: "Gửi 90% sang Fuji C-Chain không qua bridge trung gian." },
              { step: 4, title: "4. Yield 8% APY", desc: "Vốn nhàn rỗi tích lũy lãi suất thực theo block.timestamp." },
              { step: 5, title: "5. Rút Ngược Tự Động", desc: "Khi đệm L1 thiếu, Teleporter tự động rút phần bù về ví." },
            ].map((item) => (
              <button
                key={item.step}
                type="button"
                onClick={() => setActiveTeleporterStep(item.step)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                  activeTeleporterStep === item.step
                    ? "bg-white border-red-500 shadow-md ring-2 ring-red-500/10"
                    : "bg-slate-50 border-slate-200 hover:bg-white text-slate-700"
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 font-bold font-mono flex items-center justify-center text-sm">
                  {item.step}
                </div>
                <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 6: BẢO MẬT & ĐA CHỮ KÝ (SECURITY & TRUST) */}
      {/* ========================================================================= */}
      <section id="security" className="w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white border-t border-slate-200/80">
        <div className="max-w-6xl mx-auto flex flex-col gap-10">
          
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold font-mono uppercase mb-3">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              Zero-Trust Architecture
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Bảo Mật Tối Đa Cho Tài Sản Gia Đình
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed">
              Kết hợp bảo mật cấp độ doanh nghiệp của mạng Avalanche với trải nghiệm đơn giản hóa cho mọi độ tuổi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[20px]">fingerprint</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Passkey & PIN 4 Số</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ông Bà và Con Trẻ không cần nhớ cụm từ khôi phục phức tạp. Đăng nhập nhanh bằng mã PIN hoặc vân tay trên thiết bị quen thuộc.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[20px]">security</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Avalanche Core & SIWE</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tương thích hoàn toàn với Avalanche Core Wallet chuẩn EIP-4361 (Sign-In with Ethereum). Chữ ký EIP-712 chống tấn công phát lại.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[20px]">lock_reset</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">Khôi Phục Ví Đa Bảo Hộ</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Nếu người thân làm mất điện thoại hoặc quên mật khẩu, các Guardians có thể biểu quyết on-chain để gắn ví mới an toàn.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 7: FINAL CTA BANNER */}
      {/* ========================================================================= */}
      <section className="w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 text-white relative overflow-hidden shadow-2xl flex flex-col items-center text-center">
          
          {/* Subtle Ambient Background Light */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-red-600/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />

          <span className="px-3.5 py-1 rounded-full bg-white/10 text-white text-xs font-mono font-bold uppercase tracking-wider mb-4 border border-white/10">
            Sẵn Sàng Tham Gia UniHack
          </span>

          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-4 max-w-2xl">
            Khởi Tạo Hũ Tiền Đầu Tiên Cho Gia Đình Bạn Ngay Hôm Nay
          </h2>

          <p className="text-xs sm:text-base text-slate-300 max-w-xl mb-8 leading-relaxed">
            Trải nghiệm nền tảng quản trị tài chính đa không gian trên Avalanche. 0 phí gas, thanh khoản tức thì và lợi suất sinh lời an tâm.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleStartCTA}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-red-600/30 transition-all active:scale-95 cursor-pointer"
              type="button"
            >
              {isAuthenticated ? "Truy Cập Dashboard Quản Trị" : "Đăng Ký / Đăng Nhập Ngay"}
            </button>
            <button
              onClick={() => scrollToSection("about")}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm sm:text-base border border-white/10 transition-all cursor-pointer"
              type="button"
            >
              Tìm Hiểu Thêm
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};
export default HomeView;
