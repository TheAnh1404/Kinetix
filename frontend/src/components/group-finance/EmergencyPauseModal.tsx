"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  PauseCircle,
  PlayCircle,
  CheckCircle2,
  ShieldAlert,
  Users,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { GroupFundItem } from "@/types/groupFinance";
import { FinanceDialog } from "./FinanceDialog";
import { authRequest } from "@/hooks/useAuth";

interface PauseProposal {
  id: string;
  onchainProposalId?: number;
  action: "PAUSE" | "RESUME";
  approvals: number;
  quorum: number;
  hasVoted?: boolean;
  proposerAddress: string;
  createdAt?: string | number;
  status?: string;
}

interface EmergencyPauseModalProps {
  isOpen: boolean;
  onClose: () => void;
  fund: GroupFundItem | null;
  workspaceId?: string;
  userAddress?: string;
  onProposeAction?: (action: "PAUSE" | "RESUME") => Promise<{ success: boolean; error?: string }>;
  onApproveAction?: (proposalId: string) => Promise<{ success: boolean; error?: string }>;
  onExecuteAction?: (proposalId: string) => Promise<{ success: boolean; error?: string; txHash?: string }>;
}

export function EmergencyPauseModal({
  isOpen,
  onClose,
  fund,
  workspaceId,
  userAddress,
  onProposeAction,
  onApproveAction,
  onExecuteAction,
}: EmergencyPauseModalProps) {
  if (!isOpen || !fund) return null;

  return (
    <EmergencyPauseContent
      onClose={onClose}
      fund={fund}
      workspaceId={workspaceId}
      userAddress={userAddress}
      onProposeAction={onProposeAction}
      onApproveAction={onApproveAction}
      onExecuteAction={onExecuteAction}
    />
  );
}

