"use client";

import React from "react";

interface KinetixLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  subtitle?: string;
  className?: string;
  textMode?: "auto" | "dark" | "light";
}

/**
 * KinetixLogo: Biểu tượng thương hiệu Cyber-Fintech Luxe chuẩn mực của Kinetix OS
 * Đồng bộ 100% với phối màu Landing Page:
 * - Khung squircle viền gradient: Avalanche Red (#E84142) -> Amber Gold (#F59E0B) -> Violet Purple (#8B5CF6)
 * - Nền đen Obsidian chuyên sâu: #090D16
 * - Ký tự chữ "K" phủ gradient ánh kim trắng bạc: #FFFFFF -> #E2E8F0
 * - Tương thích hoàn hảo cả giao diện Sáng (Light) và Tối (Dark)
 */
export const KinetixLogo: React.FC<KinetixLogoProps> = ({
  size = "md",
  showText = true,
  subtitle = "Family Vault OS",
  className = "",
  textMode = "auto",
}) => {
  const sizeMap = {
    sm: {
      box: "w-8 h-8",
      radiusOuter: "rounded-xl",
      radiusInner: "rounded-[9px]",
      letter: "text-base",
      fontTitle: "text-sm sm:text-base",
      fontSub: "text-[10px]",
      borderPadding: "p-[1.5px]",
    },
    md: {
      box: "w-10 h-10",
      radiusOuter: "rounded-xl",
      radiusInner: "rounded-[10px]",
      letter: "text-xl",
      fontTitle: "text-base sm:text-lg",
      fontSub: "text-[11px]",
      borderPadding: "p-[1.5px]",
    },
    lg: {
      box: "w-12 h-12",
      radiusOuter: "rounded-2xl",
      radiusInner: "rounded-[13px]",
      letter: "text-2xl",
      fontTitle: "text-lg sm:text-xl",
      fontSub: "text-xs",
      borderPadding: "p-[2px]",
    },
    xl: {
      box: "w-16 h-16",
      radiusOuter: "rounded-2xl",
      radiusInner: "rounded-[14px]",
      letter: "text-3xl",
      fontTitle: "text-xl sm:text-2xl",
      fontSub: "text-sm",
      borderPadding: "p-[2px]",
    },
  };

  const current = sizeMap[size];

  // Xác định màu chữ thương hiệu theo chế độ hiển thị
  const titleColor =
    textMode === "dark"
      ? "text-white"
      : textMode === "light"
        ? "text-slate-900"
        : "text-slate-900 dark:text-white";

  const subColor =
    textMode === "dark"
      ? "text-slate-400"
      : textMode === "light"
        ? "text-slate-500"
        : "text-slate-500 dark:text-slate-400";

  const badgeClass =
    textMode === "dark"
      ? "bg-white/10 text-white/80 border-white/15"
      : textMode === "light"
        ? "bg-slate-900/10 text-slate-800 border-slate-300/40"
        : "bg-slate-900/10 dark:bg-white/10 text-slate-800 dark:text-white/80 border-slate-300/40 dark:border-white/15";

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Icon Mark: Geometric Avalanche + Cyber-Fintech Luxe Squircle */}
      <div
        className={`${current.box} ${current.radiusOuter} bg-gradient-to-tr from-[#E84142] via-[#F59E0B] to-[#8B5CF6] ${current.borderPadding} transition-transform duration-300 hover:scale-105 shadow-lg shadow-[#E84142]/20 flex items-center justify-center shrink-0 select-none`}
      >
        <div
          className={`w-full h-full bg-[#090D16] ${current.radiusInner} flex items-center justify-center`}
        >
          <span
            className={`font-black ${current.letter} text-transparent bg-clip-text bg-gradient-to-r from-[#FFFFFF] to-[#E2E8F0] select-none leading-none`}
          >
            K
          </span>
        </div>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col text-left leading-tight">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black tracking-tight ${titleColor} ${current.fontTitle}`}
            >
              Kinetix
            </span>
            <span
              className={`px-1.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}
            >
              OS
            </span>
          </div>
          {subtitle && (
            <span
              className={`font-medium tracking-tight ${subColor} ${current.fontSub}`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
