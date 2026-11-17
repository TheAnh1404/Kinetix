"use client";
import React, { useState } from "react";
import { formatEther } from "viem";
import { GroupTransfer } from "@/lib/web3/groupTransfers";
export function TransferRecovery({
  transfer,
  busy,
  onResume,
  onResolve,
}: {
  transfer: GroupTransfer;
  busy: boolean;
  onResume: (
    transfer: GroupTransfer,
    hash?: string,
  ) => Promise<{ success: boolean; error?: string; txHash?: string }>;
  onResolve: (
    transfer: GroupTransfer,
    hash: string,
  ) => Promise<{ success: boolean; error?: string }>;
}) {
  const [hash, setHash] = useState(transfer.txHash || "");
  const [message, setMessage] = useState("");
  return (
    <form
      className="bg-white border border-slate-300 rounded-xl p-3 space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await onResume(transfer, hash || undefined);
        setMessage(
          result.success
            ? "Đã xác minh giao dịch."
            : result.error || "Chưa xác minh được.",
        );
      }}
    >
      <p>
        {transfer.kind === "PAYMENT" ? "Thanh toán" : "Góp tiền"} ·{" "}
        {formatEther(BigInt(transfer.amountWei))} AVAX
      </p>
      <p className="text-sm break-all">
        Người nhận: {transfer.recipientAddress}
      </p>
      <p className="text-sm">
        Nếu đã ký hoặc ví không trả mã, kiểm tra lịch sử ví và nhập mã giao
        dịch. Không chuyển tiền lần hai.
      </p>
      <label className="block">
        Mã giao dịch đã gửi (nếu có)
        <input
          className="w-full min-w-0 p-2 border border-slate-400 rounded-lg"
          value={hash}
          onChange={(event) => setHash(event.target.value.trim())}
          autoCapitalize="none"
          spellCheck={false}
        />
      </label>
      <button
        className="bg-slate-900 text-white px-3 rounded-lg"
        disabled={busy}
      >
        {hash || transfer.txHash ? "Đối soát lệnh" : "Tiếp tục lệnh trong ví"}
      </button>
      <p className="text-sm">
        Nếu giao dịch thất bại hoặc đã hủy/thay thế trong ví, nhập mã giao dịch
        kết thúc cùng nonce để mở lại lệnh. Chỉ từ chối cửa sổ ký chưa đủ để
        chứng minh lệnh đã hủy.
      </p>
      <button
        type="button"
        className="underline"
        disabled={busy || !hash}
        onClick={async () => {
          const result = await onResolve(transfer, hash);
          setMessage(
            result.success
              ? "Đã xác minh lệnh cũ kết thúc. Có thể tạo lệnh mới."
              : result.error || "Chưa có bằng chứng kết thúc lệnh.",
          );
        }}
      >
        Xác minh giao dịch thất bại / hủy
      </button>
      {message && (
        <p role="status" className="break-all">
          {message}
        </p>
      )}
    </form>
  );
}
