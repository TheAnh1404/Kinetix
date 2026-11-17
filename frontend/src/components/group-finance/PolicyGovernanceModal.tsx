"use client";

import React, { useState, useEffect } from "react";
import { formatEther } from "viem";
import {
  Users,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Plus,
  Trash2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { GroupFundItem } from "@/types/groupFinance";
import { FinanceDialog } from "./FinanceDialog";
import { authRequest } from "@/hooks/useAuth";

interface PolicyProposal {
  id: string;
  quorum: number;
  dailyLimitAvax?: number;
  approvers: string[];
  approvals: number;
  hasVoted?: boolean;
  readyAt: number; // Unix timestamp in seconds
  status: "PENDING" | "READY" | "EXECUTED" | "EXPIRED";
  createdAt?: string | number;
}

interface PolicyGovernanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  fund: GroupFundItem | null;
  workspaceId?: string;
  userAddress?: string;
  onProposePolicy?: (params: {
    fundId: string;
    quorum: number;
    dailyLimitAvax?: string;
    approvers: string[];
  }) => Promise<{ success: boolean; error?: string }>;
  onApproveProposal?: (proposalId: string) => Promise<{ success: boolean; error?: string }>;
  onExecuteProposal?: (proposalId: string) => Promise<{ success: boolean; error?: string; txHash?: string }>;
}

export function PolicyGovernanceModal({
  isOpen,
  onClose,
  fund,
  workspaceId,
  userAddress,
  onProposePolicy,
  onApproveProposal,
  onExecuteProposal,
}: PolicyGovernanceModalProps) {
  if (!isOpen || !fund) return null;

  return (
    <PolicyGovernanceContent
      onClose={onClose}
      fund={fund}
      workspaceId={workspaceId}
      userAddress={userAddress}
      onProposePolicy={onProposePolicy}
      onApproveProposal={onApproveProposal}
      onExecuteProposal={onExecuteProposal}
    />
  );
}

