"use client";

import React from "react";
import {
  ShieldCheck,
  UserCheck,
  Users,
  Check,
  AlertCircle,
  Info,
  Shield,
  UserPlus,
  ArrowRight,
  Sliders,
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
    <div className="space-y-6">
      {/* Header Guide */}
      <div>
        <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
          {VAULT_MICROCOPY.step2Members.title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          {VAULT_MICROCOPY.step2Members.subtitle}
        </p>
      </div>

      {isLoading ? (
        <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Đang tải danh sách thành viên gia đình...</p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="p-6 text-center bg-slate-900/80 border border-slate-800 rounded-2xl space-y-3">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white">Chưa có thành viên nào trong gia đình</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Bạn cần thêm ít nhất một thành viên vào gia đình để phân quyền bảo hộ và thụ hưởng hũ tiền.
          </p>
          {onManageMembers && (
            <button
              type="button"
              onClick={onManageMembers}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs rounded-xl transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Thêm thành viên ngay</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECTION 1: GUARDIANS (HỘI ĐỒNG BẢO HỘ) */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{VAULT_MICROCOPY.step2Members.guardianSectionTitle}</span>
                    <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      {selectedGuardianIds.length} đã chọn
                    </span>
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-400">
                    {VAULT_MICROCOPY.step2Members.guardianSectionDesc}
                  </p>
                </div>
              </div>
            </div>

            {errors.guardianIds && (
              <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errors.guardianIds}</span>
              </div>
            )}

            {/* Guardian Candidate Chips Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-emerald-950/20 border-emerald-500/50 shadow-sm shadow-emerald-500/10"
                        : "bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <SafeAvatar
                        name={member.fullName}
                        role={member.role}
                        size="sm"
                        className={isSelected ? "ring-2 ring-emerald-500/50" : ""}
                      />
                      <div className="truncate">
                        <p className="text-xs font-semibold text-white truncate">
                          {member.fullName}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <span className="uppercase tracking-wider">{member.role}</span>
                          {member.linked ? (
                            <span className="text-emerald-400 flex items-center gap-0.5">
                              • Ví Core đã kết nối
                            </span>
                          ) : (
                            <span className="text-amber-400 flex items-center gap-0.5">
                              • Chưa liên kết ví
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                        isSelected
                          ? "bg-emerald-500 border-emerald-400 text-slate-950"
                          : "border-slate-700 bg-slate-900"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* MULTISIG THRESHOLD M/N SELECTOR */}
            {selectedGuardianIds.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">
                      Ngưỡng duyệt chi lớn ({requiredApprovals}/{selectedGuardianIds.length} người)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {requiredApprovals === 1
                      ? "Bất kỳ ai ký duyệt là giải ngân"
                      : requiredApprovals === selectedGuardianIds.length
                      ? "Cần 100% đồng thuận"
                      : `Cần ít nhất ${requiredApprovals} người ký`}
                  </span>
                </div>

                {/* Preset Threshold Options */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {recommendations.map((rec, idx) => {
                    const isSelected = requiredApprovals === rec.threshold;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onSetRequiredApprovals(rec.threshold)}
                        className={`text-left p-2.5 rounded-xl border text-xs transition-all ${
                          isSelected
                            ? "bg-emerald-500/15 border-emerald-500/60 text-white shadow-sm ring-1 ring-emerald-500/30"
                            : "bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs">{rec.label}</span>
                          {rec.isRecommended && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-medium">
                              Khuyên dùng
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          {rec.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: BENEFICIARIES (NGƯỜI THỤ HƯỞNG) */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{VAULT_MICROCOPY.step2Members.beneficiarySectionTitle}</span>
                    <span className="text-xs font-normal text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                      {selectedBeneficiaryIds.length} đã chọn
                    </span>
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-400">
                    {VAULT_MICROCOPY.step2Members.beneficiarySectionDesc}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onSelectAllBeneficiaries}
                className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 transition-colors"
              >
                {selectedBeneficiaryIds.length === candidates.length
                  ? "Bỏ chọn tất cả"
                  : "Chọn cả gia đình"}
              </button>
            </div>

            {errors.beneficiaryIds && (
              <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errors.beneficiaryIds}</span>
              </div>
            )}

            {/* Beneficiary Candidate Chips Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {candidates.map((member) => {
                const isSelected = selectedBeneficiaryIds.includes(member.id);
                const isGuardian = selectedGuardianIds.includes(member.id);
                // Milestone restriction: beneficiary cannot be guardian
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
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isMilestoneConflict
                        ? "bg-slate-950/20 border-slate-800/40 opacity-40 cursor-not-allowed"
                        : isSelected
                        ? "bg-sky-950/20 border-sky-500/50 shadow-sm shadow-sky-500/10 cursor-pointer"
                        : "bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <SafeAvatar
                        name={member.fullName}
                        role={member.role}
                        size="sm"
                        className={isSelected ? "ring-2 ring-sky-500/50" : ""}
                      />
                      <div className="truncate">
                        <p className="text-xs font-semibold text-white truncate">
                          {member.fullName}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <span className="uppercase tracking-wider">{member.role}</span>
                          {isMilestoneConflict && (
                            <span className="text-amber-400">• Đang là Guardian (không được tự nhận thưởng)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                        isSelected
                          ? "bg-sky-500 border-sky-400 text-slate-950"
                          : "border-slate-700 bg-slate-900"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
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
