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
  AlertTriangle,
  RefreshCw,
  PauseCircle,
  PlayCircle,
  Settings,
  Wallet,
  ExternalLink,
} from "lucide-react";
import { GroupFundItem, GroupFundKind } from "@/types/groupFinance";
import { parseIsoDateSafely } from "./RefundGoalModal";

interface GroupFundsListProps {
  funds: GroupFundItem[];
  onOpenContribute: (fundId: string) => void;
  onOpenExpense: (fundId: string) => void;
  onOpenCreateFund: () => void;
  onOpenRefund?: (fundId: string) => void;
  onOpenGovernance?: (fundId: string) => void;
  onOpenPause?: (fundId: string) => void;
}

export const GroupFundsList: React.FC<GroupFundsListProps> = ({
  funds,
  onOpenContribute,
  onOpenExpense,
  onOpenCreateFund,
  onOpenRefund,
  onOpenGovernance,
  onOpenPause,
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900/80 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`min-h-[44px] px-3.5 rounded-xl text-xs font-semibold transition-all ${
              filter === "ALL"
                ? "bg-[#E84142] text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Tất cả ({funds.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("OPERATING")}
            className={`min-h-[44px] px-3.5 rounded-xl text-xs font-semibold transition-all ${
              filter === "OPERATING"
                ? "bg-[#E84142] text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Hoạt động
          </button>
          <button
            type="button"
            onClick={() => setFilter("GOAL")}
            className={`min-h-[44px] px-3.5 rounded-xl text-xs font-semibold transition-all ${
              filter === "GOAL"
                ? "bg-[#E84142] text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Mục tiêu
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenCreateFund}
          className="min-h-[44px] px-4 flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#E84142] to-[#B91C1C] hover:from-[#D03031] hover:to-[#991B1B] text-white font-semibold text-xs shadow-lg shadow-[#E84142]/20 transition-all shrink-0"
        >
          <Plus size={16} />
          <span>Tạo quỹ mới</span>
        </button>
      </div>

      {/* Danh Sách Thẻ Quỹ */}
      {filteredFunds.length === 0 ? (
        <div className="p-8 text-center bg-[#131823] rounded-3xl border border-slate-800 shadow-xl space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center border border-slate-700/50">
            <Landmark size={24} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">Chưa có hũ quỹ nào</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Khởi tạo Quỹ Hoạt Động V2 hoặc Quỹ Mục Tiêu V2 để đóng góp và giải ngân minh bạch qua multisig.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCreateFund}
            className="min-h-[48px] px-5 inline-flex items-center gap-2 rounded-xl bg-[#E84142] text-white font-semibold text-sm transition-colors mt-2"
          >
            <Plus size={16} />
            <span>Tạo hũ quỹ đầu tiên</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFunds.map((fund) => {
            const isOperating = fund.fundType === "OPERATING";
            const isGoal = fund.fundType === "GOAL";
            const isExpanded = expandedFundId === fund.id;
            const isOnchainV2 =
              fund.custodyType === "ONCHAIN_V2" ||
              Boolean(fund.contractAddress);
            const isPaused = Boolean(fund.isPaused || fund.status === "PAUSED");

            const deadlineDate = parseIsoDateSafely(fund.targetDeadline);
            const isExpired =
              isGoal && deadlineDate
                ? deadlineDate.getTime() <= Date.now()
                : false;
            const isGoalFailed = isGoal && isExpired && !fund.goalReached;

            const goalProgress =
              isGoal && fund.targetAmountAvax
                ? Math.min(100, Math.round((fund.balanceAvax / fund.targetAmountAvax) * 100))
                : 0;
            const canProposeExpense =
              (isOperating || fund.goalReached) && !isPaused && !isGoalFailed;

            return (
              <div
                key={fund.id}
                className={`bg-[#131823] rounded-3xl border p-4 sm:p-5 shadow-xl space-y-3.5 transition-all ${
                  isPaused
                    ? "border-rose-900/60 bg-rose-950/10"
                    : "border-slate-800/90 hover:border-slate-700/90"
                }`}
              >
                {/* Header Thẻ & Các Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${
                        isOperating
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {isOperating ? <Landmark size={18} /> : <Target size={18} />}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-100 leading-tight truncate">
                        {fund.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {/* Badge loại quỹ */}
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            isOperating
                              ? "bg-blue-500/10 text-blue-300 border border-blue-500/20"
                              : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          }`}
                        >
                          {isOperating ? "Quỹ Hoạt Động" : "Quỹ Mục Tiêu"}
                        </span>

                        {/* Badge mô hình lưu ký */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wider ${
                            isOnchainV2
                              ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {isOnchainV2 ? <ShieldCheck size={11} className="text-indigo-400" /> : <Wallet size={11} />}
                          <span>{isOnchainV2 ? "Hợp Đồng V2" : "Ví Cá Nhân"}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badge trạng thái */}
                  <div className="shrink-0">
                    {isPaused ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                        <PauseCircle size={12} className="text-rose-400" />
                        Đã tạm dừng
                      </span>
                    ) : isGoalFailed ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                        <AlertTriangle size={12} className="text-rose-400" />
                        Mục tiêu thất bại
                      </span>
                    ) : isGoal && fund.goalReached ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        <CheckCircle2 size={12} className="text-emerald-400" />
                        Đạt mục tiêu
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Đang hoạt động
                      </span>
                    )}
                  </div>
                </div>

                {fund.description && (
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {fund.description}
                  </p>
                )}

                {/* Số dư khả dụng & Giữ chỗ */}
                <div className="p-3.5 bg-[#0E131F] rounded-2xl border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">Số dư khả dụng</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-2xl sm:text-3xl font-mono tabular-nums font-bold text-slate-100">
                        {fund.availableAvax.toFixed(2)}
                      </span>
                      <span className="text-xs font-bold text-slate-400">AVAX</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 font-medium block">Đang giữ chỗ</span>
                    <span className="text-xs font-mono tabular-nums font-semibold text-amber-400 mt-0.5 block">
                      {fund.reservedAvax.toFixed(2)} AVAX
                    </span>
                  </div>
                </div>

                {/* Phần riêng cho Quỹ Mục Tiêu: Tiến độ và điều kiện mở khóa */}
                {isGoal && fund.targetAmountAvax && (
                  <div className="space-y-2.5 p-3.5 bg-amber-950/20 rounded-2xl border border-amber-500/20">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-300">
                        Tiến độ: {fund.balanceAvax.toFixed(1)} / {fund.targetAmountAvax.toFixed(1)} AVAX
                      </span>
                      <span className="font-mono tabular-nums font-bold text-emerald-400">
                        {goalProgress}%
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${goalProgress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <span>
                        Hạn chót:{" "}
                        {deadlineDate
                          ? deadlineDate.toLocaleDateString("vi-VN")
                          : fund.targetDeadline || "Chưa ấn định"}
                      </span>
                      {fund.goalReached ? (
                        <span className="flex items-center gap-1 font-semibold text-emerald-400">
                          <Unlock size={12} />
                          Đã mở khóa đề nghị chi
                        </span>
                      ) : isExpired ? (
                        <span className="flex items-center gap-1 text-rose-400 font-semibold">
                          <AlertTriangle size={12} />
                          Quá hạn · Mở hoàn tiền
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-300">
                          <Lock size={12} />
                          Mở khóa khi đạt 100% mục tiêu
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* CTA Hoàn tiền nếu Mục tiêu thất bại (chỉ hiện cho Onchain V2 hoặc có onOpenRefund) */}
                {isGoalFailed && isOnchainV2 && onOpenRefund && (
                  <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-2xl space-y-2">
                    <div className="flex items-start gap-2 text-xs text-rose-300">
                      <AlertTriangle size={16} className="shrink-0 text-rose-400 mt-0.5" />
                      <p className="leading-snug">
                        Quỹ đã quá hạn và không đạt chỉ tiêu. Thành viên có quyền rút lại 100% tiền đã góp.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenRefund(fund.id)}
                      className="w-full min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md transition-colors"
                    >
                      <RefreshCw size={14} />
                      <span>Rút lại tiền góp (1-Tap Refund)</span>
                    </button>
                  </div>
                )}

                {/* Quy tắc giải ngân & Quorum */}
                <div className="text-xs text-slate-400 flex flex-wrap items-center gap-y-1 gap-x-3 pt-0.5">
                  {isOperating && fund.fastWithdrawLimitAvax > 0 && (
                    <span className="flex items-center gap-1 text-slate-300">
                      <ShieldCheck size={14} className="text-emerald-400" />
                      Chi nhanh $\le$ {fund.fastWithdrawLimitAvax} AVAX
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users size={14} className="text-slate-400" />
                    Duyệt: {fund.requiredApprovals}/{fund.totalSigners} người
                  </span>
                </div>

                {/* Chi tiết người ký & Hợp đồng (Expandable) */}
                {isExpanded && (
                  <div className="p-3.5 bg-[#0E131F] rounded-2xl border border-slate-800 text-xs space-y-2 animate-fadeIn">
                    {isOnchainV2 ? (
                      <div>
                        <span className="text-slate-400 block">Địa chỉ Smart Contract:</span>
                        <div className="font-mono text-[11px] text-slate-200 break-all flex items-center gap-1 mt-0.5">
                          <span>{fund.contractAddress || "Đang kết nối hợp đồng"}</span>
                          {fund.contractAddress && (
                            <a
                              href={`https://testnet.snowtrace.io/address/${fund.contractAddress}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-red-400 hover:text-red-300 shrink-0 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                              title="Xem hợp đồng trên Snowtrace"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Phiên bản KinetixFundV2 độc lập trên Avalanche Fuji. Quản trị qua quorum và 24h Timelock.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p>Ví giữ tiền: <span className="break-all font-mono text-slate-300">{fund.treasuryWalletAddress || "Chưa xác minh"}</span></p>
                        <p className="text-slate-400 text-[11px] mt-0.5">Chủ ví kiểm soát tiền. Phiếu duyệt quản lý nội bộ.</p>
                      </div>
                    )}
                    <p className="font-mono text-[11px] text-slate-400">
                      Khả dụng: {fund.availableAvax.toFixed(4)} AVAX · Giữ chỗ: {fund.reservedAvax.toFixed(4)} AVAX
                    </p>
                    <div className="font-semibold text-slate-300">
                      Danh sách người ký quỹ ({fund.signers.length}):
                    </div>
                    {fund.signers.map((s, idx) => (
                      <div key={idx} className="font-mono text-[11px] text-slate-400 break-all">
                        • {s}
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons: Góp tiền & Đề nghị chi */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => onOpenContribute(fund.id)}
                    disabled={isPaused || isGoalFailed}
                    className="min-h-[44px] flex items-center justify-center gap-1.5 rounded-2xl bg-[#E84142] hover:bg-[#D03031] text-white font-semibold text-xs shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ArrowDownRight size={15} />
                    <span>Góp tiền</span>
                  </button>

                  <button
                    type="button"
                    disabled={!canProposeExpense}
                    onClick={() => onOpenExpense(fund.id)}
                    className="min-h-[44px] flex items-center justify-center gap-1.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={
                      !canProposeExpense
                        ? isPaused
                          ? "Quỹ đang tạm dừng khẩn cấp."
                          : "Quỹ mục tiêu chưa đạt 100% nên chưa mở khóa đề nghị chi."
                        : undefined
                    }
                  >
                    <FileText size={15} />
                    <span>Đề nghị chi</span>
                  </button>
                </div>

                {/* Quản trị & Tạm dừng khẩn cấp Toolbar - CHỈ HIỂN THỊ CHO ON-CHAIN V2 (R05) */}
                {isOnchainV2 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
                    {onOpenGovernance && (
                      <button
                        type="button"
                        onClick={() => onOpenGovernance(fund.id)}
                        className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl bg-slate-800/70 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors"
                        title="Quản trị người duyệt và chính sách quỹ qua 24h timelock"
                      >
                        <Settings size={14} className="text-slate-400" />
                        <span>Quản trị (24h)</span>
                      </button>
                    )}

                    {onOpenPause && (
                      <button
                        type="button"
                        onClick={() => onOpenPause(fund.id)}
                        className={`flex-1 min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl font-medium text-xs transition-colors ${
                          isPaused
                            ? "bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30"
                            : "bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30"
                        }`}
                        title={isPaused ? "Mở lại hoạt động quỹ" : "Tạm dừng khẩn cấp"}
                      >
                        {isPaused ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
                        <span>{isPaused ? "Mở lại quỹ" : "Tạm dừng"}</span>
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => toggleExpand(fund.id)}
                  className="w-full min-h-[44px] text-center text-xs text-slate-400 hover:text-slate-200 font-medium py-1 flex items-center justify-center gap-1 transition-colors"
                >
                  <span>{isExpanded ? "Thu gọn chi tiết" : "Xem chính sách & hợp đồng"}</span>
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