function PolicyGovernanceContent({
  onClose,
  fund,
  workspaceId,
  userAddress,
  onProposePolicy,
  onApproveProposal,
  onExecuteProposal,
}: {
  onClose: () => void;
  fund: GroupFundItem;
  workspaceId?: string;
  userAddress?: string;
  onProposePolicy?: (params: {
    fundId: string;
    quorum: number;
    dailyLimitAvax?: string;
    approvers: string[];
  }) => Promise<{ success: boolean; error?: string }>;
  onApproveProposal?: (proposalId: string) => Promise<{ success: boolean; error?: string }>;
  onExecuteProposal?: (proposalId: string) => Promise<{ success: boolean; error?: string; txHash?: string }>;
}) {
  const [activeTab, setActiveTab] = useState<"proposals" | "new">("proposals");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [proposals, setProposals] = useState<PolicyProposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(true);

  // Form state for new proposal
  const [approvers, setApprovers] = useState<string[]>(
    fund.signers && fund.signers.length > 0 ? [...fund.signers] : [userAddress || ""]
  );
  const [newApproverInput, setNewApproverInput] = useState("");
  const [proposedQuorum, setProposedQuorum] = useState(
    fund.requiredApprovals || Math.max(1, Math.min(2, approvers.length - 1))
  );
  const [proposedDailyLimit, setProposedDailyLimit] = useState(
    fund.fastWithdrawLimitAvax ? String(fund.fastWithdrawLimitAvax) : "10"
  );

  // Countdown timer state
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const timer = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch proposals & normalize DTOs
  const fetchProposals = async () => {
    setLoadingProposals(true);
    try {
      const res = await authRequest(
        `/api/groups/${workspaceId || fund.workspaceId}/funds/${fund.id}/governance`,
        undefined,
        "GET"
      );
      const raw = res.data?.proposals || res.data || [];
      if (Array.isArray(raw)) {
        const normalized: PolicyProposal[] = raw.map((item: any) => {
          let readyAtSec = 0;
          if (typeof item.readyAt === "number") readyAtSec = item.readyAt;
          else if (item.readyAt) readyAtSec = Math.floor(new Date(item.readyAt).getTime() / 1000);

          let approverList: string[] = [];
          if (Array.isArray(item.approvers)) approverList = item.approvers;
          else if (Array.isArray(item.members)) {
            approverList = item.members.map((m: any) => (typeof m === "string" ? m : m.account || m.address || ""));
          } else if (fund.signers) {
            approverList = fund.signers;
          }

          return {
            id: String(item.onchainProposalId || item.localId || item.id),
            quorum: Number(item.quorum || item.policy?.quorum || fund.requiredApprovals || 2),
            dailyLimitAvax: item.dailyLimitWei
              ? Number(formatEther(BigInt(item.dailyLimitWei)))
              : item.dailyLimitAvax
              ? Number(item.dailyLimitAvax)
              : undefined,
            approvers: approverList.filter(Boolean),
            approvals: Number(item.approvalsCount ?? item.approvals ?? 0),
            hasVoted: Boolean(item.hasVoted),
            readyAt: readyAtSec,
            status: item.status || "PENDING",
            createdAt: item.createdAt,
          };
        });
        setProposals(normalized);
        if (normalized.length === 0) setActiveTab("new");
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

  const handleAddApprover = () => {
    const trimmed = newApproverInput.trim().toLowerCase();
    if (!trimmed.startsWith("0x") || trimmed.length !== 42) {
      setError("Địa chỉ ví không hợp lệ (cần định dạng 0x... 42 ký tự).");
      return;
    }
    if (approvers.map((a) => a.toLowerCase()).includes(trimmed)) {
      setError("Địa chỉ ví này đã có trong danh sách.");
      return;
    }
    setError("");
    setApprovers([...approvers, trimmed]);
    setNewApproverInput("");
  };

  const handleRemoveApprover = (idx: number) => {
    if (approvers.length <= 2) {
      setError("Chính sách yêu cầu tối thiểu 2 người duyệt.");
      return;
    }
    setError("");
    const updated = approvers.filter((_, i) => i !== idx);
    setApprovers(updated);
    if (proposedQuorum >= updated.length) {
      setProposedQuorum(Math.max(1, updated.length - 1));
    }
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (approvers.length < 2) {
      setError("Quỹ yêu cầu tối thiểu 2 người duyệt độc lập.");
      return;
    }
    if (proposedQuorum < 1 || proposedQuorum >= approvers.length) {
      setError(`Ngưỡng duyệt phải từ 1 đến ${approvers.length - 1}.`);
      return;
    }

    setBusy(true);
    try {
      if (onProposePolicy) {
        const res = await onProposePolicy({
          fundId: fund.id,
          quorum: proposedQuorum,
          dailyLimitAvax: fund.fundType === "OPERATING" ? proposedDailyLimit : undefined,
          approvers,
        });
        if (!res.success) throw new Error(res.error || "Không tạo được đề xuất.");
      } else {
        await authRequest(
          `/api/groups/${workspaceId || fund.workspaceId}/funds/${fund.id}/governance/propose-policy`,
          {
            quorum: proposedQuorum,
            dailyLimitAvax: fund.fundType === "OPERATING" ? proposedDailyLimit : undefined,
            approvers,
          },
          "POST"
        );
      }
      setSuccessMsg("Đã tạo đề xuất thay đổi chính sách thành công!");
      void fetchProposals();
      setActiveTab("proposals");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo đề xuất thất bại.");
    } finally {
      setBusy(false);
    }
  };

  const handleApproveProposal = async (proposalId: string) => {
    setError("");
    setBusy(true);
    try {
      if (onApproveProposal) {
        const res = await onApproveProposal(proposalId);
        if (!res.success) throw new Error(res.error || "Ký duyệt thất bại.");
      } else {
        await authRequest(
          `/api/groups/${workspaceId || fund.workspaceId}/funds/${fund.id}/governance/${proposalId}/approve`,
          {},
          "POST"
        );
      }
      setSuccessMsg("Đã ký duyệt đề xuất!");
      void fetchProposals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ký duyệt thất bại.");
    } finally {
      setBusy(false);
    }
  };

  const handleExecuteProposal = async (proposalId: string) => {
    setError("");
    setBusy(true);
    try {
      if (onExecuteProposal) {
        const res = await onExecuteProposal(proposalId);
        if (!res.success) throw new Error(res.error || "Thực thi chính sách thất bại.");
      } else {
        await authRequest(
          `/api/groups/${workspaceId || fund.workspaceId}/funds/${fund.id}/governance/${proposalId}/execute`,
          {},
          "POST"
        );
      }
      setSuccessMsg("Đã áp dụng chính sách mới thành công trên Smart Contract!");
      void fetchProposals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thực thi thất bại.");
    } finally {
      setBusy(false);
    }
  };

  const formatCountdown = (targetSec: number) => {
    const diff = targetSec - nowSec;
    if (diff <= 0) return null;
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    return `${hours}h ${minutes < 10 ? "0" : ""}${minutes}m ${seconds < 10 ? "0" : ""}${seconds}s`;
  };

  return (
    <FinanceDialog title="Quản trị chính sách (24h Timelock)" onClose={onClose} busy={busy}>
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex rounded-xl bg-slate-900/80 p-1 gap-1 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("proposals")}
            className={`flex-1 min-h-[44px] py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === "proposals"
                ? "bg-[#E84142] text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Đề xuất đang xử lý ({proposals.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("new")}
            className={`flex-1 min-h-[44px] py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === "new"
                ? "bg-[#E84142] text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Tạo đề xuất mới
          </button>
        </div>

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

        {activeTab === "proposals" ? (
          <div className="space-y-3.5">
            {loadingProposals ? (
              <p className="text-center py-6 text-xs text-slate-400">Đang tải đề xuất quản trị…</p>
            ) : proposals.length === 0 ? (
              <div className="p-6 text-center bg-slate-900/50 border border-slate-800 rounded-2xl space-y-3">
                <Users size={28} className="mx-auto text-slate-500" />
                <p className="text-xs text-slate-400">
                  Chưa có đề xuất thay đổi chính sách nào đang chờ xử lý.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("new")}
                  className="min-h-[44px] px-4 rounded-xl bg-slate-800 text-white text-xs font-medium hover:bg-slate-700 transition-colors"
                >
                  Tạo đề xuất mới
                </button>
              </div>
            ) : (
              proposals.map((item) => {
                const countdown = item.readyAt ? formatCountdown(item.readyAt) : null;
                const isTimelockDone = item.readyAt > 0 && nowSec >= item.readyAt;
                const hasQuorum = item.approvals >= item.quorum;

                return (
                  <div
                    key={item.id}
                    className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3 shadow-sm text-xs"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="font-semibold text-slate-100 text-sm block">
                          Đổi người duyệt & hạn mức
                        </span>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          Ngưỡng: {item.quorum}/{(item.approvers || []).length} người duyệt
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {item.status}
                      </span>
                    </div>

                    {/* Danh sách người duyệt mới */}
                    <div className="p-2.5 bg-slate-950/60 rounded-xl space-y-1 border border-slate-800/80">
                      <span className="text-[11px] font-medium text-slate-400 block">
                        Danh sách người duyệt đề xuất ({(item.approvers || []).length}):
                      </span>
                      {(item.approvers || []).map((addr, idx) => (
                        <div key={idx} className="font-mono text-[11px] text-slate-300 truncate">
                          • {addr}
                        </div>
                      ))}
                    </div>

                    {/* Tiến độ duyệt */}
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-800">
                      <span className="text-slate-400">Tiến độ chữ ký:</span>
                      <span className="font-mono font-bold text-slate-100">
                        {item.approvals} / {item.quorum} phiếu
                      </span>
                    </div>

                    {/* 24h Timelock Box */}
                    {hasQuorum && (
                      <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl space-y-1.5">
                        <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-xs">
                          <Clock size={15} />
                          <span>Thời gian khóa an toàn (24h Timelock)</span>
                        </div>
                        {countdown ? (
                          <div className="space-y-1">
                            <div className="text-base font-mono font-bold text-amber-200 tracking-wide">
                              {countdown}
                            </div>
                            <p className="text-[11px] text-amber-300/80 leading-snug">
                              Chính sách đã đạt đủ chữ ký nhưng cần chờ hết 24 giờ để đảm bảo an toàn trước khi có thể áp dụng on-chain.
                            </p>
                          </div>
                        ) : isTimelockDone ? (
                          <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 size={14} />
                            <span>Đã hết thời gian khóa 24h · Sẵn sàng áp dụng!</span>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400">Đang khởi tạo thời gian khóa…</p>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="pt-2 flex flex-col gap-2">
                      {!hasQuorum && !item.hasVoted && (
                        <button
                          type="button"
                          onClick={() => handleApproveProposal(item.id)}
                          disabled={busy}
                          className="finance-primary"
                        >
                          {busy ? "Đang xử lý…" : "Ký duyệt đề xuất này"}
                        </button>
                      )}

                      {hasQuorum && isTimelockDone && item.status !== "EXECUTED" && (
                        <button
                          type="button"
                          onClick={() => handleExecuteProposal(item.id)}
                          disabled={busy}
                          className="finance-primary bg-emerald-600 hover:bg-emerald-500"
                        >
                          {busy ? "Đang thực thi…" : "Áp dụng chính sách mới (Execute Policy)"}
                        </button>
                      )}

                      {hasQuorum && !isTimelockDone && (
                        <button
                          type="button"
                          disabled
                          className="finance-primary bg-slate-800 text-slate-400 cursor-not-allowed opacity-60"
                        >
                          Đang trong thời gian khóa 24h
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <form onSubmit={handleCreateProposal} className="space-y-4">
            <div className="p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 leading-relaxed">
              <span className="font-semibold block mb-0.5">Quy tắc quản trị V2:</span>
              Mọi thay đổi người duyệt hoặc hạn mức chi đều cần biểu quyết của quorum hiện tại và tuân thủ thời gian chờ 24 giờ (Timelock) trước khi có hiệu lực on-chain.
            </div>

            {/* Danh sách người duyệt */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-200 block">
                Danh sách ví người duyệt ({approvers.length})
              </label>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {approvers.map((addr, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2 bg-slate-900/60 border border-slate-800 rounded-xl text-xs"
                  >
                    <span className="font-mono text-slate-300 truncate flex-1">{addr}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveApprover(idx)}
                      disabled={busy || approvers.length <= 2}
                      className="text-slate-500 hover:text-rose-400 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors disabled:opacity-30"
                      title="Xóa người duyệt"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Thêm ví người duyệt mới */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="0x... địa chỉ ví mới"
                  value={newApproverInput}
                  onChange={(e) => setNewApproverInput(e.target.value)}
                  className="flex-1 min-h-[44px] text-xs font-mono p-2.5 rounded-xl border border-slate-700 bg-slate-950/80 text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleAddApprover}
                  disabled={busy || !newApproverInput.trim()}
                  className="min-h-[44px] px-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
                >
                  <Plus size={15} />
                  <span>Thêm</span>
                </button>
              </div>
            </div>

            {/* Ngưỡng duyệt */}
            <div>
              <label className="text-xs font-semibold text-slate-200 block mb-1">
                Ngưỡng duyệt mới (Quorum)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, approvers.length - 1)}
                  value={proposedQuorum}
                  onChange={(e) => setProposedQuorum(Number(e.target.value))}
                  className="min-h-[44px] w-24 p-2 text-base font-semibold border border-slate-700 bg-slate-950/80 text-white rounded-xl text-center"
                />
                <span className="text-xs text-slate-400">
                  / {approvers.length} người duyệt ({Math.round((proposedQuorum / approvers.length) * 100)}%)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Ngưỡng tối thiểu là 1 và phải nhỏ hơn tổng số người duyệt để đảm bảo tính độc lập.
              </p>
            </div>

            {/* Hạn mức ngày cho Quỹ Hoạt Động */}
            {fund.fundType === "OPERATING" && (
              <div>
                <label className="text-xs font-semibold text-slate-200 block mb-1">
                  Hạn mức chi tiêu theo ngày (Daily Limit AVAX)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={proposedDailyLimit}
                  onChange={(e) => setProposedDailyLimit(e.target.value)}
                  className="w-full min-h-[44px] p-2.5 text-base border border-slate-700 bg-slate-950/80 text-white rounded-xl"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Tổng số AVAX tối đa được chi nhanh trong một ngày UTC.
                </p>
              </div>
            )}

            <button type="submit" disabled={busy} className="finance-primary">
              {busy ? "Đang gửi đề xuất…" : "Tạo đề xuất thay đổi chính sách"}
            </button>
          </form>
        )}
      </div>
    </FinanceDialog>
  );
}
