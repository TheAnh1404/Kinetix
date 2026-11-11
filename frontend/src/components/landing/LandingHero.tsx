"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Shield, Award, Zap, Layers } from "lucide-react";
import styles from "./landing.module.css";

export const LandingHero: React.FC = () => {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Dynamic Background Glowing Orbs */}
      <div className={styles.floatingOrb1} aria-hidden="true" />
      <div className={styles.floatingOrb2} aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto space-y-8">
          {/* Announcement Tag */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-red-500/10 via-amber-500/10 to-purple-500/10 border border-red-500/20 backdrop-blur-md shadow-inner">
            <span className="flex h-2 w-2 rounded-full bg-[#E84142] animate-ping" />
            <span className="text-xs font-semibold text-slate-200 tracking-wide">
              Avalanche Team1 Vietnam · UniHack 2026
            </span>
            <span className="text-xs text-amber-400 font-bold border-l border-white/10 pl-2">
              PayFi Pioneer
            </span>
          </div>

          {/* Main Kinetic Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
            Hệ Điều Hành Tài Chính Gia Đình{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E84142] via-[#F59E0B] to-[#8B5CF6]">
              Đa Thế Hệ
            </span>{" "}
            Trên Avalanche
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Đột phá với kiến trúc <strong>Dual-Chain</strong>: 0đ gas cho Ông Bà & Trẻ Nhỏ từ{" "}
            <span className="text-emerald-400 font-semibold">Family L1</span>, kết hợp sinh lời{" "}
            <span className="text-amber-400 font-semibold">8% APY</span> trên{" "}
            <span className="text-red-400 font-semibold">Avalanche C-Chain</span> qua Teleporter ICM.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/demo"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-[#E84142] via-[#d93639] to-[#b51923] shadow-xl shadow-[#E84142]/30 hover:shadow-[#E84142]/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
              <span>Trải Nghiệm Demo 3 Phút</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            <a
              href="#architecture"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-base font-semibold text-slate-200 bg-slate-900/60 hover:bg-slate-800/80 border border-white/15 hover:border-white/30 backdrop-blur-md transition-all duration-200"
            >
              <Layers className="w-5 h-5 text-cyan-400" />
              <span>Khám Phá Kiến Trúc</span>
            </a>
          </div>

          {/* Highlights Mini Badges */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>0 Gas Giao Dịch Phổ Thông</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>Bảo Vệ Chống Lừa Đảo 2/3 Multisig</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" />
              <span>Chore-to-Earn Cho Trẻ Nhỏ</span>
            </div>
          </div>
        </div>

        {/* 3D Floating Interactive Generational Cards Showcase */}
        <div className="mt-16 sm:mt-24 relative max-w-5xl mx-auto">
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            
            {/* Card 1: Senior Citizen Persona */}
            <div className={`${styles.glassCard} p-6 rounded-3xl border border-emerald-500/30 ${styles.floatCardLeft} bg-slate-900/70`}>
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl">👴</span>
                  <div>
                    <h2 className="text-sm font-bold text-white">Ông Cụ Ba</h2>
                    <span className="text-[11px] text-emerald-400 font-medium">Chế độ Thân Thiện</span>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  0đ Gas Fee
                </span>
              </div>
              <div className="py-5 text-center">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Hạn Mức Rút Nhanh L1
                </span>
                <div className="text-4xl font-black text-white mt-1 text-emerald-400">
                  20.0 AVAX
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Chữ 56px, 1 chạm nhận tiền an sinh tức thì không cần đợi duyệt.
                </p>
              </div>
              <button
                type="button"
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600/80 hover:bg-emerald-600 border border-emerald-400/30 transition-colors shadow-lg shadow-emerald-900/30"
              >
                Rút Nhanh Tức Thì · 0 Gas
              </button>
            </div>

            {/* Card 2: Parent / Guardian Admin (Center Highlight) */}
            <div className={`${styles.glassCard} p-7 rounded-3xl border border-[#E84142]/40 shadow-2xl shadow-[#E84142]/20 md:-translate-y-4 bg-slate-900/90 relative z-20`}>
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-[#E84142] to-[#F59E0B] text-white text-[11px] font-bold shadow-lg">
                🛡️ BẢO VỆ CHỐNG LỪA ĐẢO
              </div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10 pt-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl">👨‍💼</span>
                  <div>
                    <h2 className="text-base font-bold text-white">Bố Ba (Admin)</h2>
                    <span className="text-[11px] text-amber-400 font-medium">Người Bảo Hộ</span>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                  2/3 Chữ Ký
                </span>
              </div>
              <div className="py-6 space-y-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <span className="text-xs text-slate-300">Yêu cầu rút lớn (60 AVAX):</span>
                  <span className="text-xs font-bold text-amber-400">Đang chờ (1/3)</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <span className="text-xs text-slate-300">Allowlist Precompile:</span>
                  <span className="text-xs font-bold text-emerald-400">Đã khóa ví lạ</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#E84142] to-[#b51923] hover:from-[#d03031] hover:to-[#930014] transition-all shadow-md shadow-[#E84142]/30"
                >
                  Ký Duyệt On-Chain
                </button>
              </div>
            </div>

            {/* Card 3: Child Persona (Kinetix Kids) */}
            <div className={`${styles.glassCard} p-6 rounded-3xl border border-purple-500/30 ${styles.floatCardRight} bg-slate-900/70`}>
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl">👧</span>
                  <div>
                    <h2 className="text-sm font-bold text-white">Bé Na</h2>
                    <span className="text-[11px] text-purple-400 font-medium">Heo Đất 4.0</span>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Chore-to-Earn
                </span>
              </div>
              <div className="py-5 text-center">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Phần Thưởng Nhiệm Vụ
                </span>
                <div className="text-4xl font-black text-white mt-1 text-purple-400">
                  +5.0 AVAX
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  "Lau dọn phòng học & xếp sách vở" · Đã nộp ảnh xác thực.
                </p>
              </div>
              <button
                type="button"
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600/80 hover:bg-purple-600 border border-purple-400/30 transition-colors shadow-lg shadow-purple-900/30"
              >
                Con Đã Hoàn Thành! ✨
              </button>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
