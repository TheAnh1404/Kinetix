"use client";

import React from "react";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Wallet,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Coins,
} from "lucide-react";
import { TransactionStep } from "@/hooks/useCreateVaultState";
import { SNOWTRACE_TESTNET_URL } from "@/contracts/config";
import { VAULT_MICROCOPY } from "./designTokens";

interface CreationStatusModalProps {
  isOpen: boolean;
  txStatus: TransactionStep;
  statusMessage: string;
  txHash: string | null;
  createdVault: any | null;
  errorMessage: string | null;
  onRetry: () => void;
  onClose: () => void;
  onDepositNow?: (vault: any) => void;
}

export function CreationStatusModal({
  isOpen,
  txStatus,
  statusMessage,
  txHash,
  createdVault,
  errorMessage,
  onRetry,
  onClose,
  onDepositNow,
}: CreationStatusModalProps) {
  if (!isOpen || txStatus === "idle") return null;

  const isSuccess = txStatus === "success";
  const isError = txStatus === "error";
  const isBusy = !isSuccess && !isError;

  const explorerUrl = txHash ? `${SNOWTRACE_TESTNET_URL}/tx/${txHash}` : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-950 text-center space-y-6">
        {/* Glow Accent */}
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 -mt-12 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-all ${
            isSuccess
              ? "bg-emerald-500/20"
              : isError
              ? "bg-red-500/20"
              : "bg-sky-500/15"
          }`}
        />

        {/* Status Icon */}
        <div className="relative flex justify-center">
          {isBusy && (
            <div className="relative w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}

          {isSuccess && (
            <div className="relative w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
            </div>
          )}

          {isError && (
            <div className="relative w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/40 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/20">
              <AlertCircle className="w-9 h-9 stroke-[2.2]" />
            </div>
          )}
        </div>

        {/* Heading & Status Message */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white tracking-tight">
            {isSuccess
              ? "Khởi tạo Hũ Tiền Thành Công!"
              : isError
              ? "Chưa Thể Hoàn Tất Giao Dịch"
              : txStatus === "awaiting_wallet"
              ? "Chờ Xác Nhận Trong Core Wallet"
              : txStatus === "broadcasting"
              ? "Đang Gửi Giao Dịch On-Chain"
              : "Đang Xử Lý Khởi Tạo Hũ"}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
            {errorMessage || statusMessage}
          </p>
        </div>

        {/* Step Indicator Tracker for In-Progress */}
        {isBusy && (
          <div className="bg-slate-950/60 rounded-2xl p-3.5 border border-slate-800/80 text-left space-y-2.5">
            <div className="flex items-center gap-2.5 text-xs">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  txStatus === "validating"
                    ? "bg-sky-500 text-slate-950 animate-pulse"
                    : "bg-emerald-500/20 text-emerald-400"
                }`}
              >
                1
              </div>
              <span className="text-slate-300">Chuẩn bị tham số hợp đồng FamilyHub</span>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  txStatus === "awaiting_wallet"
                    ? "bg-sky-500 text-slate-950 animate-pulse"
                    : txStatus === "broadcasting" || txStatus === "confirming"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                2
              </div>
              <span className="text-slate-300">Ký xác nhận với Avalanche Core Wallet</span>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  txStatus === "broadcasting" || txStatus === "confirming"
                    ? "bg-sky-500 text-slate-950 animate-pulse"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                3
              </div>
              <span className="text-slate-300">Xác nhận block và đồng bộ gia đình</span>
            </div>
          </div>
        )}

        {/* Transaction Hash Link */}
        {explorerUrl && (
          <div className="pt-1">
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-4 transition-colors"
            >
              <span>Xem giao dịch trên Snowtrace Explorer</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col gap-2.5">
          {isSuccess && (
            <>
              {onDepositNow && (
                <button
                  type="button"
                  onClick={() => onDepositNow(createdVault)}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/25 active:scale-[0.99]"
                >
                  <Coins className="w-4 h-4" />
                  <span>Nạp tiền vào hũ ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Về bảng điều khiển gia đình
              </button>
            </>
          )}

          {isError && (
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={onRetry}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
