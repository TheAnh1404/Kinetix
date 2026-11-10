"use client";

import React, { useState } from "react";
import { useFamily } from "@/context/FamilyContext";
import { useLanguage } from "@/context/LanguageContext";
import { FamilyStatsCards } from "@/components/dashboard/FamilyStatsCards";
import { MemberManagementModal } from "@/components/dashboard/MemberManagementModal";
import { CreateChoreModal } from "@/components/dashboard/CreateChoreModal";
import { useVaultCreation } from "@/context/VaultCreationContext";
import { DepositVaultModal } from "@/components/vaults/DepositVaultModal";
import { InterVaultTransferModal } from "@/components/vaults/InterVaultTransferModal";
import { ChoreProofModal } from "@/components/dashboard/ChoreProofModal";
import { DynamicVaultItem } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { hubChain, SNOWTRACE_TESTNET_URL } from "@/contracts/config";
import { vaultMappingIssue } from "../../../../shared/vaultMapping";
import { VaultWorkflowPanel } from "@/components/vaults/VaultWorkflowPanel";
import { useVaultStates } from "@/hooks/useVaultStates";
import { CoreDeploymentConsole } from "@/components/dashboard/CoreDeploymentConsole";
import { ProvisioningPanel } from "@/components/dashboard/ProvisioningPanel";
import { requestStatus } from "@/lib/member";
import { DEPLOYMENT } from "@/contracts/config";
import { TreasuryPanel } from "@/components/vaults/TreasuryPanel";

