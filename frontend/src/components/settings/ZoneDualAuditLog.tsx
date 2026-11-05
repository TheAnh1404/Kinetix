"use client";

import React, { useState } from "react";
import {
  History,
  Database,
  Blocks,
  Layers,
  ExternalLink,
  CheckCircle2,
  Clock,
  Filter,
} from "lucide-react";
import { AuditLogItem } from "@/hooks/useSettingsData";
import { SNOWTRACE_TESTNET_URL } from "@/contracts/config";

interface ZoneDualAuditLogProps {
  logs: AuditLogItem[];
  uiMode: "LITE" | "PRO";
}

export const ZoneDualAuditLog: React.FC<ZoneDualAuditLogProps> = ({
  logs,
  uiMode,
}) => {
  const [filter, setFilter] = useState<"ALL" | "OFF_CHAIN" | "ON_CHAIN" | "HYBRID_DUAL">("ALL");

  const filteredLogs = logs.filter((log) => {
    if (filter === "ALL") return true;
    return log.layer === filter;
  });

  const getLayerBadge = (layer: string) => {
    switch (layer) {
      case "OFF_CHAIN":
        return (
          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-mono font-bold flex items-center gap-1">
            <Database size={11} />
            <span>[Web2 DB]</span>
          </span>
        );
      case "ON_CHAIN":
        return (
          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-mono font-bold flex items-center gap-1">
            <Blocks size={11} />
            <span>[On-chain]</span>
          </span>
        );
      case "HYBRID_DUAL":
      default:
        return (
          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1">
            <Layers size={11} />
            <span>[Hybrid Dual]</span>
          </span>
        );
    }
  };

  const formatActionName = (action: string) => {
    switch (action) {
      case "UPDATE_ALLOWANCE":
        return "Cập nhật hạn mức chi tiêu";
      case "FREEZE_MEMBER":
        return "Đóng băng / Mở khóa thành viên";
      case "REVOKE_SESSION":
        return "Thu hồi quyền Session Key";
      case "SWITCH_PRIMARY_WALLET":
        return "Đổi ví nhận tiền mặc định";
      case "LINK_WALLET":
        return "Liên kết ví Web3 mới";
      case "UPDATE_PREFERENCES":
        return "Cập nhật tùy chọn hệ thống";
      case "ONCHAIN_CONFIRMATION":
        return "Xác nhận đồng bộ On-chain";
      default:
        return action;
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center font-bold">
            <History size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Nhật Ký Hoạt Động Kép (Dual Audit Log Timeline)
            </h3>
            <p className="text-[11px] text-slate-500">
              Minh bạch mọi thay đổi cấu hình cả ở tầng Web2 DB và On-chain Smart Contract
            </p>
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          {[
            { id: "ALL" as const, label: "Tất cả" },
            { id: "OFF_CHAIN" as const, label: "Web2 DB" },
            { id: "HYBRID_DUAL" as const, label: "Hybrid Kép" },
            { id: "ON_CHAIN" as const, label: "On-chain" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filter === item.id
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline List */}
      {filteredLogs.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          Chưa có bản ghi nhật ký hoạt động nào theo tiêu chí lọc này.
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 pl-5 space-y-6">
          {filteredLogs.map((log) => (
            <div key={log.id} className="relative group">
              {/* Dot on Timeline */}
              <div
                className={`absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 shadow-xs ${
                  log.status === "COMPLETED"
                    ? "bg-emerald-500"
                    : log.status === "PENDING_CONFIRMATION"
                      ? "bg-amber-500 animate-pulse"
                      : "bg-rose-500"
                }`}
              />

              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getLayerBadge(log.layer)}
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {formatActionName(log.actionType)}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      bởi <strong className="text-slate-700 dark:text-slate-300">{log.actorName}</strong>
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(log.createdAt).toLocaleString("vi-VN")}
                  </span>
                </div>

                {/* Diff summary */}
                {log.metadataDiff && (
                  <div className="text-xs text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    {log.metadataDiff.description ||
                      log.metadataDiff.notice ||
                      JSON.stringify(log.metadataDiff)}
                  </div>
                )}

                {/* TxHash Link */}
                {log.txHash && (
                  <div className="flex items-center gap-2 pt-1 text-[11px] font-mono">
                    <span className="text-slate-400">On-chain Receipt:</span>
                    <a
                      href={`${SNOWTRACE_TESTNET_URL}/tx/${log.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-600 dark:text-red-400 font-bold hover:underline inline-flex items-center gap-1"
                    >
                      <span>{log.txHash.slice(0, 10)}...{log.txHash.slice(-8)}</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
