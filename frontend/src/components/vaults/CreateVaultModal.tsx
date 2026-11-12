"use client";

import React, { useEffect, useRef } from "react";
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
 * Rebuilt from scratch into an elegant, non-AI-slop, consumer-friendly 4-step Wizard:
 * 1. Chọn Mục Đích (4 high-impact presets: SHIELD, SHARED_GOAL, MILESTONE, ROSCA)
 * 2. Phân Quyền Thành Viên (Guardians M/N & Beneficiaries)
 * 3. Phân Bổ Vốn & Lãi Suất (L1 Buffer vs C-Chain Yield & APY Real-time Engine)
 * 4. Xác Nhận & Ký On-Chain (Digital fintech card preview & Core Wallet signing)
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
      // Transaction successful callback
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-hidden animate-fade-in"
    >
      {/* Modal Dialog Card */}
      <div
        className="relative w-full max-w-3xl bg-slate-900/95 border border-slate-800 rounded-3xl p-4 sm:p-7 shadow-2xl shadow-slate-950/80 flex flex-col max-h-[92vh] overflow-hidden"
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
