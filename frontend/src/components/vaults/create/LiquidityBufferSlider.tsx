"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  Zap,
  Shield,
  Layers,
  Coins,
  Calendar,
  Clock,
  Sparkles,
  Info,
  DollarSign,
  AlertCircle,
  Flame,
} from "lucide-react";
import { VaultRuleType, ProjectedYieldResult } from "@/lib/vaultTemplates";
import {
  LIQUIDITY_PRESETS,
  calculateEffectiveApy,
  simulateVaultYield,
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
  const [showSimDetails, setShowSimDetails] = useState(true);

  // Quick duration options for ROSCA
  const roscaDurationOptions = [
    { label: "1 Tuần (7 ngày)", value: "604800" },
    { label: "2 Tuần (14 ngày)", value: "1209600" },
    { label: "1 Tháng (30 ngày)", value: "2592000" },
  ];

  // Quick deadline options for SHARED_GOAL
  const handleSetTargetDays = (days: number) => {
    const targetDate = new Date(Date.now() + days * 86400 * 1000);
    onTargetDeadlineChange(targetDate.toISOString());
  };

  return (
    <div className="space-y-6">
      {/* Header Guide */}
      <div>
        <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
          {VAULT_MICROCOPY.step3Rules.title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          {VAULT_MICROCOPY.step3Rules.subtitle}
        </p>
      </div>

      {/* DUAL-CHAIN LIQUIDITY ALLOCATION CARD */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 sm:p-6 space-y-5">
        {/* Visual Dual-track Bar */}
        <div>
          <div className="flex items-center justify-between mb-2 text-xs">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              Tỷ lệ phân bổ vốn Dual-Chain
            </span>
            <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold text-xs">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{effectiveApy.toFixed(1)}% APY hiệu dụng</span>
            </div>
          </div>

          {/* Visual Track */}
          <div className="h-6 w-full bg-slate-950 rounded-xl p-1 border border-slate-800/80 flex gap-1">
            <div
              style={{ width: `${bufferPercent}%` }}
              className="h-full bg-gradient-to-r from-sky-500 to-sky-400 rounded-lg transition-all duration-200 flex items-center justify-center min-w-[28px]"
            >
              {bufferPercent >= 10 && (
                <span className="text-[10px] font-bold text-slate-950 select-none">
                  {bufferPercent}%
                </span>
              )}
            </div>
            <div
              style={{ width: `${cchainPercent}%` }}
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-lg transition-all duration-200 flex items-center justify-center min-w-[28px]"
            >
              {cchainPercent >= 10 && (
                <span className="text-[10px] font-bold text-slate-950 select-none">
                  {cchainPercent}%
                </span>
              )}
            </div>
          </div>

          {/* Track Labels */}
          <div className="mt-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0" />
              <span className="text-slate-300 font-medium">
                Family L1: <strong className="text-white">{bufferPercent}%</strong>
              </span>
              <span className="text-[11px] text-sky-400 hidden sm:inline">(Rút nhanh 0 gas)</span>
            </div>
            <div className="flex items-center gap-2 text-right">
              <span className="text-[11px] text-emerald-400 hidden sm:inline">(Sinh lời 8.0% APY)</span>
              <span className="text-slate-300 font-medium">
                Fuji C-Chain: <strong className="text-white">{cchainPercent}%</strong>
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
            </div>
          </div>
        </div>

        {/* Range Slider */}
        <div className="space-y-1.5">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={bufferPercent}
            onChange={(e) => onBufferPercentChange(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>0% (Tối đa lãi 8%)</span>
            <span>20% (Khuyến nghị chi tiêu)</span>
            <span>50%</span>
            <span>100% (Thuần rút nhanh)</span>
          </div>
        </div>

        {/* Quick Presets Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {LIQUIDITY_PRESETS.map((preset, idx) => {
            const isSelected = bufferPercent === preset.l1Percent;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onBufferPercentChange(preset.l1Percent)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "bg-emerald-500/15 border-emerald-500/60 text-white shadow-sm ring-1 ring-emerald-500/30"
                    : "bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold truncate">{preset.label}</span>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                    {preset.badge}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {preset.l1Percent}% L1 / {preset.cChainPercent}% C-Chain
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* REAL-TIME YIELD PROJECTION ESTIMATOR */}
      <div className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-emerald-500/20 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg shadow-emerald-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                Ước tính lợi tức thực tế
              </h4>
              <p className="text-[11px] text-slate-400">
                Lãi suất thụ động tự động ghi nhận theo từng giây trên C-Chain
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400">Giả định vốn:</span>
            <input
              type="number"
              min={1}
              max={1000}
              value={simulationPrincipal}
              onChange={(e) =>
                onSimulationPrincipalChange(Math.max(1, Number(e.target.value) || 1))
              }
              className="w-14 bg-transparent text-white font-bold text-xs text-right outline-none focus:text-emerald-400"
            />
            <span className="text-xs font-bold text-slate-300">AVAX</span>
          </div>
        </div>

        {/* Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block mb-0.5">Đệm L1 (0 gas)</span>
            <span className="text-sm font-bold text-sky-400 font-mono">
              {projectedYield.bufferAvax} AVAX
            </span>
            <span className="text-[10px] text-slate-400 block">Rút tức thì &lt;1s</span>
          </div>

          <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block mb-0.5">Vốn C-Chain</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">
              {projectedYield.cchainPrincipalAvax} AVAX
            </span>
            <span className="text-[10px] text-slate-400 block">Sinh lời 8%/năm</span>
          </div>

          <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block mb-0.5">Lãi 30 ngày</span>
            <span className="text-sm font-bold text-emerald-300 font-mono">
              +{projectedYield.monthlyYieldAvax} AVAX
            </span>
            <span className="text-[10px] text-slate-400 block">Thu nhập thụ động</span>
          </div>

          <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block mb-0.5">Lãi 1 năm</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">
              +{projectedYield.yearlyYieldAvax} AVAX
            </span>
            <span className="text-[10px] text-emerald-400/90 font-semibold block">
              Tổng: {projectedYield.projectedTotalAvax} AVAX
            </span>
          </div>
        </div>
      </div>

      {/* RULE-SPECIFIC FINANCIAL CONTROLS */}
      {ruleTemplate === "SHIELD" && (
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-white">
              {VAULT_MICROCOPY.step3Rules.fastWithdrawLabel}
            </h4>
          </div>
          <p className="text-xs text-slate-400">
            {VAULT_MICROCOPY.step3Rules.fastWithdrawDesc}
          </p>

          <div className="relative">
            <input
              type="text"
              value={fastWithdrawLimit}
              onChange={(e) => onFastWithdrawLimitChange(e.target.value)}
              placeholder="0.05"
              className="w-full bg-slate-950 text-white font-mono text-sm rounded-xl px-4 py-3 border border-slate-800 focus:border-emerald-500 transition-colors outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">
              AVAX / lần
            </span>
          </div>
          {errors.fastWithdrawLimit && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errors.fastWithdrawLimit}</span>
            </p>
          )}

          <div className="p-3 bg-sky-950/20 border border-sky-500/20 rounded-xl text-xs text-sky-300/90 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />
            <span>
              <strong>Cơ chế tự bảo vệ:</strong> Rút $\le$ {fastWithdrawLimit || "0"} AVAX được
              giải ngân tức thì từ đệm L1. Nếu rút vượt mức này, hệ thống tự động yêu cầu Hội
              đồng Người bảo hộ phê duyệt on-chain trước khi xuất tiền.
            </span>
          </div>
        </div>
      )}

      {ruleTemplate === "SHARED_GOAL" && (
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-white mb-1.5">
              {VAULT_MICROCOPY.step3Rules.targetGoalLabel}{" "}
              <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={targetGoalAmount}
                onChange={(e) => onTargetGoalAmountChange(e.target.value)}
                placeholder="10.0"
                className="w-full bg-slate-950 text-white font-mono text-sm rounded-xl px-4 py-3 border border-slate-800 focus:border-emerald-500 transition-colors outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">
                AVAX
              </span>
            </div>
            {errors.targetGoalAmount && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.targetGoalAmount}</span>
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs sm:text-sm font-semibold text-white">
                {VAULT_MICROCOPY.step3Rules.targetDeadlineLabel}{" "}
                <span className="text-emerald-400">*</span>
              </label>
              <div className="flex gap-1.5">
                {[30, 60, 90].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => handleSetTargetDays(days)}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-700 transition-colors"
                  >
                    +{days} ngày
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
              className="w-full bg-slate-950 text-white text-xs sm:text-sm rounded-xl px-4 py-3 border border-slate-800 focus:border-emerald-500 transition-colors outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            {errors.targetDeadline && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.targetDeadline}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {ruleTemplate === "ROSCA" && (
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-white mb-1.5">
              {VAULT_MICROCOPY.step3Rules.roscaContributionLabel}{" "}
              <span className="text-teal-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={roscaRoundContribution}
                onChange={(e) => onRoscaRoundContributionChange(e.target.value)}
                placeholder="0.5"
                className="w-full bg-slate-950 text-white font-mono text-sm rounded-xl px-4 py-3 border border-slate-800 focus:border-teal-500 transition-colors outline-none focus:ring-2 focus:ring-teal-500/30"
              />
              <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">
                AVAX / thành viên
              </span>
            </div>
            {errors.roscaRoundContribution && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.roscaRoundContribution}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-white mb-1.5">
              {VAULT_MICROCOPY.step3Rules.roscaDurationLabel}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {roscaDurationOptions.map((opt) => {
                const isSelected = roscaRoundDuration === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onRoscaRoundDurationChange(opt.value)}
                    className={`p-2.5 rounded-xl border text-center text-xs transition-all ${
                      isSelected
                        ? "bg-teal-500/15 border-teal-500/60 text-white font-bold ring-1 ring-teal-500/30"
                        : "bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {errors.roscaRoundDuration && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.roscaRoundDuration}</span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
