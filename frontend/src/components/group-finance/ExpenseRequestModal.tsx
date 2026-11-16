"use client";

import React, { useState } from "react";
import {
  X,
  FileText,
  Upload,
  Camera,
  Trash2,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Info,
} from "lucide-react";
import { GroupFundItem, ProposeExpenseParams } from "@/types/groupFinance";

interface ExpenseRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  funds: GroupFundItem[];
  initialFundId?: string;
  onProposeExpense: (
    params: ProposeExpenseParams
  ) => Promise<{ success: boolean; error?: string }>;
}

export const ExpenseRequestModal: React.FC<ExpenseRequestModalProps> = ({
  isOpen,
  onClose,
  funds,
  initialFundId,
  onProposeExpense,
}) => {
  const [selectedFundId, setSelectedFundId] = useState<string>(
    initialFundId || funds[0]?.id || ""
  );
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Vận chuyển & Đi lại");
  const [purpose, setPurpose] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentFund = funds.find((f) => f.id === selectedFundId);
  const amountNum = parseFloat(amount) || 0;
  const isOverAvailable = currentFund ? amountNum > currentFund.availableAvax : false;
  const isFastSpend =
    currentFund &&
    currentFund.fundType === "OPERATING" &&
    currentFund.fastWithdrawLimitAvax > 0 &&
    amountNum > 0 &&
    amountNum <= currentFund.fastWithdrawLimitAvax;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Tệp chứng từ không được vượt quá 5MB.");
      return;
    }

    setReceiptFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setReceiptPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveReceipt = () => {
    setReceiptPreview(null);
    setReceiptFileName(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("Vui lòng nhập tên khoản chi.");
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMessage("Số tiền chi phải lớn hơn 0 AVAX.");
      return;
    }
    if (isOverAvailable) {
      setErrorMessage(
        `Số dư khả dụng của quỹ (${currentFund?.availableAvax.toFixed(2)} AVAX) không đủ để giữ chỗ. Vui lòng kiểm tra lại.`
      );
      return;
    }
    if (!recipientAddress.trim().startsWith("0x")) {
      setErrorMessage("Địa chỉ ví người nhận phải bắt đầu bằng 0x.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onProposeExpense({
        fundId: selectedFundId,
        title: title.trim(),
        purpose: purpose.trim() || title.trim(),
        category,
        amountAvax: amountNum,
        recipientAddress: recipientAddress.trim(),
        recipientName: recipientName.trim() || "Người nhận bên ngoài",
        receiptAttachmentUrl: receiptPreview || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Không thể tạo đề nghị chi. Thử lại.");
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Đã xảy ra lỗi khi tạo đề nghị chi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-title"
    >
      <div className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#E84142]/10 text-[#E84142]">
              <FileText size={18} />
            </span>
            <h2 id="expense-title" className="text-base font-semibold text-slate-900">
              Tạo đề nghị chi tiêu
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-11 h-11 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm" role="alert">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Chọn quỹ chi */}
          <div>
            <label htmlFor="exp-fund" className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wider">
              Nguồn tiền chi
            </label>
            <select
              id="exp-fund"
              value={selectedFundId}
              onChange={(e) => setSelectedFundId(e.target.value)}
              className="w-full h-12 px-3 text-base text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E84142]"
            >
              {funds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} (Khả dụng: {f.availableAvax.toFixed(2)} AVAX)
                </option>
              ))}
            </select>
            {currentFund && (
              <div className="mt-1 flex justify-between text-xs text-slate-500">
                <span>Số dư khả dụng:</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {currentFund.availableAvax.toFixed(2)} AVAX
                </span>
              </div>
            )}
          </div>

          {/* Tên khoản chi & Danh mục */}
          <div>
            <label htmlFor="exp-name" className="block text-sm font-medium text-slate-700 mb-1">
              Tên khoản chi <span className="text-red-500">*</span>
            </label>
            <input
              id="exp-name"
              type="text"
              required
              placeholder="VD: Thuê hội trường Workshop tháng 11"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 px-3 text-base text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E84142] focus:border-transparent placeholder:text-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="exp-cat" className="block text-sm font-medium text-slate-700 mb-1">
                Danh mục
              </label>
              <select
                id="exp-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-11 px-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E84142]"
              >
                <option value="Vận chuyển & Đi lại">Vận chuyển & Đi lại</option>
                <option value="Ăn uống & Sinh hoạt">Ăn uống & Sinh hoạt</option>
                <option value="Sự kiện & Hội trường">Sự kiện & Hội trường</option>
                <option value="Thiết bị & Công cụ">Thiết bị & Công cụ</option>
                <option value="Văn phòng phẩm">Văn phòng phẩm</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            {/* Số tiền */}
            <div>
              <label htmlFor="exp-amount" className="block text-sm font-medium text-slate-700 mb-1">
                Số tiền (AVAX) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="exp-amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`w-full h-11 px-3 pr-14 text-base font-mono tabular-nums font-semibold text-slate-900 bg-white border rounded-lg focus:outline-none focus:ring-2 ${
                    isOverAvailable
                      ? "border-red-500 text-red-700 focus:ring-red-500"
                      : "border-slate-300 focus:ring-[#E84142]"
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                  AVAX
                </span>
              </div>
            </div>
          </div>

          {/* Cảnh báo nếu số tiền vượt khả dụng */}
          {isOverAvailable && (
            <p className="text-xs text-red-600 font-medium leading-snug">
              Số tiền vượt quá số dư khả dụng ({currentFund?.availableAvax.toFixed(2)} AVAX). Không thể giữ chỗ.
            </p>
          )}

          {/* Người nhận tiền */}
          <div className="space-y-2">
            <div>
              <label htmlFor="rec-name" className="block text-sm font-medium text-slate-700 mb-1">
                Tên người nhận / Đơn vị thụ hưởng
              </label>
              <input
                id="rec-name"
                type="text"
                placeholder="VD: Nhà xe Anh Tuấn hoặc Nhà cung cấp thiết bị"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full h-11 px-3 text-base text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E84142]"
              />
            </div>
            <div>
              <label htmlFor="rec-addr" className="block text-sm font-medium text-slate-700 mb-1">
                Địa chỉ ví nhận tiền (0x...) <span className="text-red-500">*</span>
              </label>
              <input
                id="rec-addr"
                type="text"
                required
                placeholder="0x..."
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="w-full h-11 px-3 text-sm font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E84142]"
              />
            </div>
          </div>

          {/* Tải lên hóa đơn / Chứng từ */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Hóa đơn chứng từ đính kèm
            </label>
            {receiptPreview ? (
              <div className="relative p-2 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                <img
                  src={receiptPreview}
                  alt="Chứng từ đã chọn"
                  className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-800 truncate">
                    {receiptFileName || "Chung-tu-hoa-don.jpg"}
                  </div>
                  <div className="text-[11px] text-emerald-600 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 size={12} />
                    <span>Đã tải ảnh lên hợp lệ</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveReceipt}
                  className="flex items-center justify-center w-11 h-11 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                  aria-label="Xóa chứng từ"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ) : (
              <label
                htmlFor="receipt-upload"
                className="min-h-[56px] flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <Camera size={18} className="text-slate-500" />
                <span className="text-xs font-medium text-slate-600">
                  Chọn ảnh hóa đơn hoặc chụp từ điện thoại (tối đa 5MB)
                </span>
                <input
                  id="receipt-upload"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
            )}
          </div>

          {/* Diễn giải quy tắc phê duyệt */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 leading-snug">
            {isFastSpend ? (
              <div className="flex items-start gap-2 text-emerald-800">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Đủ điều kiện chi nhanh:</span> Khoản chi $\le$ {currentFund?.fastWithdrawLimitAvax} AVAX chỉ cần 1 chữ ký người phụ trách để giải ngân ngay.
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-slate-700">
                <Info size={16} className="text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Cần duyệt đa chữ ký:</span> Khoản chi này cần tối thiểu {currentFund?.requiredApprovals} trong số {currentFund?.totalSigners} người duyệt xác nhận trước khi thanh toán. Số tiền sẽ được đưa vào phần giữ chỗ (reserved).
                </div>
              </div>
            )}
          </div>

          {/* CTA Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isOverAvailable}
              className="w-full min-h-[48px] h-12 flex items-center justify-center rounded-xl bg-[#E84142] hover:bg-[#D03031] text-white font-medium text-base shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Đang gửi đề nghị chi..." : "Gửi đề nghị chi tiêu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
