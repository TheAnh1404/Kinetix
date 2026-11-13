"use client";

import React from "react";
import {
  TrendingUp,
  Zap,
  Layers,
  Sparkles,
  Info,
  AlertCircle,
} from "lucide-react";
import { VaultRuleType, ProjectedYieldResult } from "@/lib/vaultTemplates";
import {
  LIQUIDITY_PRESETS,
  VAULT_MICROCOPY,
} from "./designTokens";

interface LiquidityBufferSliderProps {
  ruleTemplate: VaultRuleType;
  bufferRatioBps: number;
  bufferPercent: number;
  cchainPercent: number;
  effectiveApy: number;
  simulationPrincipal: number;
  projectedYield: ProjectedYieldResult;
  onBufferPercentChange: (percent: number) => void;
  onSimulationPrincipalChange: (val: number) => void;

  // Rule specific fields
  fastWithdrawLimit: string;
  onFastWithdrawLimitChange: (limit: string) => void;
  targetGoalAmount: string;
  onTargetGoalAmountChange: (amount: string) => void;
  targetDeadline: string;
  onTargetDeadlineChange: (deadline: string) => void;
  roscaRoundContribution: string;
  onRoscaRoundContributionChange: (amount: string) => void;
  roscaRoundDuration: string;
  onRoscaRoundDurationChange: (seconds: string) => void;

  errors?: Record<string, string>;
}

