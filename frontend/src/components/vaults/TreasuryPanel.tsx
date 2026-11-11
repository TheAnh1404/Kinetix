"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createWalletClient, custom, formatEther } from "viem";
import { avalancheFuji } from "viem/chains";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/hooks/useAuth";
import { getCoreProvider } from "@/lib/web3/client";
import { treasuryCancelMemo } from "../../../../shared/treasury";

type Transfer = {
  id: string;
  jarId: string;
  destinationJarId: string | null;
  kind: string;
  amount: string;
  sender: string;
  recipient: string;
  status: string;
  txHash: string | null;
  transaction: null | {
    to: string;
    from: string;
    value: string;
    nonce: string;
    data: string;
  };
};
type Overview = {
  address: string;
  chainId: number;
  canManage: boolean;
  jars: {
    id: string;
    name: string;
    balance: string;
    available: string;
    reservedWei: string;
  }[];
  transfers: Transfer[];
  reconciliation: null | {
    walletBalance: string;
    allocated: string;
    difference: string;
    blockNumber: string;
  };
};
async function api(path: string, body?: object) {
  const response = await fetch(`/api/${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(data.error || "Không thể cập nhật sổ hũ.");
  return data;
}
const explorer = "https://explorer-test.avax.network/c-chain/tx/";
export function TreasuryPanel() {
  const auth = useAuth();
  const { currentWorkspace } = useFamily();
  const workspaceId = currentWorkspace?.id;
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [jarId, setJarId] = useState("");
  const [destinationJarId, setDestination] = useState("");
  const [kind, setKind] = useState("DEPOSIT");
  const [amount, setAmount] = useState("0.01");
  const [recipient, setRecipient] = useState("");
  const [hashes, setHashes] = useState<Record<string, string>>({});
  const request = useRef<{ key: string; id: string } | null>(null);
  const scope = useRef(workspaceId);
  scope.current = workspaceId;
  const load = useCallback(async () => {
    if (!workspaceId) return;
    const result = await api(`workspaces/${workspaceId}/treasury`);
    if (scope.current === workspaceId) setOverview(result.data);
  }, [workspaceId]);
  useEffect(() => {
    setOverview(null);
    setJarId("");
    setDestination("");
    setError("");
    setMessage("");
    request.current = null;
    void load().catch((e) => setError(e.message));
    const timer = setInterval(() => void load().catch(() => {}), 15000);
    return () => clearInterval(timer);
  }, [load]);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const sign = async (transfer: Transfer, cancel = false) => {
    const transaction = transfer.transaction;
    if (
      !transaction ||
      !["READY", "SUBMITTED"].includes(transfer.status) ||
      (!cancel && transfer.status !== "READY")
    )
      return;
    const storageKey = `kinetix-treasury:${transfer.id}${cancel ? ":cancel" : ""}`;
    // Save immediately after broadcast; recovering a hash must never broadcast again.
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      await api(`treasury/transfers/${transfer.id}/transaction`, {
        txHash: saved,
      });
      setMessage("Đã gửi lại tx hash để đối soát.");
      return;
    }
    const provider = getCoreProvider();
    if (!cancel) await api(`treasury/transfers/${transfer.id}/preflight`, {});
    if (!provider) throw new Error("Mở và kết nối Core Wallet để ký.");
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    if (accounts[0]?.toLowerCase() !== transaction.from.toLowerCase())
      throw new Error(`Chuyển Core sang ví ký ${transaction.from}.`);
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xa869" }],
    });
    if (Number(await provider.request({ method: "eth_chainId" })) !== 43113)
      throw new Error("Core chưa ở mạng Fuji.");
    if (scope.current !== workspaceId)
      throw new Error("Không gian đã thay đổi. Mở lại giao dịch.");
    const wallet = createWalletClient({
      chain: avalancheFuji,
      transport: custom(provider),
    });
    const hash = await wallet.sendTransaction({
      account: accounts[0],
      to: (cancel ? transaction.from : transaction.to) as `0x${string}`,
      value: cancel ? 0n : BigInt(transaction.value),
      nonce: Number(transaction.nonce),
      data: cancel
        ? treasuryCancelMemo(transfer.id)
        : (transaction.data as `0x${string}`),
    });
    setHashes((previous) => ({ ...previous, [transfer.id]: hash }));
    try {
      localStorage.setItem(storageKey, hash);
    } catch {
      /* Hash remains visible for manual recovery. */
    }
    setMessage(`Đã gửi ${hash}. Đang chờ finalized và cập nhật sổ hũ.`);
    await api(`treasury/transfers/${transfer.id}/transaction`, {
      txHash: hash,
    });
  };
  const inputClass =
    "w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm min-h-11 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500/20";
  const buttonClass =
    "rounded-xl bg-slate-900 dark:bg-red-600 hover:bg-slate-800 dark:hover:bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 min-h-11 cursor-pointer transition-colors";
  return (
    <section
      className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 md:p-6 space-y-5 text-slate-900 dark:text-slate-100 transition-colors"
      aria-labelledby="treasury-title"
      id="core-treasury"
      aria-busy={busy}
    >
      <div>
        <h2 id="treasury-title" className="text-xl font-bold text-slate-900 dark:text-white">
          Hũ tiền · Ví chung Fuji
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          AVAX testnet được giữ trong Core; số dư từng hũ được ghi trong
          database. Chủ ví chung ký lệnh chi.
        </p>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 dark:bg-red-950/40 p-3 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900/60 break-words"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 break-all"
        >
          {message}
        </p>
      )}
      {!overview ? (
        <p role="status" className="text-slate-500 dark:text-slate-400">
          {error ? "Chưa tải được sổ hũ." : "Đang tải sổ hũ…"}
        </p>
      ) : (
        <>
          <p className="text-sm break-all text-slate-600 dark:text-slate-300">
            Ví giữ tiền:{" "}
            <a
              className="underline font-mono text-red-600 dark:text-red-400"
              href={`https://explorer-test.avax.network/c-chain/address/${overview.address}`}
              target="_blank"
              rel="noreferrer"
            >
              {overview.address}
            </a>{" "}
            · Chain {overview.chainId}
          </p>
          {overview.reconciliation && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 p-3 text-sm space-y-1">
              <p className="font-semibold text-slate-900 dark:text-slate-200">
                Ví on-chain: {overview.reconciliation.walletBalance} AVAX · Đã
                phân bổ: {overview.reconciliation.allocated} AVAX
              </p>
              <p className="font-mono text-xs text-slate-700 dark:text-slate-300">
                Chênh lệch: {overview.reconciliation.difference} AVAX · Block{" "}
                {overview.reconciliation.blockNumber}
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Tiền chuyển trực tiếp vào ví và phí gas nằm trong chênh lệch. Sổ
                hũ có thể đang chờ worker đồng bộ.
              </p>
            </div>
          )}
          {overview.canManage && (
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void run(async () => {
                  await api(`workspaces/${workspaceId}/treasury/jars`, {
                    name,
                  });
                  setName("");
                  setMessage("Đã tạo hũ với số dư 0 AVAX.");
                });
              }}
            >
              <label className="flex-1 min-w-48 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Tên hũ mới
                <input
                  className={inputClass}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                />
              </label>
              <button className={buttonClass} disabled={busy || !name.trim()}>
                Tạo hũ ví chung
              </button>
            </form>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {overview.jars.map((jar) => (
              <article
                key={jar.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4"
              >
                <h3 className="font-semibold break-words text-slate-900 dark:text-white">{jar.name}</h3>
                <p className="text-lg font-bold mt-2 break-all font-mono text-slate-900 dark:text-white">
                  {jar.balance} AVAX
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 break-all">
                  Khả dụng {jar.available} · Giữ chỗ{" "}
                  {formatEther(BigInt(jar.reservedWei))}
                </p>
              </article>
            ))}
          </div>
          {overview.jars.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Chưa có hũ ví chung. Quản trị viên có thể tạo hũ phía trên.
            </p>
          ) : (
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                void run(async () => {
                  const body = {
                    kind,
                    jarId: jarId || overview.jars[0].id,
                    destinationJarId,
                    amount,
                    recipient,
                  };
                  const key = JSON.stringify(body);
                  if (request.current?.key !== key)
                    request.current = { key, id: crypto.randomUUID() };
                  const result = await api(
                    `workspaces/${workspaceId}/treasury/transfers`,
                    { ...body, requestId: request.current.id },
                  );
                  request.current = null;
                  setMessage(
                    result.transfer.kind === "INTERNAL"
                      ? "Đã ghi hai bút toán chuyển nội bộ. Không phát sinh giao dịch blockchain."
                      : "Đã tạo yêu cầu. Kiểm tra và ký tại danh sách bên dưới; số dư chỉ cập nhật sau finalized.",
                  );
                });
              }}
            >
              <label className="text-sm">
                Thao tác
                <select
                  className={inputClass}
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                >
                  <option value="DEPOSIT">Nạp từ ví cá nhân</option>
                  {overview.canManage && (
                    <>
                      <option value="WITHDRAW">Rút ra ví nhận</option>
                      <option value="INTERNAL">Chuyển giữa các hũ</option>
                    </>
                  )}
                </select>
              </label>
              <label className="text-sm">
                Hũ nguồn / hũ nạp
                <select
                  className={inputClass}
                  value={jarId || overview.jars[0].id}
                  onChange={(e) => setJarId(e.target.value)}
                >
                  {overview.jars.map((jar) => (
                    <option key={jar.id} value={jar.id}>
                      {jar.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Số AVAX
                <input
                  className={inputClass}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  required
                  pattern="[0-9]+(\.[0-9]{1,18})?"
                />
              </label>
              {kind === "WITHDRAW" && (
                <label className="text-sm">
                  Địa chỉ nhận
                  <input
                    className={inputClass}
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    required
                    placeholder="0x…"
                  />
                </label>
              )}
              {kind === "INTERNAL" && (
                <label className="text-sm">
                  Hũ nhận
                  <select
                    className={inputClass}
                    value={destinationJarId}
                    onChange={(e) => setDestination(e.target.value)}
                    required
                  >
                    <option value="">Chọn hũ nhận</option>
                    {overview.jars
                      .filter(
                        (jar) => jar.id !== (jarId || overview.jars[0].id),
                      )
                      .map((jar) => (
                        <option key={jar.id} value={jar.id}>
                          {jar.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <button className={buttonClass} disabled={busy}>
                Tạo yêu cầu{" "}
                {kind === "INTERNAL"
                  ? "chuyển nội bộ"
                  : kind === "WITHDRAW"
                    ? "rút tiền"
                    : "nạp tiền"}
              </button>
            </form>
          )}
          <div className="space-y-3">
            <h3 className="font-bold">Lịch sử và yêu cầu chờ ký</h3>
            <p className="text-xs text-slate-600">
              100 yêu cầu gần nhất. Ký theo thứ tự nonce. Nếu đã gửi, dùng tx
              hash để đối soát. Lệnh rút chờ ký tiếp tục giữ chỗ số dư.
            </p>
            {overview.transfers.map((transfer) => (
              <article
                key={transfer.id}
                className="rounded-xl border border-slate-200 p-3 text-sm space-y-2"
              >
                <p className="font-semibold">
                  {transfer.kind} · {transfer.amount} AVAX · {transfer.status}
                </p>
                <p>
                  {overview.jars.find((jar) => jar.id === transfer.jarId)?.name}
                  {transfer.destinationJarId &&
                    ` → ${overview.jars.find((jar) => jar.id === transfer.destinationJarId)?.name}`}
                </p>
                <p className="text-xs break-all text-slate-600">
                  Mã đối soát {transfer.id}
                  {transfer.kind !== "INTERNAL" &&
                    ` · Nhận: ${transfer.recipient}`}
                </p>
                {(transfer.txHash || hashes[transfer.id]) && (
                  <a
                    className="underline break-all"
                    href={`${explorer}${transfer.txHash || hashes[transfer.id]}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {transfer.txHash || hashes[transfer.id]}
                  </a>
                )}
                {transfer.status === "READY" && transfer.sender.toLowerCase() === auth.linkedWallet?.address.toLowerCase() && (
                  <button
                    type="button"
                    className={buttonClass}
                    disabled={busy}
                    onClick={() => void run(() => sign(transfer))}
                  >
                    Ký bằng Core · nonce {transfer.transaction?.nonce}
                  </button>
                )}
                {["READY", "SUBMITTED"].includes(transfer.status) && transfer.sender.toLowerCase() === auth.linkedWallet?.address.toLowerCase() && (
                  <button
                    type="button"
                    className="min-h-11 px-3 underline text-sm"
                    disabled={busy}
                    onClick={() => void run(() => sign(transfer, true))}
                  >
                    Ký hủy bằng Core (tốn gas)
                  </button>
                )}
                {["READY", "SUBMITTED"].includes(transfer.status) && (
                  <form
                    className="flex flex-wrap gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void run(async () => {
                        await api(
                          `treasury/transfers/${transfer.id}/transaction`,
                          { txHash: hashes[transfer.id] || transfer.txHash },
                        );
                        setMessage(
                          "Đã kiểm tra tx hash. Giao dịch chưa finalized sẽ tiếp tục được theo dõi.",
                        );
                      });
                    }}
                  >
                    <label className="flex-1 text-xs">
                      Tx hash đã gửi
                      <input
                        className={inputClass}
                        value={hashes[transfer.id] || transfer.txHash || ""}
                        onChange={(e) =>
                          setHashes((old) => ({
                            ...old,
                            [transfer.id]: e.target.value,
                          }))
                        }
                        required
                        pattern="0x[0-9a-fA-F]{64}"
                      />
                    </label>
                    <button className={buttonClass} disabled={busy}>
                      Đối soát
                    </button>
                  </form>
                )}
              </article>
            ))}
          </div>
          <button
            type="button"
            className="underline text-sm min-h-11"
            disabled={busy}
            onClick={() => void run(load)}
          >
            Làm mới sổ hũ
          </button>
        </>
      )}
    </section>
  );
}
