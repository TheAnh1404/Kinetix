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
}
export const DepositVaultModal: React.FC<Props> = ({
  isOpen,
  onClose,
  defaultVaultId,
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
  useEffect(() => {
    if (isOpen) {
      setSelected(defaultVaultId);
      setHash(null);
      setError(null);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Nạp AVAX"
        className="w-full max-w-lg rounded-3xl bg-white p-6 space-y-4 text-slate-900"
      >
        <h2 className="text-xl font-bold">Nạp AVAX vào hũ</h2>
        <p>
          {hubChain.name} · {hubChain.id} · T1 một chain
        </p>
        {!DEPLOYMENT.enabled && (
          <p role="alert" className="bg-amber-50 p-3 rounded-xl">
            Deployment mới chưa được xác minh. Hiện chưa thể ký nạp tiền.
          </p>
        )}
        {hash ? (
          <div className="space-y-3">
            <p role="status">Giao dịch đã xác nhận và đồng bộ.</p>
            <p>
              {amount} AVAX · {vault?.name}
            </p>
            <a
              className="text-red-700 underline break-all"
              href={`${SNOWTRACE_TESTNET_URL}/tx/${hash}`}
              target="_blank"
              rel="noreferrer"
            >
              Xem giao dịch: {hash}
            </a>
          </div>
        ) : (
          <>
            {vault ? (
              <>
                <label className="block">
                  Hũ nhận tiền
                  <select
                    className="block w-full border rounded-xl p-3"
                    value={vault.onchainVaultId}
                    onChange={(event) =>
                      setSelected(Number(event.target.value))
                    }
                    disabled={pending}
                  >
                    {vaults.map((item) => (
                      <option key={item.id} value={item.onchainVaultId}>
                        {item.name} · {item.ruleTemplate}
                      </option>
                    ))}
                  </select>
                </label>
                {issue && (
                  <p role="alert" className="bg-amber-50 p-3 rounded-xl">
                    {issue.message}
                  </p>
                )}
                <label className="block">
                  Số tiền (AVAX)
                  <input
                    className="block w-full border rounded-xl p-3 text-lg"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    disabled={pending}
                  />
                </label>
                <div className="flex gap-2">
                  {["0.01", "0.02", "0.05", "0.1"].map((value) => (
                    <button
                      key={value}
                      type="button"
                      disabled={pending}
                      onClick={() => setAmount(value)}
                      className="p-2 rounded-lg bg-slate-100"
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <p className="text-sm">
                  100% tiền nạp được giữ trên Fuji. Phí mạng được Core hiển thị
                  trước khi ký. Hũ chi tiền theo quy tắc và ngưỡng duyệt đã cấu
                  hình.
                </p>
                <button
                  type="button"
                  disabled={pending || !valid || !!issue || !DEPLOYMENT.enabled}
                  onClick={() => void submit()}
                  className="w-full min-h-12 bg-red-600 text-white rounded-xl font-bold disabled:opacity-40"
                >
                  {pending
                    ? "Đang chờ Core, xác nhận và đồng bộ…"
                    : `Ký nạp ${amount || "0"} AVAX`}
                </button>
              </>
            ) : (
              <p>
                Chưa có hũ phù hợp. Hũ ROSCA nhận tiền qua mục góp vốn định kỳ.
              </p>
            )}
            {error && (
              <p role="alert" className="text-red-800 break-words">
                {error}
              </p>
            )}
          </>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={onClose}
          className="min-h-12 w-full border rounded-xl"
        >
          Đóng
        </button>
      </section>
    </div>
  );
};
