"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LandingPageNew } from "@/components/landing/LandingPageNew";

/**
 * Trang Chủ Kinetix OS (Landing Page Độc Lập)
 * Thiết kế mới 100% theo chuẩn UI/UX Pro Max (Cyber-Fintech Luxe).
 * Auth Guard:
 * - Nếu đang tải phiên: Hiển thị Splash Screen công nghệ cao chống giật layout.
 * - Nếu đã đăng nhập: Tự động chuyển hướng ngay vào Dashboard.
 * - Nếu chưa đăng nhập hoặc đã đăng xuất: Hiển thị toàn bộ Landing Page mới với Navbar độc lập.
 */
export default function RootPage() {
  const { isAuthenticated, isLoading, redirectUrl } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(redirectUrl || "/dashboard");
    }
  }, [isAuthenticated, isLoading, redirectUrl, router]);

  // Splash Screen trong lúc kiểm tra phiên đăng nhập
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090D16] flex flex-col items-center justify-center p-4 selection:bg-[#E84142]">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#E84142] via-[#F59E0B] to-[#8B5CF6] p-[2px] animate-pulse shadow-2xl shadow-[#E84142]/30">
            <div className="w-full h-full bg-[#090D16] rounded-[14px] flex items-center justify-center">
              <span className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">
                K
              </span>
            </div>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-mono text-slate-400 tracking-wider">
            KHỞI CHẠY KINETIX OS...
          </span>
        </div>
      </div>
    );
  }

  // Đã xác thực: Giữ màn hình chờ chuyển hướng vào dApp
  if (isAuthenticated) {
    return null;
  }

  // Khách vãng lai / Vừa đăng xuất: Hiển thị Landing Page mới hoàn toàn
  return <LandingPageNew />;
}
