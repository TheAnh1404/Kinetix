"use client";

import React from "react";
import {
  TrendingUp,
  ShieldCheck,
  Users,
  AlertCircle,
} from "lucide-react";
import {
  VaultDraftForm,
  MemberCandidate,
} from "@/hooks/useCreateVaultState";
import {
  VaultTemplateDefinition,
  ProjectedYieldResult,
} from "@/lib/vaultTemplates";
import { VAULT_MICROCOPY, VAULT_PRESETS } from "./designTokens";

interface VaultSummaryCardProps {
  form: VaultDraftForm;
  template: VaultTemplateDefinition;
  workspaceName?: string;
  selectedGuardians: MemberCandidate[];
  selectedBeneficiaries: MemberCandidate[];
  effectiveApy: number;
  projectedYield: ProjectedYieldResult;
  onPolicyAcceptedChange: (accepted: boolean) => void;
  policyError?: string;
}

export function VaultSummaryCard({
  form,
  template,
  workspaceName = "Gia đình Kinetix",
  selectedGuardians,
  selectedBeneficiaries,
  effectiveApy,
  projectedYield,
  onPolicyAcceptedChange,
  policyError,
}: VaultSummaryCardProps) {
  const preset = VAULT_PRESETS[form.ruleTemplate];

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header Guide */}
      <div>
        <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
          {VAULT_MICROCOPY.step4Review.title}
        </h3>
        <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
          {VAULT_MICROCOPY.step4Review.subtitle}
        </p>
      </div>

      {/* COMPACT FINTECH CARD PREVIEW */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border border-emerald-500/25 p-3.5 sm:p-5 shadow-lg">
        {/* Glow */}
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top bar: Workspace & APY badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-400 text-slate-950 font-black text-[10px] flex items-center justify-center">
              KX
            </div>
            <span className="text-[11px] font-bold text-slate-300 truncate max-w-[150px]">
              {workspaceName}
            </span>
          </div>

          <span className="text-xs font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
            <TrendingUp className="w-3 h-3" />
            <span>{effectiveApy.toFixed(1)}% APY</span>
          </span>
        </div>

        {/* Card Title */}
        <div className="mb-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {preset?.shortTitle || template.title}
          </span>
          <h2 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
            {form.name || "Hũ Tiền Mới"}
          </h2>
        </div>

        {/* 4 Compact Metric Tiles (2x2 on mobile, 4 in a row on desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2.5 border-t border-slate-800/80">
          <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/80">
            <span className="text-[9px] text-slate-400 block">Phân bổ vốn</span>
            <span className="text-xs font-bold text-white font-mono">
              <span className="text-sky-400">{form.bufferRatioBps / 100}%</span> /{" "}
              <span className="text-emerald-400">{(10000 - form.bufferRatioBps) / 100}%</span>
            </span>
            <span className="text-[8px] text-slate-400 block">L1 / C-Chain</span>
          </div>

          <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/80">
            <span className="text-[9px] text-slate-400 block">Duyệt chi lớn</span>
            <span className="text-xs font-bold text-white font-mono">
              {form.requiredApprovals}/{selectedGuardians.length} người
            </span>
            <span className="text-[8px] text-emerald-400 block">
              {form.requiredApprovals === 1 ? "Duyệt nhanh" : "Đồng thuận"}
            </span>
          </div>

          <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/80">
            <span className="text-[9px] text-slate-400 block">
              {form.ruleTemplate === "SHIELD"
                ? "Rút nhanh 0 gas"
                : form.ruleTemplate === "SHARED_GOAL"
                ? "Mục tiêu"
                : form.ruleTemplate === "ROSCA"
                ? "Góp mỗi kỳ"
                : "Thưởng việc"}
            </span>
            <span className="text-xs font-bold text-white font-mono truncate block">
              {form.ruleTemplate === "SHIELD"
                ? `${form.fastWithdrawLimit} AVAX`
                : form.ruleTemplate === "SHARED_GOAL"
                ? `${form.targetGoalAmount} AVAX`
                : form.ruleTemplate === "ROSCA"
                ? `${form.roscaRoundContribution} AVAX`
                : "8% APY"}
            </span>
            <span className="text-[8px] text-slate-400 block truncate">
              {form.ruleTemplate === "SHIELD" ? "Mỗi lần rút" : "Chỉ tiêu"}
            </span>
          </div>

          <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/80">
            <span className="text-[9px] text-slate-400 block">Phí mạng</span>
            <span className="text-xs font-bold text-emerald-400 font-mono block">0 GAS FEE</span>
            <span className="text-[8px] text-slate-400 block">Miễn phí L1</span>
          </div>
        </div>
      </div>

      {/* COMPACT MEMBER SUMMARY (1 line) */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5 sm:p-3 space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Guardians ({selectedGuardians.length}):
          </span>
          <span className="font-semibold text-white truncate max-w-[200px]">
            {selectedGuardians.map((g) => g.fullName).join(", ")}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-sky-400" />
            Người nhận ({selectedBeneficiaries.length}):
          </span>
          <span className="font-semibold text-white truncate max-w-[200px]">
            {selectedBeneficiaries.map((b) => b.fullName).join(", ")}
          </span>
        </div>
      </div>

      {/* 1-LINE POLICY CONSENT CHECKBOX */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5 sm:p-3 space-y-1.5">
        <label
          htmlFor="policy-consent-checkbox"
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <input
            id="policy-consent-checkbox"
            type="checkbox"
            checked={form.policyAccepted}
            onChange={(e) => onPolicyAcceptedChange(e.target.checked)}
            className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500/30 cursor-pointer accent-emerald-500 shrink-0"
          />
          <span className="text-xs text-slate-300 font-medium">
            {VAULT_MICROCOPY.step4Review.consentShort}
          </span>
        </label>

        {policyError && (
          <p className="text-[11px] text-red-400 flex items-center gap-1 pl-6">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{policyError}</span>
          </p>
        )}
      </div>
    </div>
  );
}
