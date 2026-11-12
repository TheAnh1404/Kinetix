"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Github, ExternalLink, Heart } from "lucide-react";
import styles from "./landing.module.css";

export const LandingFooter: React.FC = () => {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-slate-950 pt-20 pb-12 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* High-Converting Pre-Footer Banner */}
        <div className="mb-20 p-8 sm:p-14 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-[#E84142]/40 relative overflow-hidden shadow-2xl shadow-[#E84142]/10 text-center space-y-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#E84142]/20 to-transparent blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-[#8B5CF6]/20 to-transparent blur-3xl pointer-events-none" />

          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[#E84142] text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>KHÁM PHÁ TƯƠNG LAI CỦA PAYFI</span>
          </span>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight max-w-2xl mx-auto">
            Sẵn Sàng Đưa Tài Chính Gia Đình Vào Kỷ Nguyên Web3?
          </h2>

          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Trải nghiệm ngay bản mô phỏng 3 vai trò hoặc kết nối ví Avalanche Core để khởi tạo không gian tài chính đầu tiên của gia đình bạn.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/demo"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-slate-200 bg-white/10 hover:bg-white/15 border border-white/15 transition-all duration-200"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Chế Độ Demo Giám Khảo</span>
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#E84142] to-[#b51923] hover:from-[#d03031] hover:to-[#930014] shadow-lg shadow-[#E84142]/30 transition-all duration-200"
            >
              <span>Vào Ứng Dụng Ngay</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Footer Navigation & Brand */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-white/10 text-xs text-slate-400">
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#E84142] via-[#F59E0B] to-[#8B5CF6] p-[1.5px] shadow-lg shadow-[#E84142]/20">
                <div className="w-full h-full bg-[#090D16] rounded-[9px] flex items-center justify-center">
                  <span className="font-black text-lg text-transparent bg-clip-text bg-gradient-to-r from-white to-[#E2E8F0]">
                    K
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-white tracking-tight">Kinetix</span>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/15">
                  OS
                </span>
              </div>
            </div>
            <p className="max-w-md leading-relaxed">
              Hệ điều hành tài chính gia đình và cộng đồng đa thế hệ trên Avalanche. Tích hợp Family L1 zero-gas và lợi tức thực tế 8% APY từ Fuji C-Chain.
            </p>
            <div className="flex items-center gap-2 text-slate-500 text-[11px]">
              <span>Mã nguồn mở theo giấy phép MIT License</span>
              <span>•</span>
              <span>UniHack 2026 Submission</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-white font-bold text-xs uppercase tracking-wider">Khám Phá</h3>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Tính Năng Nổi Bật
                </a>
              </li>
              <li>
                <a href="#architecture" className="hover:text-white transition-colors">
                  Kiến Trúc Dual-Chain
                </a>
              </li>
              <li>
                <a href="#vault-rules" className="hover:text-white transition-colors">
                  4 Mẫu Hũ Tiền
                </a>
              </li>
              <li>
                <a href="#personas" className="hover:text-white transition-colors">
                  Trải Nghiệm 3 Thế Hệ
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-white transition-colors">
                  Bảo Mật & Kiểm Toán
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-white font-bold text-xs uppercase tracking-wider">Hệ Sinh Thái</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://build.avax.network"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  <span>Avalanche Developer Docs</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
              <li>
                <a
                  href="https://subnets-test.avax.network"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  <span>Snowtrace Testnet Explorer</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>
              </li>
              <li>
                <Link href="/demo" className="hover:text-white transition-colors">
                  Mô Phỏng Trình Diễn Cục Bộ
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Đăng Nhập / Liên Kết Ví Core
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright & Team1 Vietnam Acknowledgments */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © 2026 Kinetix Protocol. Xây dựng bởi <strong>The Anh Nguyen</strong> cho cuộc thi Avalanche Team1 Vietnam - UniHack.
          </div>
          <div className="flex items-center gap-1">
            <span>Powered by</span>
            <span className="text-[#E84142] font-semibold">Avalanche Subnets & Teleporter</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
