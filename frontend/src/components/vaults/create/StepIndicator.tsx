"use client";

import React from "react";
import { Check } from "lucide-react";
import { StepNumber } from "@/hooks/useCreateVaultState";
import { VAULT_MICROCOPY } from "./designTokens";

interface StepIndicatorProps {
  currentStep: StepNumber;
  onStepClick?: (step: StepNumber) => void;
  canNavigateToStep?: (step: StepNumber) => boolean;
}

export function StepIndicator({
  currentStep,
  onStepClick,
  canNavigateToStep,
}: StepIndicatorProps) {
  const steps = VAULT_MICROCOPY.wizard.steps;

  return (
    <div className="w-full">
      {/* Mobile Step Bar */}
      <div className="block sm:hidden mb-4">
        <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-2">
          <span className="text-emerald-400 font-semibold uppercase tracking-wider">
            Bước {currentStep}/4
          </span>
          <span className="text-slate-200 font-medium">
            {steps[currentStep - 1]?.title}
          </span>
        </div>
        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-full flex-1 transition-all duration-300 ${
                s <= currentStep
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                  : "bg-transparent"
              } ${s < 4 ? "border-r border-slate-900" : ""}`}
            />
          ))}
        </div>
      </div>

      {/* Desktop / Tablet Step Progress */}
      <div className="hidden sm:block">
        <nav aria-label="Tiến trình thiết lập hũ" className="relative">
          <ol className="grid grid-cols-4 gap-2">
            {steps.map((s, idx) => {
              const stepNum = s.id as StepNumber;
              const isCompleted = stepNum < currentStep;
              const isCurrent = stepNum === currentStep;
              const isClickable =
                isCompleted ||
                (canNavigateToStep && canNavigateToStep(stepNum));

              return (
                <li key={s.id} className="relative">
                  <button
                    type="button"
                    disabled={!isClickable && !isCurrent}
                    onClick={() => {
                      if (isClickable && onStepClick) {
                        onStepClick(stepNum);
                      }
                    }}
                    className={`w-full group flex flex-col text-left p-2.5 rounded-xl transition-all duration-200 border ${
                      isCurrent
                        ? "bg-slate-800/80 border-emerald-500/40 shadow-sm shadow-emerald-500/10"
                        : isCompleted
                        ? "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 cursor-pointer"
                        : "bg-slate-900/30 border-slate-800/40 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                          isCompleted
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                            : isCurrent
                            ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/20"
                            : "bg-slate-800 text-slate-400 border border-slate-700/50"
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        ) : (
                          <span>{s.id}</span>
                        )}
                      </div>
                      <span
                        className={`text-xs font-semibold truncate ${
                          isCurrent
                            ? "text-white"
                            : isCompleted
                            ? "text-slate-300 group-hover:text-white"
                            : "text-slate-400"
                        }`}
                      >
                        {s.title}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 truncate pl-9">
                      {s.subtitle}
                    </p>

                    {/* Active highlight bar */}
                    <div
                      className={`mt-2 h-0.5 w-full rounded-full transition-all ${
                        isCurrent
                          ? "bg-emerald-400"
                          : isCompleted
                          ? "bg-emerald-500/40"
                          : "bg-slate-800"
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
}