function EmergencyPauseContent({
  onClose,
  fund,
  workspaceId,
  userAddress,
  onProposeAction,
  onApproveAction,
  onExecuteAction,
}: {
  onClose: () => void;
  fund: GroupFundItem;
  workspaceId?: string;
  userAddress?: string;
  onProposeAction?: (action: "PAUSE" | "RESUME") => Promise<{ success: boolean; error?: string }>;
  onApproveAction?: (proposalId: string) => Promise<{ success: boolean; error?: string }>;
  onExecuteAction?: (proposalId: string) => Promise<{ success: boolean; error?: string; txHash?: string }>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [proposals, setProposals] = useState<PauseProposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(true);

  const isPaused = Boolean(fund.isPaused || fund.status === "PAUSED");

  const fetchProposals = async () => {
    setLoadingProposals(true);
    try {
      const res = await authRequest(
        `/api/groups/${workspaceId || fund.workspaceId}/funds/${fund.id}/governance?type=ACTION`,
        undefined,
        "GET"
      );
      // Handles both data.actions and data.proposals
      const raw = res.data?.actions || res.data?.proposals || res.data || [];
      if (Array.isArray(raw)) {
        const normalized: PauseProposal[] = raw
          .filter(
            (p: any) =>
              (p.action === "PAUSE" ||
                p.action === "RESUME" ||
                p.type === "PAUSE" ||
                p.type === "RESUME") &&
              String(p.status || "").toUpperCase() !== "EXECUTED" &&
              String(p.status || "").toUpperCase() !== "REJECTED" &&
              String(p.status || "").toUpperCase() !== "CANCELLED"
          )
          .map((p: any) => {
            const onchainId = p.onchainProposalId ?? p.onchainActionId;
            return {
              id: onchainId !== undefined && onchainId !== null ? String(onchainId) : String(p.localId || p.id),
              onchainProposalId: onchainId !== undefined && onchainId !== null ? Number(onchainId) : undefined,
              action: (p.action || p.type) as "PAUSE" | "RESUME",
              approvals: Number(p.approvalsCount ?? p.approvals ?? 0),
              quorum: Number(p.quorum || fund.requiredApprovals || 2),
              hasVoted: Boolean(p.hasVoted),
              proposerAddress: p.proposerAddress || p.proposer || "",
              createdAt: p.createdAt,
              status: p.status,
            };
          });
        setProposals(normalized);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoadingProposals(false);
    }
  };

  useEffect(() => {
    void fetchProposals();
  }, [fund.id, workspaceId]);

  const handlePropose = async (action: "PAUSE" | "RESUME") => {
    setError("");
    setSuccessMsg("");
    setBusy(true);
    try {
      if (onProposeAction) {
        const res = await onProposeAction(action);
        if (!res.success) throw new Error(res.error || "Không tạo được đề xuất.");
      } else {
        await authRequest(
          `/api/groups/${workspaceId || fund.workspaceId}/funds/${fund.id}/governance/propose-action`,
          { action },
          "POST"
        );
      }
      setSuccessMsg(`Đã tạo đề xuất ${action === "PAUSE" ? "tạm dừng" : "mở lại"} quỹ thành công!`);
      void fetchProposals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo đề xuất thất bại.");
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async (proposalId: string) => {
    setError("");
    setBusy(true);
    try {
      const numericId = Number(proposalId);
      const idToPass = Number.isFinite(numericId) && numericId > 0 ? String(numericId) : proposalId;
      if (onApproveAction) {
        const res = await onApproveAction(idToPass);
        if (!res.success) throw new Error(res.error || "Ký duyệt thất bại.");
      } else {
        await authRequest(
          `/api/groups/${workspaceId || fund.workspaceId}/funds/${fund.id}/governance/${idToPass}/approve`,
          {},
          "POST"
        );
      }
      setSuccessMsg("Đã ký duyệt thành công!");
      void fetchProposals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ký duyệt thất bại.");
    } finally {
      setBusy(false);
    }
  };

  const handleExecute = async (proposalId: string) => {
    setError("");
    setBusy(true);
    try {
      const numericId = Number(proposalId);
      const idToPass = Number.isFinite(numericId) && numericId > 0 ? String(numericId) : proposalId;
      if (onExecuteAction) {
        const res = await onExecuteAction(idToPass);
        if (!res.success) throw new Error(res.error || "Thực thi thất bại.");
      } else {
        await authRequest(
          `/api/groups/${workspaceId || fund.workspaceId}/funds/${fund.id}/governance/${idToPass}/execute`,
          {},
          "POST"
        );
      }
      setSuccessMsg("Lệnh đã được thực thi trên Smart Contract!");
      void fetchProposals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thực thi thất bại.");
    } finally {
      setBusy(false);
    }
  };

  const activeProposal =
    proposals.find(
      (p) =>
        !p.status ||
        (String(p.status).toUpperCase() !== "EXECUTED" &&
          String(p.status).toUpperCase() !== "REJECTED" &&
          String(p.status).toUpperCase() !== "CANCELLED")
    ) || null;
  const quorum = fund.requiredApprovals || 2;

  return (
    <FinanceDialog title="Kiểm soát khẩn cấp (Emergency Control)" onClose={onClose} busy={busy}>
      <div className="space-y-4">
        {error && (
          <div className="finance-error text-xs flex items-start gap-2" role="alert">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
            <div className="min-w-0 flex-1">{error}</div>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-start gap-2">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
            <div className="min-w-0 flex-1">{successMsg}</div>
          </div>
        )}

        {/* Trạng thái quỹ hiện tại */}
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
            isPaused
              ? "bg-rose-950/30 border-rose-500/30 text-rose-200"
              : "bg-emerald-950/30 border-emerald-500/30 text-emerald-200"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isPaused
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              }`}
            >
              {isPaused ? <PauseCircle size={24} /> : <PlayCircle size={24} />}
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-slate-400 block">Trạng thái hũ quỹ</span>
              <span className="text-sm font-bold truncate block">
                {isPaused ? "Đã tạm dừng khẩn cấp (PAUSED)" : "Đang hoạt động bình thường (ACTIVE)"}
              </span>
            </div>
          </div>

          <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 shrink-0">
            Quorum: {quorum} người
          </span>
        </div>

        {/* Giải thích cơ chế Quorum Pause */}
        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed space-y-1">
          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
            <ShieldAlert size={14} className="text-amber-400" />
            <span>Cơ chế bảo vệ đa chữ ký V2:</span>
          </div>
          <p>
            • Khi <strong>Tạm dừng</strong>: Mọi giao dịch nạp tiền, chi tiền và rút hoàn tiền đều bị khóa tức thì trên smart contract.
          </p>
          <p>
            • Không giống đổi chính sách (cần 24h Timelock), lệnh Tạm dừng & Mở lại <strong>không có thời gian chờ</strong> và có hiệu lực ngay khi đủ {quorum} chữ ký của người duyệt.
          </p>
        </div>

        {/* Đề xuất đang mở nếu có */}
        {loadingProposals ? (
          <p className="text-center py-4 text-xs text-slate-400">Đang kiểm tra đề xuất khẩn cấp…</p>
        ) : activeProposal ? (
          <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-2xl space-y-3">
            <div className="flex justify-between items-start gap-2">
              <div>
                <span className="font-semibold text-slate-100 text-xs block">
                  Đề xuất #{activeProposal.onchainProposalId || activeProposal.id}: {activeProposal.action === "PAUSE" ? "Tạm dừng khẩn cấp" : "Mở lại hoạt động"}
                </span>
                <span className="text-[11px] text-slate-400 font-mono truncate block mt-0.5">
                  Người đề xuất: {activeProposal.proposerAddress}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Chờ duyệt
              </span>
            </div>

            <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-800">
              <span className="text-slate-400">Số phiếu biểu quyết:</span>
              <span className="font-mono font-bold text-slate-100">
                {activeProposal.approvals} / {activeProposal.quorum || quorum} phiếu
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      (activeProposal.approvals / (activeProposal.quorum || quorum)) * 100
                    )
                  )}%`,
                }}
              />
            </div>

            {/* Actions for active proposal */}
            <div className="pt-1 flex flex-col gap-2">
              {activeProposal.approvals < (activeProposal.quorum || quorum) ? (
                <button
                  type="button"
                  onClick={() => handleApprove(String(activeProposal.onchainProposalId ?? activeProposal.id))}
                  disabled={busy || activeProposal.hasVoted}
                  className="finance-primary"
                >
                  {busy
                    ? "Đang ký duyệt…"
                    : activeProposal.hasVoted
                    ? "Bạn đã ký duyệt đề xuất này"
                    : `Ký duyệt ${activeProposal.action === "PAUSE" ? "Tạm dừng" : "Mở lại"}`}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleExecute(String(activeProposal.onchainProposalId ?? activeProposal.id))}
                  disabled={busy}
                  className="finance-primary bg-emerald-600 hover:bg-emerald-500"
                >
                  {busy ? "Đang thực thi…" : "Thực thi ngay lập tức (Đã đủ phiếu)"}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Nút tạo đề xuất mới khi chưa có đề xuất nào */
          <div className="pt-2">
            {isPaused ? (
              <button
                type="button"
                onClick={() => handlePropose("RESUME")}
                disabled={busy}
                className="finance-primary bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center gap-2"
              >
                <PlayCircle size={18} />
                <span>{busy ? "Đang gửi đề xuất…" : "Đề xuất mở lại quỹ (Resume Fund)"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handlePropose("PAUSE")}
                disabled={busy}
                className="finance-primary bg-rose-600 hover:bg-rose-500 flex items-center justify-center gap-2"
              >
                <AlertTriangle size={18} />
                <span>{busy ? "Đang gửi đề xuất…" : "Đề xuất tạm dừng khẩn cấp (Emergency Pause)"}</span>
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="w-full min-h-[44px] text-xs text-slate-400 hover:text-slate-200 font-medium py-2 rounded-xl transition-colors"
        >
          Đóng
        </button>
      </div>
    </FinanceDialog>
  );
}
