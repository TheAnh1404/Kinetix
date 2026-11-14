"use client";

import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Coins,
  TrendingUp,
  Trophy,
  ArrowRight,
  Camera,
  Star,
  Check,
  Zap,
} from "lucide-react";
import { useFamily, ChoreItem } from "@/context/FamilyContext";
import { useAuth } from "@/hooks/useAuth";

export interface KidsDashboardProps {
  onSwitchToAdmin?: () => void;
}

/**
 * KidsDashboard: Chế độ Con Nhỏ (Chore-to-Earn & Heo Đất Số Thông Minh)
 * Thiết kế Editorial Fintech Anti-AI Slop:
 * - Nền Slate-50 (#F8FAFC) sáng rõ, thẻ trắng (#FFFFFF) viền mảnh border-slate-200/90.
 * - Số liệu tiền tệ tabular-nums, Emerald-600 cho lãi suất và thưởng 0đ gas.
 * - Thẻ Heo Đất Số sinh lãi + Bảng nhiệm vụ học tập & việc nhà nhận thưởng.
 */
export const KidsDashboard: React.FC<KidsDashboardProps> = ({ onSwitchToAdmin }) => {
  const { currentWorkspace, dynamicVaults, chores, verifyAndRewardChore } = useFamily();
  const { user } = useAuth();

  // Tìm hũ MILESTONE (Heo đất / Nhiệm vụ)
  const milestoneVault =
    dynamicVaults.find((v) => v.ruleTemplate === "MILESTONE") ||
    dynamicVaults[1] || {
      id: "vault-kids-default",
      onchainVaultId: 2,
      name: "Hũ Lì Xì & Heo Đất Bé Na",
      totalBalance: 120.0,
      l1BufferBalance: 20.0,
      cChainPrincipal: 100.0,
    };

  // State các nhiệm vụ
  const [localChores, setLocalChores] = useState<
    {
      id: string;
      title: string;
      category: string;
      reward: number;
      status: "TODO" | "SUBMITTED" | "REWARDED";
      deadline: string;
      proofRequired: boolean;
    }[]
  >([
    {
      id: "task-1",
      title: "Đạt điểm 10 kiểm tra Toán giữa kỳ",
      category: "Học tập",
      reward: 15.0,
      status: "SUBMITTED",
      deadline: "Hôm nay",
      proofRequired: true,
    },
    {
      id: "task-2",
      title: "Dọn dẹp phòng ngủ và gấp chăn màn gọn gàng",
      category: "Việc nhà",
      reward: 5.0,
      status: "TODO",
      deadline: "Hàng ngày",
      proofRequired: false,
    },
    {
      id: "task-3",
      title: "Đọc xong 1 cuốn sách tài chính tuổi thơ",
      category: "Kỹ năng",
      reward: 10.0,
      status: "TODO",
      deadline: "Chủ nhật",
      proofRequired: true,
    },
    {
      id: "task-4",
      title: "Tưới cây ban công và phụ mẹ rửa bát",
      category: "Việc nhà",
      reward: 5.0,
      status: "REWARDED",
      deadline: "Hôm qua",
      proofRequired: false,
    },
  ]);

  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmitProof = (id: string) => {
    setLocalChores((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "SUBMITTED" } : c)),
    );
    setSubmittingId(null);
    setFeedback("Đã gửi minh chứng cho Bố Mẹ duyệt nhận thưởng!");
    setTimeout(() => setFeedback(null), 4000);
  };

  const totalEarned = localChores
    .filter((c) => c.status === "REWARDED")
    .reduce((sum, c) => sum + c.reward, 0);

  const pendingReward = localChores
    .filter((c) => c.status === "SUBMITTED")
    .reduce((sum, c) => sum + c.reward, 0);

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-200">
      {/* Top Bar Switcher (nếu có callback chuyển về admin) */}
      {onSwitchToAdmin && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-xl">👧</span>
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Góc Nhìn Con Nhỏ: Bé Na (Heo Đất & Việc Nhà)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Chore-to-Earn • 0đ Gas Family L1
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onSwitchToAdmin}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition cursor-pointer"
          >
            Quay lại Quản Trị
          </button>
        </div>
      )}

      {/* Toast Feedback */}
      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 1. THẺ HEO ĐẤT SỐ THÔNG MINH (PIGGY BANK 8% APY) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl shadow-2xs">
              🐷
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {milestoneVault.name || "Heo Đất Số Của Bé Na"}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Sinh lời 8%/năm
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Tiền lì xì và tiền thưởng việc nhà tự động sinh lời trên Fuji C-Chain
              </p>
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-slate-100 sm:pl-4">
            <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold block">
              Tổng Heo Đất
            </span>
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {milestoneVault.totalBalance?.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}{" "}
              <span className="text-sm font-sans text-slate-500 font-normal">USDC</span>
            </span>
          </div>
        </div>

        {/* 3 Metric Pills */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
              Đã Nhận Thưởng
            </span>
            <span className="text-sm font-bold font-mono text-emerald-600 tabular-nums">
              +{totalEarned.toFixed(2)} USDC
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
              Chờ Bố Mẹ Duyệt
            </span>
            <span className="text-sm font-bold font-mono text-amber-600 tabular-nums">
              {pendingReward.toFixed(2)} USDC
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
              Lãi Dự Kiến / Năm
            </span>
            <span className="text-sm font-bold font-mono text-slate-800 tabular-nums">
              ~{(Number(milestoneVault.totalBalance || 0) * 0.08).toFixed(2)} USDC
            </span>
          </div>
        </div>
      </div>

      {/* 2. BẢNG NHIỆM VỤ HỌC TẬP & VIỆC NHÀ (CHORE-TO-EARN) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">
              Nhiệm Vụ Học Tập & Việc Nhà Nhận Thưởng (0đ Gas)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium font-mono">
            {localChores.filter((c) => c.status === "TODO").length} việc cần làm
          </span>
        </div>

        <div className="space-y-2.5">
          {localChores.map((chore) => {
            const isTodo = chore.status === "TODO";
            const isSubmitted = chore.status === "SUBMITTED";
            const isRewarded = chore.status === "REWARDED";

            return (
              <div
                key={chore.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                  isRewarded
                    ? "bg-slate-50/60 border-slate-200/70 opacity-80"
                    : isSubmitted
                      ? "bg-amber-50/40 border-amber-200"
                      : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isRewarded
                        ? "bg-emerald-100 text-emerald-700"
                        : isSubmitted
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {isRewarded ? (
                      <Check className="w-4 h-4" />
                    ) : isSubmitted ? (
                      <Clock className="w-4 h-4 animate-spin-slow" />
                    ) : (
                      <Star className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {chore.title}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                        {chore.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-mono">
                      <span>Hạn: {chore.deadline}</span>
                      <span>•</span>
                      <span className="text-emerald-600 font-bold">
                        +{chore.reward.toFixed(2)} USDC
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {isRewarded ? (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1 font-mono">
                      <Check className="w-3.5 h-3.5" />
                      Đã cộng heo đất
                    </span>
                  ) : isSubmitted ? (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      Chờ Bố Mẹ duyệt
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSubmitProof(chore.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#E84142] hover:bg-red-700 text-white text-xs font-bold shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Nộp Minh Chứng</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default KidsDashboard;
