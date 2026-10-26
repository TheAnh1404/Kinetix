"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { RoleSwitcherModal } from "./RoleSwitcherModal";
import { ActiveTab, DemoMember } from "../types";

interface HeaderProps {
  activeTab?: ActiveTab;
  onTabChange?: (tab: ActiveTab) => void;
  currentMember?: DemoMember;
  onMemberChange?: (member: DemoMember) => void;
  isWalletConnected?: boolean;
  onConnectWallet?: () => void;
  isLandingPage?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab = "trang-chu",
  onTabChange,
  currentMember,
  onMemberChange,
}) => {
  const { familyInfo } = useFamily();
  const { isAuthenticated, user, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = () => {
    if (familyInfo?.familyCode) {
      navigator.clipboard.writeText(familyInfo.familyCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const scrollToSection = (id: string) => {
    if (activeTab !== "trang-chu" && onTabChange) {
      onTabChange("trang-chu");
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <header className="fixed top-0 w-full z-40 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-surface-container/60 transition-all">
        <div className="h-20 max-w-7xl mx-auto px-gutter flex items-center justify-between gap-space-md">
          
          {/* 1. LOGO & BRAND */}
          <Link
            href="/"
            onClick={() => {
              if (onTabChange) onTabChange("trang-chu");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-space-sm cursor-pointer select-none group"
          >
            <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <span className="material-symbols-outlined text-[24px] text-secondary-container">
                family_restroom
              </span>
            </div>
            <div className="flex flex-col text-left">
              <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight leading-none font-bold">
                {t("brand.name")}
              </span>
              <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold mt-0.5">
                {t("brand.tagline")}
              </span>
            </div>
          </Link>

          {/* 2. THÔNG TIN GIỚI THIỆU (NAV ANCHOR LINKS) */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => scrollToSection("about")}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all cursor-pointer"
              type="button"
            >
              {t("nav.about")}
            </button>

            <button
              onClick={() => scrollToSection("architecture")}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all cursor-pointer"
              type="button"
            >
              {t("nav.architecture")}
            </button>

            <button
              onClick={() => scrollToSection("solutions")}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all cursor-pointer"
              type="button"
            >
              {t("nav.solutions")}
            </button>

            <button
              onClick={() => scrollToSection("security")}
              className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all cursor-pointer"
              type="button"
            >
              {t("nav.security")}
            </button>
          </nav>

          {/* 3. RIGHT CONTROLS: ĐỔI NGÔN NGỮ + BẮT ĐẦU ĐĂNG NHẬP SỬ DỤNG */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Language Switcher (VI / EN) */}
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

            {/* If Authenticated: Show Family Code + User Profile + Dashboard CTA */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Family Code Badge */}
                {familyInfo?.familyCode && (
                  <button
                    onClick={handleCopyCode}
                    className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low hover:bg-surface-container border border-secondary/30 rounded-xl cursor-pointer transition-all shadow-sm"
                    title={t("nav.familyCode")}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[15px] text-secondary">
                      vpn_key
                    </span>
                    <span className="font-mono text-xs font-bold text-on-surface">
                      {familyInfo.familyCode}
                    </span>
                    <span className="material-symbols-outlined text-[13px] text-on-surface-variant">
                      {copiedCode ? "check" : "content_copy"}
                    </span>
                  </button>
                )}

                {/* Dashboard Access Button */}
                <button
                  onClick={() => {
                    if (onTabChange) {
                      if (user?.role === "ELDERLY") onTabChange("kinetix-shield");
                      else if (user?.role === "CHILD") onTabChange("kinetix-kids");
                      else onTabChange("quan-tri-cha-me");
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-secondary-container hover:bg-secondary text-white font-label-lg text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    space_dashboard
                  </span>
                  <span className="hidden sm:inline">{t("nav.dashboard")}</span>
                </button>

                {/* Member Avatar */}
                {currentMember && (
                  <div
                    onClick={() => setIsRoleModalOpen(true)}
                    className="w-9 h-9 rounded-full overflow-hidden border-2 border-secondary shadow-sm cursor-pointer hover:ring-2 hover:ring-secondary/30 transition-all shrink-0"
                    title={currentMember.name}
                  >
                    <img
                      src={currentMember.avatar}
                      alt={currentMember.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Logout Button */}
                <button
                  onClick={logout}
                  title={t("nav.logout")}
                  className="w-9 h-9 rounded-xl bg-surface-container hover:bg-error-container hover:text-error flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    logout
                  </span>
                </button>
              </div>
            ) : (
              /* If NOT Authenticated: BẮT ĐẦU ĐĂNG NHẬP SỬ DỤNG */
              <Link
                href="/login"
                className="px-4 py-2.5 rounded-xl bg-secondary-container hover:bg-secondary text-white font-label-lg text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 group"
              >
                <span>{t("nav.getStarted")}</span>
                <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-0.5">
                  arrow_forward
                </span>
              </Link>
            )}

          </div>
        </div>
      </header>

      {/* Role Switcher Modal (Chỉ mở khi click avatar) */}
      {currentMember && onMemberChange && (
        <RoleSwitcherModal
          isOpen={isRoleModalOpen}
          onClose={() => setIsRoleModalOpen(false)}
          currentMember={currentMember}
          onSelectMember={onMemberChange}
        />
      )}
    </>
  );
};
