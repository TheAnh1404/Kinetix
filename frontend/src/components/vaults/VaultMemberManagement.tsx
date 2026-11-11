"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWorkspaceAccess } from "@/hooks/useWorkspaceAccess";
import type { DynamicVaultItem } from "@/types";
import { useAuth, authRequest } from "@/hooks/useAuth";
import { useFamily } from "@/context/FamilyContext";
import { useMemberTransaction } from "@/hooks/useMemberTransaction";
import { MemberManagementModal } from "@/components/dashboard/MemberManagementModal";

type Candidate = {
  id: string;
  fullName: string;
  role: string;
  walletAddress: string;
  inVault: boolean;
  allowlisted: boolean;
};

type Proposal = {
  proposalId: string;
  memberAddress: string;
  guardianRole: boolean;
  approvalsCount: number;
  requiredApprovals: number;
  deadline: number;
  approvedByCaller: boolean;
};

export function VaultMemberManagement({
  vault,
  guardians,
  beneficiaries,
}: {
  vault: DynamicVaultItem;
  guardians: string[];
  beneficiaries: string[];
}) {
  const auth = useAuth();
  const family = useFamily();
  const transaction = useMemberTransaction();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [canApprove, setCanApprove] = useState(false);
  const [candidateId, setCandidateId] = useState("");
  const [guardianRole, setGuardianRole] = useState(true);
  const [loading, setLoading] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const permission = auth.workspaces.find((item) => item.id === family.currentWorkspace?.id);
  const { isOwner: canManageMembers } = useWorkspaceAccess();
  const eligible = useMemo(() => candidates.filter((person) => !person.inVault), [candidates]);
  const allowlisted = useMemo(() => eligible.filter((person) => person.walletAddress && person.allowlisted), [eligible]);
  const selectedCandidate = allowlisted.find((person) => person.id === candidateId);
  const canBeGuardian = selectedCandidate ? ["ADMIN", "GUARDIAN"].includes(selectedCandidate.role) : true;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authRequest(`/api/vaults/${vault.id}/member-additions`, undefined, "GET");
      setCandidates(data.candidates || []);
      setProposals(data.proposals || []);
      setCanApprove(data.canApprove === true);
      setError("");
    } catch (failure: any) {
      setError(failure.message || "Không tải được danh sách thành viên Hũ.");
    } finally {
      setLoading(false);
    }
  }, [vault.id]);

  useEffect(() => {
    void load();
    window.addEventListener("kinetix-sync-complete", load);
    return () => window.removeEventListener("kinetix-sync-complete", load);
  }, [load]);

  const submit = async (candidate: Candidate, isGuardian: boolean, proposalId: string) => {
    setError("");
    setNotice("");
    const completed = await transaction.execute({
      functionName: "approveVaultMemberAddition",
      args: [BigInt(vault.onchainVaultId), candidate.walletAddress as `0x${string}`, isGuardian, proposalId as `0x${string}`],
      path: "/api/vault-members/add",
      body: { vaultId: vault.id, memberAddress: candidate.walletAddress, guardianRole: isGuardian, proposalId },
    });
    if (completed) {
      setNotice("Chữ ký đã được xác nhận. Hũ và đề nghị thành viên đang được đồng bộ.");
      await Promise.all([load(), family.refreshMembers()]);
      transaction.reset();
    }
  };

  const propose = async () => {
    const target = allowlisted.find((person) => person.id === candidateId);
    if (!target) {
      setError("Chọn thành viên đang hoạt động, đã liên kết ví và được allowlist trước.");
      return;
    }
    if (guardianRole && !["ADMIN", "GUARDIAN"].includes(target.role)) {
      setError("Tài khoản trẻ em/người cao tuổi chỉ có thể tham gia Hũ với vai trò Beneficiary.");
      return;
    }
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const proposalId = `0x${Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("")}`;
    await submit(target, guardianRole, proposalId);
  };

  const approve = async (proposal: Proposal) => {
    const target = candidates.find((person) => person.walletAddress.toLowerCase() === proposal.memberAddress.toLowerCase());
    if (!target) {
      setError("Không tìm thấy thành viên được đề nghị trong danh sách workspace đang hoạt động.");
      return;
    }
    await submit(target, proposal.guardianRole, proposal.proposalId);
  };

  const refreshAfterMemberModal = () => {
    setMemberModalOpen(false);
    void family.refreshMembers();
    void load();
  };

  const nameFor = (address: string) => candidates.find((person) => person.walletAddress.toLowerCase() === address.toLowerCase())?.fullName || address;

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-xs space-y-4 text-slate-900 dark:text-slate-100 transition-colors" aria-labelledby={`vault-members-${vault.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={`vault-members-${vault.id}`} className="text-sm font-extrabold text-slate-900 dark:text-white">Thành viên Hũ</h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-600 dark:text-slate-400">Guardian hiện tại phê duyệt bằng quorum M/N. Người được thêm cần là thành viên workspace, đã liên kết ví Core và được allowlist. Hũ ROSCA chỉ nhận thêm Guardian để giữ nguyên thứ tự nhận tiền.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="min-h-10 rounded-xl border border-slate-300 dark:border-slate-700 px-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer">Làm mới</button>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-400">
        <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 text-emerald-800 dark:text-emerald-300">{guardians.length} Guardian hiện tại</span>
        <span className="rounded-full bg-blue-50 dark:bg-blue-950/60 px-3 py-1 text-blue-800 dark:text-blue-300">{beneficiaries.length} Beneficiary hiện tại</span>
        {!canApprove && <span className="rounded-full bg-amber-50 dark:bg-amber-950/60 px-3 py-1 text-amber-800 dark:text-amber-300">Chỉ ví Guardian hiện tại mới ký được</span>}
      </div>

      {canApprove && (
        <div className="grid gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
          <label className="space-y-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>Thành viên workspace</span>
            <select value={candidateId} onChange={(event) => {
              const next = allowlisted.find((person) => person.id === event.target.value);
              setCandidateId(event.target.value);
              setGuardianRole(!next || ["ADMIN", "GUARDIAN"].includes(next.role));
            }} disabled={transaction.blocked || loading} className="min-h-11 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-white">
              <option value="" className="dark:bg-slate-900 dark:text-white">Chọn người cần thêm…</option>
              {eligible.map((person) => <option key={person.id} value={person.id} disabled={!person.walletAddress || !person.allowlisted || (vault.ruleTemplate === "ROSCA" && !["ADMIN", "GUARDIAN"].includes(person.role))} className="dark:bg-slate-900 dark:text-white">{person.fullName} · {person.role}{!person.walletAddress ? " · chưa liên kết ví" : person.allowlisted ? "" : " · chưa allowlist"}</option>)}
            </select>
          </label>
          {vault.ruleTemplate !== "ROSCA" ? (
            <label className="space-y-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Vai trò trong Hũ</span>
              <select value={guardianRole ? "GUARDIAN" : "BENEFICIARY"} onChange={(event) => setGuardianRole(event.target.value === "GUARDIAN")} disabled={transaction.blocked} className="min-h-11 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-white">
                {canBeGuardian && <option value="GUARDIAN" className="dark:bg-slate-900 dark:text-white">Guardian · ký duyệt</option>}
                <option value="BENEFICIARY" className="dark:bg-slate-900 dark:text-white">Beneficiary · thụ hưởng</option>
              </select>
            </label>
          ) : <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Vai trò: Guardian</p>}
          <button type="button" disabled={!candidateId || transaction.blocked || loading} onClick={() => void propose()} className="min-h-11 rounded-xl bg-slate-900 hover:bg-black dark:bg-red-600 dark:hover:bg-red-700 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">Gửi đề nghị</button>
        </div>
      )}

      {canManageMembers && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-100 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 p-4">
          <p className="flex-1 text-xs leading-relaxed text-blue-900 dark:text-blue-200">Tạo hồ sơ trẻ em hoặc người cao tuổi tại workspace này. Người đó cần đăng nhập, liên kết ví và được cấp allowlist trước khi có thể tham gia Hũ.</p>
          <button type="button" onClick={() => setMemberModalOpen(true)} className="min-h-10 rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-blue-800 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-slate-800 cursor-pointer">Tạo hồ sơ thành viên</button>
        </div>
      )}

      {eligible.length > 0 && allowlisted.length === 0 && <p className="text-xs text-amber-800 dark:text-amber-300">Có hồ sơ workspace chưa đủ điều kiện. Thành viên cần đăng nhập, liên kết ví riêng và hoàn tất cấp quyền on-chain tại mục Thiết lập gia đình trước.</p>}

      {proposals.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Đề nghị đang chờ chữ ký</h4>
          {proposals.map((proposal) => {
            const expired = proposal.deadline > 0 && proposal.deadline * 1000 < Date.now();
            return (
              <article key={`${proposal.proposalId}:${proposal.memberAddress}`} className="flex flex-col gap-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{nameFor(proposal.memberAddress)} <span className="font-normal text-slate-600 dark:text-slate-300">· {proposal.guardianRole ? "Guardian" : "Beneficiary"}</span></p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Đã ký {proposal.approvalsCount}/{proposal.requiredApprovals} Guardian · hạn {proposal.deadline ? new Date(proposal.deadline * 1000).toLocaleString("vi-VN") : "—"}</p>
                  {proposal.approvedByCaller && <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">Ví hiện tại đã ký</p>}
                </div>
                <button type="button" disabled={!canApprove || proposal.approvedByCaller || expired || transaction.blocked} onClick={() => void approve(proposal)} className="min-h-10 shrink-0 rounded-xl bg-amber-700 dark:bg-amber-600 px-4 text-xs font-bold text-white hover:bg-amber-800 dark:hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer">{expired ? "Đã hết hạn" : proposal.approvedByCaller ? "Đã ký" : "Ký duyệt"}</button>
              </article>
            );
          })}
        </div>
      ) : <p className="text-xs text-slate-500 dark:text-slate-400">Chưa có đề nghị thêm thành viên đang chờ.</p>}

      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{notice}</p>}
      {transaction.state === "tracking" && <p role="status" className="break-all text-xs text-amber-800 dark:text-amber-300">Giao dịch đang được theo dõi: {transaction.hash || transaction.message}</p>}
      {transaction.state === "error" && transaction.message && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{transaction.message}</p>}
      {loading && <p role="status" className="text-xs text-slate-500 dark:text-slate-400">Đang tải thành viên và đề nghị…</p>}

      <MemberManagementModal isOpen={memberModalOpen} onClose={refreshAfterMemberModal} />
    </section>
  );
}
