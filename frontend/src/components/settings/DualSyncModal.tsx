"use client";

import React from "react";
import { CheckCircle2, Clock, ExternalLink, Loader2, Shield, X } from "lucide-react";
import { SNOWTRACE_TESTNET_URL } from "@/contracts/config";

interface DualSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  step: "DATABASE" | "ONCHAIN" | "COMPLETED" | "ERROR";
  dbLatencyMs?: number;
  txHash?: string | null;
  errorMessage?: string;
  actionTitle?: string;
}

export const DualSyncModal: React.FC<DualSyncModalProps> = ({
  isOpen,
  onClose,
  step,
  dbLatencyMs = 28,
  txHash,
  errorMessage,
  actionTitle = "Đồng Bộ Kép Cấu Hình Quỹ",
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => {
        if (step === "COMPLETED" || step === "ERROR") onClose();
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden text-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center font-bold">
              <Shield size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Cơ Chế Đồng Bộ Kép (Dual Sync)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {actionTitle}
              </p>
            </div>
          </div>
          {(step === "COMPLETED" || step === "ERROR") && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* 2-Step Progress Timeline */}
        <div className="space-y-4 my-6">
          {/* BƯỚC 1: LƯU CLOUD DB */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              step === "DATABASE"
                ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700"
                : step === "ONCHAIN" || step === "COMPLETED"
                  ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                  : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {step === "DATABASE" ? (
                  <Loader2 size={20} className="animate-spin text-amber-600" />
                ) : (
                  <CheckCircle2 size={20} className="text-emerald-600" />
                )}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Bước 1: Lưu Lên Cloud Database
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    PostgreSQL Serverless • Trạng thái: Optimistic Saved
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                ~{dbLatencyMs}ms ✓
              </span>
            </div>
          </div>

          {/* BƯỚC 2: KÝ & GỬI ON-CHAIN */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              step === "ONCHAIN"
                ? "bg-red-50/60 dark:bg-red-950/20 border-red-300 dark:border-red-700"
                : step === "COMPLETED"
                  ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                  : step === "ERROR"
                    ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800"
                    : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {step === "ONCHAIN" ? (
                  <Loader2 size={20} className="animate-spin text-red-600" />
                ) : step === "COMPLETED" ? (
                  <CheckCircle2 size={20} className="text-emerald-600" />
                ) : step === "ERROR" ? (
                  <span className="text-rose-600 font-bold">⚠️</span>
                ) : (
                  <Clock size={20} className="text-slate-400" />
                )}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Bước 2: Ký & Đồng Bộ Lên Smart Contract
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    Avalanche Fuji L1/C-Chain • Xác thực On-chain
                  </p>
                </div>
              </div>
              {step === "COMPLETED" && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                  SYNCED ✓
                </span>
              )}
            </div>

            {/* TxHash Display */}
            {txHash && (
              <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-500">TxHash:</span>
                <a
                  href={`${SNOWTRACE_TESTNET_URL}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1 font-bold underline"
                >
                  {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Error Feedback */}
        {step === "ERROR" && errorMessage && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Action Button */}
        {(step === "COMPLETED" || step === "ERROR") && (
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {step === "COMPLETED" ? "Hoàn Tất & Đóng" : "Đóng & Thử Lại"}
          </button>
        )}
      </div>
    </div>
  );
};
