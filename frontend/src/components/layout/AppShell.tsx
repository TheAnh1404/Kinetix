"use client";
import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/context/SettingsContext";
import { WorkspaceSwitcher } from "@/components/workspaces/WorkspaceSwitcher";
import { KinetixLogo } from "@/components/ui/KinetixLogo";
import { NotificationDropdown } from "@/components/dashboard/NotificationDropdown";
import { ActiveTab } from "@/types";

interface Props {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  children: React.ReactNode;
}
const legacyTabs: { id: ActiveTab; label: string }[] = [
  { id: "quan-tri-cha-me", label: "Quỹ contract" },
  { id: "kinetix-shield", label: "Hỗ trợ" },
  { id: "kinetix-kids", label: "Nhiệm vụ" },
  { id: "quy-rosca", label: "Xoay vòng" },
];

/** Live navigation contains only actual memberships. Financial rights remain in each adapter. */
export function AppShell({ activeTab, onTabChange, children }: Props) {
  const auth = useAuth(),
    settings = useSettings(),
    router = useRouter();
  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 text-base">
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-3">
          <KinetixLogo subtitle="Quỹ chung" />
          <div className="flex items-center gap-2">
            <NotificationDropdown />
            <Link
              href="/settings"
              className="min-h-[44px] inline-flex items-center px-3 underline"
            >
              Tài khoản
            </Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-3 flex flex-wrap items-center justify-between gap-3">
          <WorkspaceSwitcher />
          <span className="text-sm">Avalanche Fuji · AVAX · Có phí mạng</span>
        </div>
      </header>
      <div className="max-w-7xl mx-auto lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block px-4 py-6 border-r border-slate-200 dark:border-slate-800">
          <nav className="grid gap-2" aria-label="Điều hướng ứng dụng">
            <Link
              className="min-h-[48px] flex items-center px-3 rounded-lg border border-slate-300 font-semibold"
              href="/dashboard/finance"
            >
              Quỹ chung
            </Link>
            {legacyTabs.map((tab) => (
              <button
                className="min-h-[48px] text-left px-3 rounded-lg aria-[current=page]:bg-red-50 aria-[current=page]:text-red-800"
                key={tab.id}
                aria-current={activeTab === tab.id ? "page" : undefined}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
            <Link
              className="min-h-[48px] flex items-center px-3"
              href="/dashboard/finance/members"
            >
              Thành viên và quản lý
            </Link>
            <Link
              className="min-h-[48px] flex items-center px-3"
              href="/dashboard/tools?section=activity"
            >
              Giao dịch và công cụ
            </Link>
          </nav>
          <button
            className="min-h-[44px] px-3 mt-4 underline"
            onClick={settings.toggleTheme}
          >
            {settings.theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}
          </button>
          <button
            className="min-h-[44px] px-3 underline"
            onClick={async () => {
              await auth.logout();
              router.push("/login");
            }}
          >
            Đăng xuất
          </button>
        </aside>
        <main className="min-w-0 px-3 sm:px-5 py-4 pb-[calc(100px+env(safe-area-inset-bottom))] lg:pb-8">
          <nav
            className="lg:hidden flex flex-wrap gap-3 mb-4"
            aria-label="Quản lý nhóm"
          >
            <Link
              className="min-h-[44px] inline-flex items-center underline"
              href="/dashboard/finance/members"
            >
              Thành viên và quản lý
            </Link>
            <Link
              className="min-h-[44px] inline-flex items-center underline"
              href="/dashboard/tools?section=activity"
            >
              Giao dịch và công cụ
            </Link>
          </nav>
          {children}
        </main>
      </div>
      <nav
        aria-label="Chức năng trên điện thoại"
        className="fixed bottom-0 inset-x-0 z-40 lg:hidden grid grid-cols-5 gap-1 p-2 pb-[max(8px,env(safe-area-inset-bottom))] border-t border-slate-300 bg-white dark:bg-slate-900"
      >
        <Link
          className="min-h-[48px] flex items-center justify-center text-center text-sm rounded-lg"
          href="/dashboard/finance"
        >
          Quỹ chung
        </Link>
        {legacyTabs.map((tab) => (
          <button
            key={tab.id}
            className="min-h-[48px] px-1 text-sm rounded-lg aria-[current=page]:bg-red-50 aria-[current=page]:text-red-800"
            aria-current={activeTab === tab.id ? "page" : undefined}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
