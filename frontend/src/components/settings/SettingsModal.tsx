"use client";

import React from "react";
import { SettingsView, SettingsSection } from "./SettingsView";

export type { SettingsSection };

/**
 * SettingsModal (Hỗ trợ tương thích ngược).
 * Khuyến nghị sử dụng trang Cài Đặt toàn màn hình độc lập tại /settings.
 */
export function SettingsModal({
  isOpen,
  onClose,
  initialTab = "family_setup",
}: {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsSection;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100] p-2 sm:p-4 flex items-center justify-center animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full max-h-[94vh] overflow-y-auto p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white px-2 py-1 rounded-lg"
          >
            ✕ Đóng
          </button>
        </div>
        <SettingsView initialTab={initialTab} isStandalonePage={false} />
      </div>
    </div>
  );
}
