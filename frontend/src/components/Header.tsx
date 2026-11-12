"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";
import { WorkspaceSwitcher } from "./workspaces/WorkspaceSwitcher";
import { KinetixLogo } from "./ui/KinetixLogo";
import { ActiveTab, FamilyMember } from "../types";

interface HeaderProps {
  activeTab?: ActiveTab;
  onTabChange?: (tab: ActiveTab) => void;
  currentMember?: FamilyMember;
  onMemberChange?: (member: FamilyMember) => void;
  isWalletConnected?: boolean;
  onConnectWallet?: () => void;
  isLandingPage?: boolean;
}

/**
 * Header chính của Landing Page Kinetix.
 * Hỗ trợ giao diện phản hồi chuẩn Responsive Mobile, bao gồm Menu Drawer di động,
 * thanh chuyển ngôn ngữ và các nút điều hướng nhanh.
 */
export const Header: React.FC<HeaderProps> = ({
  activeTab = "trang-chu",
  onTabChange,
  currentMember,
  onMemberChange,
}) => {
  const { familyInfo } = useFamily();
  const { isAuthenticated, user, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const [copiedCode, setCopiedCode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Đóng Mobile Drawer khi đổi kích thước màn hình sang desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Khóa cuộn trang khi Mobile Drawer đang mở
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  const handleCopyCode = () => {
    if (familyInfo?.familyCode) {
      navigator.clipboard.writeText(familyInfo.familyCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const scrollToSection = (id: string) => {
    setIsMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      // Trừ đi chiều cao header cố định để không bị che khuất tiêu đề
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
    <>
      <header className="fixed top-0 left-0 w-full z-40 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-surface-container/60 transition-all">
        <div className="h-16 sm:h-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          
          {/* 1. LOGO & BRAND */}
          <Link
            href="/"
            onClick={() => {
              if (onTabChange) onTabChange("trang-chu");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-2.5 cursor-pointer select-none group shrink-0"
          >
            <KinetixLogo size="md" subtitle={t("brand.tagline") || "Family Vault OS"} />
          </Link>

          {/* 2. THÔNG TIN GIỚI THIỆU TRÊN DESKTOP (NAV ANCHOR LINKS) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <button
              onClick={() => scrollToSection("about")}
              className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all cursor-pointer"
              type="button"
            >
              {t("nav.about")}
            </button>

            <button
              onClick={() => scrollToSection("workspaces")}
              className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all cursor-pointer"
              type="button"
            >
              {t("nav.workspaces")}
            </button>

            <button
              onClick={() => scrollToSection("rules")}
              className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all cursor-pointer"
              type="button"
            >
              {t("nav.rules")}
            </button>

            <button
              onClick={() => scrollToSection("architecture")}
              className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all cursor-pointer"
              type="button"
            >
              {t("nav.architecture")}
            </button>

            <button
              onClick={() => scrollToSection("security")}
              className="px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all cursor-pointer"
              type="button"
            >
              {t("nav.security")}
            </button>
          </nav>

          {/* 3. RIGHT CONTROLS: ĐỔI NGÔN NGỮ + TÀI KHOẢN / HAMBURGER BUTTON */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Language Switcher (VI / EN) */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-xs font-bold text-on-surface transition-all cursor-pointer shadow-xs"
              title="Chuyển đổi ngôn ngữ / Switch language"
              type="button"
            >
              <span className="text-[13px] sm:text-[14px]">
                {language === "vi" ? "🇻🇳" : "🇬🇧"}
              </span>
              <span className="uppercase tracking-wider font-mono text-[11px] sm:text-xs">
                {language === "vi" ? "VI" : "EN"}
              </span>
            </button>

            {/* Desktop Auth Section */}
            {isAuthenticated ? (
              <div className="hidden sm:flex items-center gap-2 sm:gap-3">
                {/* Workspace Switcher */}
                <div className="hidden lg:block">
                  <WorkspaceSwitcher />
                </div>

                {/* Family Code Badge */}
                {familyInfo?.familyCode && (
                  <button
                    onClick={handleCopyCode}
                    className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low hover:bg-surface-container border border-secondary/30 rounded-xl cursor-pointer transition-all shadow-xs"
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
                <Link
                  href="/dashboard"
                  className="px-3.5 py-2 rounded-xl bg-secondary-container hover:bg-secondary text-white font-label-lg text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    space_dashboard
                  </span>
                  <span>{t("nav.dashboard")}</span>
                </Link>

                {/* Member Avatar */}
                {currentMember && (
                  <Link
                    href="/dashboard"
                    className="w-8 h-8 rounded-full overflow-hidden border-2 border-secondary shadow-xs cursor-pointer hover:ring-2 hover:ring-secondary/30 transition-all shrink-0"
                    title={currentMember.name}
                  >
                    <img
                      src={currentMember.avatar}
                      alt={currentMember.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>
                )}

                {/* Settings Button */}
                <Link
                  href="/settings"
                  title={language === "vi" ? "Cài đặt tài khoản" : "Account Settings"}
                  className="w-8 h-8 rounded-xl bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
                >
                  <span className="material-symbols-outlined text-[17px]">
                    settings
                  </span>
                </Link>

                {/* Logout Button */}
                <button
                  onClick={logout}
                  title={t("nav.logout")}
                  className="w-8 h-8 rounded-xl bg-surface-container hover:bg-error-container hover:text-error flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    logout
                  </span>
                </button>
              </div>
            ) : (
              /* If NOT Authenticated (Desktop view) */
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all cursor-pointer"
                >
                  {language === "vi" ? "Đăng Nhập" : "Log In"}
                </Link>
                <Link
                  href="/login?mode=register"
                  className="px-3.5 py-2 rounded-xl bg-secondary-container hover:bg-secondary text-white font-label-lg text-xs font-bold shadow-md transition-all flex items-center gap-1 cursor-pointer active:scale-95 group"
                >
                  <span>{t("nav.getStarted")}</span>
                  <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-0.5">
                    arrow_forward
                  </span>
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Toggle Button (Hiển thị riêng cho điện thoại) */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden w-9 h-9 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 flex items-center justify-center text-on-surface transition-all cursor-pointer shadow-xs active:scale-95"
              aria-label="Toggle navigation menu"
              type="button"
            >
              <span className="material-symbols-outlined text-[22px]">
                {isMobileMenuOpen ? "close" : "menu"}
              </span>
            </button>

          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MOBILE NAVIGATION DRAWER (MENU TRƯỢT DI ĐỘNG MƯỢT MÀ) */}
      {/* ========================================================================= */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-30 md:hidden bg-surface/95 backdrop-blur-2xl border-b border-outline-variant/30 flex flex-col justify-between p-5 overflow-y-auto animate-in fade-in slide-in-from-top-4 duration-200">
          
          {/* Danh Sách Mục Điều Hướng */}
          <div className="flex flex-col gap-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/70 px-3 py-1 font-mono">
              {language === "vi" ? "Danh Mục Khám Phá" : "Explore Kinetix"}
            </div>

            <button
              onClick={() => scrollToSection("about")}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-left font-bold text-sm text-on-surface hover:bg-surface-container transition-all active:scale-98"
              type="button"
            >
              <span className="w-8 h-8 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">home</span>
              </span>
              <span>{t("nav.about")}</span>
            </button>

            <button
              onClick={() => scrollToSection("workspaces")}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-left font-bold text-sm text-on-surface hover:bg-surface-container transition-all active:scale-98"
              type="button"
            >
              <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">diversity_3</span>
              </span>
              <span>{t("nav.workspaces")}</span>
            </button>

            <button
              onClick={() => scrollToSection("rules")}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-left font-bold text-sm text-on-surface hover:bg-surface-container transition-all active:scale-98"
              type="button"
            >
              <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">rule</span>
              </span>
              <span>{t("nav.rules")}</span>
            </button>

            <button
              onClick={() => scrollToSection("architecture")}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-left font-bold text-sm text-on-surface hover:bg-surface-container transition-all active:scale-98"
              type="button"
            >
              <span className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">sync_alt</span>
              </span>
              <span>{t("nav.architecture")}</span>
            </button>

            <button
              onClick={() => scrollToSection("security")}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-left font-bold text-sm text-on-surface hover:bg-surface-container transition-all active:scale-98"
              type="button"
            >
              <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
              </span>
              <span>{t("nav.security")}</span>
            </button>
          </div>

          {/* Phần Hành Động Tài Khoản / Đăng Nhập Trên Điện Thoại */}
          <div className="mt-6 pt-5 border-t border-outline-variant/30 flex flex-col gap-3">
            {isAuthenticated ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-container-low border border-outline-variant/20">
                  <div className="flex items-center gap-2.5">
                    {currentMember?.avatar ? (
                      <img
                        src={currentMember.avatar}
                        alt={currentMember.name}
                        className="w-9 h-9 rounded-full object-cover border border-secondary"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">
                        {user?.fullName?.charAt(0) || "U"}
                      </div>
                    )}
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold text-on-surface">
                        {currentMember?.name || user?.fullName || "Thành viên"}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-mono">
                        {familyInfo?.name || "Không gian Kinetix"}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      logout();
                    }}
                    className="p-2 rounded-xl hover:bg-error-container hover:text-error text-on-surface-variant transition-colors"
                    title={t("nav.logout")}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                  </button>
                </div>

                <Link
                  href="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full py-3.5 rounded-2xl bg-secondary-container hover:bg-secondary text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">space_dashboard</span>
                  <span>{t("nav.dashboard")}</span>
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full py-3 rounded-2xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-sm flex items-center justify-center gap-2 border border-outline-variant/30 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">settings</span>
                  <span>{language === "vi" ? "Cài Đặt Tài Khoản" : "Account Settings"}</span>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full py-3 rounded-2xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-sm text-center border border-outline-variant/30 transition-all"
                >
                  {language === "vi" ? "Đăng Nhập Tài Khoản" : "Log In"}
                </Link>

                <Link
                  href="/login?mode=register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full py-3.5 rounded-2xl bg-secondary-container hover:bg-secondary text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
                >
                  <span>{t("nav.getStarted")}</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
              </div>
            )}

            {/* Quick Language Toggle Bar in Drawer */}
            <div className="flex items-center justify-between px-3 py-2 text-xs text-on-surface-variant">
              <span>{language === "vi" ? "Ngôn ngữ giao diện" : "Interface Language"}</span>
              <button
                onClick={toggleLanguage}
                className="font-bold text-secondary font-mono flex items-center gap-1 underline underline-offset-4"
                type="button"
              >
                <span>{language === "vi" ? "🇻🇳 Tiếng Việt" : "🇬🇧 English"}</span>
                <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
              </button>
            </div>
          </div>

        </div>
      )}
    </>
  );
};
