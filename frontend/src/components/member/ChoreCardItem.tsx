"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock3,
  Coins,
  Gift,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import { ChoreItem } from "@/context/FamilyContext";
import { hubChain } from "@/contracts/config";
import { amountLabel } from "@/lib/member";

// Nhãn tiếng Việt thân thiện dành cho các trạng thái việc nhà của trẻ nhỏ
export const choreLabels: Record<string, string> = {
  TODO: "Chưa làm",
  SUBMITTED: "Chờ ba mẹ duyệt",
  VERIFIED: "Đã duyệt, đang kiểm tra chi trả",
  REWARDED: "Đã nhận thưởng",
  CANCELLED: "Đã hủy",
};

interface ChoreCardProps {
  chore: ChoreItem;
  onOpenSubmit?: (chore: ChoreItem) => void;
}

/**
 * Thẻ việc nhà (Chore-to-Earn Card) được tối ưu hóa cho màn hình cảm ứng di động.
 * Tích hợp nhãn trạng thái rực rỡ, huy hiệu đồng xu thưởng, và nút nộp kết quả 1-chạm (>= 48px).
 */
export function ChoreCardItem({ chore, onOpenSubmit }: ChoreCardProps) {
  const isRewarded = chore.status === "REWARDED";
  const isTodo = chore.status === "TODO";
  const isPending = chore.status === "SUBMITTED" || chore.status === "VERIFIED";

  // Biểu tượng động theo trạng thái
  const StatusIcon = isRewarded
    ? Trophy
    : isTodo
      ? Star
      : isPending
        ? Clock3
        : CheckCircle2;

  // Lựa chọn màu sắc rực rỡ cho từng nhãn trạng thái (WCAG AAA contrast)
  const statusBadgeStyle = isRewarded
    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
    : isTodo
      ? "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700"
      : "bg-sky-100 text-sky-900 dark:bg-sky-950/60 dark:text-sky-300 border-sky-300 dark:border-sky-700";

  return (
    <article
      className={`chore-card chore-${chore.status.toLowerCase()} relative flex flex-col justify-between rounded-3xl p-5 bg-white dark:bg-slate-900 border-2 border-purple-100 dark:border-purple-900/40 shadow-sm hover:shadow-md transition-all active:scale-[0.99]`}
    >
      {/* Phần đỉnh thẻ: Biểu tượng & Nhãn trạng thái sắc màu */}
      <div className="chore-card-top w-full flex items-center justify-between gap-2 mb-3">
        <span className="chore-symbol inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-300">
          <StatusIcon size={22} aria-hidden="true" />
        </span>

        <span
          className={`member-status text-xs font-bold px-3 py-1.5 rounded-full border ${statusBadgeStyle}`}
        >
          {choreLabels[chore.status] || chore.status}
        </span>
      </div>

      {/* Tên việc nhà & Mô tả ngắn */}
      <div className="space-y-1.5 flex-1">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white line-clamp-2">
          {chore.title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {chore.description ||
            "Làm theo hướng dẫn của người giao việc. Nếu chưa rõ, con hãy hỏi người bảo hộ."}
        </p>
      </div>

      {/* Huy hiệu tiền thưởng đồng xu vàng */}
      <div className="chore-reward my-3.5 flex items-center justify-between flex-wrap gap-2 p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200">
          <Coins className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
          <span>{isRewarded ? "Đã nhận:" : "Thưởng dự kiến:"}</span>
        </div>
        <strong className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
          {amountLabel(chore.exactRewardAmount)}{" "}
          {hubChain.nativeCurrency.symbol}
        </strong>
      </div>

      {/* Khu vực nút bấm thân thiện ngón tay cái (Touch target >= 48px) */}
      <div className="space-y-2 pt-1 w-full">
        {isTodo && onOpenSubmit ? (
          <button
            type="button"
            onClick={() => onOpenSubmit(chore)}
            className="w-full min-h-[48px] py-2.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-sm shadow-md shadow-purple-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Camera className="w-4 h-4" aria-hidden="true" />
            <span>Nộp kết quả</span>
          </button>
        ) : null}

        <Link
          className="member-secondary w-full min-h-[48px] py-2.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm flex items-center justify-between transition-colors active:scale-98"
          href={`/dashboard/kids/chores/${chore.id}?source=contract&status=${chore.status}`}
        >
          <span>Xem việc</span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
