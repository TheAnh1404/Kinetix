"use client";

import React, { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Home,
  LoaderCircle,
  Volume2,
  VolumeX,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFamily } from "@/context/FamilyContext";
import { useLanguage } from "@/context/LanguageContext";
import { useSettings } from "@/context/SettingsContext";
import { WorkspaceSwitcher } from "@/components/workspaces/WorkspaceSwitcher";
import { SettingsView, SettingsSection } from "@/components/settings/SettingsView";
import { NotificationDropdown } from "@/components/dashboard/NotificationDropdown";

function SettingsPageLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400">
      <LoaderCircle className="animate-spin text-red-600 mb-3" size={32} />
      <p className="text-xs font-semibold">Đang chuẩn bị trang Cài Đặt Kinetix…</p>
    </div>
  );
}

function SettingsContent() {
  const auth = useAuth();
  const family = useFamily();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, toggleLanguage } = useLanguage();
  const settings = useSettings();

  const tabQuery = (searchParams.get("tab") as SettingsSection) || "family_setup";

  // Bảo vệ xác thực
  useEffect(() => {
    if (auth.isLoading) return;
    if (!auth.isAuthenticated) {
      router.replace("/login?from=/settings");
      return;
    }
    if (auth.onboarding !== "READY") {
      router.replace("/activate");
      return;
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.onboarding, router]);

  if (auth.isLoading || !auth.isAuthenticated || auth.onboarding !== "READY") {
    return <SettingsPageLoading />;
  }

  const currentMember = family.currentMember;
  const userRole = family.currentWorkspace?.role || "CHILD";
  const avatarUrl = auth.user?.avatarUrl || currentMember?.avatar;

  const handleTabChange = (newTab: SettingsSection) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.replace(`/settings?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* ============================================================== */}
      {/* THANH TOPBAR CỐ ĐỊNH CHO TRANG CÀI ĐẶT (CHUẨN META APP) */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 h-16 px-4 sm:px-8 flex items-center justify-between shadow-2xs">
        {/* Brand & Điều hướng nhanh */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 group transition-opacity hover:opacity-90"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-red-600 via-rose-600 to-red-700 text-white flex items-center justify-center font-black text-xl shadow-md shadow-red-500/25 group-hover:scale-105 transition-transform shrink-0">
              K
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="font-black text-base text-slate-900 dark:text-white tracking-tight leading-none">
                Kinetix OS
              </span>
              <span className="text-[10px] font-mono text-red-600 font-bold uppercase tracking-wider mt-1">
                Settings Desk
              </span>
            </div>
          </Link>

          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>

          {/* Bộ chọn Không Gian Làm Việc */}
          <div className="w-48 sm:w-56">
            <WorkspaceSwitcher />
          </div>
        </div>

        {/* Thanh công cụ người dùng bên phải */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Nút Quay lại Bàn Điều Hành */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Bàn Điều Hành</span>
            <span className="sm:hidden">Quay lại</span>
          </Link>

          {/* Bật/Tắt Hiệu Ứng Âm Thanh */}
          <button
            type="button"
            onClick={() => settings.setSoundEnabled(!settings.soundEnabled)}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs transition-colors cursor-pointer"
            title={settings.soundEnabled ? "Tắt âm thanh hiệu ứng" : "Bật âm thanh hiệu ứng"}
          >
            {settings.soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          {/* Chuông Thông Báo */}
          <NotificationDropdown />

          {/* Chuyển Ngôn Ngữ */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700"
            title="Chuyển đổi ngôn ngữ VI / EN"
          >
            {language === "vi" ? "🇻🇳 VI" : "🇬🇧 EN"}
          </button>

          {/* Đăng xuất */}
          <button
            type="button"
            onClick={() => void auth.logout().then(() => router.push("/login"))}
            className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors cursor-pointer"
            title="Đăng xuất"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* NỘI DUNG CHÍNH CỦA TRANG CÀI ĐẶT (FULL PAGE WRAPPER) */}
      {/* ============================================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <SettingsView
          initialTab={tabQuery}
          onTabChange={handleTabChange}
          isStandalonePage={true}
        />
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsPageLoading />}>
      <SettingsContent />
    </Suspense>
  );
}
