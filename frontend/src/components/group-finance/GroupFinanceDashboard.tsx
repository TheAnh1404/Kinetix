"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  ChevronDown,
  Layers,
  ArrowRightLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useGroupFinance } from "@/hooks/useGroupFinance";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/hooks/useAuth";
import { GroupFinanceDock, GroupFinanceTab } from "./GroupFinanceDock";
import { GroupFinanceOverview } from "./GroupFinanceOverview";
import { GroupFundsList } from "./GroupFundsList";
import { PendingApprovalsInbox } from "./PendingApprovalsInbox";
import { AuditActivityLedger } from "./AuditActivityLedger";
import { CreateFundModal } from "./CreateFundModal";
import { ContributionModal } from "./ContributionModal";
import { ExpenseRequestModal } from "./ExpenseRequestModal";
import { PaymentExecutionModal } from "./PaymentExecutionModal";
import { RefundGoalModal } from "./RefundGoalModal";
import { PolicyGovernanceModal } from "./PolicyGovernanceModal";
import { EmergencyPauseModal } from "./EmergencyPauseModal";
import { TransferRecovery } from "./TransferRecovery";
import { GroupReportExport } from "./GroupReportExport";
import { GroupExpenseRequest } from "@/types/groupFinance";
import { V2_PERMISSIONS } from "@/lib/web3/fundV2Client";
import { groupAmount } from "../../../../shared/groupFinance";

