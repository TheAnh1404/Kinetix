"use client";

import React, { useState, useEffect } from "react";
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

import { ElderlyDashboard } from "@/components/views/ElderlyDashboard";
import { KidsDashboard } from "@/components/views/KidsDashboard";
import { RoscaTimeline } from "@/components/views/RoscaTimeline";
import { FriendsGoalView } from "@/components/views/FriendsGoalView";
import { CommunityTreasuryView } from "@/components/views/CommunityTreasuryView";

import { DepositVaultModal } from "@/components/vaults/DepositVaultModal";
import { InterVaultTransferModal } from "@/components/vaults/InterVaultTransferModal";
import { MemberManagementModal } from "@/components/dashboard/MemberManagementModal";
import { CreateChoreModal } from "@/components/dashboard/CreateChoreModal";
import { CoreDeploymentConsole } from "@/components/dashboard/CoreDeploymentConsole";
import { DEPLOYMENT } from "@/contracts/config";

import { CheckCircle2, AlertCircle, X } from "lucide-react";

export const ModernAdminDashboard: React.FC = () => {
  const {
    workspaces,
    switchWorkspace,
    currentWorkspace,
    dynamicVaults,
    withdrawalRequests,
    approveWithdrawal,
    verifyAndRewardChore,
    fastWithdrawFromVault,
  } = useFamily();
  const { isOwner } = useWorkspaceAccess();
  const vaultCreation = useVaultCreation();
  const { language } = useLanguage();

  // Góc nhìn chuyên biệt khi ở nhóm FAMILY: Bố Mẹ (Admin), Ông Bà (WCAG AAA), Con Nhỏ (Heo đất)
  const [familySubView, setFamilySubView] = useState<"ADMIN" | "ELDERLY" | "KIDS">("ADMIN");

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

  // Tìm yêu cầu rút viện phí của Cụ Ba đang chờ duyệt
  const pendingElderlyRequest = (withdrawalRequests || []).find(
    (r) =>
      r.status === "PENDING" &&
      (r.amount >= 150 ||
        r.reason?.toLowerCase().includes("viện phí") ||
        r.reason?.toLowerCase().includes("tim mạch") ||
        r.requesterName?.includes("Cụ Ba")),
  );

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
            ? "Chữ ký xác nhận thành công! Lệnh rút viện phí của Cụ Ba đã được phê duyệt on-chain."
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
            ? `Đã duyệt hoàn thành việc nhà! Phần thưởng +${rewardAmount} USDC đã được mở khóa.`
            : `Chore verified! +${rewardAmount} USDC released to savings.`,
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
      const limit = vault.fastWithdrawLimit || 50;
      const ok = await fastWithdrawFromVault(vault.onchainVaultId, limit);
      if (ok) {
        showToast(
          "success",
          language === "vi"
            ? `Rút nhanh ${limit} USDC từ đệm L1 thành công (0đ phí gas)!`
            : `Fast withdrew ${limit} USDC from L1 buffer!`,
        );
      }
    } catch (e: any) {
      showToast("error", e?.message || "Giao dịch rút nhanh không thành công.");
    }
  };

  const wsType = currentWorkspace?.type || "FAMILY";

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] text-slate-900 pb-16 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* THANH ĐIỀU HƯỚNG GÓC NHÌN NGỮ CẢNH (ANTI-AI SLOP) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Nếu là nhóm FAMILY: Thanh chuyển 3 góc nhìn Bố Mẹ | Ông Bà | Con */}
          {wsType === "FAMILY" ? (
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
              <span className="text-xs font-bold text-slate-400 font-mono uppercase px-2 hidden sm:inline">
                Góc Nhìn:
              </span>
              <button
                type="button"
                onClick={() => setFamilySubView("ADMIN")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  familySubView === "ADMIN"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>👨‍💼</span>
                <span>Bố Mẹ (Quản Trị Bàn Lệnh)</span>
              </button>

              <button
                type="button"
                onClick={() => setFamilySubView("ELDERLY")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  familySubView === "ELDERLY"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>👴</span>
                <span>Ông Bà (Chữ To WCAG AAA)</span>
              </button>

              <button
                type="button"
                onClick={() => setFamilySubView("KIDS")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  familySubView === "KIDS"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>👧</span>
                <span>Con Nhỏ (Heo Đất & Việc Nhà)</span>
              </button>
            </div>
          ) : (
            /* Với các nhóm khác: Huy hiệu quy tắc tài chính rõ ràng */
            <div className="flex items-center gap-2">
              <span className="text-xl">
                {wsType === "SIBLINGS" ? "🤝" : wsType === "FRIENDS" ? "🎒" : "🏛️"}
              </span>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  {currentWorkspace?.name}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {wsType === "SIBLINGS"
                    ? "Quy tắc ROSCA: Góp vốn xoay vòng • 100% C-Chain 8% APY"
                    : wsType === "FRIENDS"
                      ? "Quy tắc SHARED_GOAL: Mục tiêu chung 10/90 • VietQR ăn uống"
                      : "Quy tắc COMMUNITY: Ban Chủ Nhiệm Đa Ký 2/3 • Bounty 0đ Gas"}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono font-semibold px-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span>Family L1: 0đ Gas</span>
            <span className="text-slate-300">•</span>
            <span className="text-[#E84142]">Fuji APY: 8%</span>
          </div>
        </div>

        {/* NẾU Ở GÓC NHÌN ÔNG BÀ: HIỂN THỊ ELDERLY DASHBOARD WCAG AAA */}
        {wsType === "FAMILY" && familySubView === "ELDERLY" ? (
          <ElderlyDashboard onSwitchToAdmin={() => setFamilySubView("ADMIN")} />
        ) : wsType === "FAMILY" && familySubView === "KIDS" ? (
          /* NẾU Ở GÓC NHÌN CON NHỎ: HIỂN THỊ KIDS DASHBOARD */
          <KidsDashboard onSwitchToAdmin={() => setFamilySubView("ADMIN")} />
        ) : (
          /* BỐ CỤC CHÍNH ĐA CỘT (LAPTOP EXECUTIVE 12 CỘT / MOBILE 1 CỘT STACK) */
          <div className="space-y-6">
            {isOwner && !DEPLOYMENT.enabled && (
              <details
                id="deployment"
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <summary className="min-h-12 cursor-pointer py-3 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600">
                  Triển khai T1 trên Fuji bằng Core Wallet
                </summary>
                <CoreDeploymentConsole />
              </details>
            )}

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

            {/* HÀNG ĐẦU (12 CỘT): THANH TỔNG QUAN TÀI SẢN & THAO TÁC NHANH */}
            <FamilyHeaderBar
              onOpenDeposit={() => {
                const first = dynamicVaults[0] || null;
                setDepositModalVault(first);
              }}
              onOpenCreateVault={() => vaultCreation?.open()}
              onOpenAddMember={() => setIsMemberModalOpen(true)}
            />

            <DualChainLiquidityBar
              onRebalanceClick={() => {
                const first = dynamicVaults[0] || null;
                setTransferModalVault(first);
              }}
            />

            {/* BỐ CỤC 12 CỘT: CỘT TRÁI (7 CỘT) + CỘT PHẢI (5 CỘT) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* CỘT TRÁI (7 CỘT): CẢNH BÁO MULTISIG + LƯỚI HŨ TIỀN + ACTION CENTER */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* THẺ CẢNH BÁO CAM NỔI BẬT: BẢO VỆ ÔNG BÀ (NẾU Ở GIA ĐÌNH VÀ CÓ YÊU CẦU CỤ BA) */}
                {wsType === "FAMILY" && pendingElderlyRequest && (
                  <div className="p-5 rounded-2xl bg-amber-50/90 border-2 border-amber-300 shadow-sm animate-in fade-in duration-150">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <span className="text-3xl mt-0.5">⚠️</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-md">
                              Chốt Chặn Bảo Vệ An Toàn
                            </span>
                            <span className="text-[11px] text-amber-700 font-bold font-mono">
                              Đa Chữ Ký 2/3
                            </span>
                          </div>
                          <h4 className="text-sm sm:text-base font-bold text-amber-950 mt-1">
                            CẢNH BÁO BẢO VỆ ÔNG BÀ: Cụ Ba yêu cầu rút 1,000 USDC - Viện phí đột xuất
                          </h4>
                          <p className="text-xs text-amber-800 mt-1">
                            Lệnh rút lớn vượt quá hạn mức rút nhanh (50 USDC). Cần tối thiểu 2 chữ ký người bảo vệ.
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs font-mono">
                            <span className="text-amber-900 font-bold">
                              Tiến độ chữ ký: 1/2
                            </span>
                            <div className="w-24 h-2 bg-amber-200 rounded-full overflow-hidden">
                              <div className="w-1/2 h-full bg-emerald-600 rounded-full" />
                            </div>
                            <span className="text-emerald-700 font-semibold">
                              Bố Ba đã ký duyệt
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isSigning}
                        onClick={() => handleApproveWithdrawal(pendingElderlyRequest.id)}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isSigning ? "Đang ký on-chain..." : "Ký Phê Duyệt Ngay"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* LƯỚI CÁC HŨ TIỀN ĐỘNG (DYNAMIC VAULTS GRID) */}
                <VaultDeckGrid
                  onSelectVault={(vault) => setDepositModalVault(vault)}
                  onDepositVault={(vault) => setDepositModalVault(vault)}
                  onFastWithdrawVault={handleFastWithdraw}
                  onCreateNewVault={() => vaultCreation?.open()}
                />

                {/* HỘP THƯ DUYỆT ĐA KÝ / ACTION CENTER */}
                <ActionCenterInbox
                  onApproveWithdrawal={handleApproveWithdrawal}
                  onVerifyChore={handleVerifyChore}
                  isSigning={isSigning}
                />
              </div>

              {/* CỘT PHẢI (5 CỘT): MODULE NGỮ CẢNH ĐẶC THÙ CỦA TỪNG NHÓM */}
              <div className="lg:col-span-5 space-y-6">
                {wsType === "FAMILY" ? (
                  <>
                    {/* VÒNG TRÒN GIA ĐÌNH & QUẢN LÝ THÀNH VIÊN */}
                    <FamilyRosterCard
                      onAddMemberClick={() => setIsMemberModalOpen(true)}
                      onAssignChoreClick={(childId) => {
                        setSelectedChildForChore(childId);
                        setIsChoreModalOpen(true);
                      }}
                    />

                    {/* Thẻ Tóm Tắt An Sinh Ông Bà & Heo Đất Con Nhỏ */}
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🛡️</span>
                          <h4 className="text-sm font-bold text-slate-900">
                            Chế Độ An Sinh Đa Thế Hệ
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Tự Động 100%
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs text-slate-600">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-900 block">
                              Hũ Báo Hiếu Ông Bà (SHIELD)
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Đệm L1: 85.00 USDC • C-Chain: 765.00 USDC
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFamilySubView("ELDERLY")}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition"
                          >
                            Mở Xem
                          </button>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-900 block">
                              Hũ Lì Xì & Heo Đất Bé Na (MILESTONE)
                            </span>
                            <span className="text-[11px] text-slate-500">
                              120.00 USDC sinh lãi 8% • Thưởng việc nhà
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFamilySubView("KIDS")}
                            className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 transition"
                          >
                            Mở Xem
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : wsType === "SIBLINGS" ? (
                  /* MODULE ANH CHỊ EM: VÒNG QUAY QUỸ TƯƠNG TRỢ ROSCA */
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-2 shadow-xs">
                    <RoscaTimeline />
                  </div>
                ) : wsType === "FRIENDS" ? (
                  /* MODULE HỘI BẠN THÂN: TIẾN ĐỘ QUỸ PHƯỢT ĐÀ LẠT & HŨ ĂN UỐNG */
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-2 shadow-xs">
                    <FriendsGoalView />
                  </div>
                ) : (
                  /* MODULE CLB / HỘI NHÓM: BẢNG BOUNTY & SỔ CÁI MINH BẠCH */
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-2 shadow-xs">
                    <CommunityTreasuryView />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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
