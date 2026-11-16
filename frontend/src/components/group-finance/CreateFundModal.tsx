"use client";

import React, { useState } from "react";
import { X, Landmark, Target, ShieldCheck, AlertCircle, Users } from "lucide-react";
import { GroupFundKind, CreateFundParams } from "@/types/groupFinance";
import { useAuth } from "@/hooks/useAuth";
import { DEMO_PERSONAS } from "../../../../shared/demoPersonas";

interface CreateFundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFund: (params: CreateFundParams) => Promise<{ success: boolean; error?: string }>;
}

export const CreateFundModal: React.FC<CreateFundModalProps> = ({
  isOpen,
  onClose,
  onCreateFund,
}) => {
  const { user, linkedWallet } = useAuth();
  const userWallet = linkedWallet?.address || user?.walletAddress || DEMO_PERSONAS.admin.wallet;

  const [fundType, setFundType] = useState<GroupFundKind>("OPERATING");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fastWithdrawLimit, setFastWithdrawLimit] = useState("0.5");
  const [targetAmount, setTargetAmount] = useState("10.0");
  const [targetDeadline, setTargetDeadline] = useState("30/11/2026");
  const [requiredApprovals, setRequiredApprovals] = useState(2);
  const [signersText, setSignersText] = useState(
    `${userWallet}\n${DEMO_PERSONAS.elderly.wallet}\n0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Vui lòng nhập tên quỹ.");
      return;
    }

    const signers = signersText
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (signers.length < requiredApprovals) {
      setErrorMessage(`Cần tối thiểu ${requiredApprovals} người ký hợp lệ.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onCreateFund({
        name: name.trim(),
        description: description.trim() || undefined,
        fundType,
        custodyType: "ONCHAIN_HUB",
        fastWithdrawLimitAvax:
          fundType === "OPERATING" ? parseFloat(fastWithdrawLimit) || 0 : 0,
        requiredApprovals,
        guardianWallets: signers,
        targetAmountAvax:
          fundType === "GOAL" ? parseFloat(targetAmount) || 0 : undefined,
        targetDeadline: fundType === "GOAL" ? targetDeadline : undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Không thể tạo quỹ. Thử lại.");
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Đã xảy ra lỗi khi tạo quỹ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#E84142]/10 text-[#E84142]">
              <Landmark size={18} />
            </span>
            <h2 id="modal-title" className="text-base font-semibold text-slate-900">
              Khởi tạo hũ quỹ mới
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-11 h-11 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Đóng cửa sổ"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm" role="alert">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Chọn loại quỹ */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wider">
              Chọn mẫu quỹ
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setFundType("OPERATING")}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                  fundType === "OPERATING"
                    ? "border-[#E84142] bg-[#E84142]/5 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 mb-1">
                  <Landmark size={16} className={fundType === "OPERATING" ? "text-[#E84142]" : "text-slate-500"} />
                  <span>Quỹ Hoạt Động</span>
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  Thu chi thường nhật, chi nhanh trong hạn mức, chi lớn cần đa chữ ký.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFundType("GOAL")}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                  fundType === "GOAL"
                    ? "border-[#E84142] bg-[#E84142]/5 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 mb-1">
                  <Target size={16} className={fundType === "GOAL" ? "text-[#E84142]" : "text-slate-500"} />
                  <span>Quỹ Mục Tiêu</span>
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  Góp tiền theo chỉ tiêu và hạn chót. Mở khóa giải ngân khi đạt mục tiêu.
                </p>
              </button>
            </div>
          </div>

          {/* Tên quỹ */}
          <div>
            <label htmlFor="fund-name" className="block text-sm font-medium text-slate-700 mb-1">
              Tên quỹ <span className="text-red-500">*</span>
            </label>
            <input
              id="fund-name"
              type="text"
              required
              placeholder={fundType === "OPERATING" ? "VD: Quỹ Sinh Hoạt CLB" : "VD: Quỹ Mua Thiết Bị Mới"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3 text-base text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E84142] focus:border-transparent placeholder:text-slate-400"
            />
          </div>

          {/* Mô tả ngắn */}
          <div>
            <label htmlFor="fund-desc" className="block text-sm font-medium text-slate-700 mb-1">
              Mục đích sử dụng
            </label>
            <input
              id="fund-desc"
              type="text"
              placeholder="VD: Chi trả tiền thuê sân, nước uống và sự kiện"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-11 px-3 text-base text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E84142] focus:border-transparent placeholder:text-slate-400"
            />
          </div>

          {/* Cấu hình riêng theo từng loại */}
          {fundType === "OPERATING" ? (
            <div>
              <label htmlFor="fast-withdraw" className="block text-sm font-medium text-slate-700 mb-1">
                Hạn mức chi nhanh (AVAX)
              </label>
              <div className="relative">
                <input
                  id="fast-withdraw"
                  type="number"
                  step="0.01"
                  min="0"
                  value={fastWithdrawLimit}
                  onChange={(e) => setFastWithdrawLimit(e.target.value)}
                  className="w-full h-11 px-3 pr-16 text-base font-mono tabular-nums text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E84142] focus:border-transparent"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  AVAX
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Khoản chi $\le$ {fastWithdrawLimit || "0"} AVAX chỉ cần 1 chữ ký giải ngân ngay.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label htmlFor="target-amount" className="block text-sm font-medium text-slate-700 mb-1">
                  Mục tiêu (AVAX)
                </label>
                <div className="relative">
                  <input
                    id="target-amount"
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full h-11 px-3 pr-14 text-base font-mono tabular-nums text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E84142] focus:border-transparent"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    AVAX
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="target-deadline" className="block text-sm font-medium text-slate-700 mb-1">
                  Hạn chót
                </label>
                <input
                  id="target-deadline"
                  type="text"
                  placeholder="DD/MM/YYYY"
                  value={targetDeadline}
                  onChange={(e) => setTargetDeadline(e.target.value)}
                  className="w-full h-11 px-3 text-base text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E84142] focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Ngưỡng phê duyệt đa chữ ký M/N */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-900 flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-emerald-600" />
                Ngưỡng duyệt đa chữ ký (Quorum)
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setRequiredApprovals(num)}
                    className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
                      requiredApprovals === num
                        ? "bg-[#E84142] text-white shadow-sm"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-snug">
              Cần tối thiểu {requiredApprovals} người ký xác nhận để giải ngân các khoản chi tiêu lớn.
            </p>

            <div>
              <label htmlFor="signers-list" className="block text-xs font-medium text-slate-600 mb-1">
                Danh sách địa chỉ ví người duyệt (mỗi ví 1 dòng):
              </label>
              <textarea
                id="signers-list"
                rows={3}
                value={signersText}
                onChange={(e) => setSignersText(e.target.value)}
                className="w-full p-2.5 text-xs font-mono text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#E84142]"
              />
            </div>
          </div>

          {/* Footer CTA */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[48px] h-12 flex items-center justify-center rounded-xl bg-[#E84142] hover:bg-[#D03031] text-white font-medium text-base shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Đang khởi tạo quỹ..." : "Xác nhận tạo quỹ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
