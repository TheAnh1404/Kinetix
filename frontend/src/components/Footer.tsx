"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";

/**
 * Footer của Landing Page Kinetix.
 * Thiết kế chuẩn Responsive Mobile với khoảng cách và liên kết thân thiện ngón tay bấm.
 */
export const Footer: React.FC = () => {
  const { t } = useLanguage();

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
    <footer className="w-full bg-surface-container-low mt-12 sm:mt-20 border-t border-outline-variant/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">
        
        {/* Brand & Subnet Badge */}
        <div className="flex flex-col items-center md:items-start gap-1.5 text-center md:text-left">
          <div className="flex items-center gap-2">
            <span className="font-headline-sm text-lg sm:text-headline-sm text-on-surface font-bold tracking-tight">
              {t("brand.name")}
            </span>
            <span className="px-2 py-0.5 rounded-full font-label-caps text-[10px] bg-surface-container-high text-on-surface font-semibold border border-outline-variant/20">
              Avalanche Fuji · Testnet
            </span>
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-sm">
            {t("footer.desc")}
          </p>
        </div>

        {/* Navigation Quick Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm font-semibold text-on-surface-variant">
          <button
            onClick={() => scrollToSection("about")}
            className="hover:text-on-surface transition-colors cursor-pointer py-1"
            type="button"
          >
            {t("nav.about")}
          </button>
          <button
            onClick={() => scrollToSection("workspaces")}
            className="hover:text-on-surface transition-colors cursor-pointer py-1"
            type="button"
          >
            {t("nav.workspaces")}
          </button>
          <button
            onClick={() => scrollToSection("rules")}
            className="hover:text-on-surface transition-colors cursor-pointer py-1"
            type="button"
          >
            {t("nav.rules")}
          </button>
          <button
            onClick={() => scrollToSection("architecture")}
            className="hover:text-on-surface transition-colors cursor-pointer py-1"
            type="button"
          >
            {t("nav.architecture")}
          </button>
          <button
            onClick={() => scrollToSection("security")}
            className="hover:text-on-surface transition-colors cursor-pointer py-1"
            type="button"
          >
            {t("nav.security")}
          </button>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ICM · Experimental
          </span>
        </div>

        {/* Copyright */}
        <div className="text-[11px] sm:text-xs text-on-surface-variant text-center md:text-right">
          {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
};
