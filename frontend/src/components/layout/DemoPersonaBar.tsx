"use client";

import React, { useState, useEffect } from "react";
import { useFamily } from "@/context/FamilyContext";
import { DEMO_PERSONAS } from "../../../../shared/demoPersonas";
import { ActiveTab } from "@/types";

export interface DemoPersonaBarProps {
  isMobileSimulator?: boolean;
  onToggleSimulator?: (enabled: boolean) => void;
  onTabChange?: (tab: ActiveTab) => void;
  onExit?: () => void;
}

export type QuickPersonaId = "cuba" | "boba" | "truongnhom" | "chunhiem";

interface QuickPersonaConfig {
  id: QuickPersonaId;
  name: string;
  roleBadge: string;
  icon: string;
  workspaceType: "FAMILY" | "FRIENDS" | "COMMUNITY";
  preferredTab: ActiveTab;
  personaData: {
    name: string;
    role: "ADMIN" | "GUARDIAN" | "ELDERLY" | "CHILD";
    wallet: string;
    defaultTab: ActiveTab;
  };
}

const QUICK_PERSONAS: QuickPersonaConfig[] = [
  {
    id: "cuba",
    name: "Cụ Ba",
    roleBadge: "Ông Nội · An Sinh",
    icon: "👴",
    workspaceType: "FAMILY",
    preferredTab: "kinetix-shield",
    personaData: {
      name: "Ông Nội (Cụ Ba)",
      role: "ELDERLY",
      wallet: DEMO_PERSONAS.elderly.wallet,
      defaultTab: "kinetix-shield",
    },
  },
  {
    id: "boba",
    name: "Bố Ba",
    roleBadge: "Admin · Đa Ký M/N",
    icon: "👨‍💼",
    workspaceType: "FAMILY",
    preferredTab: "quan-tri-cha-me",
    personaData: {
      name: "Bố Ba (Admin)",
      role: "ADMIN",
      wallet: DEMO_PERSONAS.admin.wallet,
      defaultTab: "quan-tri-cha-me",
    },
  },
  {
    id: "truongnhom",
    name: "Trưởng Nhóm ĐH",
    roleBadge: "Hội Bạn Thân · Quỹ Phượt",
    icon: "🎒",
    workspaceType: "FRIENDS",
    preferredTab: "quan-tri-cha-me",
    personaData: {
      name: "Trần Anh (Trưởng Nhóm ĐH)",
      role: "ADMIN",
      wallet: DEMO_PERSONAS.admin.wallet,
      defaultTab: "quan-tri-cha-me",
    },
  },
  {
    id: "chunhiem",
    name: "Chủ Nhiệm CLB",
    roleBadge: "CLB · Bounty & Minh Bạch",
    icon: "🏛️",
    workspaceType: "COMMUNITY",
    preferredTab: "quan-tri-cha-me",
    personaData: {
      name: "Hoàng Minh (Chủ Nhiệm CLB)",
      role: "ADMIN",
      wallet: DEMO_PERSONAS.admin.wallet,
      defaultTab: "quan-tri-cha-me",
    },
  },
];

/**
 * DemoPersonaBar: Thanh chuyển vai diễn nhanh (1-Click Persona Switcher)
 * & Bộ chuyển đổi Viewport Mode (Desktop Laptop ⇄ Mobile Simulator 400px)
 * Tuân thủ nghiêm ngặt nguyên tắc Anti-AI Slop: Slate-50, viền subtle, typography sắc sảo.
 */
