"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Coins, Gift, PartyPopper, Sparkles, Target, Trophy } from "lucide-react";
import { formatEther, parseEther } from "viem";
import { hubChain } from "@/contracts/config";
import { amountLabel } from "@/lib/member";

// Danh sách các câu chúc khích lệ ngẫu nhiên khi bé lắc heo đất
const ENCOURAGING_QUOTES = [
  "Leng keng! Heo đất reo vui vì bé chăm chỉ!",
  "Tích tiểu thành đại, từng việc tốt đều có ý nghĩa!",
  "Hoan hô bé! Sắp đủ tiền mua món đồ mơ ước rồi nhé!",
  "Leng keng keng! Heo đất no căng nhờ công sức của con!",
  "Mỗi đồng xu là một lời cảm ơn từ ba mẹ!",
];

interface PiggyBankCardProps {
  currentWei?: string; // Số dư hiện có (dạng Wei hoặc Ether string)
  targetWei?: string; // Mục tiêu tiết kiệm (dạng Wei hoặc Ether string)
  targetName?: string; // Tên món đồ mục tiêu
  onExploreChores?: () => void;
}

/** Chuyển đổi linh hoạt giữa chuỗi Wei và Ether để format hiển thị chính xác */
function toEther(val: string): string {
  if (!val || val === "0") return "0";
  try {
    if (val.includes(".") || BigInt(val) < 1000000000000n) return val;
    return formatEther(BigInt(val));
  } catch {
    return val;
  }
}

function toBigIntWei(val: string): bigint {
  if (!val || val === "0") return 0n;
  try {
    if (val.includes(".")) return parseEther(val);
    const n = BigInt(val);
    return n < 1000000000000n ? parseEther(val) : n;
  } catch {
    return 0n;
  }
}

/**
 * Thẻ Heo Đất tương tác (Interactive Piggy Bank Card) dành riêng cho trẻ nhỏ.
 * Tích hợp hoạt ảnh lắc heo phát ra tiếng leng keng, thanh nước xu dâng theo % mục tiêu,
 * kích thước nút bấm chuẩn di động (>= 48px) cho trải nghiệm vui tươi, khích lệ.
 */
