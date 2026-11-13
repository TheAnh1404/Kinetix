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
  const current = steps[currentStep - 1];

  return (
    <div className="w-full">
      {/* Mobile: Ultra-compact 1-line step bar (saves 60px vertical height) */}
      <div className="block sm:hidden">
        <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
          <span className="text-emerald-400 font-bold font-mono">
            Bước {currentStep}/4
          </span>
          <span className="text-white font-semibold truncate max-w-[200px]">
            {current?.title}: <span className="text-slate-400 font-normal">{current?.subtitle}</span>
          </span>
        </div>
        {/* Sleek 3px progress track */}
        <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-full flex-1 transition-all duration-200 ${
                s <= currentStep
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                  : "bg-transparent"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Desktop: Clean 4-step row */}
      <div className="hidden sm:block">
        <nav aria-label="Tiến trình thiết lập hũ">
          <ol className="grid grid-cols-4 gap-2">
            {steps.map((s) => {
              const stepNum = s.id as StepNumber;
              const isCompleted = stepNum < currentStep;
              const isCurrent = stepNum === currentStep;
              const isClickable =
                isCompleted ||
                (canNavigateToStep && canNavigateToStep(stepNum));

              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={!isClickable && !isCurrent}
                    onClick={() => {
                      if (isClickable && onStepClick) {
                        onStepClick(stepNum);
                      }
                    }}
                    className={`w-full group flex flex-col text-left p-2 rounded-xl transition-all border ${
                      isCurrent
                        ? "bg-slate-800/80 border-emerald-500/40 shadow-xs"
                        : isCompleted
                        ? "bg-slate-900/60 border-slate-800 hover:border-slate-700 cursor-pointer"
                        : "bg-slate-900/30 border-slate-800/40 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 transition-all ${
                          isCompleted
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : isCurrent
                            ? "bg-emerald-500 text-slate-950 font-black"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {isCompleted ? <Check className="w-3 h-3 stroke-[2.5]" /> : s.id}
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

                    <p className="text-[10px] text-slate-400 truncate pl-7">
                      {s.subtitle}
                    </p>
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
