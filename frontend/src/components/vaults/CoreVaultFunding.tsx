"use client";

import React, { useId, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowRight, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type {
  ExperienceJar,
  ExperiencePayment,
  useVaultExperience,
} from "@/hooks/useVaultExperience";
import { TREASURY_ADDRESS, treasuryAmount } from "../../../../shared/treasury";
import type { Review } from "./ExperiencePrimitives";

export function CoreVaultFunding({
  jar,
  controller,
  prepare,
}: {
  jar: ExperienceJar;
  controller: ReturnType<typeof useVaultExperience>;
  prepare: (review: Review) => void;
}) {
  const auth = useAuth();
  const id = useId();
  const [amount, setAmount] = useState("0.01");
  const [error, setError] = useState("");
  const blocked = !auth.linkedWallet;
  const updateAmount = (value: string) => {
    setAmount(value);
    setError("");
  };

  return (
    <section
      className="vx-card vx-funding"
      id={`funding-${jar.id}`}
      aria-labelledby={`${id}-title`}
    >
      <div className="vx-funding-heading">
        <span className="vx-card-icon">
          <ArrowDownToLine size={22} aria-hidden />
        </span>
        <div>
          <h2 id={`${id}-title`}>
            Nạp tiền vào {jar.policy.kind === "SAVINGS" ? "heo đất" : "hũ"}
          </h2>
          <p className="vx-muted">
            Từ ví cá nhân của bạn vào <strong>{jar.name}</strong>.
          </p>
        </div>
      </div>
      <p className="vx-muted">
        {jar.policy.kind === "MILESTONE"
          ? "Nạp quỹ để gia đình có thể giao việc và dành sẵn tiền thưởng cho con."
          : "Thêm một khoản nhỏ, tiến gần hơn đến mục tiêu của hũ."}
      </p>
      <form
        className="vx-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (blocked || controller.busy) return;
          try {
            const amountWei = treasuryAmount(amount).toString();
            setError("");
            // Reuse the intent if Core is dismissed or receipt reconciliation needs a retry.
            let payment: ExperiencePayment | undefined;
            prepare({
              title: `Nạp tiền vào ${jar.name}`,
              detail:
                "AVAX sẽ được chuyển vào ví chung Core và ghi sổ cho đúng hũ này sau khi mạng xác nhận. Bạn cần thêm AVAX trong ví cá nhân để trả phí mạng.",
              amountWei,
              recipient: TREASURY_ADDRESS,
              confirmLabel: "Mở Core để nạp tiền",
              confirm: async () => {
                const intent: ExperiencePayment =
                  payment ||
                  (await controller.post(
                    `/api/workspaces/${controller.workspaceId}/treasury/transfers`,
                    { jarId: jar.id, kind: "DEPOSIT", amount },
                  ));
                payment = intent;
                await controller.sign(intent);
              },
            });
          } catch (cause) {
            setError((cause as Error).message);
            document.getElementById(`${id}-amount`)?.focus();
          }
        }}
      >
        <div className="vx-funding-fields">
          <label htmlFor={`${id}-amount`}>
            Số tiền nạp (AVAX)
            <input
              id={`${id}-amount`}
              name="amount"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(event) => updateAmount(event.target.value)}
              disabled={controller.busy || blocked}
              aria-invalid={!!error}
              aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
            />
          </label>
          <button className="vx-button" disabled={controller.busy || blocked}>
            {controller.busy ? "Đang xử lý…" : "Xem lại khoản nạp"}
            <ArrowRight size={18} aria-hidden />
          </button>
        </div>
        <div
          className="vx-amount-options"
          role="group"
          aria-label="Chọn nhanh số AVAX"
        >
          {["0.01", "0.05", "0.1", "0.5"].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={amount === value}
              disabled={controller.busy || blocked}
              onClick={() => updateAmount(value)}
            >
              {value} AVAX
            </button>
          ))}
        </div>
        {error && (
          <p id={`${id}-error`} className="vx-alert" role="alert">
            {error}
          </p>
        )}
        <p id={`${id}-hint`} className="vx-muted vx-funding-note">
          <Wallet size={18} aria-hidden /> Ví chung Core · Avalanche Fuji · Chỉ
          ghi tăng số dư khi giao dịch được xác nhận.
        </p>
        {blocked && (
          <p className="vx-alert">
            Liên kết ví Core để nạp tiền.{" "}
            <Link href="/settings?tab=wallet">Mở cài đặt ví</Link>
          </p>
        )}
      </form>
    </section>
  );
}
