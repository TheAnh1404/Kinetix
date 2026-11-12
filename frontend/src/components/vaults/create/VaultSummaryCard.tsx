"use client";

import React from "react";
import {
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Layers,
  Users,
  Lock,
  Zap,
  Target,
  Clock,
  Sparkles,
  Info,
  Check,
  AlertCircle,
  Award,
} from "lucide-react";
import {
  VaultDraftForm,
  MemberCandidate,
} from "@/hooks/useCreateVaultState";
import {
  VaultTemplateDefinition,
  ProjectedYieldResult,
} from "@/lib/vaultTemplates";
import { SafeAvatar } from "@/components/ui/SafeAvatar";
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
    <div className="space-y-6">
      {/* Header Guide */}
      <div>
        <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
          {VAULT_MICROCOPY.step4Review.title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          {VAULT_MICROCOPY.step4Review.subtitle}
        </p>
      </div>

      {/* FINTECH DIGITAL VAULT CARD PREVIEW */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 p-5 sm:p-7 shadow-2xl shadow-emerald-950/30">
        {/* Glow & Texture Background */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Card Header: Brand, Type Badge, Chain Indicator */}
        <div className="relative flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20">
              KX
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-wider uppercase text-emerald-400 font-bold block">
                {workspaceName}
              </span>
              <span className="text-xs font-semibold text-slate-300">
                Avalanche Fuji Appchain
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{effectiveApy.toFixed(1)}% APY</span>
            </span>
          </div>
        </div>

        {/* Card Body: Vault Name & Tagline */}
        <div className="relative mb-6">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
            {template.title}
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
            {form.name || "Hũ Tiền Gia Đình"}
          </h2>
          {form.description ? (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {form.description}
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-1">
              {preset?.tagline || template.subtitle}
            </p>
          )}
        </div>

        {/* 3 Metric Pills */}
        <div className="relative grid grid-cols-3 gap-2.5 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block mb-0.5">Phân bổ vốn</span>
            <div className="text-xs sm:text-sm font-bold text-white font-mono flex items-center gap-1">
              <span className="text-sky-400">{form.bufferRatioBps / 100}%</span>
              <span>/</span>
              <span className="text-emerald-400">{(10000 - form.bufferRatioBps) / 100}%</span>
            </div>
            <span className="text-[9px] text-slate-400">L1 / C-Chain</span>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block mb-0.5">Biểu quyết</span>
            <div className="text-xs sm:text-sm font-bold text-white font-mono">
              {form.requiredApprovals}/{selectedGuardians.length} Người
            </div>
            <span className="text-[9px] text-emerald-400">
              {form.requiredApprovals === 1
                ? "Duyệt nhanh"
                : form.requiredApprovals === selectedGuardians.length
                ? "100% Đồng thuận"
                : "Đa số"}
            </span>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block mb-0.5">
              {form.ruleTemplate === "SHIELD"
                ? "Rút nhanh 0 gas"
                : form.ruleTemplate === "SHARED_GOAL"
                ? "Mục tiêu"
                : form.ruleTemplate === "ROSCA"
                ? "Góp mỗi kỳ"
                : "Thưởng việc"}
            </span>
            <div className="text-xs sm:text-sm font-bold text-white font-mono truncate">
              {form.ruleTemplate === "SHIELD"
                ? `${form.fastWithdrawLimit} AVAX`
                : form.ruleTemplate === "SHARED_GOAL"
                ? `${form.targetGoalAmount} AVAX`
                : form.ruleTemplate === "ROSCA"
                ? `${form.roscaRoundContribution} AVAX`
                : "8.0% APY"}
            </div>
            <span className="text-[9px] text-slate-400 truncate block">
              {form.ruleTemplate === "SHIELD"
                ? "Mỗi lần rút"
                : form.ruleTemplate === "SHARED_GOAL"
                ? "Chỉ tiêu"
                : form.ruleTemplate === "ROSCA"
                ? "Mỗi thành viên"
                : "Khen thưởng con"}
            </span>
          </div>
        </div>
      </div>

      {/* DETAILED GOVERNANCE & MEMBER SUMMARY */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-4">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Chi tiết thành viên & Quy tắc bảo vệ
        </h4>

        {/* Guardians List */}
        <div className="flex items-center justify-between text-xs py-2 border-b border-slate-800/60">
          <span className="text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Hội đồng Người bảo hộ ({selectedGuardians.length})
          </span>
          <div className="flex items-center gap-1">
            {selectedGuardians.slice(0, 3).map((g) => (
              <span
                key={g.id}
                className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-800 text-slate-200 px-2 py-0.5 rounded-lg"
              >
                {g.fullName}
              </span>
            ))}
            {selectedGuardians.length > 3 && (
              <span className="text-[11px] text-slate-400 font-mono">
                +{selectedGuardians.length - 3}
              </span>
            )}
          </div>
        </div>

        {/* Beneficiaries List */}
        <div className="flex items-center justify-between text-xs py-2 border-b border-slate-800/60">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-sky-400" />
            Người thụ hưởng ({selectedBeneficiaries.length})
          </span>
          <div className="flex items-center gap-1">
            {selectedBeneficiaries.slice(0, 3).map((b) => (
              <span
                key={b.id}
                className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-800 text-slate-200 px-2 py-0.5 rounded-lg"
              >
                {b.fullName}
              </span>
            ))}
            {selectedBeneficiaries.length > 3 && (
              <span className="text-[11px] text-slate-400 font-mono">
                +{selectedBeneficiaries.length - 3}
              </span>
            )}
          </div>
        </div>

        {/* Network & Zero Gas Note */}
        <div className="flex items-center justify-between text-xs py-1">
          <span className="text-slate-400">Phí giao dịch Family L1</span>
          <span className="text-emerald-400 font-semibold font-mono">0 GAS FEE (Miễn phí)</span>
        </div>
      </div>

      {/* POLICY CONSENT CHECKBOX */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-3">
        <label
          htmlFor="policy-consent-checkbox"
          className="flex items-start gap-3 cursor-pointer select-none"
        >
          <div className="pt-0.5">
            <input
              id="policy-consent-checkbox"
              type="checkbox"
              checked={form.policyAccepted}
              onChange={(e) => onPolicyAcceptedChange(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500/30 cursor-pointer accent-emerald-500"
            />
          </div>
          <div className="text-xs text-slate-300 leading-relaxed">
            <span className="font-semibold text-white">
              {VAULT_MICROCOPY.step4Review.consentText}
            </span>
            <p className="text-slate-400 mt-1 text-[11px]">
              {VAULT_MICROCOPY.step4Review.disclaimerSafe}
            </p>
          </div>
        </label>

        {policyError && (
          <p className="text-xs text-red-400 flex items-center gap-1.5 pl-7">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{policyError}</span>
          </p>
        )}
      </div>
    </div>
  );
}