export function PiggyBankCard({
  currentWei = "0",
  targetWei = parseEther("0.5").toString(),
  targetName = "Món quà yêu thích",
  onExploreChores,
}: PiggyBankCardProps) {
  const [isWiggling, setIsWiggling] = useState(false);
  const [coinBurst, setCoinBurst] = useState(false);
  const [bubbleText, setBubbleText] = useState(
    "Chạm vào heo đất hoặc bấm 'Lắc heo đất' để xem niềm vui nhé!",
  );

  const current = toBigIntWei(currentWei);
  const target = toBigIntWei(targetWei);
  const targetSafe = target > 0n ? target : parseEther("0.5");

  // Tính phần trăm tích luỹ đạt được (tối đa 100%)
  const percentage = Math.min(
    100,
    Number((current * 100n) / targetSafe),
  );

  // Xử lý hiệu ứng khi trẻ nhỏ chạm vào heo đất
  const handleShake = () => {
    if (isWiggling) return;
    setIsWiggling(true);
    setCoinBurst(true);

    const randomQuote =
      ENCOURAGING_QUOTES[Math.floor(Math.random() * ENCOURAGING_QUOTES.length)];
    setBubbleText(randomQuote);

    setTimeout(() => setIsWiggling(false), 600);
    setTimeout(() => setCoinBurst(false), 1200);
  };

  return (
    <section
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-50 via-pink-50 to-amber-50 dark:from-purple-950/40 dark:via-slate-900 dark:to-amber-950/20 border-2 border-purple-200 dark:border-purple-800/60 p-5 md:p-6 shadow-xl shadow-purple-500/5 transition-all"
      aria-label="Heo đất tích luỹ của con"
    >
      <style>{`
        @keyframes piggyWiggle {
          0%, 100% { transform: rotate(0deg) scale(1); }
          20% { transform: rotate(-10deg) scale(1.06); }
          40% { transform: rotate(10deg) scale(1.08); }
          60% { transform: rotate(-6deg) scale(1.05); }
          80% { transform: rotate(6deg) scale(1.02); }
        }
        @keyframes coinPop {
          0% { transform: translateY(0) scale(0.6); opacity: 0; }
          40% { transform: translateY(-40px) scale(1.2); opacity: 1; }
          100% { transform: translateY(-70px) scale(0.9); opacity: 0; }
        }
      `}</style>

      {/* Bong bóng lời thoại khích lệ của chú heo */}
      <div className="flex items-start gap-3 mb-4">
        <div className="relative inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-purple-200 dark:border-purple-700 shadow-sm text-sm font-medium text-purple-950 dark:text-purple-200">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
          <span>{bubbleText}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Phần minh họa Heo Đất tương tác */}
        <div className="md:col-span-5 flex flex-col items-center justify-center text-center">
          <div
            role="button"
            tabIndex={0}
            onClick={handleShake}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleShake();
              }
            }}
            className="relative cursor-pointer p-4 rounded-3xl bg-white/80 dark:bg-purple-900/30 border-2 border-pink-200 dark:border-pink-800/50 shadow-inner group active:scale-95 transition-transform select-none focus:outline-none focus:ring-4 focus:ring-purple-400"
            aria-label="Chạm để lắc heo đất kêu leng keng"
          >
            {/* Hoạt ảnh đồng xu nhảy vọt ra khi lắc */}
            {coinBurst && (
              <div
                className="absolute left-1/2 -top-2 -translate-x-1/2 z-20 pointer-events-none flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-amber-950 font-bold text-xs shadow-lg"
                style={{ animation: "coinPop 1s ease-out forwards" }}
              >
                <Coins className="w-3.5 h-3.5" aria-hidden="true" />
                <span>+ Keng! Ting!</span>
              </div>
            )}

            {/* SVG Chú heo đất sinh động với mức lấp đầy đồng xu */}
            <svg
              className={`w-36 h-36 md:w-44 md:h-44 transition-transform duration-300 drop-shadow-md ${
                isWiggling ? "animate-none" : "group-hover:scale-105"
              }`}
              style={
                isWiggling
                  ? { animation: "piggyWiggle 0.6s ease-in-out" }
                  : undefined
              }
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                {/* Gradient thân heo màu hồng pastel */}
                <linearGradient id="piggyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F472B6" />
                  <stop offset="50%" stopColor="#EC4899" />
                  <stop offset="100%" stopColor="#DB2777" />
                </linearGradient>

                {/* Gradient nước đồng xu vàng bên trong */}
                <linearGradient id="coinGoldFill" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FBBF24" />
                  <stop offset="100%" stopColor="#D97706" />
                </linearGradient>

                {/* Mặt nạ cắt thân heo để hiển thị mức vàng lấp đầy */}
                <clipPath id="piggyBodyClip">
                  <path d="M165 110C165 145 136 170 100 170C60 170 30 142 30 110C30 75 60 55 100 55C140 55 165 75 165 110Z" />
                </clipPath>
              </defs>

              {/* Chân trước & chân sau */}
              <rect x="55" y="150" width="22" height="30" rx="8" fill="#BE185D" />
              <rect x="120" y="150" width="22" height="30" rx="8" fill="#BE185D" />

              {/* Đuôi xoắn ốc đáng yêu */}
              <path
                d="M32 105C20 98 15 110 22 118C28 124 35 115 32 110"
                stroke="#BE185D"
                strokeWidth="5"
                strokeLinecap="round"
              />

              {/* Thân chú heo đất */}
              <path
                d="M165 110C165 145 136 170 100 170C60 170 30 142 30 110C30 75 60 55 100 55C140 55 165 75 165 110Z"
                fill="url(#piggyGradient)"
              />

              {/* Mức lấp đầy đồng xu vàng theo phần trăm mục tiêu */}
              <g clipPath="url(#piggyBodyClip)">
                <rect
                  x="20"
                  y={170 - (1.15 * percentage)}
                  width="160"
                  height="120"
                  fill="url(#coinGoldFill)"
                  opacity="0.85"
                />
                {/* Làn sóng óng ánh phía trên mặt nước xu */}
                <path
                  d={`M 20 ${170 - (1.15 * percentage)} Q 60 ${165 - (1.15 * percentage)} 100 ${170 - (1.15 * percentage)} T 180 ${170 - (1.15 * percentage)} V 180 H 20 Z`}
                  fill="#FDE68A"
                  opacity="0.6"
                />
              </g>

              {/* Tai heo */}
              <path
                d="M75 58C70 40 85 30 95 48C95 54 85 62 75 58Z"
                fill="#F472B6"
                stroke="#BE185D"
                strokeWidth="3"
              />

              {/* Mắt heo to tròn long lanh */}
              <circle cx="132" cy="92" r="6" fill="#1E1B4B" />
              <circle cx="134" cy="90" r="2" fill="#FFFFFF" />

              {/* Má hồng hào */}
              <circle cx="130" cy="115" r="9" fill="#F43F5E" opacity="0.45" />

              {/* Mũi heo đáng yêu có 2 lỗ mũi */}
              <ellipse cx="168" cy="112" rx="14" ry="11" fill="#FBCFE8" stroke="#BE185D" strokeWidth="3" />
              <circle cx="164" cy="112" r="2.5" fill="#BE185D" />
              <circle cx="172" cy="112" r="2.5" fill="#BE185D" />

              {/* Khe nhét tiền xu trên lưng */}
              <rect x="85" y="52" width="30" height="5" rx="2.5" fill="#831843" />
            </svg>

            <span className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-pink-700 dark:text-pink-300">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              Lắc thử con nhé!
            </span>
          </div>
        </div>

        {/* Phần thông số tiến độ và mục tiêu */}
        <div className="md:col-span-7 flex flex-col justify-center space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/50 px-3 py-1 rounded-full">
                <Target className="w-3.5 h-3.5" aria-hidden="true" />
                Mục tiêu: {targetName}
              </span>
              <span className="text-sm font-black text-purple-900 dark:text-purple-100">
                {percentage}%
              </span>
            </div>

            <div className="mt-2 text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white flex items-baseline gap-2">
              <span className="text-purple-600 dark:text-purple-400">
                {amountLabel(toEther(currentWei))}
              </span>
              <span className="text-sm md:text-base font-bold text-slate-500 dark:text-slate-400">
                / {amountLabel(toEther(targetWei))} {hubChain.nativeCurrency.symbol}
              </span>
            </div>
          </div>

          {/* Thanh tiến độ bo tròn dày dặn chuẩn Mobile */}
          <div className="space-y-1.5">
            <div className="h-4 w-full rounded-full bg-purple-200/60 dark:bg-slate-800 p-0.5 overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-amber-400 transition-all duration-700 ease-out shadow-sm"
                style={{ width: `${Math.max(percentage, 4)}%` }}
              />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
              <span>Đã tích lũy trong heo</span>
              <span className="font-semibold text-purple-700 dark:text-purple-300">
                {percentage >= 100 ? (
                  <span className="inline-flex items-center gap-1">
                    <PartyPopper className="w-3.5 h-3.5 text-amber-500 inline" aria-hidden="true" />
                    Hoan hô con đã đạt mục tiêu!
                  </span>
                ) : (
                  `Cần thêm ${amountLabel(formatEther(targetSafe > current ? targetSafe - current : 0n))} ${hubChain.nativeCurrency.symbol}`
                )}
              </span>
            </p>
          </div>

          {/* Các nút bấm thao tác thuận tiện ngón tay cái (>= 48px) */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleShake}
              className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-200 font-bold text-sm shadow-sm hover:bg-purple-50 dark:hover:bg-slate-700 active:scale-95 transition-all"
            >
              <Coins className="w-5 h-5 text-amber-500" aria-hidden="true" />
              Lắc heo đất
            </button>

            <Link
              href="/dashboard/kids/chores?source=contract"
              onClick={onExploreChores}
              className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-sm shadow-md shadow-purple-500/25 active:scale-95 transition-all flex-1 min-w-[160px]"
            >
              <Gift className="w-5 h-5" aria-hidden="true" />
              Làm việc nhận thưởng
              <ArrowRight className="w-4 h-4 ml-auto" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
