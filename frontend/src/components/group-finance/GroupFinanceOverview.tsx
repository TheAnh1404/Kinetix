"use client";

import React from "react";
import {
  Wallet,
  ArrowDownRight,
  FileText,
  Plus,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Lock,
} from "lucide-react";
import {
  GroupFundItem,
  GroupExpenseRequest,
  GroupObligation,
  GroupAuditEvent,
} from "@/types/groupFinance";
import { useAuth } from "@/hooks/useAuth";

interface GroupFinanceOverviewProps {
  summary: {
    totalBalanceAvax: number;
    totalReservedAvax: number;
    totalAvailableAvax: number;
    fundsCount: number;
    pendingApprovalsCount: number;
    awaitingPaymentCount: number;
  };
  funds: GroupFundItem[];
  pendingApprovals: GroupExpenseRequest[];
  awaitingPayments: GroupExpenseRequest[];
  obligations: GroupObligation[];
  recentActivity: GroupAuditEvent[];
  onOpenContribute: (fundId?: string) => void;
  onOpenExpense: (fundId?: string) => void;
  onOpenCreateFund: () => void;
  onOpenPayModal: (request: GroupExpenseRequest) => void;
  onSwitchTab: (tab: "funds" | "inbox" | "activity") => void;
}

export const GroupFinanceOverview: React.FC<GroupFinanceOverviewProps> = ({
  summary,
  funds,
  pendingApprovals,
  awaitingPayments,
  obligations,
  recentActivity,
  onOpenContribute,
  onOpenExpense,
  onOpenCreateFund,
  onOpenPayModal,
  onSwitchTab,
}) => {
  const { user, linkedWallet } = useAuth();
  const userWallet = linkedWallet?.address || user?.walletAddress || "";
  const unpaidObligations = obligations.filter((ob) => ob.status === "PENDING");

  return (
    <div className="space-y-4">
      {/* Thẻ Tổng Hợp Số Dư Quỹ Nhóm */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Tổng số dư khả dụng
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Avalanche Fuji
          </span>
        </div>

        {/* Số dư lớn tabular-nums */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl sm:text-4xl font-mono tabular-nums font-bold tracking-tight text-slate-900">
            {summary.totalAvailableAvax.toFixed(2)}
          </span>
          <span className="text-base font-bold text-slate-600">AVAX</span>
        </div>

        {/* Chi tiết phân bổ */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-col">
            <span className="text-slate-500">Đang giữ chỗ (Reserved):</span>
            <span className="font-mono tabular-nums font-semibold text-slate-700 mt-0.5">
              {summary.totalReservedAvax.toFixed(2)} AVAX
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-500">Tổng tài sản ghi sổ:</span>
            <span className="font-mono tabular-nums font-semibold text-slate-700 mt-0.5">
              {summary.totalBalanceAvax.toFixed(2)} AVAX
            </span>
          </div>
        </div>

        {/* 3 Nút Tác Vụ Chính */}
        <div className="grid grid-cols-2 gap-2 pt-4">
          <button
            type="button"
            onClick={() => onOpenContribute()}
            className="min-h-[48px] h-12 flex items-center justify-center gap-2 rounded-xl bg-[#E84142] hover:bg-[#D03031] text-white font-medium text-sm shadow-sm transition-colors"
          >
            <ArrowDownRight size={18} />
            <span>Góp tiền</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenExpense()}
            className="min-h-[48px] h-12 flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm shadow-sm transition-colors"
          >
            <FileText size={18} />
            <span>Đề nghị chi</span>
          </button>
        </div>
      </div>

      {/* Hộp Việc Cần Làm (Action Inbox) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <Clock size={16} className="text-slate-500" />
            <span>Việc cần xử lý</span>
          </h3>
          {(pendingApprovals.length > 0 || awaitingPayments.length > 0) && (
            <button
              onClick={() => onSwitchTab("inbox")}
              className="text-xs font-semibold text-[#E84142] hover:underline flex items-center gap-0.5"
            >
              <span>Xem tất cả</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>

        {pendingApprovals.length === 0 &&
        awaitingPayments.length === 0 &&
        unpaidObligations.length === 0 ? (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-500">
            Không có việc cần xử lý. Tất cả các khoản chi và nghĩa vụ đều đã hoàn tất.
          </div>
        ) : (
          <div className="space-y-2">
            {/* Khoản chi chờ duyệt */}
            {pendingApprovals.slice(0, 2).map((req) => (
              <div
                key={req.id}
                className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-amber-950 truncate">
                    Duyệt chi: {req.title}
                  </div>
                  <div className="text-[11px] text-amber-800 flex items-center gap-2 mt-0.5">
                    <span className="font-mono tabular-nums font-semibold">
                      {req.amountAvax.toFixed(2)} AVAX
                    </span>
                    <span>·</span>
                    <span>Cần thêm {req.requiredApprovals - req.approvedCount} người duyệt</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSwitchTab("inbox")}
                  className="min-h-[44px] px-3 flex items-center justify-center rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shrink-0 transition-colors"
                >
                  Duyệt ngay
                </button>
              </div>
            ))}

            {/* Khoản chi đã đủ phiếu chờ phát lệnh thanh toán */}
            {awaitingPayments.slice(0, 1).map((req) => (
              <div
                key={req.id}
                className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-emerald-950 truncate">
                    Chờ thanh toán: {req.title}
                  </div>
                  <div className="text-[11px] text-emerald-800 flex items-center gap-2 mt-0.5">
                    <span className="font-mono tabular-nums font-semibold">
                      {req.amountAvax.toFixed(2)} AVAX
                    </span>
                    <span>·</span>
                    <span>Đã đủ {req.approvedCount}/{req.requiredApprovals} chữ ký</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenPayModal(req)}
                  className="min-h-[44px] px-3 flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shrink-0 transition-colors"
                >
                  Ký phát
                </button>
              </div>
            ))}

            {/* Nghĩa vụ nộp quỹ */}
            {unpaidObligations.slice(0, 1).map((ob) => (
              <div
                key={ob.id}
                className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-blue-950 truncate">
                    Đóng góp định kỳ: {ob.fundName}
                  </div>
                  <div className="text-[11px] text-blue-800 mt-0.5">
                    <span className="font-mono tabular-nums font-semibold">
                      {ob.amountAvax.toFixed(2)} AVAX
                    </span>{" "}
                    (Hạn nộp: {ob.dueDate})
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenContribute(ob.fundId)}
                  className="min-h-[44px] px-3 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shrink-0 transition-colors"
                >
                  Nộp quỹ
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tóm tắt các Quỹ (Funds Spotlight) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Hũ quỹ ({funds.length})
          </h3>
          <button
            onClick={() => onSwitchTab("funds")}
            className="text-xs font-semibold text-[#E84142] hover:underline flex items-center gap-0.5"
          >
            <span>Tất cả quỹ</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="space-y-2.5">
          {funds.map((fund) => (
            <div
              key={fund.id}
              className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <span className="text-xs font-semibold text-slate-900">
                    {fund.name}
                  </span>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {fund.fundType === "OPERATING" ? "Quỹ Hoạt Động" : "Quỹ Mục Tiêu"}
                    {fund.fundType === "OPERATING" && fund.fastWithdrawLimitAvax > 0 && (
                      <span> · Chi nhanh $\le$ {fund.fastWithdrawLimitAvax} AVAX</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono tabular-nums font-bold text-sm text-slate-900">
                    {fund.availableAvax.toFixed(2)} AVAX
                  </div>
                  <div className="text-[10px] text-slate-400">Khả dụng</div>
                </div>
              </div>

              {fund.fundType === "GOAL" && fund.targetAmountAvax && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                    <span>
                      Tiến độ: {fund.balanceAvax.toFixed(1)}/{fund.targetAmountAvax.toFixed(1)} AVAX
                    </span>
                    <span className="font-semibold text-emerald-700">
                      {Math.min(
                        100,
                        Math.round((fund.balanceAvax / fund.targetAmountAvax) * 100)
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((fund.balanceAvax / fund.targetAmountAvax) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Hoạt Động Gần Đây (Recent Activity) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Hoạt động gần nhất
          </h3>
          <button
            onClick={() => onSwitchTab("activity")}
            className="text-xs font-semibold text-[#E84142] hover:underline flex items-center gap-0.5"
          >
            <span>Nhật ký đối soát</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="space-y-2">
          {recentActivity.slice(0, 3).map((act) => (
            <div
              key={act.id}
              className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
            >
              <div className="min-w-0">
                <div className="font-medium text-slate-900 truncate">
                  {act.description}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <span>{act.actorName}</span>
                  <span>·</span>
                  <span>{act.createdAt}</span>
                </div>
              </div>
              {act.amountAvax !== undefined && (
                <span className="font-mono tabular-nums font-semibold text-slate-900 shrink-0">
                  {act.amountAvax.toFixed(2)} AVAX
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
