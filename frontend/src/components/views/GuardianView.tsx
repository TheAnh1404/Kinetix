"use client";

import React, { useState } from "react";
import { useFamily } from "@/context/FamilyContext";
import { useLanguage } from "@/context/LanguageContext";
import { FamilyStatsCards } from "@/components/dashboard/FamilyStatsCards";
import { MemberManagementModal } from "@/components/dashboard/MemberManagementModal";
import { CreateChoreModal } from "@/components/dashboard/CreateChoreModal";
import { CreateVaultModal } from "@/components/vaults/CreateVaultModal";
import { DepositVaultModal } from "@/components/vaults/DepositVaultModal";
import { ChoreProofModal } from "@/components/dashboard/ChoreProofModal";
import { DynamicVaultItem } from "@/types";
import { useAuth } from "@/hooks/useAuth";

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
  const [isCreateVaultOpen, setIsCreateVaultOpen] = useState(false);
  const [depositModalVault, setDepositModalVault] =
    useState<DynamicVaultItem | null>(null);
  const [inspectingChore, setInspectingChore] = useState<any | null>(null);

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
        `Đã xác nhận duyệt và chi trả ${rewardAmount} AVAX về ví người được giao việc.`,
      );
    }
    return success;
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
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

      {/* 3. BỐ CỤC 2 CỘT CHÍNH CHO CHỦ GIA ĐÌNH TRÊN LAPTOP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI (7 CỘT): DANH MỤC HŨ ĐỘNG (DYNAMIC VAULTS PORTFOLIO) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
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
                  Tự động phân bổ đệm L1 (0 gas) và vốn C-Chain (8% APY)
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
                onClick={() => setIsCreateVaultOpen(true)}
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
            {dynamicVaults.map((vault) => {
              const bufferRatio = vault.bufferRatioBps / 100;
              const yieldRatio = 100 - bufferRatio;
              const total = vault.cachedTotalBalance ?? vault.totalBalance ?? 0;
              const l1Buffer =
                vault.cachedL1Buffer ??
                vault.l1BufferBalance ??
                (total * bufferRatio) / 100;
              const cChainYield = total - l1Buffer;

              return (
                <div
                  key={vault.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col gap-3.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{vault.icon || "🏦"}</span>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            {vault.name}
                          </h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                            #{vault.onchainVaultId}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {vault.description}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold font-mono">
                        {vault.ruleTemplate}
                      </span>
                      <button
                        onClick={() => setDepositModalVault(vault)}
                        type="button"
                        className="px-3 py-1 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        + Nạp Quỹ
                      </button>
                    </div>
                  </div>

                  {/* Thanh trượt tỷ lệ đệm thanh khoản L1 / C-Chain */}
                  <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-emerald-700 flex items-center gap-1">
                        <span>⚡ Đệm Family L1: {bufferRatio}%</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({l1Buffer.toFixed(2)} AVAX)
                        </span>
                      </span>
                      <span className="text-blue-700 flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({cChainYield.toFixed(2)} AVAX)
                        </span>
                        <span>🌊 C-Chain 8% APY: {yieldRatio}%</span>
                      </span>
                    </div>

                    <div className="w-full h-2.5 bg-blue-500 rounded-full overflow-hidden flex shadow-inner">
                      <div
                        style={{ width: `${bufferRatio}%` }}
                        className="bg-emerald-500 h-full transition-all duration-500"
                        title={`Đệm Family L1 (${bufferRatio}%)`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                      <span>
                        Rút nhanh &le; {vault.fastWithdrawLimit} AVAX (0 gas)
                      </span>
                      <span>
                        Multisig: {vault.requiredApprovals}/
                        {vault.guardianCount ?? "—"} Guardians
                      </span>
                    </div>
                  </div>

                  {/* Chi tiết người thụ hưởng & tổng số dư */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">
                      Người thụ hưởng:{" "}
                      <strong className="text-slate-800">
                        {vault.beneficiaryName}
                      </strong>
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      Tổng:{" "}
                      <span className="text-base text-red-600 font-black">
                        {total.toFixed(2)}
                      </span>{" "}
                      AVAX
                    </span>
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
                  {activeRequest.status === "PENDING"
                    ? "⏳ Chờ Duyệt On-Chain"
                    : "✓ Đã Giải Ngân"}
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

              {activeRequest.status === "PENDING" ? (
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
                      : "Ký Duyệt Lệnh Rút (Bố Ba)"}
                  </span>
                </button>
              ) : (
                <div className="w-full py-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-center font-bold text-xs">
                  ✓ Lệnh đã được giải ngân về ví người thụ hưởng
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
              Không có yêu cầu rút tiền lớn nào đang chờ duyệt. Mọi tài sản đang
              an toàn!
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
      <CreateVaultModal
        isOpen={isCreateVaultOpen}
        onClose={() => setIsCreateVaultOpen(false)}
      />

      <DepositVaultModal
        isOpen={Boolean(depositModalVault)}
        onClose={() => setDepositModalVault(null)}
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