export const GroupFinanceDashboard: React.FC = () => {
  const { user, linkedWallet, workspaces } = useAuth();
  const { currentWorkspace, switchWorkspace } = useFamily();
  const {
    funds,
    expenses,
    obligations,
    auditEvents,
    pendingUserApprovals,
    awaitingPaymentExpenses,
    summary,
    createFund,
    contribute,
    proposeExpense,
    approveExpense,
    rejectExpense,
    cancelExpense,
    executePayment,
    refundFailedGoal,
    proposePolicy,
    executeGovernance,
    proposePause,
    proposeResume,
    approveGovernance,
    fundV2,
    transfers,
    unsupportedFunds,
    resumeTransfer,
    resolveTransfer,
    isLoading,
    isMutating,
    error,
    refresh,
    hasMoreActivity,
    isLoadingMore,
    historyError,
    loadMoreActivity,
  } = useGroupFinance();

  // R12: Deep link query params tab support
  const [activeTab, setActiveTab] = useState<GroupFinanceTab>("overview");
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [errorDismissed, setErrorDismissed] = useState(false);

  // Sync tab with URL query parameter (R12)
  useEffect(() => {
    const handleUrlTab = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as GroupFinanceTab;
      if (tabParam && ["overview", "funds", "inbox", "activity"].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    };
    handleUrlTab();
    window.addEventListener("popstate", handleUrlTab);
    return () => window.removeEventListener("popstate", handleUrlTab);
  }, []);

  const handleTabChange = useCallback((tab: GroupFinanceTab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.pushState(null, "", url.toString());
    }
  }, []);

  // Trạng thái mở Modals
  const [isCreateFundOpen, setIsCreateFundOpen] = useState(false);
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [contributeTargetFundId, setContributeTargetFundId] = useState<string | undefined>(undefined);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [expenseTargetFundId, setExpenseTargetFundId] = useState<string | undefined>(undefined);
  const [paymentModalRequest, setPaymentModalRequest] = useState<GroupExpenseRequest | null>(null);

  // V2 Modals
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [refundTargetFundId, setRefundTargetFundId] = useState<string | undefined>(undefined);
  const [isGovernanceOpen, setIsGovernanceOpen] = useState(false);
  const [governanceTargetFundId, setGovernanceTargetFundId] = useState<string | undefined>(undefined);
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [pauseTargetFundId, setPauseTargetFundId] = useState<string | undefined>(undefined);

  const userAddress = linkedWallet?.address || user?.walletAddress || "";
  const workspaceName = currentWorkspace?.name || "Không gian nhóm";

  const handleCopyWallet = () => {
    if (!userAddress) return;
    navigator.clipboard.writeText(userAddress);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  const handleOpenContribute = (fundId?: string) => {
    setContributeTargetFundId(fundId);
    setIsContributeOpen(true);
  };

  const handleOpenExpense = (fundId?: string) => {
    setExpenseTargetFundId(fundId);
    setIsExpenseOpen(true);
  };

  const handleOpenRefund = (fundId: string) => {
    setRefundTargetFundId(fundId);
    setIsRefundOpen(true);
  };

  const handleOpenGovernance = (fundId: string) => {
    setGovernanceTargetFundId(fundId);
    setIsGovernanceOpen(true);
  };

  const handleOpenPause = (fundId: string) => {
    setPauseTargetFundId(fundId);
    setIsPauseOpen(true);
  };

  const refundTargetFund = funds.find((f) => f.id === refundTargetFundId) || null;
  const governanceTargetFund = funds.find((f) => f.id === governanceTargetFundId) || null;
  const pauseTargetFund = funds.find((f) => f.id === pauseTargetFundId) || null;

  // Clear errors safely (R11)
  const handleDismissError = () => {
    setErrorDismissed(true);
    fundV2?.clearError();
  };

  const handleRefresh = async () => {
    setErrorDismissed(false);
    fundV2?.clearError();
    await refresh();
  };

  return (
    <div className="group-finance min-h-screen bg-[#0B0E14] text-slate-100 antialiased selection:bg-[#E84142] selection:text-white">
      {/* Top Bar Nhóm */}
      <header className="sticky top-0 z-30 bg-[#0B0E14]/90 backdrop-blur-xl border-b border-slate-800/80 px-3.5 py-2.5">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          {/* Tên nhóm & Switcher */}
          <div className="relative min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setIsWorkspaceMenuOpen((v) => !v)}
              className="flex min-h-[44px] w-full min-w-0 items-center gap-2 p-1.5 rounded-2xl hover:bg-slate-900 transition-colors text-left"
              aria-expanded={isWorkspaceMenuOpen}
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#E84142] to-[#B91C1C] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-md shadow-[#E84142]/20">
                {workspaceName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-xs font-bold text-slate-100 truncate">
                  <span className="truncate max-w-[150px] sm:max-w-[200px]">{workspaceName}</span>
                  <ChevronDown size={14} className="text-slate-400 shrink-0" />
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Avalanche Fuji C-Chain</span>
                </div>
              </div>
            </button>

            {/* Menu chuyển nhóm */}
            {isWorkspaceMenuOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-[#131823] rounded-2xl border border-slate-800 shadow-2xl p-2 z-50 animate-fadeIn">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5 py-1.5">
                  Chuyển không gian nhóm
                </div>
                <div className="space-y-1 mt-1 max-h-48 overflow-y-auto pr-1">
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => {
                        void switchWorkspace(ws.id);
                        setIsWorkspaceMenuOpen(false);
                      }}
                      className={`w-full min-h-[44px] flex items-center justify-between px-3 rounded-xl text-xs font-medium transition-colors ${
                        ws.id === currentWorkspace?.id
                          ? "bg-[#E84142]/15 text-red-400 font-semibold border border-[#E84142]/30"
                          : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <span className="truncate">{ws.name}</span>
                      {ws.id === currentWorkspace?.id && <CheckCircle2 size={14} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ví kết nối */}
          {userAddress && (
            <button
              type="button"
              onClick={handleCopyWallet}
              className="min-h-[44px] px-3 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 flex items-center gap-1.5 text-xs font-mono text-slate-300 transition-colors shrink-0"
              title="Nhấn để sao chép địa chỉ ví"
            >
              <span>{userAddress.slice(0, 6)}...{userAddress.slice(-4)}</span>
              {copiedWallet ? (
                <CheckCircle2 size={13} className="text-emerald-400" />
              ) : (
                <Copy size={13} className="text-slate-500" />
              )}
            </button>
          )}
        </div>
      </header>

      {/* Nội dung chính màn hình điện thoại (Single Column, 360px -> 320px) */}
      <main className="max-w-lg mx-auto px-3.5 pt-3.5 pb-[calc(env(safe-area-inset-bottom)+88px)]">
        <nav aria-label="Công cụ nhóm" className="flex flex-wrap gap-4 mb-3 text-xs text-slate-400">
          <a href="/dashboard/finance/members" className="hover:text-white underline min-h-[44px] inline-flex items-center">
            Thành viên & Quyền
          </a>
          <a href="/settings" className="hover:text-white underline min-h-[44px] inline-flex items-center">
            Cài đặt tài khoản
          </a>
        </nav>

        {/* Dismissible Error Banner (Fix R11) */}
        {error && !errorDismissed && (
          <div
            className="mb-4 p-3 bg-rose-950/40 border border-rose-800/80 rounded-2xl flex items-start justify-between gap-2 text-xs text-rose-300"
            role="alert"
          >
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <div className="min-w-0">
                <p className="leading-snug">{error}</p>
                <button
                  type="button"
                  disabled={isLoading || isMutating}
                  onClick={() => void handleRefresh()}
                  className="underline mt-1.5 text-rose-200 hover:text-white min-h-[36px] inline-flex items-center gap-1"
                >
                  <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
                  <span>Tải lại dữ liệu</span>
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismissError}
              className="text-slate-400 hover:text-white p-1 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
              aria-label="Đóng thông báo lỗi"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {isLoading && (
          <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw size={20} className="animate-spin text-[#E84142]" />
            <span>Đang tải thông tin quỹ nhóm…</span>
          </div>
        )}

        {!isLoading && unsupportedFunds.length > 0 && (
          <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-2xl mb-4 text-xs text-amber-300 space-y-1">
            <p className="font-semibold">Quỹ cũ chưa kết nối adapter V2:</p>
            <ul className="list-disc list-inside">
              {unsupportedFunds.map((fund) => (
                <li key={fund.id}>{fund.name}</li>
              ))}
            </ul>
          </div>
        )}

        {!isLoading && transfers.length > 0 && (
          <section className="space-y-3 mb-4" aria-label="Lệnh cần hoàn tất">
            <h2 className="font-semibold text-sm text-slate-200">Lệnh cần hoàn tất</h2>
            {transfers.map((transfer) => (
              <TransferRecovery
                key={transfer.id}
                transfer={transfer}
                busy={isMutating}
                onResume={resumeTransfer}
                onResolve={resolveTransfer}
              />
            ))}
          </section>
        )}

        {/* Render Tabs: Fix R11 - DO NOT HIDE ON ERROR! */}
        {!isLoading && activeTab === "overview" && (
          <GroupFinanceOverview
            summary={summary}
            funds={funds}
            pendingApprovals={pendingUserApprovals}
            awaitingPayments={awaitingPaymentExpenses}
            obligations={obligations}
            recentActivity={auditEvents}
            onOpenContribute={handleOpenContribute}
            onOpenExpense={handleOpenExpense}
            onOpenCreateFund={() => setIsCreateFundOpen(true)}
            onOpenPayModal={(req) => setPaymentModalRequest(req)}
            onSwitchTab={handleTabChange}
          />
        )}

        {!isLoading && activeTab === "funds" && (
          <GroupFundsList
            funds={funds}
            onOpenContribute={handleOpenContribute}
            onOpenExpense={handleOpenExpense}
            onOpenCreateFund={() => setIsCreateFundOpen(true)}
            onOpenRefund={handleOpenRefund}
            onOpenGovernance={handleOpenGovernance}
            onOpenPause={handleOpenPause}
          />
        )}

        {!isLoading && activeTab === "inbox" && (
          <PendingApprovalsInbox
            expenses={expenses}
            onApprove={approveExpense}
            onReject={rejectExpense}
            onCancel={cancelExpense}
            onOpenPayModal={(req) => setPaymentModalRequest(req)}
          />
        )}

        {!isLoading && activeTab === "activity" && (
          <>
            <GroupReportExport />
            <AuditActivityLedger events={auditEvents} />
            {historyError && (
              <p className="text-xs text-rose-400 mt-2" role="alert">
                {historyError}
              </p>
            )}
            {hasMoreActivity && (
              <button
                className="min-h-[48px] w-full border border-slate-800 rounded-2xl bg-slate-900/60 hover:bg-slate-800 text-xs text-slate-300 font-medium mt-4 transition-colors"
                disabled={isLoadingMore}
                onClick={() => void loadMoreActivity()}
              >
                {isLoadingMore ? "Đang tải…" : "Tải thêm hoạt động"}
              </button>
            )}
          </>
        )}
      </main>

      {/* Thanh Điều Hướng Đáy 4 Tab Di Động */}
      <GroupFinanceDock
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        pendingApprovalsCount={pendingUserApprovals.length}
      />

      {/* Modals Tác Vụ */}
      <CreateFundModal
        isOpen={isCreateFundOpen}
        onClose={() => setIsCreateFundOpen(false)}
        onCreateFund={createFund}
      />

      <ContributionModal
        isOpen={isContributeOpen}
        onClose={() => setIsContributeOpen(false)}
        funds={funds}
        initialFundId={contributeTargetFundId}
        obligations={obligations}
        onContribute={contribute}
      />

      <ExpenseRequestModal
        isOpen={isExpenseOpen}
        onClose={() => setIsExpenseOpen(false)}
        funds={funds}
        initialFundId={expenseTargetFundId}
        onProposeExpense={proposeExpense}
      />

      <PaymentExecutionModal
        isOpen={Boolean(paymentModalRequest)}
        onClose={() => setPaymentModalRequest(null)}
        request={paymentModalRequest}
        onExecutePayment={executePayment}
      />

      {/* Modals V2: Nối trực tiếp tới các hooks on-chain V2 (Fix R05) */}
      <RefundGoalModal
        isOpen={isRefundOpen}
        onClose={() => {
          setIsRefundOpen(false);
          void handleRefresh();
        }}
        fund={refundTargetFund}
        userAddress={userAddress}
        workspaceId={currentWorkspace?.id}
        onRefund={async (fundId) => {
          return refundFailedGoal(fundId);
        }}
      />

      <PolicyGovernanceModal
        isOpen={isGovernanceOpen}
        onClose={() => {
          setIsGovernanceOpen(false);
          void handleRefresh();
        }}
        fund={governanceTargetFund}
        userAddress={userAddress}
        workspaceId={currentWorkspace?.id}
        onProposePolicy={async ({ fundId, quorum, dailyLimitAvax, approvers }) => {
          const policy = {
            quorum,
            transactionLimitWei: dailyLimitAvax ? groupAmount(dailyLimitAvax).toString() : "0",
            dailyLimitWei: dailyLimitAvax ? groupAmount(dailyLimitAvax).toString() : "0",
          };
          const members = approvers.map((addr) => ({
            account: addr,
            permissions: V2_PERMISSIONS.PROPOSE | V2_PERMISSIONS.APPROVE,
            dailyAllowanceWei: "0",
          }));
          return proposePolicy(fundId, policy, members);
        }}
        onApproveProposal={async (proposalId) => {
          if (!governanceTargetFundId) throw new Error("Chưa chọn quỹ.");
          return approveGovernance(governanceTargetFundId, Number(proposalId));
        }}
        onExecuteProposal={async (proposalId) => {
          if (!governanceTargetFundId) throw new Error("Chưa chọn quỹ.");
          return executeGovernance(governanceTargetFundId, Number(proposalId));
        }}
      />

      <EmergencyPauseModal
        isOpen={isPauseOpen}
        onClose={() => {
          setIsPauseOpen(false);
          void handleRefresh();
        }}
        fund={pauseTargetFund}
        userAddress={userAddress}
        workspaceId={currentWorkspace?.id}
        onProposeAction={async (action) => {
          if (!pauseTargetFundId) throw new Error("Chưa chọn quỹ.");
          return action === "PAUSE"
            ? proposePause(pauseTargetFundId)
            : proposeResume(pauseTargetFundId);
        }}
        onApproveAction={async (proposalId) => {
          if (!pauseTargetFundId) throw new Error("Chưa chọn quỹ.");
          return approveGovernance(pauseTargetFundId, Number(proposalId));
        }}
        onExecuteAction={async (proposalId) => {
          if (!pauseTargetFundId) throw new Error("Chưa chọn quỹ.");
          return executeGovernance(pauseTargetFundId, Number(proposalId));
        }}
      />
    </div>
  );
};
