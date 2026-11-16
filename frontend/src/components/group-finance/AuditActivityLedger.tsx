"use client";

import React, { useState } from "react";
import {
  History,
  ArrowDownRight,
  FileText,
  CheckCircle2,
  XCircle,
  CreditCard,
  PlusCircle,
  ExternalLink,
  Search,
} from "lucide-react";
import { GroupAuditEvent } from "@/types/groupFinance";

interface AuditActivityLedgerProps {
  events: GroupAuditEvent[];
}

export const AuditActivityLedger: React.FC<AuditActivityLedgerProps> = ({
  events,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("ALL");

  const filteredEvents = events.filter((ev) => {
    if (actionFilter !== "ALL" && ev.action !== actionFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        ev.description.toLowerCase().includes(q) ||
        ev.actorName.toLowerCase().includes(q) ||
        (ev.fundName && ev.fundName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getActionIcon = (action: GroupAuditEvent["action"]) => {
    switch (action) {
      case "CONTRIBUTION_MADE":
        return <ArrowDownRight size={16} className="text-emerald-600" />;
      case "EXPENSE_PROPOSED":
        return <FileText size={16} className="text-blue-600" />;
      case "EXPENSE_APPROVED":
        return <CheckCircle2 size={16} className="text-emerald-600" />;
      case "EXPENSE_REJECTED":
        return <XCircle size={16} className="text-red-600" />;
      case "PAYMENT_EXECUTED":
        return <CreditCard size={16} className="text-[#E84142]" />;
      case "FUND_CREATED":
        return <PlusCircle size={16} className="text-purple-600" />;
      default:
        return <History size={16} className="text-slate-600" />;
    }
  };

  const getActionBadge = (action: GroupAuditEvent["action"]) => {
    switch (action) {
      case "CONTRIBUTION_MADE":
        return "Góp tiền";
      case "EXPENSE_PROPOSED":
        return "Đề nghị chi";
      case "EXPENSE_APPROVED":
        return "Ký duyệt";
      case "EXPENSE_REJECTED":
        return "Từ chối chi";
      case "PAYMENT_EXECUTED":
        return "Giải ngân on-chain";
      case "FUND_CREATED":
        return "Khởi tạo quỹ";
      default:
        return "Kiểm toán";
    }
  };

  return (
    <div className="space-y-4">
      {/* Tìm kiếm & Lọc nhanh */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm giao dịch, người thực hiện, quỹ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-10 pr-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E84142]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100 rounded-xl">
          {[
            { id: "ALL", label: "Tất cả" },
            { id: "CONTRIBUTION_MADE", label: "Góp tiền" },
            { id: "EXPENSE_PROPOSED", label: "Đề nghị chi" },
            { id: "EXPENSE_APPROVED", label: "Ký duyệt" },
            { id: "PAYMENT_EXECUTED", label: "Giải ngân" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActionFilter(item.id)}
              className={`min-h-[44px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                actionFilter === item.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sổ cái kiểm toán */}
      {filteredEvents.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
            <History size={24} />
          </div>
          <h4 className="text-sm font-semibold text-slate-900">Không tìm thấy bản ghi đối soát</h4>
          <p className="text-xs text-slate-500">
            Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc hành động.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((ev) => (
            <div
              key={ev.id}
              className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 shrink-0">
                    {getActionIcon(ev.action)}
                  </span>
                  <div>
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {getActionBadge(ev.action)}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-2">
                      {ev.createdAt}
                    </span>
                  </div>
                </div>

                {ev.amountAvax !== undefined && (
                  <div className="font-mono tabular-nums font-bold text-sm text-slate-900 text-right">
                    {ev.amountAvax.toFixed(2)} AVAX
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-800 font-medium leading-snug">
                {ev.description}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-700">{ev.actorName}</span>
                  <span>·</span>
                  <span className="font-mono text-slate-400">
                    {ev.actorWallet.slice(0, 6)}...{ev.actorWallet.slice(-4)}
                  </span>
                </div>

                {ev.txHash && (
                  <a
                    href={`https://testnet.snowtrace.io/tx/${ev.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#E84142] hover:underline font-mono"
                  >
                    <span>Biên lai</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
