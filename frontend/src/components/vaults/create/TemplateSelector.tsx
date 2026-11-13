"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Target,
  Trophy,
  Users,
  Check,
  TrendingUp,
  Info,
  Lightbulb,
  Plus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { VaultRuleType, TEMPLATE_LIST } from "@/lib/vaultTemplates";
import { VAULT_PRESETS, VAULT_MICROCOPY } from "./designTokens";

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
  const [showDescription, setShowDescription] = useState(Boolean(vaultDescription));
  const selectedPreset = VAULT_PRESETS[selectedTemplateId];

  return (
    <div className="space-y-3.5 sm:space-y-5">
      {/* Header Guide: 1 short line on mobile */}
      <div>
        <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
          {VAULT_MICROCOPY.step1Preset.title}
        </h3>
        <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
          {VAULT_MICROCOPY.step1Preset.subtitle}
        </p>
      </div>

      {/* 2-Column Compact Grid on mobile & desktop */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {TEMPLATE_LIST.map((tpl) => {
          const isSelected = tpl.id === selectedTemplateId;
          const preset = VAULT_PRESETS[tpl.id];
          const Icon = TEMPLATE_ICONS[tpl.id] || ShieldCheck;

          let borderClass = "border-slate-800/80 hover:border-slate-700 bg-slate-900/60";
          let iconBg = "bg-slate-800 text-slate-300";
          let apyText = "text-emerald-400";

          if (tpl.id === "SHIELD") {
            iconBg = "bg-emerald-500/15 text-emerald-400";
            if (isSelected) {
              borderClass = "border-emerald-500/70 bg-emerald-950/25 shadow-sm shadow-emerald-500/10 ring-1 ring-emerald-500/30";
            }
          } else if (tpl.id === "SHARED_GOAL") {
            iconBg = "bg-amber-500/15 text-amber-400";
            if (isSelected) {
              borderClass = "border-amber-500/70 bg-amber-950/25 shadow-sm shadow-amber-500/10 ring-1 ring-amber-500/30";
            }
          } else if (tpl.id === "MILESTONE") {
            iconBg = "bg-violet-500/15 text-violet-400";
            if (isSelected) {
              borderClass = "border-violet-500/70 bg-violet-950/25 shadow-sm shadow-violet-500/10 ring-1 ring-violet-500/30";
            }
          } else if (tpl.id === "ROSCA") {
            iconBg = "bg-teal-500/15 text-teal-400";
            if (isSelected) {
              borderClass = "border-teal-500/70 bg-teal-950/25 shadow-sm shadow-teal-500/10 ring-1 ring-teal-500/30";
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
              className={`relative text-left p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-150 cursor-pointer group flex flex-col justify-between min-h-[105px] sm:min-h-[125px] ${borderClass}`}
            >
              <div>
                {/* Header: Icon + Radio */}
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
                  </div>

                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                      isSelected
                        ? "bg-emerald-500 border-emerald-400 text-slate-950 shadow-xs"
                        : "border-slate-700 bg-slate-800"
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </div>

                {/* Title */}
                <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
                  {preset?.shortTitle || tpl.title}
                </h4>

                {/* Concise 1-line Tagline */}
                <p className="text-[10px] sm:text-[11px] text-slate-400 line-clamp-1 mt-0.5 leading-tight">
                  {preset?.tagline || tpl.subtitle}
                </p>
              </div>

              {/* Bottom: APY & Split pill */}
              <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-mono text-[9px] sm:text-[10px]">
                  {preset?.splitSummary || `${tpl.defaultBufferRatioBps / 100}% L1`}
                </span>
                <span className={`font-bold flex items-center gap-0.5 ${apyText}`}>
                  <TrendingUp className="w-2.5 h-2.5" />
                  <span>{preset?.effectiveApyFormatted || "8% APY"}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vault Name Input & Quick Suggestion Chips */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-2.5">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="vault-name-input"
              className="text-xs font-semibold text-slate-200"
            >
              {VAULT_MICROCOPY.step1Preset.fieldVaultName} <span className="text-emerald-400">*</span>
            </label>
            {/* Quick Name Chips */}
            {selectedPreset?.quickNames && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedPreset.quickNames.map((name, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onNameChange(name)}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-0.5 rounded-md border border-slate-700/60 transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            id="vault-name-input"
            type="text"
            value={vaultName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={selectedPreset?.quickNames?.[0] || VAULT_MICROCOPY.step1Preset.namePlaceholder}
            maxLength={80}
            className={`w-full bg-slate-950 text-white placeholder-slate-500 text-xs sm:text-sm rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 border transition-colors outline-none focus:ring-1 focus:ring-emerald-500/40 ${
              nameError
                ? "border-red-500 focus:border-red-500"
                : "border-slate-800 focus:border-emerald-500"
            }`}
          />
          {nameError && (
            <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0" />
              <span>{nameError}</span>
            </p>
          )}
        </div>

        {/* Progressive Disclosure for Description */}
        <div>
          {!showDescription ? (
            <button
              type="button"
              onClick={() => setShowDescription(true)}
              className="text-[11px] text-slate-400 hover:text-slate-300 flex items-center gap-1 font-medium py-0.5 transition-colors"
            >
              <Plus className="w-3 h-3 text-emerald-400" />
              <span>{VAULT_MICROCOPY.step1Preset.addNoteToggle}</span>
            </button>
          ) : (
            <div className="space-y-1 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400">
                  {VAULT_MICROCOPY.step1Preset.fieldDesc}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowDescription(false);
                    onDescriptionChange("");
                  }}
                  className="text-[10px] text-slate-400 hover:text-slate-300"
                >
                  Thu gọn
                </button>
              </div>
              <textarea
                value={vaultDescription}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder={VAULT_MICROCOPY.step1Preset.descPlaceholder}
                rows={2}
                maxLength={200}
                className="w-full bg-slate-950 text-white placeholder-slate-500 text-xs rounded-lg px-3 py-1.5 border border-slate-800 focus:border-emerald-500 outline-none resize-none"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
