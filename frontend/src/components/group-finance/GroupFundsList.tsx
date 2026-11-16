"use client";

import React, { useState } from "react";
import {
  Landmark,
  Target,
  Plus,
  ArrowDownRight,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Unlock,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { GroupFundItem, GroupFundKind } from "@/types/groupFinance";

interface GroupFundsListProps {
  funds: GroupFundItem[];
  onOpenContribute: (fundId: string) => void;
  onOpenExpense: (fundId: string) => void;
  onOpenCreateFund: () => void;
}

export const GroupFundsList: React.FC<GroupFundsListProps> = ({
  funds,
  onOpenContribute,
  onOpenExpense,
  onOpenCreateFund,
}) => {
  const [filter, setFilter] = useState<"ALL" | GroupFundKind>("ALL");
  const [expandedFundId, setExpandedFundId] = useState<string | null>(null);

  const filteredFunds = funds.filter((f) => {
    if (filter === "ALL") return true;
    return f.fundType === filter;
  });

  const toggleExpand = (fundId: string) => {
    setExpandedFundId((prev) => (prev === fundId ? null : fundId));
  };

  return (
    <div className="space-y-4">
      {/* Thanh Lọc & CTA Tạo Quỹ Mới */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`min-h-[44px] px-3 rounded-lg text-xs font-semibold transition-colors ${
              filter === "ALL"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Tất cả ({funds.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("OPERATING")}
            className={`min-h-[44px] px-3 rounded-lg text-xs font-semibold transition-colors ${
              filter === "OPERATING"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Hoạt động
          </button>
          <button
            type="button"
            onClick={() => setFilter("GOAL")}
            className={`min-h-[44px] px-3 rounded-lg text-xs font-semibold transition-colors ${
              filter === "GOAL"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Mục tiêu
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenCreateFund}
          className="min-h-[44px] px-3.5 flex items-center gap-1.5 rounded-xl bg-[#E84142] hover:bg-[#D03031] text-white font-medium text-xs shadow-sm transition-colors shrink-0"
        >
          <Plus size={16} />
          <span>Tạo quỹ</span>
        </button>
      </div>

      {/* Danh Sách Thẻ Quỹ */}
      {filteredFunds.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
            <Landmark size={24} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Chưa có hũ quỹ nào trong mục này</h4>
            <p className="text-xs text-slate-500 mt-1">
              Khởi tạo Quỹ Hoạt Động hoặc Quỹ Mục Tiêu để bắt đầu đóng góp và chi tiêu minh bạch.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCreateFund}
            className="min-h-[48px] px-4 inline-flex items-center gap-2 rounded-xl bg-[#E84142] text-white font-medium text-sm transition-colors"
          >
            <Plus size={16} />
            <span>Tạo hũ quỹ mới</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredFunds.map((fund) => {
            const isOperating = fund.fundType === "OPERATING";
            const isGoal = fund.fundType === "GOAL";
            const isExpanded = expandedFundId === fund.id;
            const goalProgress =
              isGoal && fund.targetAmountAvax
                ? Math.min(100, Math.round((fund.balanceAvax / fund.targetAmountAvax) * 100))
                : 0;
            const canProposeExpense = isOperating || fund.goalReached;

            return (
              <div
                key={fund.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3"
              >
                {/* Header Thẻ */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                        isOperating
                          ? "bg-blue-100 text-blue-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {isOperating ? <Landmark size={18} /> : <Target size={18} />}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 leading-tight">
                        {fund.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase tracking-wider ${
                            isOperating
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {isOperating ? "Quỹ Hoạt Động" : "Quỹ Mục Tiêu"}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {fund.createdAt}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Đang hoạt động
                  </span>
                </div>

                {fund.description && (
                  <p className="text-xs text-slate-600 leading-snug">
                    {fund.description}
                  </p>
                )}

                {/* Số dư khả dụng & Giữ chỗ */}
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 block">Số dư khả dụng</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-2xl font-mono tabular-nums font-bold text-slate-900">
                        {fund.availableAvax.toFixed(2)}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">AVAX</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Đang giữ chỗ</span>
                    <span className="text-xs font-mono tabular-nums font-medium text-slate-600 mt-0.5 block">
                      {fund.reservedAvax.toFixed(2)} AVAX
                    </span>
                  </div>
                </div>

                {/* Phần riêng cho Quỹ Mục Tiêu: Tiến độ và điều kiện mở khóa */}
                {isGoal && fund.targetAmountAvax && (
                  <div className="space-y-2 p-3 bg-amber-50/50 rounded-xl border border-amber-200/80">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-700">
                        Tiến độ mục tiêu: {fund.balanceAvax.toFixed(1)} / {fund.targetAmountAvax.toFixed(1)} AVAX
                      </span>
                      <span className="font-mono tabular-nums font-bold text-emerald-700">
                        {goalProgress}%
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${goalProgress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>Hạn chót: {fund.targetDeadline || "Chưa ấn định"}</span>
                      {fund.goalReached ? (
                        <span className="flex items-center gap-1 font-semibold text-emerald-700">
                          <Unlock size={12} />
                          Đã mở khóa đề nghị chi
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-800">
                          <Lock size={12} />
                          Mở khóa khi đạt 100% mục tiêu
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Quy tắc giải ngân */}
                <div className="text-xs text-slate-600 flex flex-wrap items-center gap-y-1 gap-x-3 pt-1">
                  {isOperating && fund.fastWithdrawLimitAvax > 0 && (
                    <span className="flex items-center gap-1">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      Chi nhanh $\le$ {fund.fastWithdrawLimitAvax} AVAX (1 chữ ký)
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users size={14} className="text-slate-500" />
                    Đa chữ ký: {fund.requiredApprovals}/{fund.totalSigners} người duyệt
                  </span>
                </div>

                {/* Chi tiết người ký (Expandable) */}
                {isExpanded && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 animate-fadeIn">
                    <div className="font-semibold text-slate-800 mb-1">
                      Danh sách người ký quỹ ({fund.signers.length}):
                    </div>
                    {fund.signers.map((s, idx) => (
                      <div key={idx} className="font-mono text-[11px] text-slate-600 truncate">
                        • {s}
                      </div>
                    ))}
                    {isGoal && (
                      <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 leading-snug">
                        Chính sách hoàn tiền: Nếu mục tiêu bị hủy hoặc không đạt điều kiện giải ngân, tiền nạp sẽ được hoàn lại theo tỷ lệ đóng góp thực tế.
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onOpenContribute(fund.id)}
                    className="min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl bg-[#E84142] hover:bg-[#D03031] text-white font-medium text-xs transition-colors"
                  >
                    <ArrowDownRight size={15} />
                    <span>Góp tiền</span>
                  </button>

                  <button
                    type="button"
                    disabled={!canProposeExpense}
                    onClick={() => onOpenExpense(fund.id)}
                    className="min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={
                      !canProposeExpense
                        ? "Quỹ mục tiêu chưa đạt 100% nên chưa mở khóa đề nghị chi."
                        : undefined
                    }
                  >
                    <FileText size={15} />
                    <span>Đề nghị chi</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => toggleExpand(fund.id)}
                  className="w-full text-center text-[11px] text-slate-500 hover:text-slate-800 font-medium py-1 flex items-center justify-center gap-1 transition-colors"
                >
                  <span>{isExpanded ? "Thu gọn chính sách" : "Xem chính sách & người ký"}</span>
                  {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
