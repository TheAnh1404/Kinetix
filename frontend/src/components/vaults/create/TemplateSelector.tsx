"use client";

import React from "react";
import {
  ShieldCheck,
  Target,
  Trophy,
  Users,
  Sparkles,
  TrendingUp,
  Check,
  Info,
  Lightbulb,
} from "lucide-react";
import { VaultRuleType, VaultTemplateDefinition, TEMPLATE_LIST } from "@/lib/vaultTemplates";
import { VAULT_PRESETS, VAULT_MICROCOPY, VAULT_COLORS } from "./designTokens";

interface TemplateSelectorProps {
  selectedTemplateId: VaultRuleType;
  onSelectTemplate: (templateId: VaultRuleType) => void;
  vaultName: string;
  onNameChange: (name: string) => void;
  vaultDescription: string;
  onDescriptionChange: (description: string) => void;
  nameError?: string;
}

const TEMPLATE_ICONS: Record<VaultRuleType, React.ElementType> = {
  SHIELD: ShieldCheck,
  SHARED_GOAL: Target,
  MILESTONE: Trophy,
  ROSCA: Users,
};

export function TemplateSelector({
  selectedTemplateId,
  onSelectTemplate,
  vaultName,
  onNameChange,
  vaultDescription,
  onDescriptionChange,
  nameError,
}: TemplateSelectorProps) {
  const selectedPreset = VAULT_PRESETS[selectedTemplateId];

  return (
    <div className="space-y-6">
      {/* Header Guide */}
      <div>
        <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>{VAULT_MICROCOPY.step1Preset.title}</span>
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          {VAULT_MICROCOPY.step1Preset.subtitle}
        </p>
      </div>

      {/* 4 Template Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {TEMPLATE_LIST.map((tpl) => {
          const isSelected = tpl.id === selectedTemplateId;
          const preset = VAULT_PRESETS[tpl.id];
          const Icon = TEMPLATE_ICONS[tpl.id] || ShieldCheck;

          // Theme styling
          let borderClass = "border-slate-800 hover:border-slate-700 bg-slate-900/60";
          let badgeBg = "bg-slate-800 text-slate-300";
          let iconBg = "bg-slate-800 text-slate-300";

          if (tpl.id === "SHIELD") {
            badgeBg = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
            iconBg = "bg-emerald-500/15 text-emerald-400";
            if (isSelected) {
              borderClass = "border-emerald-500/60 bg-emerald-950/20 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30";
            }
          } else if (tpl.id === "SHARED_GOAL") {
            badgeBg = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
            iconBg = "bg-amber-500/15 text-amber-400";
            if (isSelected) {
              borderClass = "border-amber-500/60 bg-amber-950/20 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30";
            }
          } else if (tpl.id === "MILESTONE") {
            badgeBg = "bg-violet-500/10 text-violet-400 border border-violet-500/20";
            iconBg = "bg-violet-500/15 text-violet-400";
            if (isSelected) {
              borderClass = "border-violet-500/60 bg-violet-950/20 shadow-lg shadow-violet-500/10 ring-1 ring-violet-500/30";
            }
          } else if (tpl.id === "ROSCA") {
            badgeBg = "bg-teal-500/10 text-teal-400 border border-teal-500/20";
            iconBg = "bg-teal-500/15 text-teal-400";
            if (isSelected) {
              borderClass = "border-teal-500/60 bg-teal-950/20 shadow-lg shadow-teal-500/10 ring-1 ring-teal-500/30";
            }
          }

          return (
            <div
              key={tpl.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectTemplate(tpl.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectTemplate(tpl.id);
                }
              }}
              className={`relative text-left p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer group flex flex-col justify-between ${borderClass}`}
            >
              <div>
                {/* Top Row: Icon, Badge, Radio/Check */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${iconBg}`}
                    >
                      <Icon className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full inline-block ${badgeBg}`}>
                        {preset?.badge || tpl.badge}
                      </span>
                      <h4 className="text-base font-bold text-white mt-1 group-hover:text-emerald-300 transition-colors">
                        {preset?.title || tpl.title}
                      </h4>
                    </div>
                  </div>

                  {/* Selection Radio Indicator */}
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                      isSelected
                        ? "bg-emerald-500 border-emerald-400 text-slate-950 shadow-sm shadow-emerald-500/40"
                        : "border-slate-700 bg-slate-800/80 group-hover:border-slate-600"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                {/* Tagline / Description */}
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  {preset?.tagline || tpl.subtitle}
                </p>

                {/* Highlights List */}
                <ul className="space-y-1.5 mb-4">
                  {(preset?.highlights || tpl.features.slice(0, 3)).map((item, idx) => (
                    <li
                      key={idx}
                      className="text-[11px] sm:text-xs text-slate-400 flex items-start gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70 shrink-0 mt-1.5" />
                      <span className="leading-tight">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bottom Split & APY Tag */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                  <span className="text-sky-400 font-medium">
                    {tpl.defaultBufferRatioBps / 100}% L1
                  </span>
                  <span>/</span>
                  <span className="text-emerald-400 font-medium">
                    {(10000 - tpl.defaultBufferRatioBps) / 100}% C-Chain
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-[11px] font-semibold">
                  <TrendingUp className="w-3 h-3" />
                  <span>
                    {(8.0 * (10000 - tpl.defaultBufferRatioBps) / 10000).toFixed(1)}% APY
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vault Name & Suggestions */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-4">
        <div>
          <label
            htmlFor="vault-name-input"
            className="block text-xs sm:text-sm font-semibold text-slate-200 mb-1.5"
          >
            {VAULT_MICROCOPY.step1Preset.fieldVaultName}{" "}
            <span className="text-emerald-400">*</span>
          </label>
          <input
            id="vault-name-input"
            type="text"
            value={vaultName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={
              selectedPreset?.suggestedNames?.[0] ||
              VAULT_MICROCOPY.step1Preset.namePlaceholder
            }
            maxLength={80}
            className={`w-full bg-slate-950/80 text-white placeholder-slate-500 text-sm rounded-xl px-4 py-3 border transition-colors outline-none focus:ring-2 focus:ring-emerald-500/30 ${
              nameError
                ? "border-red-500 focus:border-red-500"
                : "border-slate-800 focus:border-emerald-500"
            }`}
          />
          {nameError && (
            <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>{nameError}</span>
            </p>
          )}

          {/* Smart Suggestion Chips */}
          {selectedPreset?.suggestedNames && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                <Lightbulb className="w-3 h-3 text-amber-400" />
                Gợi ý tên:
              </span>
              {selectedPreset.suggestedNames.slice(0, 3).map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onNameChange(suggestion)}
                  className="text-[11px] bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700/60 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Optional Description */}
        <div>
          <label
            htmlFor="vault-desc-input"
            className="block text-xs sm:text-sm font-semibold text-slate-200 mb-1.5"
          >
            {VAULT_MICROCOPY.step1Preset.fieldDesc}
          </label>
          <textarea
            id="vault-desc-input"
            value={vaultDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder={VAULT_MICROCOPY.step1Preset.descPlaceholder}
            rows={2}
            maxLength={300}
            className="w-full bg-slate-950/80 text-white placeholder-slate-500 text-xs sm:text-sm rounded-xl px-4 py-2.5 border border-slate-800 focus:border-emerald-500 transition-colors outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
          />
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Info className="w-3 h-3 shrink-0 text-slate-400" />
            <span>{VAULT_MICROCOPY.step1Preset.privacyNote}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
