"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="w-full bg-surface-container-low mt-margin border-t border-outline-variant/20">
      <div className="max-w-7xl mx-auto px-gutter py-space-xl flex flex-col md:flex-row items-center justify-between gap-space-lg">
        <div className="flex flex-col items-center md:items-start gap-space-xs">
          <div className="flex items-center gap-space-xs">
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
              {t("brand.name")}
            </span>
            <span className="px-2 py-0.5 rounded font-label-caps text-label-caps bg-surface-container-high text-on-surface font-semibold">
              Subnet v2.4 • L1
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant text-center md:text-left">
            {t("footer.desc")}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-space-lg font-label-lg text-label-lg text-on-surface-variant text-xs sm:text-sm">
          <a
            className="hover:text-on-surface transition-colors"
            href="https://github.com/theanh/kinetix"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("footer.unihack")}
          </a>
          <a className="hover:text-on-surface transition-colors" href="#about">
            {t("footer.docs")}
          </a>
          <a className="hover:text-on-surface transition-colors" href="#security">
            {t("footer.security")}
          </a>
          <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Teleporter ICM Live
          </span>
        </div>

        <div className="font-label-caps text-label-caps text-on-surface-variant text-center md:text-right text-xs">
          {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
};
