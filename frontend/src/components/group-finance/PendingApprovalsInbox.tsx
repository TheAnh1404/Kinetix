"use client";
import React, { useState } from "react";
import { formatEther } from "viem";
import { GroupExpenseRequest, GroupFundItem } from "@/types/groupFinance";
import { useAuth } from "@/hooks/useAuth";
import { FinanceDialog } from "./FinanceDialog";
interface Props {
  expenses: GroupExpenseRequest[];
  funds?: GroupFundItem[];
  onApprove: (
    id: string,
    comment?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  onReject: (
    id: string,
    reason: string,
  ) => Promise<{ success: boolean; error?: string }>;
  onCancel?: (id: string) => Promise<{ success: boolean; error?: string }>;
  onOpenPayModal: (request: GroupExpenseRequest) => void;
}
const labels: Record<string, string> = {
  PENDING_APPROVAL: "Chờ duyệt",
  APPROVED: "Đủ duyệt · Chưa thanh toán",
  PAYMENT_PENDING: "Đang thanh toán · Cần đối soát",
  EXECUTED: "Đã thanh toán",
  REJECTED: "Đã từ chối",
  CANCELLED: "Đã hủy",
  EXPIRED: "Đã hết hạn",
};
export function PendingApprovalsInbox({
  expenses,
  funds,
  onApprove,
  onReject,
  onCancel,
  onOpenPayModal,
}: Props) {
  const { user } = useAuth();
  const [filter, setFilter] = useState("pending");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [reject, setReject] = useState<GroupExpenseRequest | null>(null);
  const [reason, setReason] = useState("");
  const [receipt, setReceipt] = useState("");
  const run = async (
    action: () => Promise<{ success: boolean; error?: string }>,
  ) => {
    setBusy(true);
    setMessage("");
    try {
      const result = await action();
      setMessage(
        result.success
          ? "Đã lưu thay đổi."
          : result.error || "Không thực hiện được.",
      );
      if (result.success) setReject(null);
    } finally {
      setBusy(false);
    }
  };
  const items = expenses.filter(
    (item) =>
      filter === "all" ||
      (filter === "pending"
        ? item.status === "PENDING_APPROVAL"
        : ["APPROVED", "PAYMENT_PENDING"].includes(item.status)),
  );
  return (
    <div className="space-y-4">
      <label className="block">
        Hiển thị
        <select
          className="block w-full p-3 rounded-lg border border-slate-300"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="pending">Chờ duyệt</option>
          <option value="payment">Chờ thanh toán</option>
          <option value="all">Tất cả</option>
        </select>
      </label>
      {message && (
        <p role="status" className="finance-notice">
          {message}
        </p>
      )}
      {!items.length && <p>Không có đề nghị trong mục này.</p>}
      {items.map((request) => {
        const fund = funds?.find((f) => f.id === request.fundId);
        const isV2 = Boolean(
          request.custodyType === "ONCHAIN_V2" ||
          fund?.custodyType === "ONCHAIN_V2" ||
          (typeof request.onchainExpenseId === "number" && request.onchainExpenseId > 0)
        );

        return (
          <article
            key={request.id}
            className="bg-white border border-slate-200 rounded-xl p-4 space-y-3"
          >
            <h2 className="font-semibold">{request.title}</h2>
            <p>{request.fundName}</p>
            <p className="font-semibold break-all">
              {formatEther(BigInt(request.amountWei))} AVAX
            </p>
            <p>{labels[request.status] || request.status}</p>
            <p>{request.purpose}</p>
            <p>
              Người nhận: {request.recipientName}
              <br />
              <span className="break-all">{request.recipientAddress}</span>
            </p>
            <p>
              {request.approvedCount}/{request.requiredApprovals}{" "}
              {isV2 ? "chữ ký on-chain" : "phiếu duyệt ứng dụng"} · Hạn {request.deadlineFormatted || request.deadline}
            </p>
            <p className="text-sm">
              {isV2
                ? "Phiếu duyệt được ghi nhận trực tiếp trên smart contract V2 (Multisig On-Chain)."
                : "Phiếu duyệt không chuyển tiền và không tạo multisig on-chain."}
            </p>
          {request.approvals.map((vote) => (
            <p className="text-sm" key={vote.id}>
              {vote.approverName} ·{" "}
              {vote.decision === "APPROVE" ? "Đã duyệt" : "Từ chối"} ·{" "}
              {vote.createdAt}
            </p>
          ))}
          {request.receiptAttachmentUrl?.startsWith(
            "data:image/png;base64,",
          ) && (
            <button
              className="underline"
              onClick={() => setReceipt(request.receiptAttachmentUrl!)}
            >
              Xem chứng từ
            </button>
          )}
          {request.canApprove && (
            <div className="grid grid-cols-2 gap-3">
              <button
                className="rounded-lg bg-emerald-700 text-white p-3"
                disabled={busy}
                onClick={() => void run(() => onApprove(request.id))}
              >
                Duyệt chi
              </button>
              <button
                className="rounded-lg border border-slate-400 p-3"
                disabled={busy}
                onClick={() => {
                  setReason("");
                  setReject(request);
                }}
              >
                Từ chối
              </button>
            </div>
          )}
          {request.canPay && (
            <button
              className="w-full rounded-lg bg-red-700 text-white p-3"
              disabled={busy}
              onClick={() => onOpenPayModal(request)}
            >
              Thanh toán / đối soát
            </button>
          )}
          {onCancel &&
            user?.id === request.proposerId &&
            ["PENDING_APPROVAL", "APPROVED"].includes(request.status) && (
              <button
                className="underline"
                disabled={busy}
                onClick={() => void run(() => onCancel(request.id))}
              >
                Hủy đề nghị chưa thanh toán
              </button>
            )}
          {request.payment?.txHash && (
            <a
              className="block underline"
              target="_blank"
              rel="noreferrer"
              href={`https://testnet.snowtrace.io/tx/${request.payment.txHash}`}
            >
              Xem bằng chứng thanh toán
            </a>
          )}
        </article>
      ); })}
      {reject && (
        <FinanceDialog
          title="Từ chối đề nghị chi"
          busy={busy}
          onClose={() => setReject(null)}
        >
          <form
            className="finance-stack"
            onSubmit={(event) => {
              event.preventDefault();
              void run(() => onReject(reject.id, reason));
            }}
          >
            <p>
              {reject.title} · {formatEther(BigInt(reject.amountWei))} AVAX
            </p>
            <label>
              Lý do
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={250}
                required
              />
            </label>
            <p>Từ chối sẽ đóng đề nghị và giải phóng khoản giữ chỗ.</p>
            <button
              className="finance-primary"
              disabled={busy || !reason.trim()}
            >
              Xác nhận từ chối
            </button>
          </form>
        </FinanceDialog>
      )}
      {receipt && (
        <FinanceDialog
          title="Chứng từ khoản chi"
          onClose={() => setReceipt("")}
        >
          <img src={receipt} alt="Chứng từ khoản chi trong nhóm" />
        </FinanceDialog>
      )}
    </div>
  );
}
