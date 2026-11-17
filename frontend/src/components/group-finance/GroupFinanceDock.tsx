"use client";

import React from "react";
import { LayoutDashboard, Landmark, FileCheck2, History } from "lucide-react";

export type GroupFinanceTab = "overview" | "funds" | "inbox" | "activity";

interface GroupFinanceDockProps {
  activeTab: GroupFinanceTab;
  onChangeTab: (tab: GroupFinanceTab) => void;
  pendingApprovalsCount: number;
}

export const GroupFinanceDock: React.FC<GroupFinanceDockProps> = ({
  activeTab,
  onChangeTab,
  pendingApprovalsCount,
}) => {
  const tabs = [
    {
      id: "overview" as GroupFinanceTab,
      label: "Tổng quan",
      Icon: LayoutDashboard,
    },
    {
      id: "funds" as GroupFinanceTab,
      label: "Quỹ",
      Icon: Landmark,
    },
    {
      id: "inbox" as GroupFinanceTab,
      label: "Chờ xử lý",
      Icon: FileCheck2,
      badge: pendingApprovalsCount,
    },
    {
      id: "activity" as GroupFinanceTab,
      label: "Hoạt động",
      Icon: History,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B0E14]/95 backdrop-blur-xl border-t border-slate-800/90 shadow-2xl px-2 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-1.5"
      aria-label="Thanh điều hướng nghiệp vụ quỹ chung"
    >
      <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
        {tabs.map(({ id, label, Icon, badge }) => {
          const isActive = activeTab === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onChangeTab(id)}
              className={`min-h-[48px] h-12 flex flex-col items-center justify-center rounded-2xl relative transition-all ${
                isActive
                  ? "text-[#E84142] font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  size={20}
                  className={`transition-transform duration-150 ${
                    isActive ? "scale-110 text-[#E84142]" : ""
                  }`}
                  aria-hidden="true"
                />
                {typeof badge === "number" && badge > 0 && (
                  <span
                    className="absolute -top-2 -right-3 min-w-[20px] min-h-[20px] px-1 rounded-full bg-[#E84142] text-white text-[11px] font-mono tabular-nums font-bold flex items-center justify-center border-2 border-[#0B0E14] shadow-md"
                    aria-label={`${badge} mục chờ xử lý`}
                  >
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight font-medium">{label}</span>
              {isActive && (
                <span
                  className="absolute bottom-1 w-5 h-0.5 rounded-full bg-[#E84142] shadow-sm shadow-[#E84142]"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
