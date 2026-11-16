"use client";

import React, { useState } from "react";
import {
  Users,
  ChevronDown,
  Layers,
  ArrowRightLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
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
import { GroupExpenseRequest } from "@/types/groupFinance";

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
    executePayment,
  } = useGroupFinance();

  const [activeTab, setActiveTab] = useState<GroupFinanceTab>("overview");
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);

  // Trạng thái mở Modals
  const [isCreateFundOpen, setIsCreateFundOpen] = useState(false);
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [contributeTargetFundId, setContributeTargetFundId] = useState<string | undefined>(undefined);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [expenseTargetFundId, setExpenseTargetFundId] = useState<string | undefined>(undefined);
  const [paymentModalRequest, setPaymentModalRequest] = useState<GroupExpenseRequest | null>(null);

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      {/* Top Bar Nhóm */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3.5 py-2.5">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          {/* Tên nhóm & Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsWorkspaceMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-slate-100 transition-colors text-left"
              aria-expanded={isWorkspaceMenuOpen}
            >
              <div className="w-8 h-8 rounded-lg bg-[#E84142] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                {workspaceName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-xs font-semibold text-slate-900 truncate">
                  <span className="truncate max-w-[150px] sm:max-w-[200px]">{workspaceName}</span>
                  <ChevronDown size={14} className="text-slate-400 shrink-0" />
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Avalanche Fuji</span>
                </div>
              </div>
            </button>

            {/* Menu chuyển nhóm */}
            {isWorkspaceMenuOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-60 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-50 animate-fadeIn">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1">
                  Chuyển không gian nhóm
                </div>
                <div className="space-y-1 mt-1 max-h-48 overflow-y-auto">
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => {
                        void switchWorkspace(ws.id);
                        setIsWorkspaceMenuOpen(false);
                      }}
                      className={`w-full min-h-[44px] flex items-center justify-between px-2.5 rounded-xl text-xs transition-colors ${
                        ws.id === currentWorkspace?.id
                          ? "bg-[#E84142]/10 text-[#E84142] font-semibold"
                          : "text-slate-700 hover:bg-slate-100"
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
              className="min-h-[44px] px-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center gap-1.5 text-[11px] font-mono text-slate-700 transition-colors"
              title="Nhấn để sao chép địa chỉ ví"
            >
              <span>{userAddress.slice(0, 5)}...{userAddress.slice(-4)}</span>
              {copiedWallet ? (
                <CheckCircle2 size={13} className="text-emerald-600" />
              ) : (
                <Copy size={13} className="text-slate-400" />
              )}
            </button>
          )}
        </div>
      </header>

      {/* Nội dung chính màn hình điện thoại (Single Column, 360px -> 320px) */}
      <main className="max-w-lg mx-auto px-3.5 pt-3.5 pb-[calc(env(safe-area-inset-bottom)+88px)]">
        {activeTab === "overview" && (
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
            onSwitchTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "funds" && (
          <GroupFundsList
            funds={funds}
            onOpenContribute={handleOpenContribute}
            onOpenExpense={handleOpenExpense}
            onOpenCreateFund={() => setIsCreateFundOpen(true)}
          />
        )}

        {activeTab === "inbox" && (
          <PendingApprovalsInbox
            expenses={expenses}
            onApprove={approveExpense}
            onReject={rejectExpense}
            onOpenPayModal={(req) => setPaymentModalRequest(req)}
          />
        )}

        {activeTab === "activity" && (
          <AuditActivityLedger events={auditEvents} />
        )}
      </main>

      {/* Thanh Điều Hướng Đáy 4 Tab Di Động */}
      <GroupFinanceDock
        activeTab={activeTab}
        onChangeTab={(tab) => setActiveTab(tab)}
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
    </div>
  );
};
