"use client";

import React, { useEffect } from "react";
import { useFamily } from "@/context/FamilyContext";
import { useCreateVaultState } from "@/hooks/useCreateVaultState";
import { CreateVaultWizard } from "./create/CreateVaultWizard";

export interface CreateVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNext?: (vault: any, action: "deposit" | "chore") => void;
  onManage?: (draftId: string) => void;
  initialDraftId?: string;
}

/**
 * Kinetix CreateVaultModal
 * 
 * Mobile-First & Anti-AI-Slop 4-Step Wizard:
 * - Mobile (360px-430px): Sleek bottom-sheet modal (`max-h-[92dvh] rounded-t-3xl`), thumb-friendly sticky nav
 * - Desktop: Centered glassmorphic card modal (`max-w-2xl rounded-3xl`)
 * 
 * 1. Chọn Mục Đích (Compact 2x2 grid, 1-line taglines, quick name chips)
 * 2. Thành Viên (SafeAvatar chips, horizontal segmented multisig pills)
 * 3. Đệm & Lợi Nhuận (Dual-chain visual slider, 1-line yield simulation)
 * 4. Xác Nhận (Compact fintech card, 1-line policy consent)
 */
export function CreateVaultModal({
  isOpen,
  onClose,
  onNext,
  onManage,
  initialDraftId,
}: CreateVaultModalProps) {
  const { currentWorkspace } = useFamily();

  const state = useCreateVaultState({
    isOpen,
    initialDraftId,
    onSuccess: (vault) => {
      if (onNext) {
        onNext(vault, vault?.ruleTemplate === "MILESTONE" ? "chore" : "deposit");
      }
    },
    onError: (err) => {
      console.error("[CreateVaultModal] Creation error:", err);
    },
  });

  // Handle ESC key safely
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !state.isBusy) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, state.isBusy, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="vault-creation-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden animate-fade-in"
    >
      {/* Dialog Container: Bottom Sheet on Mobile, Centered Modal on Tablet/Desktop */}
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-3 sm:p-5 shadow-2xl shadow-slate-950 flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <CreateVaultWizard
          state={state}
          workspaceName={currentWorkspace?.name}
          onClose={onClose}
          onManageMembers={async () => {
            if (onManage) {
              const id = state.draftId || (await state.saveDraft()) || "";
              onManage(id);
            }
          }}
          onDepositNow={(vault) => {
            if (onNext) {
              onNext(vault, "deposit");
            } else {
              onClose();
            }
          }}
        />
      </div>
    </div>
  );
}

export default CreateVaultModal;
