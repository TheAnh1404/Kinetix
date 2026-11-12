"use client";

import React, { useId, useState } from "react";
import {
  ArrowDownLeft,
  ChevronDown,
  Info,
  Minus,
  Plus,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { formatEther, parseEther } from "viem";
import { MemberVaultPolicy } from "@/hooks/useVaultPolicy";
import { ElderlySpeakerButton } from "./ElderlySpeakerButton";
import { formatElderlyAvax } from "./elderlyUtils";

interface DynamicVaultItem {
  id: string;
  name: string;
  ruleTemplate: string;
  onchainVaultId: number;
  exactTotalBalance?: string;
  isActive: boolean;
}

interface ElderlyQuickWithdrawCardProps {
  /** Danh sách các hũ an sinh SHIELD */
  vaults: DynamicVaultItem[];
  /** Hũ đang chọn */
  selectedVault?: DynamicVaultItem;
  /** Thay đổi hũ đang chọn */
  onSelectVault: (vaultId: string) => void;
  /** Chính sách hạn mức hũ từ smart contract */
  policy: MemberVaultPolicy | null;
  /** Đơn vị tiền tệ (mặc định: AVAX) */
  asset?: string;
  /** Hàm mở modal xác nhận rút tiền */
  onRequestWithdraw: (params: {
    amount: string;
    isLarge: boolean;
    reason: string;
  }) => void;
  /** Trạng thái cấm thao tác khi đang gửi giao dịch */
  isBusy?: boolean;
}

/**
 * Thẻ rút tiền trợ cấp tức thì dành cho Người cao tuổi (Ông bà / Senior).
 * Tối ưu công thái học di động:
 * - Nút bấm và chip chọn số tiền >= 56px.
 * - Tương phản màu sắc WCAG AAA (>= 7:1) ở cả chế độ sáng và tối.
 * - Hỗ trợ các chip chọn nhanh (0.1, 0.5, 1.0 AVAX, Tối đa rút ngay).
 * - Bộ tăng giảm số tiền (+/- 0.1) to rõ, không cần bấm bàn phím nhỏ.
 * - Nút nghe đọc hướng dẫn bằng giọng nói tiếng Việt tự nhiên.
 */
export function ElderlyQuickWithdrawCard({
  vaults,
  selectedVault,
  onSelectVault,
  policy,
  asset = "AVAX",
  onRequestWithdraw,
  isBusy = false,
}: ElderlyQuickWithdrawCardProps) {
  const selectId = useId();
  // Mặc định chọn 0.5 AVAX hoặc 0.1 AVAX
  const [amount, setAmount] = useState("0.5");
  const [reason, setReason] = useState("Sinh hoạt hàng ngày");
  const [localError, setLocalError] = useState("");

  // Hạn mức rút nhanh tức thì từ hợp đồng (L1 Buffer - 0 gas, <1s)
  const fastLimitNum = policy?.fastWithdrawLimit
    ? parseFloat(policy.fastWithdrawLimit)
    : 1.0;
  // Số dư có sẵn trong bộ đệm L1 hiện tại
  const availableNowNum = policy?.availableNow
    ? parseFloat(policy.availableNow)
    : 0;
  // Tổng số dư của hũ (bao gồm cả C-Chain yield)
  const totalBalanceNum = policy?.totalBalance
    ? parseFloat(policy.totalBalance)
    : 0;

  // Kiểm tra số tiền hiện tại có hợp lệ
  const currentNum = parseFloat(amount) || 0;
  // Khoản rút lớn nếu vượt hạn mức rút nhanh (fastWithdrawLimit)
  const isLarge = currentNum > fastLimitNum;

  // Danh sách các chip chọn nhanh (>= 56px touch target)
  const presetChips = [
    { label: "0.1 AVAX", value: "0.1" },
    { label: "0.5 AVAX", value: "0.5" },
    { label: "1.0 AVAX", value: "1.0" },
  ];

  // Bổ sung nút "Tối đa rút ngay" nếu có số dư khả dụng
  if (availableNowNum > 0 && availableNowNum !== 0.1 && availableNowNum !== 0.5 && availableNowNum !== 1.0) {
    const maxQuickStr = Math.min(availableNowNum, fastLimitNum).toFixed(1);
    if (!presetChips.some((p) => p.value === maxQuickStr)) {
      presetChips.push({
        label: `Tối đa (${maxQuickStr})`,
        value: maxQuickStr,
      });
    }
  }

  // Tăng/giảm số tiền bằng nút bấm lớn
  const handleStep = (delta: number) => {
    setLocalError("");
    const nextVal = Math.max(0.1, +(currentNum + delta).toFixed(2));
    setAmount(nextVal.toString());
  };

  // Xử lý khi nhấn nút RÚT VỀ VÍ
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!selectedVault) {
      setLocalError("Xin ông bà chọn một hũ an sinh để rút tiền.");
      return;
    }

    if (currentNum <= 0) {
      setLocalError("Số tiền rút phải lớn hơn 0 AVAX.");
      return;
    }

    if (currentNum > totalBalanceNum && totalBalanceNum > 0) {
      setLocalError(
        `Số tiền rút vượt quá tổng số dư hiện có của hũ (${formatElderlyAvax(totalBalanceNum)} AVAX).`
      );
      return;
    }

    // Nếu rút nhanh mà số dư đệm L1 chưa đủ
    if (!isLarge && currentNum > availableNowNum && availableNowNum > 0) {
      setLocalError(
        `Bộ đệm L1 chỉ còn ${formatElderlyAvax(availableNowNum)} AVAX để rút ngay. Ông bà có thể rút số nhỏ hơn hoặc chọn rút lớn để con cháu duyệt.`
      );
      return;
    }

    // Mở modal xác nhận với các thông số chuẩn
    onRequestWithdraw({
      amount: currentNum.toString(),
      isLarge,
      reason: isLarge ? reason : "Rút chi tiêu sinh hoạt tức thì",
    });
  };

  // Đoạn văn bản cho nút đọc hướng dẫn
  const speechGuidance = `Mục rút tiền trợ cấp tức thì. Hũ an sinh đang có ${formatElderlyAvax(
    availableNowNum
  )} AVAX có thể rút ngay trong một giây, không mất phí giao dịch. Ông bà đang chọn rút ${amount} AVAX. Bấm nút Rút tiền về ví của tôi màu xanh ở dưới cùng để xác nhận.`;

  return (
    <section
      className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-3xl p-5 md:p-7 shadow-md transition-all"
      aria-labelledby="quick-withdraw-title"
    >
      {/* Tiêu đề & Nút nghe đọc */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 border-2 border-emerald-600 dark:border-emerald-400 flex items-center justify-center text-emerald-900 dark:text-emerald-200 flex-shrink-0">
            <Zap className="w-8 h-8" aria-hidden="true" />
          </div>
          <div>
            <span className="text-xs font-black tracking-wider uppercase text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700">
              0 Gas · Nhận dưới 1 giây
            </span>
            <h2
              id="quick-withdraw-title"
              className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-slate-50 mt-1"
            >
              Rút tiền trợ cấp tức thì
            </h2>
          </div>
        </div>

        <ElderlySpeakerButton
          textToSpeak={speechGuidance}
          label="Nghe hướng dẫn"
          className="self-start sm:self-auto"
        />
      </div>

      {/* Bộ chọn hũ nếu gia đình có nhiều hơn 1 hũ an sinh */}
      {vaults.length > 1 && (
        <div className="mt-5">
          <label
            htmlFor={selectId}
            className="block text-lg font-bold text-slate-900 dark:text-slate-100 mb-2"
          >
            Chọn hũ muốn rút tiền:
          </label>
          <div className="relative">
            <select
              id={selectId}
              value={selectedVault?.id || ""}
              onChange={(e) => onSelectVault(e.target.value)}
              className="w-full min-h-[56px] text-lg font-bold bg-slate-50 dark:bg-slate-800 text-slate-950 dark:text-slate-50 border-2 border-slate-400 dark:border-slate-600 rounded-2xl px-4 pr-12 appearance-none focus:outline-none focus:ring-4 focus:ring-emerald-400"
            >
              {vaults.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <ChevronDown
              className="w-6 h-6 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 dark:text-slate-300"
              aria-hidden="true"
            />
          </div>
        </div>
      )}

      {/* Thông số hạn mức & Khả dụng hiện tại */}
      <div className="mt-5 p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-700/80">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-lg font-semibold text-emerald-950 dark:text-emerald-100">
            Có thể rút ngay về ví:
          </span>
          <span className="text-3xl font-black text-emerald-800 dark:text-emerald-300">
            {formatElderlyAvax(availableNowNum)}{" "}
            <span className="text-xl font-bold">{asset}</span>
          </span>
        </div>
        <p className="text-base text-emerald-900 dark:text-emerald-200 mt-1">
          Hạn mức rút tức thì không cần duyệt:{" "}
          <strong>{formatElderlyAvax(fastLimitNum)} {asset}</strong> / lần.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* Các chip chọn nhanh số tiền (Touch targets >= 56px) */}
        <div>
          <label className="block text-lg font-bold text-slate-900 dark:text-slate-100 mb-2.5">
            Chọn nhanh số tiền:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {presetChips.map((chip) => {
              const active = amount === chip.value;
              return (
                <button
                  type="button"
                  key={chip.value}
                  onClick={() => {
                    setAmount(chip.value);
                    setLocalError("");
                  }}
                  className={`min-h-[56px] px-3 py-3 rounded-2xl font-black text-xl flex items-center justify-center transition-all duration-150 active:scale-95 focus:outline-none focus:ring-4 ${
                    active
                      ? "bg-emerald-700 text-white border-4 border-emerald-900 shadow-md ring-2 ring-emerald-400 dark:bg-emerald-600 dark:border-emerald-200"
                      : "bg-slate-100 text-slate-900 hover:bg-slate-200 border-2 border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
                  }`}
                  aria-pressed={active}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bộ tăng/giảm số tiền to rõ (+ / - 0.1) */}
        <div>
          <label
            htmlFor="elderly-amount-input"
            className="block text-lg font-bold text-slate-900 dark:text-slate-100 mb-2"
          >
            Số tiền muốn rút ({asset}):
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleStep(-0.1)}
              disabled={currentNum <= 0.1 || isBusy}
              aria-label="Giảm 0.1 AVAX"
              className="min-h-[56px] min-w-[56px] w-14 h-14 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 border-2 border-slate-400 dark:border-slate-600 flex items-center justify-center active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-emerald-400"
            >
              <Minus className="w-8 h-8" aria-hidden="true" />
            </button>

            <div className="flex-1 relative">
              <input
                id="elderly-amount-input"
                type="number"
                step="0.05"
                min="0.05"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setLocalError("");
                }}
                disabled={isBusy}
                className="w-full min-h-[56px] text-3xl font-black text-center text-slate-950 dark:text-slate-50 bg-slate-50 dark:bg-slate-800 border-2 border-slate-400 dark:border-slate-600 rounded-2xl px-4 focus:outline-none focus:ring-4 focus:ring-emerald-400"
                placeholder="0.0"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-600 dark:text-slate-300 pointer-events-none">
                {asset}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleStep(0.1)}
              disabled={isBusy}
              aria-label="Tăng 0.1 AVAX"
              className="min-h-[56px] min-w-[56px] w-14 h-14 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 border-2 border-slate-400 dark:border-slate-600 flex items-center justify-center active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-emerald-400"
            >
              <Plus className="w-8 h-8" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Thông báo thông minh: Rút tức thì vs Rút lớn cần duyệt */}
        {isLarge ? (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-400 dark:border-amber-600 text-amber-950 dark:text-amber-100 space-y-3">
            <div className="flex items-start gap-2.5">
              <Info className="w-6 h-6 flex-shrink-0 text-amber-700 dark:text-amber-300 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-black text-lg">Khoản rút lớn ({amount} {asset})</p>
                <p className="text-base text-amber-900 dark:text-amber-200 mt-0.5">
                  Số tiền vượt quá hạn mức rút nhanh ({formatElderlyAvax(fastLimitNum)} {asset}). Yêu cầu này sẽ được gửi đến con cháu trong gia đình để ký duyệt trước khi chuyển tiền về ví cho ông bà.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-base font-bold text-amber-950 dark:text-amber-100 mb-1.5">
                Mục đích sử dụng:
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full min-h-[52px] text-lg font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-2 border-amber-400 dark:border-amber-600 rounded-xl px-3 focus:outline-none focus:ring-4 focus:ring-amber-400"
              >
                <option value="Sinh hoạt hàng ngày">Sinh hoạt hàng ngày</option>
                <option value="Thuốc men & Khám bệnh">Thuốc men & Khám bệnh</option>
                <option value="Mua sắm thiết yếu">Mua sắm thiết yếu</option>
                <option value="Việc gia đình khác">Việc gia đình khác</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-400 dark:border-emerald-600 text-emerald-950 dark:text-emerald-100 flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 flex-shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
            <p className="text-base font-medium">
              Khoản rút này nằm trong hạn mức tức thì. Tiền sẽ được chuyển ngay về ví trong <strong>dưới 1 giây</strong> và <strong>hoàn toàn không mất phí mạng</strong> (0 Gas).
            </p>
          </div>
        )}

        {/* Thông báo lỗi nếu có */}
        {localError && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950 border-2 border-rose-500 text-rose-950 dark:text-rose-100 text-lg font-bold flex items-center gap-2"
          >
            <Info className="w-6 h-6 text-rose-600 flex-shrink-0" aria-hidden="true" />
            <span>{localError}</span>
          </div>
        )}

        {/* Nút bấm hành động chính (min-h >= 60px, chuẩn công thái học ngón tay cái) */}
        <button
          type="submit"
          disabled={isBusy || currentNum <= 0}
          className="w-full min-h-[64px] px-6 py-4 rounded-2xl font-black text-2xl text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 border-2 border-emerald-900 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:border-emerald-300 shadow-lg transition-all duration-150 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-emerald-400"
        >
          <ArrowDownLeft className="w-8 h-8 flex-shrink-0" aria-hidden="true" />
          <span>Rút {amount || "0"} {asset} về ví của tôi</span>
        </button>
      </form>
    </section>
  );
}
