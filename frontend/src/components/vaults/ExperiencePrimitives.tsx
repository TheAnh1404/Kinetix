"use client";
import React, { useEffect, useId, useRef } from "react";
import {
  ArrowUpRight,
  ShieldCheck,
  Wallet,
  X,
  CircleCheck,
  Clock3,
} from "lucide-react";
import {
  exactContribution,
  businessLabels,
  paymentLabels,
} from "../../../../shared/vaultExperience";
import { ExperiencePayment } from "@/hooks/useVaultExperience";

export function Money({
  wei,
  className = "",
}: {
  wei: string;
  className?: string;
}) {
  return (
    <span className={`vx-money ${className}`}>
      <span>{exactContribution(wei)}</span>
      <small>AVAX</small>
    </span>
  );
}
export function Status({ value }: { value: string }) {
  return (
    <span className={`vx-status vx-status-${value.toLowerCase()}`}>
      {["PAID", "CONFIRMED"].includes(value) ? (
        <CircleCheck size={15} aria-hidden />
      ) : (
        <Clock3 size={15} aria-hidden />
      )}
      {businessLabels[value] || paymentLabels[value] || value}
    </span>
  );
}
export function SourceBadge({ contract = false }: { contract?: boolean }) {
  return (
    <span className="vx-source">
      {contract ? (
        <ShieldCheck size={15} aria-hidden />
      ) : (
        <Wallet size={15} aria-hidden />
      )}
      {contract ? "Smart contract" : "Ví chung Core"} · Fuji
    </span>
  );
}
export function PaymentDetails({ payment }: { payment: ExperiencePayment }) {
  return (
    <div className="vx-payment">
      <Status value={payment.status} />
      {payment.txHash && (
        <a
          href={`https://explorer-test.avax.network/c-chain/tx/${payment.txHash}`}
          target="_blank"
          rel="noreferrer"
        >
          Xem giao dịch <ArrowUpRight size={16} aria-hidden />
        </a>
      )}
      <details>
        <summary>Thông tin đối soát</summary>
        <p className="vx-address">Mã {payment.id}</p>
        <p className="vx-address">Người nhận {payment.recipient}</p>
        <p>Nonce {payment.nonce}</p>
      </details>
    </div>
  );
}
export type Review = {
  title: string;
  detail: string;
  amountWei?: string;
  recipient?: string;
  confirm: () => Promise<void>;
  confirmLabel?: string;
};
export function ReviewDialog({
  review,
  close,
  busy,
}: {
  review: Review | null;
  close: () => void;
  busy: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [error, setError] = React.useState("");
  useEffect(() => {
    setError("");
    if (review && !ref.current?.open) ref.current?.showModal();
    else if (!review) ref.current?.close();
  }, [review]);
  return (
    <dialog
      ref={ref}
      className="vx-dialog"
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else close();
      }}
      onClose={close}
      aria-labelledby={titleId}
    >
      <div className="vx-dialog-body">
        <div className="vx-heading">
          <h2 id={titleId}>{review?.title}</h2>
          <button
            type="button"
            className="vx-icon-button"
            aria-label="Đóng xác nhận"
            onClick={close}
            disabled={busy}
          >
            <X size={22} />
          </button>
        </div>
        <p>{review?.detail}</p>
        {review?.amountWei && (
          <Money wei={review.amountWei} className="vx-large-money" />
        )}
        {review?.recipient && (
          <p className="vx-address">Nhận tại {review.recipient}</p>
        )}
        <p className="vx-muted">
          Kiểm tra thông tin trước khi xác nhận. Chỉ thao tác ký giao dịch Core
          mới phát sinh phí mạng; ghi nhận thanh toán cần chờ mạng xác nhận.
        </p>
        {error && (
          <p className="vx-alert" role="alert">
            {error}
          </p>
        )}
        <div className="vx-actions">
          <button
            type="button"
            className="vx-button-secondary"
            onClick={close}
            disabled={busy}
          >
            Quay lại
          </button>
          <button
            type="button"
            className="vx-button"
            disabled={busy}
            onClick={async () => {
              try {
                await review?.confirm();
                close();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            {busy ? "Đang xử lý…" : review?.confirmLabel || "Xác nhận"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
