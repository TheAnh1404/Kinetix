"use client";

import React, { useState } from "react";
import { formatEther } from "viem";
import { ShieldCheck, Wallet, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";
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
  const isOnchain =
    fund?.custodyType === "ONCHAIN_V2" ||
    Boolean(fund?.contractAddress);
  const destinationAddress = isOnchain
    ? fund?.contractAddress || fund?.treasuryWalletAddress
    : fund?.treasuryWalletAddress;
  const isPaused = Boolean(fund?.isPaused || fund?.status === "PAUSED");

  return (
    <FinanceDialog title="Góp tiền vào quỹ" busy={busy} onClose={onClose}>
      {hash ? (
        <div className="space-y-4 text-center p-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Đã ghi nhận khoản góp {amount} AVAX!
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Giao dịch đã được phát lên mạng Avalanche Fuji và đối soát thành công.
            </p>
          </div>
          <a
            href={`https://testnet.snowtrace.io/tx/${hash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 underline font-mono min-h-[44px]"
          >
            <span>Xem giao dịch trên Snowtrace</span>
            <ExternalLink size={13} />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="finance-primary"
          >
            Đóng
          </button>
        </div>
      ) : (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            try {
              groupAmount(amount);
              if (!destinationAddress) {
                throw new Error(
                  isOnchain
                    ? "Hợp đồng quỹ On-Chain V2 chưa có địa chỉ hợp lệ."
                    : "Quỹ chưa có ví giữ tiền đã xác minh."
                );
              }
              if (isPaused) {
                throw new Error("Quỹ đang trong trạng thái tạm dừng khẩn cấp. Không thể nạp tiền.");
              }
              setBusy(true);
              const result = await onContribute({ fundId, amount });
              if (result.success && result.txHash) {
                setHash(result.txHash);
              } else {
                setError(result.error || "Chưa xác minh được khoản góp.");
              }
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
          className="space-y-4"
        >
          {error && (
            <div className="finance-error text-xs flex items-start gap-2" role="alert">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <label>
            Chọn hũ quỹ
            <select
              value={fundId}
              onChange={(event) => setFundId(event.target.value)}
            >
              {funds.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.fundType === "OPERATING" ? "Hoạt động" : "Mục tiêu"})
                </option>
              ))}
            </select>
          </label>

          <label>
            Số lượng AVAX
            <input
              inputMode="decimal"
              type="number"
              step="any"
              min="0.001"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.1"
              required
            />
          </label>

          <dl className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <dt className="text-slate-400">Hình thức lưu ký:</dt>
              <dd className="font-semibold text-slate-200 flex items-center gap-1">
                {isOnchain ? (
                  <>
                    <ShieldCheck size={13} className="text-indigo-400" />
                    <span>Hợp Đồng On-Chain V2</span>
                  </>
                ) : (
                  <>
                    <Wallet size={13} className="text-slate-400" />
                    <span>Ví Cá Nhân Thủ Quỹ</span>
                  </>
                )}
              </dd>
            </div>

            <div>
              <dt className="text-slate-400 mb-0.5">Địa chỉ nhận tiền:</dt>
              <dd className="font-mono text-[11px] text-slate-300 break-all">
                {destinationAddress || "Chưa xác minh"}
              </dd>
            </div>

            <div className="flex justify-between items-center">
              <dt className="text-slate-400">Mạng giao dịch:</dt>
              <dd className="text-slate-200">Avalanche Fuji C-Chain</dd>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-slate-800">
              <dt className="text-slate-400">Khả dụng hiện tại:</dt>
              <dd className="font-mono font-bold text-slate-100">
                {fund ? formatEther(BigInt(fund.availableWei || "0")) : "0"} AVAX
              </dd>
            </div>
          </dl>

          {isOnchain ? (
            <p className="finance-notice">
              Khoản tiền được gửi trực tiếp vào Smart Contract độc lập KinetixFundV2.
              {fund?.fundType === "GOAL"
                ? " Nếu quỹ không đạt mục tiêu trước hạn chót, bạn có quyền tự rút lại 100% số tiền đã góp trực tiếp từ hợp đồng."
                : " Tiền được bảo vệ bởi cơ chế đa chữ ký và giải ngân minh bạch."}
            </p>
          ) : (
            <p className="finance-notice">
              Tiền nằm trong ví cá nhân đã công bố. Chủ ví nhận kiểm soát tiền;
              giao dịch được đối soát ghi sổ nội bộ trong nhóm.
            </p>
          )}

          {isPaused && (
            <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300">
              ⚠ Quỹ đang tạm dừng khẩn cấp. Mọi giao dịch nạp tiền tạm thời bị chặn.
            </div>
          )}

          <button
            className="finance-primary"
            disabled={busy || !destinationAddress || isPaused}
          >
            {busy ? "Đang xử lý giao dịch ví…" : isPaused ? "Quỹ đang tạm dừng" : "Ký nạp AVAX vào quỹ"}
          </button>
        </form>
      )}
    </FinanceDialog>
  );
}
