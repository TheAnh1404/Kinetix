"use client";

import React, { useState, useEffect } from "react";
import { parseEther } from "viem";
import { useFamily } from "@/context/FamilyContext";
import { DynamicVaultItem } from "@/types";
import { SNOWTRACE_TESTNET_URL } from "@/contracts/config";

interface InterVaultTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceVault?: DynamicVaultItem | null;
  allVaults: DynamicVaultItem[];
}

/**
 * Modal Chuyển Tiền Giữa Các Hũ Nội Bộ (Inter-Vault Transfer)
 * Cho phép luân chuyển AVAX trực tiếp và nguyên tử giữa 2 Hũ do Factory tạo ra.
 */
export const InterVaultTransferModal: React.FC<InterVaultTransferModalProps> = ({
  isOpen,
  onClose,
  sourceVault: initialSource,
  allVaults,
}) => {
  const { transferBetweenVaults } = useFamily();
  const [selectedSourceId, setSelectedSourceId] = useState<number | undefined>(
    initialSource?.onchainVaultId
  );
  const [destinationAddress, setDestinationAddress] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Lọc các Hũ có địa chỉ onchain
  const eligibleVaults = allVaults.filter(
    (v) => v.onchainVaultAddress && v.onchainVaultAddress.startsWith("0x")
  );

  const currentSource =
    eligibleVaults.find((v) => v.onchainVaultId === selectedSourceId) ||
    eligibleVaults[0];

  const destinationOptions = eligibleVaults.filter(
    (v) => v.onchainVaultId !== currentSource?.onchainVaultId
  );

  useEffect(() => {
    if (isOpen) {
      if (initialSource?.onchainVaultId) {
        setSelectedSourceId(initialSource.onchainVaultId);
      } else if (eligibleVaults.length > 0) {
        setSelectedSourceId(eligibleVaults[0].onchainVaultId);
      }
      setAmount("");
      setError(null);
      setTxHash(null);
    }
  }, [isOpen, initialSource]);

  useEffect(() => {
    if (destinationOptions.length > 0 && !destinationAddress) {
      setDestinationAddress(destinationOptions[0].onchainVaultAddress || "");
    }
  }, [selectedSourceId, destinationOptions, destinationAddress]);

  if (!isOpen) return null;

  const sourceTotal = currentSource?.cachedTotalBalance ?? currentSource?.totalBalance ?? 0;
  const sourceAvailable = currentSource?.availableBalance ?? sourceTotal;

  const handleMaxClick = () => {
    if (sourceAvailable > 0) {
      setAmount(sourceAvailable.toString());
    }
  };

  const handleTransfer = async () => {
    if (!currentSource || !destinationAddress) {
      setError("Vui lòng chọn đầy đủ Hũ nguồn và Hũ đích.");
      return;
    }

    let parsedAmount = 0n;
    try {
      parsedAmount = parseEther(amount);
      if (parsedAmount <= 0n) {
        setError("Số tiền chuyển phải lớn hơn 0 AVAX.");
        return;
      }
    } catch {
      setError("Định dạng số tiền không hợp lệ.");
      return;
    }

    if (parseFloat(amount) > sourceAvailable) {
      setError(`Số dư khả dụng của Hũ nguồn chỉ còn ${sourceAvailable.toFixed(4)} AVAX.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await transferBetweenVaults(
        currentSource.onchainVaultId,
        destinationAddress,
        amount
      );

      if (res.success && res.txHash) {
        setTxHash(res.txHash);
      } else {
        setError(res.error || "Giao dịch chuyển tiền thất bại.");
      }
    } catch (err: any) {
      setError(err?.message || "Đã xảy ra lỗi khi gửi giao dịch.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900"
      >
        {/* Header Modal */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <span className="material-symbols-outlined text-[22px]">swap_horiz</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Chuyển Tiền Giữa Các Hũ
              </h3>
              <p className="text-xs text-slate-500">
                Luân chuyển AVAX nguyên tử trực tiếp giữa 2 Smart Contracts
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

        {/* Nội dung Modal */}
        <div className="p-6 space-y-5">
          {txHash ? (
            /* Trạng thái thành công */
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[28px]">check_circle</span>
              </div>
              <div>
                <h4 className="text-base font-bold text-emerald-950">
                  Chuyển Tiền Thành Công!
                </h4>
                <p className="text-xs text-emerald-800 mt-1">
                  Đã chuyển {amount} AVAX từ {currentSource?.name} sang Hũ đích an toàn.
                </p>
              </div>

              <a
                href={`${SNOWTRACE_TESTNET_URL}/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-mono font-semibold hover:bg-emerald-100/50 transition-colors"
              >
                <span>Xem trên Snowtrace: {txHash.slice(0, 10)}...{txHash.slice(-8)}</span>
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>

              <button
                onClick={onClose}
                className="mt-2 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                Hoàn Tất
              </button>
            </div>
          ) : (
            <>
              {/* Chọn Hũ Nguồn */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>1. Hũ Nguồn (Trừ tiền)</span>
                  <span className="text-[11px] text-emerald-700 font-mono">
                    Khả dụng: <strong>{sourceAvailable.toFixed(4)}</strong> AVAX
                  </span>
                </label>
                <select
                  value={currentSource?.onchainVaultId}
                  onChange={(e) => setSelectedSourceId(Number(e.target.value))}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                >
                  {eligibleVaults.map((vault) => (
                    <option key={vault.id} value={vault.onchainVaultId}>
                      {vault.name} (#{vault.onchainVaultId}) · {vault.ruleTemplate}
                    </option>
                  ))}
                </select>
                {currentSource?.onchainVaultAddress && (
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    Contract: {currentSource.onchainVaultAddress}
                  </p>
                )}
              </div>

              {/* Icon mũi tên chuyển giao */}
              <div className="flex justify-center -my-2 relative z-10">
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                </div>
              </div>

              {/* Chọn Hũ Đích */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  2. Hũ Đích (Cộng tiền)
                </label>
                {destinationOptions.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    Chưa có thêm Hũ nào có địa chỉ contract V1 để nhận tiền. Hãy tạo thêm Hũ mới.
                  </div>
                ) : (
                  <select
                    value={destinationAddress}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  >
                    {destinationOptions.map((vault) => (
                      <option
                        key={vault.id}
                        value={vault.onchainVaultAddress || ""}
                      >
                        {vault.name} (#{vault.onchainVaultId}) · {vault.ruleTemplate}
                      </option>
                    ))}
                  </select>
                )}
                {destinationAddress && (
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    Contract: {destinationAddress}
                  </p>
                )}
              </div>

              {/* Nhập số lượng AVAX */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    3. Số Lượng AVAX Chuyển
                  </label>
                  <button
                    type="button"
                    onClick={handleMaxClick}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    Tối Đa (Max)
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 pr-16 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    AVAX
                  </span>
                </div>
              </div>

              {/* Cảnh báo lỗi */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
                  <span className="material-symbols-outlined text-[18px] text-rose-600">
                    error
                  </span>
                  <span>{error}</span>
                </div>
              )}

              {/* Cam kết an toàn On-Chain */}
              <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-2 text-[11px] text-indigo-900 leading-relaxed">
                <span className="material-symbols-outlined text-[16px] text-indigo-600 shrink-0 mt-0.5">
                  lock
                </span>
                <span>
                  Giao dịch chuyển tiền được thực thi nguyên tử (atomic) giữa 2 hợp đồng Hũ Kinetix. Tiền chỉ rời Hũ nguồn khi Hũ đích xác nhận nhận tiền thành công.
                </span>
              </div>

              {/* Nút hành động */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleTransfer}
                  disabled={isSubmitting || destinationOptions.length === 0}
                  className="w-2/3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Đang Ký On-Chain...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">
                        verified
                      </span>
                      <span>Ký Chuyển Hũ Trực Tiếp</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
