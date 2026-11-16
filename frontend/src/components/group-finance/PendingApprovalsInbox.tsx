"use client";

import React, { useState } from "react";
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  FileText,
  UserCheck,
  Image,
} from "lucide-react";
import { GroupExpenseRequest } from "@/types/groupFinance";
import { useAuth } from "@/hooks/useAuth";

interface PendingApprovalsInboxProps {
  expenses: GroupExpenseRequest[];
  onApprove: (
    expenseId: string,
    comment?: string
  ) => Promise<{ success: boolean; error?: string }>;
  onReject: (
    expenseId: string,
    reason: string
  ) => Promise<{ success: boolean; error?: string }>;
  onOpenPayModal: (request: GroupExpenseRequest) => void;
}

export const PendingApprovalsInbox: React.FC<PendingApprovalsInboxProps> = ({
  expenses,
  onApprove,
  onReject,
  onOpenPayModal,
}) => {
  const { user, linkedWallet } = useAuth();
  const userWallet = (linkedWallet?.address || user?.walletAddress || "").toLowerCase();

  const [filter, setFilter] = useState<"PENDING" | "APPROVED" | "ALL">("PENDING");
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const pendingCount = expenses.filter((e) => e.status === "PENDING_APPROVAL").length;
  const approvedCount = expenses.filter((e) => e.status === "APPROVED").length;

  const filteredExpenses = expenses.filter((e) => {
    if (filter === "PENDING") return e.status === "PENDING_APPROVAL";
    if (filter === "APPROVED") return e.status === "APPROVED";
    return true;
  });

  const handleApprove = async (expenseId: string) => {
    setStatusMessage(null);
    setIsProcessing(expenseId);
    try {
      const res = await onApprove(expenseId);
      if (!res.success) {
        setStatusMessage({ type: "error", text: res.error || "Không thể ký duyệt." });
      } else {
        setStatusMessage({ type: "success", text: "Đã ký duyệt đề nghị chi tiêu thành công." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Đã xảy ra lỗi khi duyệt." });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectModalId || !rejectReason.trim()) return;
    setStatusMessage(null);
    setIsProcessing(rejectModalId);
    try {
      const res = await onReject(rejectModalId, rejectReason.trim());
      if (!res.success) {
        setStatusMessage({ type: "error", text: res.error || "Không thể từ chối đề nghị." });
      } else {
        setStatusMessage({ type: "success", text: "Đã từ chối đề nghị chi và giải phóng tiền giữ chỗ." });
        setRejectModalId(null);
        setRejectReason("");
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Đã xảy ra lỗi khi từ chối." });
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Thông báo trạng thái */}
      {statusMessage && (
        <div
          className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs font-medium ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
          role="alert"
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Tabs Lọc */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setFilter("PENDING")}
          className={`min-h-[44px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            filter === "PENDING"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Chờ duyệt ({pendingCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter("APPROVED")}
          className={`min-h-[44px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            filter === "APPROVED"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Chờ thanh toán ({approvedCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter("ALL")}
          className={`min-h-[44px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            filter === "ALL"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Tất cả ({expenses.length})
        </button>
      </div>

      {/* Danh sách đề nghị chi */}
      {filteredExpenses.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
            <FileCheck2 size={24} />
          </div>
          <h4 className="text-sm font-semibold text-slate-900">Không có đề nghị chi nào</h4>
          <p className="text-xs text-slate-500">
            Hộp xử lý hiện tại trống. Mọi đề nghị chi đều đã được giải quyết hoặc chưa phát sinh.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredExpenses.map((req) => {
            const isRecipient = req.recipientAddress.toLowerCase() === userWallet;
            const hasSigned = req.approvals.some(
              (a) => a.approverAddress.toLowerCase() === userWallet
            );
            const isApproved = req.status === "APPROVED";
            const isExecuted = req.status === "EXECUTED";
            const isRejected = req.status === "REJECTED";
            const isPending = req.status === "PENDING_APPROVAL";

            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3"
              >
                {/* Header Thẻ: Quỹ & Trạng thái */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                      {req.fundName}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900 mt-0.5">
                      {req.title}
                    </h3>
                  </div>

                  <div>
                    {isPending && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                        <Clock size={12} />
                        <span>Chờ duyệt</span>
                      </span>
                    )}
                    {isApproved && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 size={12} />
                        <span>Đủ duyệt · Chờ chi</span>
                      </span>
                    )}
                    {isExecuted && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                        <CheckCircle2 size={12} />
                        <span>Đã thanh toán</span>
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                        <XCircle size={12} />
                        <span>Đã từ chối</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Số tiền & Đơn vị nhận */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 block">Số tiền thanh toán</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-2xl font-mono tabular-nums font-bold text-slate-900">
                        {req.amountAvax.toFixed(2)}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">AVAX</span>
                    </div>
                  </div>

                  <div className="text-right max-w-[55%]">
                    <span className="text-xs text-slate-500 block">Người nhận</span>
                    <span className="text-xs font-semibold text-slate-800 truncate block mt-0.5">
                      {req.recipientName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 truncate block">
                      {req.recipientAddress.slice(0, 6)}...{req.recipientAddress.slice(-4)}
                    </span>
                  </div>
                </div>

                {/* Mục đích & Chứng từ */}
                <div className="space-y-2 text-xs">
                  <div className="text-slate-700 leading-snug">
                    <span className="font-semibold text-slate-900">Mục đích:</span> {req.purpose}
                  </div>

                  {req.receiptAttachmentUrl && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedReceiptUrl(req.receiptAttachmentUrl!)}
                        className="min-h-[44px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
                      >
                        <Image size={15} className="text-slate-500" />
                        <span>Xem chứng từ / Hóa đơn đính kèm</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Tiến độ đa chữ ký */}
                <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between items-center text-slate-700 font-medium">
                    <span className="flex items-center gap-1">
                      <ShieldCheck size={14} className="text-slate-500" />
                      Tiến độ chữ ký:
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      {req.approvedCount}/{req.requiredApprovals} chữ ký
                    </span>
                  </div>

                  {/* Thanh tiến độ */}
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        req.approvedCount >= req.requiredApprovals ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((req.approvedCount / req.requiredApprovals) * 100)
                        )}%`,
                      }}
                    />
                  </div>

                  {/* Danh sách người đã ký */}
                  {req.approvals.length > 0 && (
                    <div className="pt-1 text-[11px] text-slate-500 space-y-0.5">
                      {req.approvals.map((app) => (
                        <div key={app.id} className="flex items-center gap-1">
                          <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                          <span className="font-medium text-slate-700">{app.approverName}</span>
                          <span className="text-slate-400">({app.createdAt})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* HÀNH ĐỘNG DUYỆT / TỪ CHỐI / KÝ PHÁT */}
                {isPending && (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    {/* Kiểm tra vi phạm tự duyệt */}
                    {isRecipient ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                        <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          Bạn là người thụ hưởng khoản chi này nên <strong>không thể tự duyệt</strong> theo quy định an toàn.
                        </span>
                      </div>
                    ) : hasSigned ? (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
                        <UserCheck size={16} className="text-emerald-600 shrink-0" />
                        <span>Bạn đã ký duyệt đề nghị này. Đang chờ thêm người duyệt khác.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          disabled={isProcessing === req.id}
                          onClick={() => handleApprove(req.id)}
                          className="min-h-[48px] h-12 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-sm transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 size={16} />
                          <span>{isProcessing === req.id ? "Đang ký..." : "Duyệt chi"}</span>
                        </button>

                        <button
                          type="button"
                          disabled={isProcessing === req.id}
                          onClick={() => setRejectModalId(req.id)}
                          className="min-h-[48px] h-12 flex items-center justify-center gap-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium text-sm transition-colors disabled:opacity-50"
                        >
                          <XCircle size={16} />
                          <span>Từ chối</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Đã đủ chữ ký -> Hiển thị nút Ký Phát Thanh Toán */}
                {isApproved && (
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onOpenPayModal(req)}
                      className="w-full min-h-[48px] h-12 flex items-center justify-center gap-2 rounded-xl bg-[#E84142] hover:bg-[#D03031] text-white font-medium text-sm shadow-sm transition-colors"
                    >
                      <CreditCard size={17} />
                      <span>Ký phát lệnh thanh toán {req.amountAvax} AVAX</span>
                    </button>
                  </div>
                )}

                {/* Đã giải ngân -> Hiển thị biên lai */}
                {isExecuted && req.payment?.txHash && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Biên lai on-chain:</span>
                    <a
                      href={`https://testnet.snowtrace.io/tx/${req.payment.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <span>
                        {req.payment.txHash.slice(0, 10)}...{req.payment.txHash.slice(-6)}
                      </span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Từ Chối Đề Nghị Chi */}
      {rejectModalId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-4 shadow-xl space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Lý do từ chối đề nghị chi
            </h3>
            <p className="text-xs text-slate-500">
              Khi từ chối, đề nghị này sẽ bị hủy bỏ và số tiền đang giữ chỗ (reserved) sẽ được hoàn trả về số dư khả dụng của quỹ.
            </p>
            <textarea
              rows={3}
              required
              placeholder="VD: Thiếu hóa đơn VAT hợp lệ hoặc vượt hạn mức thỏa thuận..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-2.5 text-xs text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setRejectModalId(null);
                  setRejectReason("");
                }}
                className="min-h-[44px] flex items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={!rejectReason.trim()}
                className="min-h-[44px] flex items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem Chứng Từ / Hóa Đơn */}
      {selectedReceiptUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4"
          onClick={() => setSelectedReceiptUrl(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-w-md w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedReceiptUrl}
              alt="Hóa đơn chứng từ"
              className="w-full max-h-[70vh] object-contain rounded-xl"
            />
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setSelectedReceiptUrl(null)}
                className="min-h-[44px] px-6 rounded-xl bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors"
              >
                Đóng ảnh chứng từ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