export const DemoPersonaBar: React.FC<DemoPersonaBarProps> = ({
  isMobileSimulator: controlledSimulator,
  onToggleSimulator,
  onTabChange,
  onExit,
}) => {
  const family = useFamily();
  const [internalSimulator, setInternalSimulator] = useState<boolean>(false);
  const [activePersonaId, setActivePersonaId] = useState<QuickPersonaId>("boba");

  // Đồng bộ trạng thái simulator nếu được truyền từ bên ngoài
  const isSimulatorActive =
    controlledSimulator !== undefined ? controlledSimulator : internalSimulator;

  // Tự động nhận diện vai diễn đang chọn theo currentMember và currentWorkspace
  useEffect(() => {
    if (!family.currentMember) return;
    const isElderly = family.currentMember.role === "ELDERLY";
    const wsType = family.currentWorkspace?.type;

    if (isElderly) {
      setActivePersonaId("cuba");
    } else if (wsType === "FRIENDS") {
      setActivePersonaId("truongnhom");
    } else if (wsType === "COMMUNITY") {
      setActivePersonaId("chunhiem");
    } else {
      setActivePersonaId("boba");
    }
  }, [family.currentMember, family.currentWorkspace]);

  const handleToggleSimulator = (targetMode: boolean) => {
    if (onToggleSimulator) {
      onToggleSimulator(targetMode);
    } else {
      setInternalSimulator(targetMode);
    }
    try {
      localStorage.setItem("kinetix_viewport_simulator", String(targetMode));
    } catch {}
  };

  const handleSelectPersona = async (persona: QuickPersonaConfig) => {
    setActivePersonaId(persona.id);

    // 1. Chuyển Workspace phù hợp nếu có
    const targetWs = family.workspaces.find(
      (ws) => ws.type === persona.workspaceType,
    );
    if (targetWs && targetWs.id !== family.currentWorkspace?.id) {
      try {
        await family.switchWorkspace(targetWs.id);
      } catch (err) {
        console.warn("Could not switch workspace:", err);
      }
    }

    // 2. Chuyển Identity Member
    const memberObj = family.members.find(
      (m) =>
        m.walletAddress.toLowerCase() ===
          persona.personaData.wallet.toLowerCase() &&
        m.role === persona.personaData.role,
    );

    family.setCurrentMember(
      memberObj || {
        id: `demo-${persona.id}`,
        name: persona.personaData.name,
        role: persona.personaData.role,
        title: persona.roleBadge,
        walletAddress: persona.personaData.wallet,
        address: persona.personaData.wallet,
        avatar: "",
        defaultTab: persona.preferredTab,
      },
    );

    // 3. Chuyển Tab phù hợp
    if (onTabChange) {
      onTabChange(persona.preferredTab);
    }
  };

  return (
    <div
      role="region"
      aria-label="Thanh chuyển đổi nhanh vai diễn & kích thước màn hình"
      className="w-full bg-slate-50 dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 px-3 sm:px-6 py-2 transition-colors z-40 select-none"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        
        {/* Left: Brand Badge & 4 Persona Switch Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 mr-1 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E84142] animate-pulse" />
            <span className="hidden sm:inline">DEMO PERSONAS</span>
            <span className="sm:hidden">DEMO</span>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            {QUICK_PERSONAS.map((p) => {
              const isSelected = activePersonaId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPersona(p)}
                  aria-pressed={isSelected}
                  className={`flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-[#E84142] shadow-xs"
                      : "bg-slate-100/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 border border-slate-200/70 dark:border-slate-700/70"
                  }`}
                  title={`${p.name} (${p.roleBadge})`}
                >
                  <span className="text-sm leading-none" aria-hidden="true">
                    {p.icon}
                  </span>
                  <span className="font-bold tracking-tight">{p.name}</span>
                  <span
                    className={`hidden md:inline text-[10px] font-normal font-mono px-1.5 py-0.2 rounded ${
                      isSelected
                        ? "bg-red-50 dark:bg-red-950/50 text-[#E84142] font-semibold"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {p.roleBadge.split(" · ")[1] || p.roleBadge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Viewport Mode Switcher & Exit */}
        <div className="flex items-center gap-2">
          {/* Segmented Viewport Switcher */}
          <div
            role="radiogroup"
            aria-label="Chế độ kích thước màn hình"
            className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs shadow-2xs"
          >
            <button
              type="button"
              role="radio"
              aria-checked={isSimulatorActive}
              onClick={() => handleToggleSimulator(true)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                isSimulatorActive
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs border border-slate-200/80 dark:border-slate-700 text-[#E84142]"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Chuyển sang khung mô phỏng Smartphone di động 400px"
            >
              <span className="material-symbols-outlined text-[14px]">
                smartphone
              </span>
              <span>📱 Điện thoại (400px)</span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={!isSimulatorActive}
              onClick={() => handleToggleSimulator(false)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                !isSimulatorActive
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-xs border border-slate-200/80 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Chuyển sang giao diện máy tính Laptop đầy đủ"
            >
              <span className="material-symbols-outlined text-[14px]">
                laptop_mac
              </span>
              <span>💻 Laptop</span>
            </button>
          </div>

          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Thoát
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DemoPersonaBar;
