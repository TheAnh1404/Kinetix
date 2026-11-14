"use client";

import React from "react";
import { ActiveTab } from "@/types";

export interface BottomNavProps {
  activeTab: ActiveTab | string;
  onTabChange: (tab: ActiveTab) => void;
  onOpenLedger?: () => void;
  isSimulator?: boolean;
}

interface TabItem {
  id: string;
  label: string;
  icon: string;
  tabTarget?: ActiveTab;
  action?: "ledger";
  badge?: string;
}

/**
 * BottomNav: Thanh điều hướng di động tối ưu công thái học (Ergonomic Mobile Bottom Bar)
 * 4 Tab chuẩn theo yêu cầu nghiệp vụ:
 * 1. 🏠 Tổng quan
 * 2. 🏺 Hũ tiền
 * 3. 📋 Nhiệm vụ / Quỹ
 * 4. 👥 Sao kê & Thành viên
 *
 * Touch targets chuẩn ngón cái tối thiểu 48px, không giật lag.
 */
export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenLedger,
  isSimulator = false,
}) => {
  const tabs: TabItem[] = [
    {
      id: "overview",
      label: "Tổng quan",
      icon: "dashboard",
      tabTarget: "quan-tri-cha-me",
    },
    {
      id: "vaults",
      label: "Hũ tiền",
      icon: "savings",
      tabTarget: "kinetix-shield",
    },
    {
      id: "tasks",
      label: "Nhiệm vụ / Quỹ",
      icon: "assignment",
      tabTarget: "kinetix-kids",
    },
    {
      id: "members",
      label: "Sao kê & TV",
      icon: "receipt_long",
      action: "ledger",
    },
  ];

  const isTabActive = (item: TabItem): boolean => {
    if (item.action === "ledger") {
      return activeTab === "tools";
    }
    if (item.id === "overview") {
      return activeTab === "quan-tri-cha-me" || activeTab === "trang-chu";
    }
    if (item.id === "vaults") {
      return activeTab === "kinetix-shield";
    }
    if (item.id === "tasks") {
      return activeTab === "kinetix-kids" || activeTab === "quy-rosca";
    }
    return activeTab === item.tabTarget;
  };

  const handleTabClick = (item: TabItem) => {
    if (item.action === "ledger") {
      if (onOpenLedger) {
        onOpenLedger();
      } else if (item.tabTarget) {
        onTabChange(item.tabTarget);
      }
      return;
    }

    if (item.tabTarget) {
      onTabChange(item.tabTarget);
    }
  };

  // Nếu đang ở trong khung mô phỏng MobilePhoneContainer trên Desktop: dùng absolute để bám đáy khung điện thoại
  // Nếu ở chế độ native mobile view: dùng fixed bottom-0 inset-x-0
  const containerClasses = isSimulator
    ? "absolute bottom-0 inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 z-40"
    : "lg:hidden fixed bottom-0 inset-x-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 z-40 pb-[env(safe-area-inset-bottom,0px)]";

  return (
    <nav
      aria-label="Thanh điều hướng di động"
      className={containerClasses}
    >
      <div className="grid grid-cols-4 h-16 max-w-lg mx-auto px-1 items-stretch">
        {tabs.map((tab) => {
          const active = isTabActive(tab);
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab)}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-1 transition-all select-none relative group cursor-pointer ${
                active
                  ? "text-[#E84142] font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {/* Chỉ báo active trên đỉnh tab */}
              {active && (
                <span className="absolute top-0 inset-x-4 h-0.5 bg-[#E84142] rounded-full" />
              )}

              <div className="relative flex items-center justify-center">
                <span
                  className={`material-symbols-outlined text-[22px] transition-transform group-active:scale-90 ${
                    active ? "text-[#E84142]" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {tab.icon}
                </span>

                {tab.badge && (
                  <span className="absolute -top-1 -right-2 px-1 py-0.2 bg-[#E84142] text-white text-[9px] font-bold rounded-full font-mono">
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className="text-[11px] leading-tight tracking-tight truncate max-w-[85px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
