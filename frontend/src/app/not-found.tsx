"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

export default function NotFound() {
  const router = useRouter();
  const { language, toggleLanguage, t } = useLanguage();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface text-on-surface px-4 py-12 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-secondary/5 rounded-full blur-2xl pointer-events-none" />

      {/* Top Language Switcher */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-xs font-bold text-on-surface transition-all cursor-pointer shadow-sm"
          title="Chuyển đổi ngôn ngữ / Switch language"
          type="button"
        >
          <span className="text-[14px]">
            {language === "vi" ? "🇻🇳" : "🇬🇧"}
          </span>
          <span className="uppercase tracking-wider font-mono">
            {language === "vi" ? "VI" : "EN"}
          </span>
        </button>
      </div>

      <div className="relative z-10 max-w-md w-full bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-8 sm:p-10 shadow-2xl text-center flex flex-col items-center gap-6">
        {/* Brand Icon */}
        <div className="w-20 h-20 rounded-2xl bg-secondary-container/20 border border-secondary-container/30 flex items-center justify-center text-secondary-container">
          <span className="material-symbols-outlined text-[42px]">explore_off</span>
        </div>

        {/* 404 Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-error-container/30 border border-error/20 text-error font-mono text-xs font-bold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
          {t("notfound.badge")}
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h1 className="font-headline-md text-headline-md text-on-surface font-extrabold tracking-tight">
            {t("notfound.title")}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            {t("notfound.desc")}
          </p>
        </div>

        {/* Auto-redirect countdown notice */}
        <div className="w-full py-2.5 px-4 bg-surface-container-low rounded-xl text-xs font-medium text-on-surface-variant flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[16px] animate-spin text-secondary">
            progress_activity
          </span>
          <span>
            {t("notfound.countdown")}{" "}
            <strong className="text-secondary font-bold">{countdown}s</strong>...
          </span>
        </div>

        {/* CTA Buttons */}
        <div className="w-full flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/"
            className="flex-1 py-3 px-4 rounded-xl bg-secondary-container hover:bg-secondary text-white font-label-lg font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            <span>{t("notfound.home")}</span>
          </Link>
          <Link
            href="/login"
            className="flex-1 py-3 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/40 text-on-surface font-label-lg font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">login</span>
            <span>{t("notfound.login")}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
