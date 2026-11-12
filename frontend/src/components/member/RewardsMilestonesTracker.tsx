"use client";

import React, { useState } from "react";
import {
  Award,
  CheckCircle2,
  Clock3,
  Coins,
  Flame,
  Gift,
  LucideIcon,
  PartyPopper,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import { ChoreItem } from "@/context/FamilyContext";
import { hubChain } from "@/contracts/config";
import { amountLabel } from "@/lib/member";
import { formatEther } from "viem";
import { ConfettiEffect } from "./ConfettiEffect";

function toEther(val: string): string {
  if (!val || val === "0") return "0";
  try {
    if (val.includes(".") || BigInt(val) < 1000000000000n) return val;
    return formatEther(BigInt(val));
  } catch {
    return val;
  }
}

// Danh mục các huy hiệu thành tích bé có thể mở khóa
interface MilestoneBadge {
  id: string;
  name: string;
  requiredCount: number;
  description: string;
  Icon: LucideIcon;
  color: string;
  bgLight: string;
}

const BADGES: MilestoneBadge[] = [
  {
    id: "badge-1",
    name: "Tập sự tự giác",
    requiredCount: 1,
    description: "Hoàn thành việc nhà đầu tiên trong gia đình",
    Icon: Star,
    color: "#F59E0B",
    bgLight: "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
  },
  {
    id: "badge-2",
    name: "Chiến binh chăm chỉ",
    requiredCount: 3,
    description: "Hoàn thành xuất sắc 3 việc nhà được ba mẹ duyệt",
    Icon: Flame,
    color: "#EC4899",
    bgLight: "bg-pink-100 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400",
  },
  {
    id: "badge-3",
    name: "Siêu nhân ngăn nắp",
    requiredCount: 5,
    description: "Tích lũy 5 việc nhà hoàn thành, phòng ốc gọn gàng",
    Icon: Sparkles,
    color: "#8B5CF6",
    bgLight: "bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400",
  },
  {
    id: "badge-4",
    name: "Bậc thầy tự lập",
    requiredCount: 10,
    description: "Đạt cột mốc 10 việc nhà, trở thành niềm tự hào của cả nhà",
    Icon: Trophy,
    color: "#10B981",
    bgLight: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
  },
];

interface RewardsMilestonesTrackerProps {
  completedCount: number;
  totalRewardedWei: string;
  totalPendingWei: string;
  completedChores: ChoreItem[];
}

/**
 * Trình theo dõi cột mốc & huy hiệu danh dự (Rewards Milestones Tracker).
 * Cung cấp dòng thời gian huy hiệu thị giác, tổng thưởng AVAX sinh động,
 * và pháo hoa rực rỡ khi mở khóa danh hiệu hoặc chạm xem chi tiết.
 */
export function RewardsMilestonesTracker({
  completedCount,
  totalRewardedWei,
  totalPendingWei,
  completedChores,
}: RewardsMilestonesTrackerProps) {
  const [celebrating, setCelebrating] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<MilestoneBadge | null>(null);

  // Số lượng huy hiệu đã mở khoá
  const unlockedBadges = BADGES.filter(
    (b) => completedCount >= b.requiredCount,
  );

  const handleBadgeClick = (badge: MilestoneBadge) => {
    setSelectedBadge(badge);
    if (completedCount >= badge.requiredCount) {
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pháo hoa chúc mừng khi chạm vào huy hiệu đã đạt */}
      {celebrating && <ConfettiEffect active={celebrating} count={40} />}

      {/* Thẻ vinh danh tổng thưởng AVAX - Thiết kế nổi bật */}
      <section
        className="rounded-3xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 p-6 text-white shadow-xl shadow-purple-500/20 relative overflow-hidden"
        aria-label="Tổng thưởng đã tích lũy"
      >
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Thành tích của con</span>
          </div>

          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              {amountLabel(toEther(totalRewardedWei))}
            </h2>
            <span className="text-xl font-bold opacity-90">
              {hubChain.nativeCurrency.symbol}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-purple-100 max-w-md">
            Tổng thưởng đã chi trả, không phải số dư ví hiện tại. Tiền được lưu
            giữ an toàn trong hũ cho con.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-purple-100">
            <span className="inline-flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-full">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" aria-hidden="true" />
              Đã xong: {completedCount} việc nhà
            </span>
            <span className="inline-flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-full">
              <Clock3 className="w-4 h-4 text-amber-300" aria-hidden="true" />
              Đang chờ duyệt: {amountLabel(toEther(totalPendingWei))}{" "}
              {hubChain.nativeCurrency.symbol}
            </span>
          </div>
        </div>
      </section>

      {/* Dòng thời gian huy hiệu thành tích (Visual Badge Timeline) */}
      <section
        className="rounded-3xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/40 p-5 sm:p-6 shadow-sm space-y-4"
        aria-label="Cột mốc huy hiệu danh dự"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
              Huy hiệu danh dự
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Đã mở khóa {unlockedBadges.length}/{BADGES.length} danh hiệu
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCelebrating(true);
              setTimeout(() => setCelebrating(false), 3000);
            }}
            className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 rounded-full min-h-[36px] flex items-center gap-1 active:scale-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
            <span>Ăn mừng</span>
            <PartyPopper className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
          </button>
        </div>

        {/* Thanh tiến độ mở huy hiệu */}
        <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
            style={{
              width: `${(unlockedBadges.length / BADGES.length) * 100}%`,
            }}
          />
        </div>

        {/* Danh sách 4 huy hiệu với dạng thẻ di động tương tác */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {BADGES.map((badge) => {
            const isUnlocked = completedCount >= badge.requiredCount;
            const Icon = badge.Icon;

            return (
              <button
                key={badge.id}
                type="button"
                onClick={() => handleBadgeClick(badge)}
                className={`flex flex-col items-center text-center p-3.5 rounded-2xl border-2 transition-all min-h-[140px] justify-between relative group active:scale-95 ${
                  isUnlocked
                    ? "bg-purple-50/50 dark:bg-purple-950/20 border-purple-300 dark:border-purple-700/80 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50 opacity-60"
                }`}
                aria-label={`Huy hiệu ${badge.name}: ${isUnlocked ? "Đã đạt" : `Cần hoàn thành ${badge.requiredCount} việc`}`}
              >
                {/* Biểu tượng huy hiệu */}
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${badge.bgLight}`}
                >
                  <Icon className="w-6 h-6" aria-hidden="true" />
                </div>

                <div className="mt-2 space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                    {badge.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {badge.requiredCount} việc nhà
                  </p>
                </div>

                {/* Nhãn trạng thái */}
                <span
                  className={`mt-2 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                    isUnlocked
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {isUnlocked ? (
                    <>
                      <span>Đã đạt</span>
                      <Star className="w-3 h-3 text-amber-500 fill-amber-400" aria-hidden="true" />
                    </>
                  ) : (
                    "Chưa mở"
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Khung giải thích chi tiết huy hiệu khi chọn */}
      {selectedBadge && (
        <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${selectedBadge.bgLight}`}>
            <selectedBadge.Icon className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-purple-950 dark:text-purple-200">
              {selectedBadge.name}
            </h4>
            <p className="text-xs text-purple-800 dark:text-purple-300 mt-0.5">
              {selectedBadge.description} (
              {completedCount >= selectedBadge.requiredCount
                ? "Con đã hoàn thành xuất sắc!"
                : `Còn thiếu ${selectedBadge.requiredCount - completedCount} việc nữa`}
              )
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
