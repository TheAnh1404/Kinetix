"use client";

import React, { useState, useEffect } from "react";
import { formatEther } from "viem";
import { AlertCircle, CheckCircle2, ExternalLink, RefreshCw, AlertTriangle, ShieldCheck } from "lucide-react";
import { GroupFundItem } from "@/types/groupFinance";
import { FinanceDialog } from "./FinanceDialog";
import { authRequest } from "@/hooks/useAuth";

interface RefundGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  fund: GroupFundItem | null;
  userAddress?: string;
  workspaceId?: string;
  onRefund?: (fundId: string) => Promise<{ success: boolean; error?: string; txHash?: string }>;
}

export function parseIsoDateSafely(val: string | null | undefined): Date | null {
  if (!val || val === "Chưa đặt hạn" || val === "Chưa ấn định") return null;
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d;
  // Parse dd/mm/yyyy hh:mm:ss if present
  const match = val.match(/(\d{1,2}):(\d{1,2}):(\d{1,2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [, hour, minute, second, day, month, year] = match;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

export function RefundGoalModal({
  isOpen,
  onClose,
  fund,
  userAddress,
  workspaceId,
  onRefund,
}: RefundGoalModalProps) {
  if (!isOpen || !fund) return null;

  return (
    <RefundGoalContent
      onClose={onClose}
      fund={fund}
      userAddress={userAddress}
      workspaceId={workspaceId}
      onRefund={onRefund}
    />
  );
}

function RefundGoalContent({
  onClose,
  fund,
  userAddress,
  workspaceId,
  onRefund,
}: {
  onClose: () => void;
  fund: GroupFundItem;
  userAddress?: string;
  workspaceId?: string;
  onRefund?: (fundId: string) => Promise<{ success: boolean; error?: string; txHash?: string }>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [contributedAvax, setContributedAvax] = useState<number | null>(null);
  const [loadingEligibility, setLoadingEligibility] = useState(true);

  const deadlineDate = parseIsoDateSafely(fund.targetDeadline);
  const isExpired = deadlineDate ? deadlineDate.getTime() <= Date.now() : false;
  const isGoalFailed = !fund.goalReached && isExpired;

  useEffect(() => {
    let live = true;
    if (!fund.id || !workspaceId) {
      setLoadingEligibility(false);
      return;
    }

    setLoadingEligibility(true);
    authRequest(`/api/groups/${workspaceId}/funds/${fund.id}/refund-eligibility`, undefined, "GET")
      .then((res) => {
        if (!live) return;
        const data = res.data;
        if (data?.contributedAmountWei !== undefined) {
          setContributedAvax(Number(formatEther(BigInt(data.contributedAmountWei))));
        } else if (data?.contributedWei !== undefined) {
          setContributedAvax(Number(formatEther(BigInt(data.contributedWei))));
        } else if (data?.refundableAmountWei !== undefined) {
          setContributedAvax(Number(formatEther(BigInt(data.refundableAmountWei))));
        } else if (data?.contributedAvax !== undefined) {
          setContributedAvax(Number(data.contributedAvax));
        } else {
          setContributedAvax(0);
        }
      })
      .catch((err) => {
        if (!live) return;
        // Strict financial rule: never fallback to total fund balance
        setContributedAvax(0);
        setError("Chưa tải được thông tin đóng góp từ backend. Bạn vẫn có thể thử gọi contract nếu đã góp.");
      })
      .finally(() => {
        if (live) setLoadingEligibility(false);
      });

    return () => {
      live = false;
    };
  }, [fund.id, workspaceId]);

  const effectiveContributed = contributedAvax ?? 0;
  const canRefund =
    isGoalFailed &&
    !fund.isPaused &&
    (loadingEligibility || effectiveContributed > 0);

  const handleExecuteRefund = async () => {
    setError("");
    setBusy(true);
    try {
      if (onRefund) {
        const result = await onRefund(fund.id);
        if (!result.success) {
          throw new Error(result.error || "Giao dịch hoàn tiền không thành công.");
        }
        setTxHash(result.txHash || "confirmed");
      } else {
        const res = await authRequest(
          `/api/groups/${workspaceId || fund.workspaceId}/funds/${fund.id}/refund`,
          {},
          "POST"
        );
        setTxHash(res.data?.txHash || "confirmed");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Giao dịch hoàn tiền thất bại. Vui lòng kiểm tra ví và thử lại."
      );
    } finally {
      setBusy(false);
    }
  };

  const formattedDeadline = deadlineDate
    ? deadlineDate.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : fund.targetDeadline || "Chưa ấn định";

  return (
    <FinanceDialog title="Hoàn tiền mục tiêu thất bại" onClose={onClose} busy={busy}>
      <div className="space-y-4">
        {error && (
          <div className="finance-error text-xs flex items-start gap-2" role="alert">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
            <div className="min-w-0 flex-1">{error}</div>
          </div>
        )}

        {txHash ? (
          <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl space-y-3 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">Hoàn tiền thành công!</h3>
              <p className="text-xs text-slate-300 mt-1">
                Toàn bộ khoản tiền bạn đã góp đã được giải ngân trực tiếp từ Smart Contract về ví của bạn.
              </p>
            </div>
            {txHash !== "confirmed" && (
              <a
                href={`https://testnet.snowtrace.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-mono underline min-h-[44px]"
              >
                <span>Xem trên Snowtrace</span>
                <ExternalLink size={13} />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="finance-primary mt-2"
            >
              Đóng cửa sổ
            </button>
          </div>
        ) : (
          <>
            {/* Tóm tắt tình trạng quỹ */}
            <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Hũ quỹ:</span>
                <span className="font-semibold text-slate-100 truncate max-w-[200px]">{fund.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Mục tiêu:</span>
                <span className="font-mono font-bold text-slate-200">
                  {fund.targetAmountAvax?.toFixed(2) || "0"} AVAX
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Hạn chót góp:</span>
                <span className="text-slate-200">{formattedDeadline}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                <span className="text-slate-400">Trạng thái:</span>
                {fund.goalReached ? (
                  <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Đã đạt mục tiêu
                  </span>
                ) : isExpired ? (
                  <span className="font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                    Mục tiêu thất bại (Quá hạn)
                  </span>
                ) : (
                  <span className="font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    Đang kêu gọi góp
                  </span>
                )}
              </div>
            </div>

            {/* Quyền hoàn trả 100% của thành viên */}
            <div className="p-4 bg-[#141B2B] border border-indigo-500/20 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-indigo-400" />
                  <span>Quyền hoàn trả 100% On-Chain</span>
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                  1-Tap Claim
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xs text-slate-400">Khoản tiền hoàn lại:</span>
                <div className="text-right">
                  {loadingEligibility ? (
                    <span className="text-xs text-slate-400 animate-pulse">Đang truy vấn số dư on-chain…</span>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-mono font-bold text-slate-100 tabular-nums">
                        {effectiveContributed.toFixed(2)}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">AVAX</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800 leading-relaxed space-y-1">
                {userAddress && (
                  <div className="break-all">
                    Ví nhận: <span className="font-mono text-slate-300">{userAddress}</span>
                  </div>
                )}
                {isGoalFailed ? (
                  <p className="text-emerald-400 font-medium">
                    ✓ Quỹ không đạt mục tiêu trước hạn chót. Bạn có quyền hoàn tiền 1-tap trực tiếp từ smart contract mà không cần ai duyệt.
                  </p>
                ) : !isExpired ? (
                  <p className="text-amber-400">
                    ⚠ Quỹ vẫn đang kêu gọi góp vốn. Chỉ mở quyền hoàn tiền tự động khi hết hạn chót mà không đạt mục tiêu.
                  </p>
                ) : (
                  <p className="text-slate-400">
                    Quỹ đã đạt mục tiêu thành công nên số tiền đóng góp không áp dụng hoàn trả.
                  </p>
                )}
              </div>
            </div>

            {/* Cảnh báo tạm dừng nếu có */}
            {fund.isPaused && (
              <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-xs text-rose-300">
                ⚠ Quỹ đang tạm dừng khẩn cấp. Cần quorum mở lại quỹ trước khi rút hoàn tiền.
              </div>
            )}

            {/* Nút 1-tap Refund */}
            <button
              type="button"
              onClick={handleExecuteRefund}
              disabled={busy || !canRefund}
              className="finance-primary flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Đang xử lý giao dịch on-chain…</span>
                </>
              ) : canRefund ? (
                <span>Rút lại tiền góp ngay (1-Tap Refund)</span>
              ) : (
                <span>Chưa đủ điều kiện hoàn tiền</span>
              )}
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="w-full min-h-[44px] text-xs text-slate-400 hover:text-slate-200 font-medium py-2 rounded-xl transition-colors"
            >
              Hủy bỏ
            </button>
          </>
        )}
      </div>
    </FinanceDialog>
  );
}
