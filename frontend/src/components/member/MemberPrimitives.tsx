"use client";

import React, { useEffect, useRef } from "react";
import { ArrowLeft, CheckCircle2, Circle, Info } from "lucide-react";
import Link from "next/link";
import { useMemberPreferences } from "@/components/layout/MemberResponsiveShell";

export function PageHeader({
  eyebrow,
  title,
  description,
  back,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  back?: string;
}) {
  const { voice, read } = useMemberPreferences();
  return (
    <header className="member-page-header">
      {back && (
        <Link className="member-back" href={back}>
          <ArrowLeft size={20} />
          Quay lại
        </Link>
      )}
      <span className="member-eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      {voice && (
        <button
          className="member-text-button"
          onClick={() =>
            read(
              document.getElementById("member-main")?.innerText ||
                [title, description].filter(Boolean).join(". "),
            )
          }
        >
          Đọc nội dung trang
        </button>
      )}
    </header>
  );
}
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="member-empty">
      <Info size={28} aria-hidden="true" />
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}
export function StatusTimeline({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <ol className="status-timeline" aria-label="Tiến độ">
      {steps.map((step, index) => (
        <li
          key={step}
          aria-current={current === index ? "step" : undefined}
          className={current >= index ? "done" : ""}
        >
          {current > index ? (
            <CheckCircle2 size={22} aria-hidden="true" />
          ) : (
            <Circle size={22} aria-hidden="true" />
          )}
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}
export function AmountInput({
  value,
  onChange,
  asset,
}: {
  value: string;
  onChange: (value: string) => void;
  asset: string;
}) {
  return (
    <div className="amount-field">
      <label htmlFor="member-amount">Số tiền ({asset})</label>
      <input
        id="member-amount"
        autoComplete="off"
        inputMode="decimal"
        placeholder="0,00"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby="amount-help"
      />
      <p id="amount-help">Nhập bằng dấu phẩy hoặc dấu chấm.</p>
    </div>
  );
}
export function TransactionReview({
  amount,
  asset,
  vault,
  recipient,
}: {
  amount: string;
  asset: string;
  vault: string;
  recipient: string;
}) {
  return (
    <section className="review-card" aria-label="Thông tin xác nhận">
      <h2>Kiểm tra trước khi xác nhận</h2>
      <dl>
        <div>
          <dt>Số tiền</dt>
          <dd>
            {amount} {asset}
          </dd>
        </div>
        <div>
          <dt>Từ hũ</dt>
          <dd>{vault}</dd>
        </div>
        <div>
          <dt>Nhận tại</dt>
          <dd>
            Ví Core cá nhân<small className="wallet-address">{recipient}</small>
          </dd>
        </div>
      </dl>
      <p>
        Đây là chuyển tài sản về ví cá nhân. Chưa phải rút tiền mặt hoặc chuyển
        khoản ngân hàng.
      </p>
    </section>
  );
}
export function AccessibleDialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      opener?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="member-dialog"
      aria-labelledby="member-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="member-dialog-header">
        <h2 id="member-dialog-title">{title}</h2>
        <button
          className="member-secondary"
          onClick={onClose}
          aria-label="Đóng cửa sổ"
        >
          Đóng
        </button>
      </div>
      {children}
    </dialog>
  );
}
