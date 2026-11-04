"use client";
import React, { useEffect, useState } from "react";
import { Wallet, Clock3 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  pendingTransactions,
  reconcileTransactions,
  PendingTransaction,
} from "@/lib/web3/client";
export function AccountStatus() {
  const auth = useAuth();
  const [transactions, setTransactions] = useState<PendingTransaction[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!auth.user) return;
    const userId = auth.user.id;
    const refresh = () => setTransactions(pendingTransactions(userId));
    refresh();
    void reconcileTransactions(userId);
    const timer = setInterval(() => void reconcileTransactions(userId), 15000);
    window.addEventListener("kinetix-transactions-changed", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("kinetix-transactions-changed", refresh);
    };
  }, [auth.user?.id]);
  useEffect(() => {
    const showError = (event: Event) =>
      setError((event as CustomEvent<string>).detail);
    window.addEventListener("kinetix-operation-error", showError);
    return () =>
      window.removeEventListener("kinetix-operation-error", showError);
  }, []);
  const pending = transactions.filter(
    (transaction) => transaction.status === "PENDING",
  );
  const unsynced = transactions.filter(
    (transaction) =>
      transaction.status === "CONFIRMED" &&
      transaction.sync &&
      transaction.sync.status !== "DONE",
  );
  return (
    <div className="space-y-2 mb-4">
      {auth.sessionError && (
        <p className="auth-error" role="alert">
          {auth.sessionError}
        </p>
      )}
      {(!auth.connectedAddress || !auth.walletMatches) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <Wallet size={20} className="text-slate-400" />
            <p className="text-xs text-slate-600">
              {auth.connectedAddress
                ? "Ví đang kết nối chưa khớp ví đã liên kết. Đổi tài khoản trong Core để giao dịch."
                : "Bạn có thể xem dữ liệu. Khi giao dịch, hãy kết nối ví Core đã liên kết."}
            </p>
          </div>
          <button
            className="text-xs font-bold text-red-600"
            onClick={() =>
              void auth.connectWallet().catch((err) => setError(err.message))
            }
          >
            Kết nối Core
          </button>
        </div>
      )}
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      {auth.onchainPermissions.some(
        (request) => request.status !== "CONFIRMED",
      ) && (
        <p className="rounded-xl bg-slate-100 p-4 text-xs text-slate-600">
          Một số quyền giao dịch chưa có xác nhận cấp quyền. Người bảo hộ hoặc
          operator cần hoàn tất trên đúng mạng; quyền của từng hũ được kiểm lại
          trước khi gửi giao dịch.
        </p>
      )}
      {unsynced.length > 0 && (
        <p className="auth-error" role="status">
          {unsynced.length} giao dịch đã xác nhận trên blockchain, đang chờ đồng
          bộ dữ liệu hoặc cần Admin đối soát. Không gửi lại giao dịch.
        </p>
      )}
      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex gap-2 items-center text-xs font-bold text-amber-900">
            <Clock3 size={16} /> {pending.length} giao dịch đang chờ xác nhận
          </p>
          {pending.map((transaction) => (
            <p
              key={transaction.hash}
              className="text-[11px] text-amber-800 mt-2 break-all"
            >
              Mạng {transaction.chainId} · {transaction.hash}
            </p>
          ))}
          <p className="text-[11px] text-amber-800 mt-2">
            Tiếp tục theo dõi theo mã giao dịch khi đổi tài khoản hoặc ngắt
            Core. Không cần gửi lại.
          </p>
        </div>
      )}
    </div>
  );
}
