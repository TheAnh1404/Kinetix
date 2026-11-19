"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { ActiveTab } from "@/types";
import { useLanguage } from "@/context/LanguageContext";

export interface MobileNavBarProps {
  activeTab?: ActiveTab | "settings" | "overview" | "funds" | "inbox" | "activity";
  onTabChange?: (tab: ActiveTab) => void;
  onOpenDeposit?: () => void;
  variant?: "legacy" | "finance";
}

/**
 * Bảng ánh xạ route tương ứng cho từng không gian quy tắc Kinetix OS
 */
const tabRoutes: Record<string, string> = {
  "quan-tri-cha-me": "/dashboard/admin",
  "kinetix-shield": "/dashboard/elderly",
  "kinetix-kids": "/dashboard/kids",
  "quy-rosca": "/dashboard/rosca",
};

/**
 * Thanh Điều Hướng Đáy Di Động (Floating Glass Dock)
 * Thiết kế theo phong cách Ergonomic Thumb-Zone:
 * - Kính mờ cao cấp (Backdrop Blur Glassmorphism)
 * - Nút nạp tiền nổi bật trung tâm (Floating Action Button) với hiệu ứng Avalanche Red
 * - Hỗ trợ đầy đủ 4 bộ quy tắc Kinetix và phím tắt Cài Đặt hệ thống
 * - Khoảng chạm rộng rãi (≥ 48px), chống mỏi ngón tay
 * - Phản hồi xúc giác trực quan khi nhấn (Active Scale)
 */
export const MobileNavBar: React.FC<MobileNavBarProps> = ({
  activeTab,
  onTabChange,
  onOpenDeposit,
  variant = "legacy",
}) => {
  const { language } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  // Xác định trạng thái xem người dùng đang đứng ở trang Cài Đặt hay không
  const isSettingsActive =
    activeTab === "settings" || pathname?.startsWith("/settings");

  const legacyNavItems = [
    {
      tab: "quan-tri-cha-me" as ActiveTab,
      label: language === "vi" ? "Quản Trị" : "Command",
      icon: "dashboard",
      route: "/dashboard/admin",
    },
    {
      tab: "kinetix-shield" as ActiveTab,
      label: language === "vi" ? "An Sinh" : "Shield",
      icon: "shield",
      route: "/dashboard/elderly",
    },
    {
      action: "deposit",
      label: language === "vi" ? "Nạp Quỹ" : "Deposit",
      icon: "bolt",
      isCenter: true,
    },
    {
      tab: "kinetix-kids" as ActiveTab,
      label: language === "vi" ? "Việc Nhà" : "Kids",
      icon: "savings",
      route: "/dashboard/kids",
    },
    {
      tab: "quy-rosca" as ActiveTab,
      label: language === "vi" ? "Họ Hụi" : "ROSCA",
      icon: "groups",
      route: "/dashboard/rosca",
    },
    {
      tab: "settings" as const,
      href: "/settings",
      label: language === "vi" ? "Cài Đặt" : "Settings",
      icon: "settings",
    },
  ];

  const financeNavItems = [
    {
      tab: "overview" as const,
      label: language === "vi" ? "Tổng quan" : "Overview",
      icon: "dashboard",
      route: "/dashboard?tab=overview",
    },
    {
      tab: "funds" as const,
      label: language === "vi" ? "Quỹ nhóm" : "Vaults",
      icon: "account_balance",
      route: "/dashboard?tab=funds",
    },
    {
      tab: "inbox" as const,
      label: language === "vi" ? "Chờ xử lý" : "Inbox",
      icon: "fact_check",
      route: "/dashboard?tab=inbox",
    },
    {
      tab: "activity" as const,
      label: language === "vi" ? "Hoạt động" : "Activity",
      icon: "history",
      route: "/dashboard?tab=activity",
    },
    {
      tab: "settings" as const,
      href: "/settings",
      label: language === "vi" ? "Cài Đặt" : "Settings",
      icon: "settings",
    },
  ];

  const navItems = variant === "finance" ? financeNavItems : legacyNavItems;

  // Xử lý chuyển hướng thông minh cho từng loại nút trên mobile dock
  const handleItemClick = (item: (typeof navItems)[number]) => {
    if ("isCenter" in item && (item.isCenter || ("action" in item && item.action === "deposit"))) {
      if (onOpenDeposit) {
        onOpenDeposit();
      } else {
        router.push("/dashboard");
      }
      return;
    }

    if ("href" in item && item.href) {
      if (!isSettingsActive) {
        router.push(item.href);
      }
      return;
    }

    if ("route" in item && item.route) {
      router.push(item.route);
      return;
    }

    if ("tab" in item && item.tab) {
      // Nếu đang ở màn hình Cài Đặt hoặc trang khác, chuyển hướng về Dashboard tương ứng
      if (isSettingsActive || !pathname?.startsWith("/dashboard")) {
        router.push(tabRoutes[item.tab] || "/dashboard");
      } else if (onTabChange) {
        onTabChange(item.tab as ActiveTab);
      } else {
        router.push(tabRoutes[item.tab] || "/dashboard");
      }
    }
  };

  // Xác định nút nào đang được kích hoạt nổi bật
  const isItemActive = (item: (typeof navItems)[number]) => {
    if ("isCenter" in item && item.isCenter) return false;
    if ("href" in item && item.href === "/settings") {
      return isSettingsActive;
    }
    if (item.tab === "settings") {
      return isSettingsActive;
    }
    if (isSettingsActive) return false;
    return activeTab === item.tab;
  };

  return (
    <nav
      aria-label="Điều hướng chính trên di động"
      className="lg:hidden fixed bottom-3 left-2 right-2 sm:left-4 sm:right-4 max-w-lg mx-auto z-40 bg-slate-900/90 backdrop-blur-xl text-white rounded-3xl border border-white/10 shadow-2xl px-1.5 py-1.5 flex items-center justify-around"
    >
      {navItems.map((item, idx) => {
        if ("isCenter" in item && item.isCenter) {
          return (
            <button
              key={idx}
              onClick={() => handleItemClick(item)}
              type="button"
              className="flex flex-col items-center justify-center -mt-5 cursor-pointer group flex-shrink-0 px-1 min-h-[48px]"
              title={
                language === "vi"
                  ? "Nạp tiền vào Quỹ"
                  : "Deposit into Vault"
              }
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 text-white shadow-lg shadow-red-600/40 flex items-center justify-center transition-all duration-200 group-active:scale-90 border-2 border-slate-900">
                <span className="material-symbols-outlined text-[22px] sm:text-[24px] text-white">
                  bolt
                </span>
              </div>
              <span className="text-[11px] sm:text-xs font-bold text-slate-300 group-hover:text-white mt-0.5">
                {item.label}
              </span>
            </button>
          );
        }

        const isActive = isItemActive(item);
        return (
          <button
            key={idx}
            onClick={() => handleItemClick(item)}
            type="button"
            className={`flex flex-col items-center justify-center py-1.5 px-1 sm:px-2 rounded-2xl transition-all cursor-pointer min-w-[48px] min-h-[48px] flex-1 max-w-[68px] ${
              isActive
                ? "text-white font-bold bg-white/10"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span
              className={`material-symbols-outlined text-[20px] sm:text-[22px] transition-transform ${
                isActive ? "scale-110 text-red-500" : "text-slate-400"
              }`}
            >
              {item.icon}
            </span>
            <span className="text-[11px] sm:text-xs font-medium leading-tight mt-0.5 truncate max-w-[56px] text-center">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
export default MobileNavBar;
