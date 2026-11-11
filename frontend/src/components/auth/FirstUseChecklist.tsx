"use client";
import React from "react";
import { CheckCircle2, Clock3 } from "lucide-react";
import type { FirstUseAction, FirstUseStep } from "../../../../shared/firstUse";

export function FirstUseChecklist({
  steps,
  busy,
  onAction,
}: {
  steps: FirstUseStep[];
  busy: boolean;
  onAction: (action: FirstUseAction) => void;
}) {
  return (
    <ol className="grid gap-3 md:grid-cols-2 mt-4">
      {steps.map((step, index) => (
        <li
          key={step.id}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 transition-colors"
        >
          <div className="flex items-start gap-3">
            {step.status === "DONE" ? (
              <CheckCircle2
                size={22}
                className="shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden
              />
            ) : (
              <Clock3
                size={22}
                className="shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden
              />
            )}
            <div className="min-w-0">
              <h3 className="font-bold text-base text-slate-950 dark:text-white">
                {index + 1}. {step.title}
              </h3>
              <p className="text-sm mt-1 text-slate-700 dark:text-slate-300 leading-relaxed">
                {step.description}
              </p>
              <p className="text-xs font-semibold mt-2 text-slate-600 dark:text-slate-400">
                {step.status === "DONE"
                  ? "Đã xác minh"
                  : step.status === "BLOCKED"
                    ? "Cần hoàn tất điều kiện trước"
                    : "Bước tiếp theo"}
              </p>
              {step.action && (
                <button
                  type="button"
                  disabled={busy}
                  className="min-h-12 mt-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-bold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700/80 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 cursor-pointer"
                  onClick={() => onAction(step.action!)}
                >
                  {step.actionLabel}
                </button>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
