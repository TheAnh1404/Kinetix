"use client";

import React from "react";
import {
  ShieldCheck,
  UserCheck,
  Users,
  Check,
  AlertCircle,
  Sliders,
  UserPlus,
} from "lucide-react";
import { MemberCandidate } from "@/hooks/useCreateVaultState";
import { VaultRuleType } from "@/lib/vaultTemplates";
import { SafeAvatar } from "@/components/ui/SafeAvatar";
import { getMultisigRecommendations, VAULT_MICROCOPY } from "./designTokens";

interface GuardianSelectorProps {
  ruleTemplate: VaultRuleType;
  candidates: MemberCandidate[];
  selectedGuardianIds: string[];
  selectedBeneficiaryIds: string[];
  requiredApprovals: number;
  onToggleGuardian: (id: string) => void;
  onToggleBeneficiary: (id: string) => void;
  onSetRequiredApprovals: (count: number) => void;
  onSelectAllBeneficiaries: () => void;
  onManageMembers?: () => void;
  errors?: Record<string, string>;
  isLoading?: boolean;
}

export function GuardianSelector({
  ruleTemplate,
  candidates,
  selectedGuardianIds,
  selectedBeneficiaryIds,
  requiredApprovals,
  onToggleGuardian,
  onToggleBeneficiary,
  onSetRequiredApprovals,
  onSelectAllBeneficiaries,
  onManageMembers,
  errors = {},
  isLoading = false,
}: GuardianSelectorProps) {
  const recommendations = getMultisigRecommendations(selectedGuardianIds.length);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header Guide */}
      <div>
        <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
          {VAULT_MICROCOPY.step2Members.title}
        </h3>
        <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
          {VAULT_MICROCOPY.step2Members.subtitle}
        </p>
      </div>

      {isLoading ? (
        <div className="p-6 text-center bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400">Đang tải thành viên...</p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="p-4 text-center bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
          <p className="text-xs text-slate-300">Chưa có thành viên nào trong gia đình</p>
          {onManageMembers && (
            <button
              type="button"
              onClick={onManageMembers}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs rounded-lg transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Thêm thành viên</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {/* SECTION 1: GUARDIANS */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-white">
                  {VAULT_MICROCOPY.step2Members.guardiansTitle}
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-full border border-emerald-500/20 font-mono">
                  {selectedGuardianIds.length} chọn
                </span>
              </div>
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                {VAULT_MICROCOPY.step2Members.guardiansHint}
              </span>
            </div>

            {errors.guardianIds && (
              <p className="text-[11px] text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.guardianIds}</span>
              </p>
            )}

            {/* Compact Member Chips Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
              {candidates.map((member) => {
                const isSelected = selectedGuardianIds.includes(member.id);
                return (
                  <div
                    key={member.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onToggleGuardian(member.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onToggleGuardian(member.id);
                      }
                    }}
                    className={`flex items-center justify-between p-2 sm:p-2.5 rounded-lg sm:rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-emerald-950/20 border-emerald-500/50"
                        : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <SafeAvatar
                        name={member.fullName}
                        role={member.role}
                        size="sm"
                        className={isSelected ? "ring-1 ring-emerald-500/60" : ""}
                      />
                      <div className="truncate">
                        <p className="text-xs font-semibold text-white truncate">
                          {member.fullName}
                        </p>
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider block">
                          {member.role} {member.linked ? "• Ví Core" : ""}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                        isSelected
                          ? "bg-emerald-500 border-emerald-400 text-slate-950"
                          : "border-slate-700 bg-slate-900"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* MULTISIG THRESHOLD: Horizontal Segmented Pills */}
            {selectedGuardianIds.length > 0 && (
              <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-semibold flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-emerald-400" />
                    {VAULT_MICROCOPY.step2Members.thresholdLabel}
                  </span>
                  <span className="text-emerald-400 font-bold font-mono">
                    {requiredApprovals}/{selectedGuardianIds.length} người
                  </span>
                </div>

                {/* Horizontal Segmented Bar */}
                <div className="flex gap-1.5 flex-wrap">
                  {recommendations.map((rec, idx) => {
                    const isSelected = requiredApprovals === rec.threshold;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onSetRequiredApprovals(rec.threshold)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-emerald-500/20 border-emerald-500/70 text-emerald-300 ring-1 ring-emerald-500/30 font-bold"
                            : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        <span>{rec.shortLabel || `${rec.threshold}/${rec.total}`}</span>
                        {rec.isRecommended && (
                          <span className="text-[9px] bg-emerald-500/30 text-emerald-300 px-1 rounded font-normal">
                            Gợi ý
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: BENEFICIARIES */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-white">
                  {VAULT_MICROCOPY.step2Members.beneficiariesTitle}
                </span>
                <span className="text-[10px] text-sky-400 bg-sky-500/10 px-1.5 py-0.2 rounded-full border border-sky-500/20 font-mono">
                  {selectedBeneficiaryIds.length} chọn
                </span>
              </div>

              <button
                type="button"
                onClick={onSelectAllBeneficiaries}
                className="text-[10px] sm:text-xs text-sky-400 hover:text-sky-300 font-semibold px-2 py-0.5 rounded-md bg-sky-500/10 transition-colors"
              >
                {selectedBeneficiaryIds.length === candidates.length ? "Bỏ chọn" : "Chọn cả nhà"}
              </button>
            </div>

            {errors.beneficiaryIds && (
              <p className="text-[11px] text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.beneficiaryIds}</span>
              </p>
            )}

            {/* Beneficiary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
              {candidates.map((member) => {
                const isSelected = selectedBeneficiaryIds.includes(member.id);
                const isGuardian = selectedGuardianIds.includes(member.id);
                const isMilestoneConflict = ruleTemplate === "MILESTONE" && isGuardian;

                return (
                  <div
                    key={member.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (!isMilestoneConflict) {
                        onToggleBeneficiary(member.id);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (!isMilestoneConflict) {
                          onToggleBeneficiary(member.id);
                        }
                      }
                    }}
                    className={`flex items-center justify-between p-2 sm:p-2.5 rounded-lg sm:rounded-xl border transition-all ${
                      isMilestoneConflict
                        ? "bg-slate-950/20 border-slate-800/40 opacity-40 cursor-not-allowed"
                        : isSelected
                        ? "bg-sky-950/20 border-sky-500/50 cursor-pointer"
                        : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <SafeAvatar
                        name={member.fullName}
                        role={member.role}
                        size="sm"
                        className={isSelected ? "ring-1 ring-sky-500/60" : ""}
                      />
                      <div className="truncate">
                        <p className="text-xs font-semibold text-white truncate">
                          {member.fullName}
                        </p>
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider block">
                          {member.role} {isMilestoneConflict ? "• Đang là Guardian" : ""}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                        isSelected
                          ? "bg-sky-500 border-sky-400 text-slate-950"
                          : "border-slate-700 bg-slate-900"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
