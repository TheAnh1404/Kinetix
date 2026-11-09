"use client";

import React, { useEffect, useState } from "react";
import { parseEther } from "viem";
import { useFamily } from "@/context/FamilyContext";
import {
  hubChain,
  SNOWTRACE_TESTNET_URL,
  DEPLOYMENT,
} from "@/contracts/config";
import { vaultMappingIssue } from "../../../../shared/vaultMapping";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultVaultId?: number;
  onNext?: () => void;
}

export const DepositVaultModal: React.FC<Props> = ({
  isOpen,
  onClose,
  defaultVaultId,
  onNext,
}) => {
  const { dynamicVaults, depositToVault, currentWorkspace } = useFamily();
  const vaults = dynamicVaults.filter(
    (vault) => vault.ruleTemplate !== "ROSCA",
  );
  const [selected, setSelected] = useState(defaultVaultId);
  const [amount, setAmount] = useState("0.02");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelected(defaultVaultId);
      setHash(null);
      setError(null);
      setCopied(false);
    }
  }, [isOpen, defaultVaultId]);

  if (!isOpen) return null;
  const vault =
    vaults.find((item) => item.onchainVaultId === selected) || vaults[0];
  const issue = vault
    ? vaultMappingIssue(vault, hubChain.id, currentWorkspace?.l1HubAddress)
    : null;

  let valid = false;
  try {
    valid = /^\d+(\.\d{1,18})?$/.test(amount) && parseEther(amount) > 0n;
  } catch {
    /* giữ input không hợp lệ, không ký */
  }

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submit = async () => {
    if (!vault || !valid || issue || pending || !DEPLOYMENT.enabled) return;
    setPending(true);
    setError(null);
    try {
      const result = await depositToVault(vault.onchainVaultId, amount);
      if (result.success && result.txHash) setHash(result.txHash);
      else setError(result.error || "Chưa thể hoàn tất thao tác.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Nạp AVAX"
        className="w-full max-w-lg rounded-3xl bg-white p-6 space-y-5 text-slate-900 shadow-2xl border border-slate-200"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
              <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Nạp AVAX Vào Hũ Tiền</h2>
              <p className="text-xs text-slate-500">
                {hubChain.name} · Chain ID {hubChain.id} · Trực Tiếp On-Chain
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {!DEPLOYMENT.enabled && (
          <p role="alert" className="bg-amber-50 p-3 rounded-xl text-xs text-amber-800 border border-amber-200">
            Deployment mới chưa được xác minh. Hiện chưa thể ký nạp tiền.
          </p>
        )}

        {hash ? (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[28px]">check_circle</span>
            </div>
            <div>
              <h4 className="text-base font-bold text-emerald-950">
                Nạp Tiền Thành Công!
              </h4>
              <p className="text-xs text-emerald-800 mt-1">
                Đã nạp <strong>{amount} AVAX</strong> vào <strong>{vault?.name}</strong>.
              </p>
            </div>

            <a
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-mono font-semibold hover:bg-emerald-100/50 transition-colors"
              href={`${SNOWTRACE_TESTNET_URL}/tx/${hash}`}
              target="_blank"
              rel="noreferrer"
            >
              <span>Xem trên Snowtrace: {hash.slice(0, 10)}...{hash.slice(-8)}</span>
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>

            {onNext &&
              vault?.ruleTemplate === "MILESTONE" &&
              vault.onchainVaultId === defaultVaultId && (
                <button
                  className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs"
                  onClick={onNext}
                >
                  Tiếp Tục Giao Nhiệm Vụ
                </button>
              )}

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
            >
              Hoàn Tất
            </button>
          </div>
        ) : (
          <>
            {vault ? (
              <div className="space-y-4">
                {/* Chọn Hũ */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Hũ Nhận Tiền
                  </label>
                  <select
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
                    value={vault.onchainVaultId}
                    onChange={(event) =>
                      setSelected(Number(event.target.value))
                    }
                    disabled={pending}
                  >
                    {vaults.map((item) => (
                      <option key={item.id} value={item.onchainVaultId}>
                        {item.name} (#{item.onchainVaultId}) · {item.ruleTemplate}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Thông tin Contract Hũ riêng */}
                {vault.onchainVaultAddress && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        Địa Chỉ Hợp Đồng Hũ
                      </span>
                      <span className="font-mono text-slate-800 text-[11px]">
                        {vault.onchainVaultAddress.slice(0, 10)}...{vault.onchainVaultAddress.slice(-8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => copyAddress(vault.onchainVaultAddress!)}
                        className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-[10px] font-bold flex items-center gap-1 transition-all"
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {copied ? "check" : "content_copy"}
                        </span>
                        <span>{copied ? "Đã chép" : "Chép ví"}</span>
                      </button>
                      <a
                        href={`${SNOWTRACE_TESTNET_URL}/address/${vault.onchainVaultAddress}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
                        title="Xem hợp đồng trên Snowtrace"
                      >
                        <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                      </a>
                    </div>
                  </div>
                )}

                {issue && (
                  <p role="alert" className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    {issue.message}
                  </p>
                )}

                {/* Nhập số tiền */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Số Tiền Nạp (AVAX)
                  </label>
                  <div className="relative">
                    <input
                      className="w-full px-3.5 py-2.5 pr-16 rounded-xl bg-slate-50 border border-slate-200 text-base font-bold font-mono focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      disabled={pending}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      AVAX
                    </span>
                  </div>

                  {/* Nút gợi ý nhanh */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {["0.01", "0.05", "0.1", "0.5", "1"].map((val) => (
                      <button
                        key={val}
                        type="button"
                        disabled={pending}
                        onClick={() => setAmount(val)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                          amount === val
                            ? "bg-red-600 text-white shadow-xs"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Thông báo minh bạch on-chain */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2 text-[11px] text-slate-600 leading-relaxed">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600 shrink-0 mt-0.5">
                    verified_user
                  </span>
                  <span>
                    100% tiền nạp được chuyển thẳng vào Smart Contract của Hũ trên Avalanche Fuji. Sổ cái on-chain ghi nhận tự động và giải ngân theo đúng quy tắc đã cấu hình.
                  </span>
                </div>

                {error && (
                  <p role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 break-words flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-rose-600">error</span>
                    <span>{error}</span>
                  </p>
                )}

                {/* Nút ký nạp tiền */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={onClose}
                    className="w-1/3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    disabled={pending || !valid || !!issue || !DEPLOYMENT.enabled}
                    onClick={() => void submit()}
                    className="w-2/3 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {pending ? (
                      <>
                        <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Đang Chờ Ký Ví...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">
                          bolt
                        </span>
                        <span>Ký Nạp {amount || "0"} AVAX</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 text-center py-4">
                Chưa có hũ phù hợp. Hũ ROSCA nhận tiền qua mục góp vốn định kỳ.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
};
