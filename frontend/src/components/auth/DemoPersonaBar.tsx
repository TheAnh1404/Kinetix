"use client";

import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export const DemoPersonaBar: React.FC = () => {
  const { user, switchDemoPersona, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(true);

  const personas = [
    {
      role: "ADMIN" as const,
      label: "Bố Ba (Admin)",
      badge: "Ví Core",
      color: "bg-slate-900 text-white",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
    },
    {
      role: "GUARDIAN" as const,
      label: "Cô Út (Guardian)",
      badge: "Ký 2/3",
      color: "bg-blue-700 text-white",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    },
    {
      role: "ELDERLY" as const,
      label: "Ông Nội (Shield)",
      badge: "Rút <50$",
      color: "bg-amber-600 text-white",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuB9RXFgUn83eP41jg2weE3YA8vd83fsVimUf5y0OcZS7SOQ3XPOzG_gbODV_xJIXeRQye9NHAh2TXP_28Oz-bPHhWTfscJFCZWXYRXq2gQAAtwAVTc1yseRsDx3GBa94HVhTHAal40UzoVwN7YY1IXQ5EmMOe0WhhEvzu4V7ZNBtixA0ZiaR61Ad1UJUADoRuNzug0ggIZW8eO5XEiktIZD-zCJ4THMAqG0i7Z1ivkCGPnUrjsBJg",
    },
    {
      role: "CHILD" as const,
      label: "Bé Na (Kids)",
      badge: "Việc nhà",
      color: "bg-emerald-600 text-white",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAc1UhNj0E3eKWwrEAv9WJ4KTtp_4pnR4-fyhwEHSKncOxXMGgdr5EdEkF7AMpuaguOYSWTwC-3Ovp1jhOZtflnABlKorh-7E9pPfvKLow6TvFQHGxmf0EgQh_J7eX2WyhgY_obtzgCtT892o3CCd1-TKpF3WABb42fGzxm4wVTK6S7fWG0bKJKRZGbEsWybndKRK3uK6Aix2ehMS1hOr8zRyDG3ZRA0ODbqcIHWiDv1p2ayRMtyQ",
    },
  ];

  return (
    <div className="fixed top-24 right-4 z-50 flex flex-col items-end gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md shadow-lg border border-secondary/30 text-xs font-bold text-on-surface hover:bg-surface-container transition-all cursor-pointer"
        type="button"
      >
        <span className="w-2 h-2 rounded-full bg-secondary animate-ping" />
        <span>Demo Quick Switcher</span>
        <span className="material-symbols-outlined text-[16px]">
          {isOpen ? "expand_less" : "expand_more"}
        </span>
      </button>

      {/* Floating Panel */}
      {isOpen && (
        <div className="p-2.5 bg-surface-container-lowest/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-outline-variant/30 flex flex-col gap-1.5 w-64">
          <div className="flex items-center justify-between px-1 pb-1 border-b border-surface-container-low text-[11px] font-bold text-on-surface-variant uppercase">
            <span>Chuyển Vai Diễn (1-Click)</span>
            {user && (
              <span className="text-secondary font-semibold">
                Đang là: {user.role}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-1">
            {personas.map((p) => {
              const isActive = user?.role === p.role;
              return (
                <button
                  key={p.role}
                  disabled={isLoading}
                  onClick={() => switchDemoPersona(p.role)}
                  className={`flex items-center justify-between p-1.5 rounded-xl transition-all cursor-pointer text-left ${
                    isActive
                      ? "bg-secondary-fixed text-on-secondary-fixed font-bold ring-2 ring-secondary"
                      : "hover:bg-surface-container text-on-surface"
                  }`}
                  type="button"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={p.avatar}
                      alt={p.label}
                      className="w-7 h-7 rounded-full object-cover border border-outline-variant/40"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs leading-tight font-medium">
                        {p.label}
                      </span>
                      <span className="text-[10px] text-on-surface-variant leading-none">
                        {p.badge}
                      </span>
                    </div>
                  </div>
                  {isActive && (
                    <span className="material-symbols-outlined text-secondary text-[16px]">
                      check_circle
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-[10px] text-on-surface-variant/80 px-1 pt-1 text-center">
            Mã PIN mẫu: <strong>1234</strong> • Chuẩn SIWE Avalanche
          </p>
        </div>
      )}
    </div>
  );
};
