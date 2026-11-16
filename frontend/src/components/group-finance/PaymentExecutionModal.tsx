"use client";

import React, { useState } from "react";
import {
  X,
  CreditCard,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import { GroupExpenseRequest } from "@/types/groupFinance";

interface PaymentExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: GroupExpenseRequest | null;
  onExecutePayment: (
    expenseId: string
  ) => Promise<{ success: boolean; error?: string; txHash?: string }>;
}

export const PaymentExecutionModal: React.FC<PaymentExecutionModalProps> = ({
  isOpen,
  onClose,
  request,
  onExecutePayment,
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedTxHash, setConfirmedTxHash] = useState<string | null>(null);

  if (!isOpen || !request) return null;

  const handleExecute = async () => {
    setErrorMessage(null);
    setIsExecuting(true);
    try {
      const res = await onExecutePayment(request.id);
      if (!res.success) {
        setErrorMessage(res.error || "Thực thi thanh toán thất bại. Thử lại.");
      } else {
        setConfirmedTxHash(res.txHash || null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Đã xảy ra lỗi khi giải ngân.");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleResetAndClose = () => {
    setConfirmedTxHash(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-title"
    >
      <div className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700">
              <CreditCard size={18} />
            </span>
            <h2 id="payment-title" className="text-base font-semibold text-slate-900">
              Ký phát lệnh thanh toán
            </h2>
          </div>
          <button
            onClick={handleResetAndClose}
            className="flex items-center justify-center w-11 h-11 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        {confirmedTxHash ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Giải ngân thành công {request.amountAvax} AVAX
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Lệnh chuyển tiền đã được xác nhận trên Avalanche Fuji. Số tiền giữ chỗ (reserved) đã được quyết toán.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs font-mono break-all space-y-1">
              <div className="text-slate-500">Mã giao dịch (TxHash):</div>
              <div className="text-slate-800">{confirmedTxHash}</div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <a
                href={`https://testnet.snowtrace.io/tx/${confirmedTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="min-h-[44px] flex items-center justify-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                <span>Xem biên lai trên Snowtrace</span>
                <ExternalLink size={15} />
              </a>
              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-full min-h-[48px] h-12 flex items-center justify-center rounded-xl bg-[#E84142] hover:bg-[#D03031] text-white font-medium text-base shadow-sm transition-colors"
              >
                Hoàn tất
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4 overflow-y-auto">
            {errorMessage && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm" role="alert">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-900 text-xs font-medium">
              <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
              <span>Đã đủ {request.approvedCount}/{request.requiredApprovals} chữ ký phê duyệt hợp lệ. Đủ điều kiện giải ngân.</span>
            </div>

            {/* Chi tiết khoản chi */}
            <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-sm">
              <div className="flex justify-between items-start">
                <span className="text-slate-500 text-xs">Khoản chi:</span>
                <span className="font-semibold text-slate-900 text-right max-w-[70%]">
                  {request.title}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">Số tiền thanh toán:</span>
                <span className="font-mono tabular-nums font-bold text-lg text-slate-900">
                  {request.amountAvax.toFixed(2)} AVAX
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-xs">Hũ quỹ chi trả:</span>
                <span className="font-medium text-slate-800">{request.fundName}</span>
              </div>

              <div className="flex justify-between items-start">
                <span className="text-slate-500 text-xs">Đơn vị nhận:</span>
                <div className="text-right">
                  <div className="font-semibold text-slate-900">{request.recipientName}</div>
                  <div className="font-mono text-xs text-slate-500 truncate max-w-[200px]">
                    {request.recipientAddress}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-500 text-xs block mb-1.5">Người đã ký duyệt:</span>
                <div className="space-y-1">
                  {request.approvals.map((app) => (
                    <div key={app.id} className="flex items-center justify-between text-xs text-slate-700">
                      <span className="flex items-center gap-1 font-medium">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        {app.approverName}
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {app.approverAddress.slice(0, 6)}...{app.approverAddress.slice(-4)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleExecute}
                disabled={isExecuting}
                className="w-full min-h-[48px] h-12 flex items-center justify-center gap-2 rounded-xl bg-[#E84142] hover:bg-[#D03031] text-white font-medium text-base shadow-sm transition-colors disabled:opacity-50"
              >
                <ArrowUpRight size={18} />
                <span>{isExecuting ? "Đang xử lý chuyển tiền..." : `Ký phát ${request.amountAvax} AVAX`}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
