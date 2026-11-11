"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight, ShieldCheck, Sparkles, ExternalLink } from "lucide-react";
import styles from "./landing.module.css";

export const LandingNavbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Tính Năng", href: "#features" },
    { label: "Kiến Trúc Dual-Chain", href: "#architecture" },
    { label: "4 Bộ Quy Tắc Hũ", href: "#vault-rules" },
    { label: "Trải Nghiệm Đa Thế Hệ", href: "#personas" },
    { label: "Bảo Mật & UniHack", href: "#security" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-[#090D16]/85 backdrop-blur-md border-b border-white/10 shadow-2xl py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo & Avalanche Badge */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E84142] via-[#F59E0B] to-[#8B5CF6] p-[1.5px] transition-transform duration-300 group-hover:scale-105 shadow-lg shadow-[#E84142]/20">
              <div className="w-full h-full bg-[#090D16] rounded-[10px] flex items-center justify-center">
                <span className="font-extrabold text-xl text-transparent bg-clip-text bg-gradient-to-r from-[#FFFFFF] to-[#E2E8F0]">
                  K
                </span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
                Kinetix
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/15">
                  OS
                </span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className={styles.liveDot} />
                <span className="text-[11px] text-emerald-400 font-medium tracking-wide">
                  Avalanche Dual-Chain
                </span>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 p-1.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/10 shadow-inner">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-4 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/demo"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 hover:shadow-lg hover:shadow-white/5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Trải Nghiệm Demo</span>
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#E84142] to-[#b51923] hover:from-[#d03031] hover:to-[#930014] shadow-lg shadow-[#E84142]/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Vào Ứng Dụng</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center gap-2">
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#E84142] sm:hidden"
            >
              Vào App
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-300 hover:text-white bg-white/5 border border-white/10"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-4 p-5 rounded-2xl bg-[#0F172A]/95 border border-white/15 backdrop-blur-xl shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
            <nav className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 text-sm font-medium text-slate-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5">
              <Link
                href="/demo"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-200 bg-white/10 border border-white/15"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Trải Nghiệm Demo 3 Phút</span>
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#E84142] to-[#b51923] shadow-lg shadow-[#E84142]/30"
              >
                <span>Vào Ứng Dụng / Đăng Nhập</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
