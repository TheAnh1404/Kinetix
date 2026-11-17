"use client";
import React, { useState } from "react";
import { formatEther } from "viem";
import { GroupFundItem, GroupObligation } from "@/types/groupFinance";
import { FinanceDialog } from "./FinanceDialog";
import { groupAmount } from "../../../../shared/groupFinance";

interface Props {
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
export function ContributionModal(props: Props) {
  return props.isOpen ? <ContributionForm {...props} /> : null;
}
function ContributionForm({
  funds,
  initialFundId,
  onClose,
  onContribute,
}: Props) {
  const [fundId, setFundId] = useState(initialFundId || funds[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hash, setHash] = useState("");
  const fund = funds.find((item) => item.id === fundId);
  return (
    <FinanceDialog title="Góp tiền" busy={busy} onClose={onClose}>
      {hash ? (
        <div className="finance-stack">
          <p role="status">Đã đối soát khoản góp {amount} AVAX.</p>
          <a
            href={`https://testnet.snowtrace.io/tx/${hash}`}
            target="_blank"
            rel="noreferrer"
          >
            Xem giao dịch
          </a>
          <button onClick={onClose}>Đóng</button>
        </div>
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            try {
              groupAmount(amount);
              if (!fund?.treasuryWalletAddress)
                throw new Error("Quỹ chưa có ví giữ tiền đã xác minh.");
              setBusy(true);
              const result = await onContribute({ fundId, amount });
              if (result.success && result.txHash) setHash(result.txHash);
              else setError(result.error || "Chưa xác minh được khoản góp.");
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {error && (
            <p className="finance-error" role="alert">
              {error}
            </p>
          )}
          <label>
            Quỹ
            <select
              value={fundId}
              onChange={(event) => setFundId(event.target.value)}
            >
              {funds.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Số AVAX
            <input
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.01"
              required
            />
          </label>
          <dl>
            <dt>Người nhận · Ví giữ tiền</dt>
            <dd>{fund?.treasuryWalletAddress || "Chưa xác minh"}</dd>
            <dt>Mạng</dt>
            <dd>Avalanche Fuji · AVAX</dd>
            <dt>Khả dụng đã đối soát</dt>
            <dd>{formatEther(BigInt(fund?.availableWei || "0"))} AVAX</dd>
          </dl>
          <p className="finance-notice">
            Chủ ví nhận kiểm soát tiền. Khoản góp không tự tạo quyền rút hoặc
            quyền hoàn. Phí mạng trả thêm bằng AVAX. Chỉ ghi nhận sau khi giao
            dịch được xác minh.
          </p>
          <button
            className="finance-primary"
            disabled={busy || !fund?.treasuryWalletAddress}
          >
            {busy ? "Đang ký / đối soát…" : "Mở ví để góp tiền"}
          </button>
        </form>
      )}
    </FinanceDialog>
  );
}