export const GuardianView: React.FC = () => {
  const {
    withdrawalRequests,
    approveWithdrawal,
    dynamicVaults,
    currentMember,
    members,
    chores,
    verifyAndRewardChore,
    currentWorkspace,
  } = useFamily();
  const auth = useAuth();
  const { states: liveStates } = useVaultStates();
  const canManageMembers = auth.workspaces.some(
    (workspace) =>
      workspace.id === currentWorkspace?.id &&
      (workspace.role === "ADMIN" || workspace.canManageMembers),
  );

  const { language } = useLanguage();

  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isChoreModalOpen, setIsChoreModalOpen] = useState(false);
  const vaultCreation = useVaultCreation();
  const [depositModalVault, setDepositModalVault] =
    useState<DynamicVaultItem | null>(null);
  const [transferModalVault, setTransferModalVault] =
    useState<DynamicVaultItem | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [inspectingChore, setInspectingChore] = useState<any | null>(null);
  const [showOperator, setShowOperator] = useState(false);

  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddress(addr);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // Yêu cầu rút tiền đang chờ duyệt (Pending Multisig Request)
  const pendingRequests = withdrawalRequests.filter(
    (r) => r.status === "PENDING",
  );
  const activeRequest = pendingRequests[0] || withdrawalRequests[0];

  const handleApprove = async (requestId: string | number) => {
    setIsSigning(true);
    try {
      const success = await approveWithdrawal(requestId);
      if (success) {
        setFeedback(
          language === "vi"
            ? "Chữ ký đã được xác nhận. Trạng thái và số chữ ký được cập nhật từ hợp đồng."
            : "Signature confirmed. Request status and approval count are updated from the contract.",
        );
      }
    } finally {
      setIsSigning(false);
    }
  };

  const handleVerifyChore = async (
    taskId: string | number,
    rewardAmount: number,
  ) => {
    const success = await verifyAndRewardChore(taskId);
    if (success) {
      setFeedback(
        "Chữ ký duyệt đã xác nhận. Phần thưởng chỉ được chi khi đủ quorum; trạng thái được đọc từ contract.",
      );
    }
    return success;
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      <TreasuryPanel />
      {/* 1. THÔNG BÁO FEEDBACK NỔI BẬT */}
      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-start justify-between gap-3 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[26px] text-emerald-600">
              verified
            </span>
            <span className="text-xs sm:text-sm font-bold leading-relaxed">
              {feedback}
            </span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer font-bold text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. KHỐI TỔNG QUAN TÀI SẢN (3 CHỈ SỐ LỚN CHO LAPTOP) */}
      <FamilyStatsCards />
      {!DEPLOYMENT.enabled && currentWorkspace?.role === "ADMIN" && (
        <div className="text-sm text-slate-600">
          <button
            type="button"
            className="underline min-h-12"
            onClick={() => setShowOperator((value) => !value)}
          >
            {showOperator ? "Ẩn" : "Mở"} công cụ triển khai dành cho người vận
            hành
          </button>
          {showOperator && (
            <>
              <p>
                Đây là thao tác thiết lập hạ tầng, không phải bước bắt buộc cho
                mọi gia đình. Cần ví và ngân sách testnet của người vận hành.
              </p>
              <CoreDeploymentConsole />
            </>
          )}
        </div>
      )}
      {canManageMembers && (
        <ProvisioningPanel />
      )}
      <VaultWorkflowPanel />

      {/* 3. BỐ CỤC 2 CỘT CHÍNH CHO CHỦ GIA ĐÌNH TRÊN LAPTOP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI (7 CỘT): DANH MỤC HŨ ĐỘNG (DYNAMIC VAULTS PORTFOLIO) */}
        <div id="family-vaults" className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm">
                🏦
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Danh Mục Hũ Tiền Động
                </h2>
                <p className="text-xs text-slate-500">
                  AVAX được giữ trên Fuji và giải ngân theo quy tắc của hũ
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMemberModalOpen(true)}
                hidden={!canManageMembers}
                type="button"
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 border border-slate-200"
              >
                <span className="material-symbols-outlined text-[16px]">
                  supervisor_account
                </span>
                <span>Thành Viên Quản Lý</span>
              </button>

              <button
                onClick={() => vaultCreation.open()}
                title="Chuẩn bị và lưu bản nháp; quyền ký được kiểm tra trước giao dịch"
                type="button"
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs"
              >
                <span className="material-symbols-outlined text-[15px]">
                  add
                </span>
                <span>Tạo Hũ Mới</span>
              </button>
            </div>
          </div>

          {/* Lưới các Hũ tiền */}
          <div className="space-y-3">
            {dynamicVaults.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-700">
                <h3 className="font-bold text-slate-950">
                  Gia đình chưa có hũ tiền
                </h3>
                <p className="mt-2">
                  Bắt đầu bằng việc thêm người thân, để mỗi người kích hoạt tài
                  khoản và liên kết Core. Có thể chọn Tạo Hũ Mới để chuẩn bị bản
                  nháp ngay; chỉ ký khi quyền giao dịch sẵn sàng. Số dư ban đầu là 0 AVAX.
                </p>
              </div>
            )}
            {dynamicVaults.map((vault) => {
              const issue = vaultMappingIssue(
                vault,
                hubChain.id,
                currentWorkspace?.l1HubAddress,
              );
              if (issue)
                return (
                  <article
                    key={vault.id}
                    className="p-5 rounded-2xl border border-amber-200 bg-amber-50"
                  >
                    <h3 className="font-bold">{vault.name}</h3>
                    <p className="text-sm mt-2">{issue.message}</p>
                    <p className="text-xs mt-2">
                      Chưa có số dư on-chain đã xác minh để hiển thị.
                    </p>
                  </article>
                );
              const total = vault.cachedTotalBalance ?? vault.totalBalance ?? 0;
              const liveState = liveStates[vault.id];
              const reserved = liveState?.balance?.reservedWei
                ? Number(liveState.balance.reservedWei) / 1e18
                : (vault.reservedBalance ?? 0);
              const available = liveState?.balance?.availableWei
                ? Number(liveState.balance.availableWei) / 1e18
                : (vault.availableBalance ?? Math.max(0, total - reserved));

              const availPercent = total > 0 ? Math.min(100, Math.max(0, (available / total) * 100)) : 100;
              const reservedPercent = 100 - availPercent;

              return (
                <div
                  key={vault.id}
                  className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all flex flex-col gap-4"
                >
                  {/* Top Bar: Icon, Name, On-chain Badge, Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl p-2 rounded-2xl bg-slate-50 border border-slate-100">{vault.icon || "🏦"}</span>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900">
                            {vault.name}
                          </h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                            #{vault.onchainVaultId}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold font-mono">
                            {vault.ruleTemplate}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 mt-0.5">
                          {vault.description || "Hũ tiền quản trị đa chữ ký bảo vệ gia đình"}
                        </span>

                        {/* On-Chain Contract Address Badge */}
                        {vault.onchainVaultAddress ? (
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-700 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-slate-400 font-sans font-bold text-[10px]">Contract:</span>
                            <span className="font-bold">{vault.onchainVaultAddress.slice(0, 6)}...{vault.onchainVaultAddress.slice(-4)}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyAddress(vault.onchainVaultAddress!)}
                              className="hover:text-slate-900 transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
                              title="Sao chép địa chỉ Smart Contract của Hũ"
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                {copiedAddress === vault.onchainVaultAddress ? "check" : "content_copy"}
                              </span>
                            </button>
                            <a
                              href={`${SNOWTRACE_TESTNET_URL}/address/${vault.onchainVaultAddress}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-slate-600 transition-colors"
                              title="Tra cứu Smart Contract trên Avalanche Explorer"
                            >
                              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                            </a>
                          </div>
                        ) : (
                          <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-slate-400">
                            <span className="material-symbols-outlined text-[13px]">shield</span>
                            <span>Bảo vệ qua FamilyHub On-Chain</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons: Nạp Quỹ & Chuyển Hũ */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setTransferModalVault(vault)}
                        type="button"
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95 border border-slate-200"
                        title="Chuyển AVAX sang một Hũ khác trong gia đình"
                      >
                        <span className="material-symbols-outlined text-[15px]">swap_horiz</span>
                        <span>Chuyển Hũ</span>
                      </button>

                      <button
                        onClick={() => setDepositModalVault(vault)}
                        type="button"
                        className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">add</span>
                        <span>Nạp Quỹ</span>
                      </button>
                    </div>
                  </div>

                  {/* 3 TẦNG SỐ DƯ MINH BẠCH (TIERED BALANCES) */}
                  <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        1. Tổng Tài Sản
                      </span>
                      <span className="text-sm font-mono font-bold text-slate-900 mt-0.5">
                        {total.toFixed(2)} <span className="text-[10px] font-normal text-slate-500">AVAX</span>
                      </span>
                    </div>

                    <div className="flex flex-col items-center border-x border-slate-200/80 px-2">
                      <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[12px]">lock</span>
                        <span>2. Giữ Chỗ M/N</span>
                      </span>
                      <span className="text-sm font-mono font-bold text-amber-700 mt-0.5">
                        {reserved.toFixed(2)} <span className="text-[10px] font-normal text-amber-600">AVAX</span>
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[12px]">bolt</span>
                        <span>3. Khả Dụng</span>
                      </span>
                      <span className="text-sm font-mono font-black text-emerald-700 mt-0.5">
                        {available.toFixed(2)} <span className="text-[10px] font-normal text-emerald-600">AVAX</span>
                      </span>
                    </div>
                  </div>

                  {/* Thanh Progress Bar Khả Dụng vs Giữ Chỗ */}
                  <div className="flex flex-col gap-1.5">
                    <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden flex shadow-inner">
                      <div
                        style={{ width: `${availPercent}%` }}
                        className="bg-emerald-500 h-full transition-all duration-500"
                        title={`Khả dụng: ${availPercent.toFixed(0)}%`}
                      />
                      <div
                        style={{ width: `${reservedPercent}%` }}
                        className="bg-amber-400 h-full transition-all duration-500"
                        title={`Khóa giữ chỗ: ${reservedPercent.toFixed(0)}%`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Rút nhanh &le; {vault.fastWithdrawLimit} AVAX/lần</span>
                      <span>Multisig: {vault.requiredApprovals}/{vault.guardianCount ?? "—"} Guardians</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CỘT PHẢI (5 CỘT): MULTISIG PENDING APPROVALS & CHORE-TO-EARN */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* MULTISIG COMMAND PANEL */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                ✍️
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Bàn Ký Duyệt Đa Chữ Ký (M/N)
                </h2>
                <p className="text-xs text-slate-500">
                  Giải ngân các khoản rút lớn an toàn
                </p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {pendingRequests.length} lệnh chờ
            </span>
          </div>

          {activeRequest ? (
            <div className="bg-white p-5 rounded-2xl border-2 border-blue-200 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold font-mono uppercase">
                  {requestStatus(activeRequest)}
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">
                  Phiếu #{activeRequest.id}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-xs text-slate-500">
                  Số tiền yêu cầu giải ngân:
                </span>
                <div className="text-2xl font-black font-mono text-slate-900 my-0.5">
                  {activeRequest.amount}{" "}
                  <span className="text-sm font-sans font-bold text-slate-500">
                    AVAX
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-700">Mục đích:</span>{" "}
                  {activeRequest.reason}
                </p>
              </div>

              {/* Tiến độ chữ ký Guardians M/N */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600">Tiến độ chữ ký:</span>
                  <span className="font-mono text-blue-600">
                    {activeRequest.approvalsCount ?? 0}/
                    {activeRequest.requiredApprovals ?? 2} chữ ký
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        ((activeRequest.approvalsCount ?? 0) /
                          (activeRequest.requiredApprovals ?? 2)) *
                          100,
                      )}%`,
                    }}
                    className="bg-blue-600 h-full rounded-full transition-all"
                  />
                </div>
              </div>

              {activeRequest.status === "PENDING" &&
              liveStates[activeRequest.vaultId || ""]?.requests.some(
                (item: any) => item.id === activeRequest.id && item.canApprove,
              ) ? (
                <button
                  onClick={() => handleApprove(activeRequest.id)}
                  disabled={isSigning}
                  type="button"
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    draw
                  </span>
                  <span>
                    {isSigning
                      ? "Đang xác nhận on-chain..."
                      : "Ký duyệt lệnh rút"}
                  </span>
                </button>
              ) : (
                <div className="w-full py-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-center font-bold text-xs">
                  {activeRequest.status === "EXECUTED"
                    ? "Đã giải ngân về ví người thụ hưởng"
                    : "Xem trạng thái và quyền ký trong chi tiết hũ"}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
              Không có yêu cầu rút tiền lớn nào đang chờ duyệt.
            </div>
          )}

          {/* DUYỆT THƯỞNG VIỆC NHÀ (CHORE-TO-EARN) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                Việc Nhà Của Con Cần Duyệt
              </span>
              <button
                onClick={() => setIsChoreModalOpen(true)}
                type="button"
                className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
              >
                + Giao Việc Mới
              </button>
            </div>

            <div className="space-y-2">
              {chores.filter((c: any) => c.status === "SUBMITTED").length ===
              0 ? (
                <p className="text-[11px] text-slate-400 text-center py-2">
                  Chưa có bài tập nào con vừa nộp chờ duyệt.
                </p>
              ) : (
                chores
                  .filter((c: any) => c.status === "SUBMITTED")
                  .map((chore: any) => (
                    <div
                      key={chore.id}
                      className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 flex items-center justify-between gap-2"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {chore.title}
                        </span>
                        <span className="text-[11px] text-emerald-700 font-mono font-bold">
                          Thưởng: {chore.rewardAmount} AVAX
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setInspectingChore(chore)}
                          type="button"
                          className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-bold cursor-pointer flex items-center gap-1 transition-all"
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            visibility
                          </span>
                          <span>Xem Ảnh</span>
                        </button>
                        <button
                          disabled={
                            !liveStates[chore.vaultId]?.tasks.some(
                              (task: any) =>
                                task.id === chore.id && task.canApprove,
                            )
                          }
                          onClick={() =>
                            handleVerifyChore(chore.id, chore.rewardAmount)
                          }
                          type="button"
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer transition-all active:scale-95"
                        >
                          Duyệt Thưởng
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. MODALS QUẢN TRỊ TRUNG TÂM */}

      <DepositVaultModal
        isOpen={Boolean(depositModalVault)}
        onClose={() => setDepositModalVault(null)}
      />

      <InterVaultTransferModal
        isOpen={Boolean(transferModalVault)}
        onClose={() => setTransferModalVault(null)}
        sourceVault={transferModalVault}
        allVaults={dynamicVaults}
      />

      <CreateChoreModal
        isOpen={isChoreModalOpen}
        onClose={() => setIsChoreModalOpen(false)}
      />

      <MemberManagementModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
      />

      {/* Modal Xem Minh Chứng Báo Cáo Việc Nhà */}
      <ChoreProofModal
        isOpen={Boolean(inspectingChore)}
        chore={inspectingChore}
        onClose={() => setInspectingChore(null)}
        onApprove={handleVerifyChore}
      />
    </div>
  );
};
