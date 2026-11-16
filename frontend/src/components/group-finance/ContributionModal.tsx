"use client";

import React, { useState, useEffect } from "react";
import { X, ArrowDownRight, CheckCircle2, ExternalLink, AlertCircle, Coins } from "lucide-react";
import { GroupFundItem, GroupObligation } from "@/types/groupFinance";
import { useAuth } from "@/hooks/useAuth";

interface ContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  funds: GroupFundItem[];
  initialFundId?: string;
  obligations: GroupObligation[];
  onContribute: (params: {
    fundId: string;
    amount: string;
    txHash?: string;
  }) => Promise<{ success: boolean; error?: string; txHash?: string }>;
}

export const ContributionModal: React.FC<ContributionModalProps> = ({
  isOpen,
  onClose,
  funds,
  initialFundId,
  obligations,
  onContribute,
}) => {
  const { linkedWallet } = useAuth();
  const [selectedFundId, setSelectedFundId] = useState<string>(initialFundId || funds[0]?.id || "");
  const [amount, setAmount] = useState<string>("0.5");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successTxHash, setSuccessTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (initialFundId) {
      setSelectedFundId(initialFundId);
    } else if (funds.length > 0 && !selectedFundId) {
      setSelectedFundId(funds[0].id);
    }
  }, [initialFundId, funds, selectedFundId]);

  if (!isOpen) return null;

  const currentFund = funds.find((f) => f.id === selectedFundId);
  const currentObligation = obligations.find(
    (ob) => ob.fundId === selectedFundId && ob.status === "PENDING"
  );

  const handleQuickAdd = (value: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + value).toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setErrorMessage("Số tiền đóng góp phải lớn hơn 0 AVAX.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onContribute({
        fundId: selectedFundId,
        amount,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Giao dịch không thành công. Thử lại.");
      } else {
        setSuccessTxHash(res.txHash || null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Không thể thực hiện đóng góp.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSuccessTxHash(null);
    setErrorMessage(null);
    setAmount("0.5");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contrib-title"
    >
      <div className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700">
              <ArrowDownRight size={18} />
            </span>
            <h2 id="contrib-title" className="text-base font-semibold text-slate-900">
              Góp tiền vào quỹ chung
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

        {/* Content */}
        {successTxHash ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Đã ghi nhận đóng góp {amount} AVAX
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                Giao dịch đã được gửi lên mạng Avalanche Fuji và đối soát thành công vào quỹ.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs font-mono break-all space-y-1">
              <div className="text-slate-500">Mã giao dịch (TxHash):</div>
              <div className="text-slate-800">{successTxHash}</div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <a
                href={`https://testnet.snowtrace.io/tx/${successTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="min-h-[44px] flex items-center justify-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                <span>Xem trên Snowtrace Explorer</span>
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
          <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
            {errorMessage && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm" role="alert">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Chọn quỹ nạp */}
            <div>
              <label htmlFor="select-fund" className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wider">
                Chọn hũ quỹ đích
              </label>
              <select
                id="select-fund"
                value={selectedFundId}
                onChange={(e) => setSelectedFundId(e.target.value)}
                className="w-full h-12 px-3 text-base text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E84142]"
              >
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.fundType === "OPERATING" ? "Quỹ Hoạt Động" : "Quỹ Mục Tiêu"} · Số dư: {f.availableAvax.toFixed(2)} AVAX)
                  </option>
                ))}
              </select>
            </div>

            {/* Thông báo nghĩa vụ nợ nếu có */}
            {currentObligation && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <div>
                  <span className="font-semibold">Nghĩa vụ định kỳ:</span> {currentObligation.amountAvax} AVAX (hạn {currentObligation.dueDate})
                </div>
                <button
                  type="button"
                  onClick={() => setAmount(currentObligation.amountAvax.toString())}
                  className="px-2 py-1 rounded bg-amber-200 hover:bg-amber-300 font-semibold transition-colors"
                >
                  Nạp đúng hạn
                </button>
              </div>
            )}

            {/* Nhập số tiền */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="contrib-amount" className="text-sm font-medium text-slate-700">
                  Số tiền nạp (AVAX)
                </label>
                <span className="text-xs text-slate-500">Mạng Avalanche Fuji</span>
              </div>
              <div className="relative">
                <input
                  id="contrib-amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-14 px-3.5 pr-20 text-2xl font-mono tabular-nums font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E84142] focus:border-transparent"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                  AVAX
                </span>
              </div>
            </div>

            {/* Phím chọn nhanh */}
            <div className="grid grid-cols-4 gap-2">
              {[0.5, 1.0, 2.0, 5.0].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAdd(val)}
                  className="min-h-[44px] flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-mono tabular-nums font-semibold text-slate-700 transition-colors"
                >
                  +{val}
                </button>
              ))}
            </div>

            {/* Thông tin xác thực */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <div className="flex justify-between">
                <span>Số dư quỹ hiện tại:</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {currentFund?.availableAvax.toFixed(2) || "0.00"} AVAX
                </span>
              </div>
              <div className="flex justify-between">
                <span>Số dư dự kiến sau khi nạp:</span>
                <span className="font-mono tabular-nums font-semibold text-emerald-700">
                  {((currentFund?.availableAvax || 0) + (parseFloat(amount) || 0)).toFixed(2)} AVAX
                </span>
              </div>
              {currentFund?.fundType === "GOAL" && currentFund.targetAmountAvax && (
                <div className="flex justify-between text-slate-500">
                  <span>Mục tiêu hoàn thành:</span>
                  <span className="font-mono tabular-nums">
                    {Math.min(
                      100,
                      Math.round(
                        (((currentFund.balanceAvax + (parseFloat(amount) || 0)) /
                          currentFund.targetAmountAvax) *
                          100)
                      )
                    )}
                    %
                  </span>
                </div>
              )}
            </div>

            {/* Nút gửi */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[48px] h-12 flex items-center justify-center rounded-xl bg-[#E84142] hover:bg-[#D03031] text-white font-medium text-base shadow-sm transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Đang gửi giao dịch..." : `Xác nhận nạp ${amount || "0"} AVAX`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
