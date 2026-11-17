"use client";
import React, { useState } from "react";
import { formatEther } from "viem";
import { GroupExpenseRequest } from "@/types/groupFinance";
import { FinanceDialog } from "./FinanceDialog";
interface Props {
  isOpen: boolean;
  onClose: () => void;
  request: GroupExpenseRequest | null;
  onExecutePayment: (
    id: string,
  ) => Promise<{ success: boolean; error?: string; txHash?: string }>;
}
export function PaymentExecutionModal(props: Props) {
  return props.isOpen && props.request ? (
    <PaymentForm {...props} request={props.request} />
  ) : null;
}
function PaymentForm({
  onClose,
  request,
  onExecutePayment,
}: Props & { request: GroupExpenseRequest }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [hash, setHash] = useState("");
  return (
    <FinanceDialog title="Thanh toán khoản chi" busy={busy} onClose={onClose}>
      <div className="finance-stack">
        {error && (
          <p className="finance-error" role="alert">
            {error}
          </p>
        )}
        {hash ? (
          <>
            <p role="status">Đã xác minh thanh toán.</p>
            <a
              href={`https://testnet.snowtrace.io/tx/${hash}`}
              target="_blank"
              rel="noreferrer"
            >
              Xem giao dịch
            </a>
            <button onClick={onClose}>Đóng</button>
          </>
        ) : (
          <>
            <dl>
              <dt>Quỹ / khoản chi</dt>
              <dd>
                {request.fundName} · {request.title}
              </dd>
              <dt>Số tiền chính xác</dt>
              <dd>{formatEther(BigInt(request.amountWei))} AVAX</dd>
              <dt>Người nhận</dt>
              <dd>
                {request.recipientName}
                <br />
                {request.recipientAddress}
              </dd>
              <dt>Mạng</dt>
              <dd>Avalanche Fuji · Phí mạng trả thêm bằng AVAX</dd>
            </dl>
            <p className="finance-notice">
              Đủ duyệt · Chưa thanh toán. Chỉ ví giữ tiền của quỹ được ký. Sau
              khi mở lệnh, khoản giữ chỗ được giữ đến khi đối soát để tránh chi
              trùng.
            </p>
            <button
              className="finance-primary"
              disabled={busy || !request.canPay}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const result = await onExecutePayment(request.id);
                  if (result.success && result.txHash) setHash(result.txHash);
                  else
                    setError(result.error || "Chưa xác minh được thanh toán.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Đang ký / đối soát…" : "Mở ví để thanh toán"}
            </button>
          </>
        )}
      </div>
    </FinanceDialog>
  );
}