export function LiquidityBufferSlider({
  ruleTemplate,
  bufferRatioBps,
  bufferPercent,
  cchainPercent,
  effectiveApy,
  simulationPrincipal,
  projectedYield,
  onBufferPercentChange,
  onSimulationPrincipalChange,
  fastWithdrawLimit,
  onFastWithdrawLimitChange,
  targetGoalAmount,
  onTargetGoalAmountChange,
  targetDeadline,
  onTargetDeadlineChange,
  roscaRoundContribution,
  onRoscaRoundContributionChange,
  roscaRoundDuration,
  onRoscaRoundDurationChange,
  errors = {},
}: LiquidityBufferSliderProps) {
  const roscaDurationOptions = [
    { label: "7 ngày", value: "604800" },
    { label: "14 ngày", value: "1209600" },
    { label: "30 ngày", value: "2592000" },
  ];

  const handleSetTargetDays = (days: number) => {
    const targetDate = new Date(Date.now() + days * 86400 * 1000);
    onTargetDeadlineChange(targetDate.toISOString());
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header Guide */}
      <div>
        <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
          {VAULT_MICROCOPY.step3Rules.title}
        </h3>
        <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
          {VAULT_MICROCOPY.step3Rules.subtitle}
        </p>
      </div>

      {/* COMBINED COMPACT DUAL-CHAIN CARD */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-3">
        {/* Header row: split labels & APY */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-medium">
            <span className="text-sky-400 font-bold">{bufferPercent}% L1 (0 gas)</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-bold">{cchainPercent}% C-Chain (Lãi 8%)</span>
          </div>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1 font-mono">
            <TrendingUp className="w-3 h-3" />
            <span>{effectiveApy.toFixed(1)}% APY</span>
          </span>
        </div>

        {/* Visual Dual-track Bar */}
        <div className="h-5 w-full bg-slate-950 rounded-lg p-0.5 border border-slate-800 flex gap-0.5">
          <div
            style={{ width: `${bufferPercent}%` }}
            className="h-full bg-gradient-to-r from-sky-500 to-sky-400 rounded-md transition-all duration-150 flex items-center justify-center min-w-[20px]"
          >
            {bufferPercent >= 15 && (
              <span className="text-[9px] font-bold text-slate-950 select-none">
                {bufferPercent}%
              </span>
            )}
          </div>
          <div
            style={{ width: `${cchainPercent}%` }}
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-md transition-all duration-150 flex items-center justify-center min-w-[20px]"
          >
            {cchainPercent >= 15 && (
              <span className="text-[9px] font-bold text-slate-950 select-none">
                {cchainPercent}%
              </span>
            )}
          </div>
        </div>

        {/* Range Slider */}
        <div className="pt-0.5">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={bufferPercent}
            onChange={(e) => onBufferPercentChange(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
          />
        </div>

        {/* 4 Quick Preset Pills in a single row */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {LIQUIDITY_PRESETS.map((preset, idx) => {
            const isSelected = bufferPercent === preset.l1Percent;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onBufferPercentChange(preset.l1Percent)}
                className={`py-1.5 px-1 rounded-lg border text-center transition-all text-[11px] ${
                  isSelected
                    ? "bg-emerald-500/20 border-emerald-500/70 text-emerald-300 font-bold ring-1 ring-emerald-500/30"
                    : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <div className="truncate font-semibold">{preset.label}</div>
                <div className="text-[9px] font-mono text-slate-400">{preset.l1Percent}% L1</div>
              </button>
            );
          })}
        </div>

        {/* Clean 1-Liner Simulation Preview (Replaces bulky 4-card grid) */}
        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-300">
          <span className="text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>Ví dụ 10 AVAX:</span>
          </span>
          <span className="font-mono text-right truncate">
            <strong className="text-sky-300">{projectedYield.bufferAvax}</strong> rút 0s •{" "}
            <strong className="text-emerald-300">{projectedYield.cchainPrincipalAvax}</strong> sinh lãi ~
            <strong className="text-emerald-400">+{projectedYield.yearlyYieldAvax} AVAX/năm</strong>
          </span>
        </div>
      </div>

      {/* RULE-SPECIFIC FINANCIAL INPUTS (Clean & Compact) */}
      {ruleTemplate === "SHIELD" && (
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              {VAULT_MICROCOPY.step3Rules.fastLimitLabel}
            </span>
            <span className="text-[10px] text-slate-400">
              {VAULT_MICROCOPY.step3Rules.fastLimitHint}
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              value={fastWithdrawLimit}
              onChange={(e) => onFastWithdrawLimitChange(e.target.value)}
              placeholder="0.05"
              className="w-full bg-slate-950 text-white font-mono text-xs sm:text-sm rounded-lg px-3 py-2 border border-slate-800 focus:border-emerald-500 outline-none"
            />
            <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">
              AVAX / lần
            </span>
          </div>
          {errors.fastWithdrawLimit && (
            <p className="text-[11px] text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>{errors.fastWithdrawLimit}</span>
            </p>
          )}
        </div>
      )}

      {ruleTemplate === "SHARED_GOAL" && (
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-2.5">
          <div>
            <label className="text-xs font-semibold text-white block mb-1">
              {VAULT_MICROCOPY.step3Rules.goalLabel} <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={targetGoalAmount}
                onChange={(e) => onTargetGoalAmountChange(e.target.value)}
                placeholder="10.0"
                className="w-full bg-slate-950 text-white font-mono text-xs sm:text-sm rounded-lg px-3 py-2 border border-slate-800 focus:border-emerald-500 outline-none"
              />
              <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">
                AVAX
              </span>
            </div>
            {errors.targetGoalAmount && (
              <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.targetGoalAmount}</span>
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-white">
                {VAULT_MICROCOPY.step3Rules.goalDeadlineLabel} <span className="text-emerald-400">*</span>
              </label>
              <div className="flex gap-1">
                {[30, 60, 90].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => handleSetTargetDays(days)}
                    className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700"
                  >
                    +{days}N
                  </button>
                ))}
              </div>
            </div>
            <input
              type="datetime-local"
              value={targetDeadline ? targetDeadline.slice(0, 16) : ""}
              onChange={(e) => {
                if (e.target.value) {
                  onTargetDeadlineChange(new Date(e.target.value).toISOString());
                }
              }}
              className="w-full bg-slate-950 text-white text-xs rounded-lg px-3 py-2 border border-slate-800 focus:border-emerald-500 outline-none"
            />
          </div>
        </div>
      )}

      {ruleTemplate === "ROSCA" && (
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-2.5">
          <div>
            <label className="text-xs font-semibold text-white block mb-1">
              {VAULT_MICROCOPY.step3Rules.roscaContribLabel} <span className="text-teal-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={roscaRoundContribution}
                onChange={(e) => onRoscaRoundContributionChange(e.target.value)}
                placeholder="0.5"
                className="w-full bg-slate-950 text-white font-mono text-xs sm:text-sm rounded-lg px-3 py-2 border border-slate-800 focus:border-teal-500 outline-none"
              />
              <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">
                AVAX/người
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-white block mb-1">
              {VAULT_MICROCOPY.step3Rules.roscaDurationLabel}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {roscaDurationOptions.map((opt) => {
                const isSelected = roscaRoundDuration === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onRoscaRoundDurationChange(opt.value)}
                    className={`py-1.5 rounded-lg border text-center text-xs transition-all ${
                      isSelected
                        ? "bg-teal-500/20 border-teal-500/70 text-white font-bold"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
