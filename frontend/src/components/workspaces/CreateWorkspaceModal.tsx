"use client";

import React, { useState, useEffect } from "react";
import { useFamily } from "@/context/FamilyContext";
import {
  WorkspaceType,
  WORKSPACE_PRESETS,
  getWorkspacePreset,
} from "@/config/workspacePresets";

export interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (workspace: any) => void;
}

/**
 * Danh sách 4 loại Không Gian chuẩn mực Kinetix OS
 */
const WORKSPACE_OPTIONS: {
  type: WorkspaceType;
  emoji: string;
  label: string;
  tagline: string;
}[] = [
  {
    type: "FAMILY",
    emoji: "👨‍👩‍👧‍👦",
    label: "Đại Gia Đình",
    tagline: "Đa thế hệ & an dưỡng tuổi già",
  },
  {
    type: "SIBLINGS",
    emoji: "🤝",
    label: "Anh Chị Em",
    tagline: "Góp vốn xoay vòng & phụng dưỡng",
  },
  {
    type: "FRIENDS",
    emoji: "🎒",
    label: "Hội Bạn Thân",
    tagline: "Mục tiêu chung & chia sẻ chi phí",
  },
  {
    type: "COMMUNITY",
    emoji: "🏛️",
    label: "CLB / Hội Nhóm",
    tagline: "Kho bạc & thưởng đóng góp",
  },
];

/**
 * Kinetix CreateWorkspaceModal
 * 
 * Thiết kế chuẩn mực Anti-AI Slop:
 * - Responsive: Bottom Sheet Drawer trên Mobile / Mobile Simulator, Centered Modal trên Desktop.
 * - 2x2 Grid hiển thị 4 loại Không Gian: Selected có viền Avalanche Red #E84142, nền đỏ nhạt tinh tế, checkmark sắc nét.
 * - Ô nhập tên cập nhật placeholder động theo loại đã chọn.
 * - Toggle switch: "Tự động khởi tạo 2 Hũ mẫu tiêu chuẩn cho nhóm này" (Mặc định BẬT).
 */
export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { createWorkspace } = useFamily();

  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>("FAMILY");
  const [workspaceName, setWorkspaceName] = useState("");
  const [autoSeedVaults, setAutoSeedVaults] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Metadata theo loại được chọn
  const currentPreset = getWorkspacePreset(workspaceType);

  // Reset form khi mở modal
  useEffect(() => {
    if (isOpen) {
      setWorkspaceName("");
      setErrorMessage(null);
      setWorkspaceType("FAMILY");
      setAutoSeedVaults(true);
    }
  }, [isOpen]);

  // Hỗ trợ bấm phím ESC để đóng modal an toàn
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = workspaceName.trim();
    if (!trimmed) {
      setErrorMessage("Vui lòng nhập tên cho Không gian mới.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await createWorkspace(trimmed, workspaceType);
      if (res.success) {
        if (onCreated) {
          onCreated(res.workspace);
        }
        onClose();
      } else {
        setErrorMessage(res.error || "Không thể tạo Không gian mới. Vui lòng thử lại.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Lỗi kết nối khi khởi tạo Không gian.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-workspace-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Dialog container: Bottom Sheet trên Mobile, Centered Modal trên Tablet/Desktop */}
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border-t sm:border border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Grab Bar */}
        <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-3 shrink-0 sm:hidden" />

        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/40 text-[#E84142] flex items-center justify-center font-bold shrink-0 border border-red-100 dark:border-red-900/50">
              <span className="material-symbols-outlined text-[22px]">
                add_business
              </span>
            </div>
            <div>
              <h2
                id="create-workspace-title"
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight"
              >
                Tạo Không Gian Mới
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Đa không gian chia sẻ tài chính trên Avalanche Family L1 (0đ gas)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Đóng"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-0.5">
          {/* Thông báo lỗi nếu có */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/80 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] shrink-0 text-red-600">
                error
              </span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Chọn Phân Loại Không Gian (2x2 Grid) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Phân Loại Không Gian
              </label>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                4 mẫu thiết kế chuyên biệt
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {WORKSPACE_OPTIONS.map((item) => {
                const isSelected = workspaceType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setWorkspaceType(item.type)}
                    className={`relative p-3 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between min-h-[76px] ${
                      isSelected
                        ? "border-[#E84142] bg-red-50/60 dark:bg-red-950/30 text-slate-900 dark:text-white ring-1.5 ring-[#E84142] shadow-xs"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <span className="text-2xl leading-none select-none">
                        {item.emoji}
                      </span>
                      {isSelected ? (
                        <span className="w-5 h-5 rounded-full bg-[#E84142] text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <span className="material-symbols-outlined text-[13px] font-bold">
                            check
                          </span>
                        </span>
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 shrink-0" />
                      )}
                    </div>

                    <div className="mt-1.5 min-w-0">
                      <div className="text-xs font-bold leading-tight truncate">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {item.tagline}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Nhập Tên Không Gian (Placeholder động theo Type) */}
          <div>
            <label
              htmlFor="workspace-name-input"
              className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
            >
              Tên Không Gian
            </label>
            <div className="relative">
              <input
                id="workspace-name-input"
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder={currentPreset.placeholderName}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#E84142]/20 focus:border-[#E84142] transition-colors"
                maxLength={60}
                required
              />
              <span className="absolute right-3 top-2.5 text-[11px] text-slate-400 font-mono select-none">
                {workspaceName.length}/60
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Gợi ý: {currentPreset.tagline}
            </p>
          </div>

          {/* 3. Toggle Switch: Tự động khởi tạo 2 Hũ mẫu tiêu chuẩn */}
          <div className="pt-1">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-800">
              <div className="pr-3">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Tự động khởi tạo 2 Hũ mẫu tiêu chuẩn cho nhóm này
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Được cấu hình sẵn tỷ lệ đệm thanh khoản L1 & C-Chain tối ưu
                </div>
              </div>

              {/* iOS / Fintech Style Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={autoSeedVaults}
                onClick={() => setAutoSeedVaults(!autoSeedVaults)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#E84142]/30 ${
                  autoSeedVaults ? "bg-[#E84142]" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    autoSeedVaults ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Preview 2 Hũ Mẫu Tiêu Chuẩn khi Toggle BẬT */}
            {autoSeedVaults && (
              <div className="mt-2.5 space-y-1.5 p-3 rounded-2xl bg-red-50/40 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#E84142] mb-1">
                  <span>2 Hũ mẫu chuẩn bị khởi tạo:</span>
                  <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                    Phí Gas: 0đ (L1)
                  </span>
                </div>

                {currentPreset.defaultVaultTemplates.map((vault, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base select-none shrink-0">
                        {vault.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white truncate text-[11px]">
                          {vault.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {vault.ruleTemplate} • {vault.bufferRatioBps / 100}% L1 /{" "}
                          {(10000 - vault.bufferRatioBps) / 100}% C-Chain
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-900/60 shrink-0">
                      8% APY
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !workspaceName.trim()}
              className="flex-1 py-2.5 rounded-xl bg-[#E84142] hover:bg-[#d33a3b] text-xs font-bold text-white shadow-xs transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">
                    progress_activity
                  </span>
                  <span>Đang khởi tạo...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">
                    add_circle
                  </span>
                  <span>Khởi Tạo Không Gian</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateWorkspaceModal;
