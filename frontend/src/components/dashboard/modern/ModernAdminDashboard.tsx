"use client";

import React, { useState } from "react";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceAccess } from "@/hooks/useWorkspaceAccess";
import { useVaultCreation } from "@/context/VaultCreationContext";
import { useLanguage } from "@/context/LanguageContext";
import { DynamicVaultItem } from "@/types";

import { FamilyHeaderBar } from "./FamilyHeaderBar";
import { DualChainLiquidityBar } from "./DualChainLiquidityBar";
import { FamilyRosterCard } from "./FamilyRosterCard";
import { VaultDeckGrid } from "./VaultDeckGrid";
import { ActionCenterInbox } from "./ActionCenterInbox";

import { DepositVaultModal } from "@/components/vaults/DepositVaultModal";
import { InterVaultTransferModal } from "@/components/vaults/InterVaultTransferModal";
import { MemberManagementModal } from "@/components/dashboard/MemberManagementModal";
import { CreateChoreModal } from "@/components/dashboard/CreateChoreModal";

import { CheckCircle2, AlertCircle, X } from "lucide-react";

export const ModernAdminDashboard: React.FC = () => {
  const {
    currentWorkspace,
    dynamicVaults,
    approveWithdrawal,
    verifyAndRewardChore,
    fastWithdrawFromVault,
  } = useFamily();
  const { isOwner } = useWorkspaceAccess();
  const vaultCreation = useVaultCreation();
  const { language } = useLanguage();

  // State Modals
  const [depositModalVault, setDepositModalVault] =
    useState<DynamicVaultItem | null>(null);
  const [transferModalVault, setTransferModalVault] =
    useState<DynamicVaultItem | null>(null);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isChoreModalOpen, setIsChoreModalOpen] = useState(false);
  const [selectedChildForChore, setSelectedChildForChore] = useState<
    string | undefined
  >();

  // Feedback toast state
  const [feedback, setFeedback] = useState<{
    type: "success" | "info" | "error";
    message: string;
  } | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  const showToast = (type: "success" | "info" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  // Hành vi Phê duyệt Multisig on-chain thực tế
  const handleApproveWithdrawal = async (requestId: string | number) => {
    setIsSigning(true);
    try {
      const ok = await approveWithdrawal(requestId);
      if (ok) {
        showToast(
          "success",
          language === "vi"
            ? "Chữ ký xác nhận thành công! Lệnh rút tiền đã được cập nhật từ hợp đồng."
            : "Signature approved successfully on-chain!",
        );
      }
    } catch (e: any) {
      showToast("error", e?.message || "Không thể thực hiện ký duyệt.");
    } finally {
      setIsSigning(false);
    }
  };

  // Hành vi Duyệt việc nhà & trả thưởng thực tế
  const handleVerifyChore = async (
    choreId: string | number,
    rewardAmount: number,
  ) => {
    try {
      const ok = await verifyAndRewardChore(choreId);
      if (ok) {
        showToast(
          "success",
          language === "vi"
            ? `Đã duyệt hoàn thành việc nhà! Phần thưởng +${rewardAmount} AVAX đã được mở khóa.`
            : `Chore verified! +${rewardAmount} AVAX released to savings.`,
        );
        return true;
      }
      return false;
    } catch (e: any) {
      showToast("error", e?.message || "Không thể duyệt thưởng.");
      return false;
    }
  };

  // Rút nhanh từ đệm L1 on-chain thực tế
  const handleFastWithdraw = async (vault: DynamicVaultItem) => {
    try {
      const limit = vault.fastWithdrawLimit || 0.1;
      const ok = await fastWithdrawFromVault(vault.onchainVaultId, limit);
      if (ok) {
        showToast(
          "success",
          language === "vi"
            ? `Rút nhanh ${limit} AVAX từ đệm L1 thành công!`
            : `Fast withdrew ${limit} AVAX from L1 buffer!`,
        );
      }
    } catch (e: any) {
      showToast("error", e?.message || "Giao dịch rút nhanh không thành công.");
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] text-slate-900 pb-16 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Toast Thông Báo Phản Hồi */}
        {feedback && (
          <div
            className={`flex items-center justify-between p-4 rounded-xl shadow-md border animate-in fade-in slide-in-from-top-2 duration-200 ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : feedback.type === "error"
                  ? "bg-red-50 border-red-300 text-red-900"
                  : "bg-blue-50 border-blue-300 text-blue-900"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <span className="text-sm font-bold">{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="p-1 rounded-lg hover:bg-black/5 text-slate-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1. HEADER KHÔNG GIAN GIA ĐÌNH & THAO TÁC NHANH */}
        <FamilyHeaderBar
          onOpenDeposit={() => {
            const first = dynamicVaults[0] || null;
            setDepositModalVault(first);
          }}
          onOpenCreateVault={() => vaultCreation?.open()}
          onOpenAddMember={() => setIsMemberModalOpen(true)}
        />

        {/* 2. TỔNG TÀI SẢN & ĐỆM THANH KHOẢN 2 CHUỖI (DUAL-CHAIN HEALTH) */}
        <DualChainLiquidityBar
          onRebalanceClick={() => {
            const first = dynamicVaults[0] || null;
            setTransferModalVault(first);
          }}
        />

        {/* 3. VÒNG TRÒN GIA ĐÌNH (FAMILY CIRCLE ROSTER THỰC TẾ) */}
        <FamilyRosterCard
          onAddMemberClick={() => setIsMemberModalOpen(true)}
          onAssignChoreClick={(childId) => {
            setSelectedChildForChore(childId);
            setIsChoreModalOpen(true);
          }}
        />

        {/* 4. CÁC HŨ TIỀN HOẠT ĐỘNG THỰC TẾ (DYNAMIC VAULTS DECK) */}
        <VaultDeckGrid
          onSelectVault={(vault) => setDepositModalVault(vault)}
          onDepositVault={(vault) => setDepositModalVault(vault)}
          onFastWithdrawVault={handleFastWithdraw}
          onCreateNewVault={() => vaultCreation?.open()}
        />

        {/* 5. TRUNG TÂM PHÊ DUYỆT CỦA CHỦ HỘ (MULTISIG & CHORES INBOX) */}
        <ActionCenterInbox
          onApproveWithdrawal={handleApproveWithdrawal}
          onVerifyChore={handleVerifyChore}
          isSigning={isSigning}
        />
      </div>

      {/* --- CÁC DIALOG QUẢN TRỊ TRUNG TÂM --- */}
      {/* Nạp Quỹ Vào Hũ */}
      <DepositVaultModal
        isOpen={Boolean(depositModalVault)}
        defaultVaultId={depositModalVault?.onchainVaultId}
        onClose={() => setDepositModalVault(null)}
      />

      {/* Điều Chuyển Đệm / Giữa Các Hũ */}
      <InterVaultTransferModal
        isOpen={Boolean(transferModalVault)}
        sourceVault={transferModalVault}
        allVaults={dynamicVaults}
        onClose={() => setTransferModalVault(null)}
      />

      {/* Quản Lý Thành Viên Gia Đình */}
      <MemberManagementModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
      />

      {/* Giao Việc Nhà Cho Con */}
      <CreateChoreModal
        isOpen={isChoreModalOpen}
        onClose={() => setIsChoreModalOpen(false)}
      />
    </div>
  );
};
