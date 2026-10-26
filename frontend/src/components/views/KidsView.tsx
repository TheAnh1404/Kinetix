"use client";

import React, { useState } from "react";
import { useFamily } from "@/context/FamilyContext";

export const KidsView: React.FC = () => {
  const { chores, kidsBalance, kidsXp, submitChoreProof, verifyAndRewardChore } = useFamily();
  const [toast, setToast] = useState<string | null>(null);

  // Bé nộp việc nhà
  const handleSubmitTask = async (taskId: number | string) => {
    const success = await submitChoreProof(
      taskId,
      "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400"
    );
    if (success) {
      setToast(
        "🎒 Bé Na đã nộp ảnh báo cáo việc nhà lên Smart Contract! Bố Mẹ sẽ nhận được thông báo để kiểm tra và duyệt thưởng."
      );
    }
  };

  // Bố mẹ duyệt thưởng
  const handleVerifyReward = async (taskId: number | string, rewardAmount: number) => {
    const success = await verifyAndRewardChore(taskId);
    if (success) {
      setToast(
        `🎉 CHÚC MỪNG BÉ NA! Hợp đồng FamilyHub đã giải ngân ${rewardAmount} USDC thẳng vào heo đất với 0đ phí gas trên Family L1!`
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-gutter py-space-md flex flex-col gap-space-lg">
      {/* Toast Feedback */}
      {toast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-start justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[28px] text-emerald-600">
              celebration
            </span>
            <span className="text-body-md font-semibold">{toast}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-gray-500 hover:text-black">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Top Greeting & Child Profile Card */}
      <div className="w-full bg-surface-container-lowest rounded-2xl shadow-sm p-space-md md:p-space-lg flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-lg relative overflow-hidden border border-surface-container-high/60">
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-surface-container-high/60 pointer-events-none blur-2xl"></div>
        <div className="flex items-center gap-space-md z-10">
          <div className="relative">
            <img
              className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover shadow-sm bg-surface-container border-2 border-surface-container-highest"
              alt="Bé Na"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAc1UhNj0E3eKWwrEAv9WJ4KTtp_4pnR4-fyhwEHSKncOxXMGgdr5EdEkF7AMpuaguOYSWTwC-3Ovp1jhOZtflnABlKorh-7E9pPfvKLow6TvFQHGxmf0EgQh_J7eX2WyhgY_obtzgCtT892o3CCd1-TKpF3WABb42fGzxm4wVTK6S7fWG0bKJKRZGbEsWybndKRK3uK6Aix2ehMS1hOr8zRyDG3ZRA0ODbqcIHWiDv1p2ayRMtyQ"
            />
            <div className="absolute -bottom-2 -right-2 bg-secondary-container text-on-secondary-container rounded-full px-2 py-0.5 font-label-caps text-label-caps shadow flex items-center gap-1 font-bold">
              <span className="material-symbols-outlined text-[13px]">
                kid_star
              </span>
              <span>TOP 1</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-headline-md text-headline-md text-on-surface truncate">
                Bé Na (Lớp 6A - Trường Chu Văn An) 🌟
              </h1>
              <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface font-label-caps text-label-caps font-bold">
                L1 Family Explorer
              </span>
            </div>
            <div className="flex items-center gap-2 text-on-surface-variant font-label-lg text-label-lg">
              <span className="material-symbols-outlined text-[18px] text-secondary-container">
                military_tech
              </span>
              <span>Cấp độ 3: Bậc Thầy Tiết Kiệm Thông Thái</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-label-caps text-label-caps text-on-surface-variant font-bold">
                XP Level 3:
              </span>
              <div className="w-44 md:w-56 h-3 bg-surface-container rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-secondary-container rounded-full transition-all duration-700"
                  style={{ width: `${(kidsXp / 1000) * 100}%` }}
                ></div>
              </div>
              <span className="font-label-caps text-label-caps text-on-surface font-bold">
                {kidsXp} / 1000 XP
              </span>
            </div>
          </div>
        </div>

        {/* Streak Card */}
        <div className="flex items-center gap-3 z-10 self-stretch sm:self-auto bg-surface-container-low p-space-md rounded-xl border border-surface-container">
          <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-[28px]">
              local_fire_department
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase font-bold">
              Kỷ Lục Chăm Chỉ
            </span>
            <span className="font-title-md text-title-md text-on-surface font-bold">
              Chuỗi 14 ngày liên tục 🔥
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Làm việc nhà &amp; hoàn thành bài tập
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Piggy Bank & Savings Goal (Left) vs Chore board (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* LEFT COLUMN: Heo Đất Số 4.0 */}
        <div className="lg:col-span-5 flex flex-col gap-space-lg">
          <div className="w-full bg-surface-container-lowest rounded-2xl shadow-sm p-space-md md:p-space-lg flex flex-col gap-space-md relative overflow-hidden border border-surface-container-high/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-tertiary-fixed-dim"></span>
                <span className="font-label-caps text-label-caps uppercase text-on-surface-variant font-bold">
                  Kinetix Piggy Bank 4.0
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface font-label-caps text-label-caps font-bold">
                APY +8.0% DeFi
              </span>
            </div>

            {/* Central Piggy Bank Graphic */}
            <div className="flex flex-col items-center text-center p-space-md bg-surface-container-low rounded-2xl relative border border-surface-container">
              <div className="relative w-32 h-32 flex items-center justify-center mb-2">
                <svg
                  className="w-28 h-28 text-on-surface drop-shadow-md animate-bounce"
                  style={{ animationDuration: "3s" }}
                  fill="none"
                  viewBox="0 0 200 200"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="100" cy="108" fill="#F8FAFC" r="66"></circle>
                  <path
                    d="M155 105C155 138.137 127.882 165 94.4444 165C61.0068 165 33.8889 138.137 33.8889 105C33.8889 71.8629 61.0068 45 94.4444 45C127.882 45 155 71.8629 155 105Z"
                    fill="#DCE9FF"
                  ></path>
                  <path
                    d="M60 48C56 34 70 32 78 40C83 45 84 52 82 58C72 60 62 55 60 48Z"
                    fill="#D93639"
                  ></path>
                  <path
                    d="M125 48C129 34 115 32 107 40C102 45 101 52 103 58C113 60 123 55 125 48Z"
                    fill="#D93639"
                  ></path>
                  <ellipse
                    cx="65"
                    cy="106"
                    fill="#CBDBF5"
                    rx="20"
                    ry="14"
                  ></ellipse>
                  <circle cx="58" cy="106" fill="#213145" r="3.5"></circle>
                  <circle cx="72" cy="106" fill="#213145" r="3.5"></circle>
                  <circle cx="100" cy="90" fill="#0B1C30" r="5"></circle>
                  <circle cx="98" cy="88" fill="#FFFFFF" r="1.5"></circle>
                  <rect
                    fill="#0B1C30"
                    height="4"
                    rx="2"
                    width="22"
                    x="90"
                    y="42"
                  ></rect>
                  <circle cx="101" cy="34" fill="#4EDEA3" r="12"></circle>
                  <path
                    d="M101 26V42M95 30H106"
                    stroke="#002113"
                    strokeLinecap="round"
                    strokeWidth="2.5"
                  ></path>
                </svg>
              </div>

              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider font-bold">
                Tổng số dư trong Heo Đất
              </span>
              <div className="flex items-baseline gap-1 my-1">
                <span className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
                  {kidsBalance.toFixed(2)}
                </span>
                <span className="font-headline-sm text-headline-sm text-secondary-container font-bold">
                  USDC
                </span>
              </div>
              <div className="font-body-sm text-body-sm text-on-surface-variant">
                Tương đương{" "}
                <strong className="text-on-surface font-semibold">
                  ~{(kidsBalance * 25000).toLocaleString("vi-VN")} VNĐ
                </strong>
              </div>
            </div>

            {/* Micro Breakdown */}
            <div className="flex flex-col gap-2 bg-surface p-space-sm rounded-xl border border-surface-container">
              <div className="flex items-center justify-between text-body-sm font-body-sm">
                <span className="flex items-center gap-1.5 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px] text-secondary">
                    redeem
                  </span>
                  Tiền lì xì Tết:
                </span>
                <span className="font-semibold text-on-surface">100.00 USDC</span>
              </div>
              <div className="flex items-center justify-between text-body-sm font-body-sm">
                <span className="flex items-center gap-1.5 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px] text-tertiary-fixed-dim">
                    mop
                  </span>
                  Thưởng làm việc nhà:
                </span>
                <span className="font-semibold text-on-surface">
                  {(kidsBalance - 102.5 > 0 ? kidsBalance - 102.5 : 0).toFixed(2)} USDC
                </span>
              </div>
              <div className="flex items-center justify-between text-body-sm font-body-sm">
                <span className="flex items-center gap-1.5 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px] text-tertiary-fixed-dim">
                    trending_up
                  </span>
                  Lãi DeFi đẻ ra thêm:
                </span>
                <span className="font-bold text-on-tertiary-container bg-surface-container-high px-2 py-0.5 rounded-full">
                  +2.50 USDC 📈
                </span>
              </div>
            </div>

            {/* Educational Note */}
            <div className="p-space-sm rounded-xl bg-surface-container flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary text-[22px] flex-shrink-0 mt-0.5">
                tips_and_updates
              </span>
              <p className="font-body-sm text-body-sm text-on-surface leading-snug">
                Tiền trong heo đất của con đang tự sinh lời mỗi ngày nhờ{" "}
                <strong>Avalanche DeFi</strong> với lãi suất <strong>8%/năm</strong>{" "}
                mà hoàn toàn không mất phí gas!
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Chore-to-Earn Tasks Board */}
        <div className="lg:col-span-7 flex flex-col gap-space-md">
          <div className="w-full bg-surface-container-lowest rounded-2xl shadow-sm p-space-md md:p-space-lg flex flex-col gap-space-md border border-surface-container-high/60">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">
                  Nhiệm Vụ Việc Nhà (Chore-to-Earn) 🧹
                </h2>
                <p className="text-body-sm text-on-surface-variant">
                  Bé hoàn thành việc nhà $\to$ Bố mẹ xác nhận $\to$ Thưởng USDC
                  chuyển thẳng về ví với 0đ phí gas!
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-surface-container text-xs font-bold text-on-surface">
                {chores.filter((t) => t.status === "REWARDED").length}/{chores.length}{" "}
                Hoàn thành
              </span>
            </div>

            {/* Tasks List */}
            <div className="flex flex-col gap-3">
              {chores.map((task) => (
                <div
                  key={task.id}
                  className="p-4 rounded-xl border border-surface-container-high bg-surface-container-low/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:bg-surface-container-low"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`material-symbols-outlined text-[24px] mt-0.5 ${
                        task.status === "REWARDED"
                          ? "text-emerald-600"
                          : task.status === "SUBMITTED"
                          ? "text-amber-600"
                          : "text-gray-400"
                      }`}
                    >
                      {task.status === "REWARDED"
                        ? "check_circle"
                        : task.status === "SUBMITTED"
                        ? "pending_actions"
                        : "radio_button_unchecked"}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-title-md text-title-md font-semibold text-on-surface">
                        {task.title}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold text-xs px-2 py-0.5 rounded bg-surface-container-high text-on-surface">
                          +{task.rewardAmount.toFixed(1)} USDC
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            task.status === "REWARDED"
                              ? "bg-emerald-100 text-emerald-800"
                              : task.status === "SUBMITTED"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {task.status === "REWARDED"
                            ? "Đã nhận thưởng"
                            : task.status === "SUBMITTED"
                            ? "Chờ Bố Mẹ duyệt"
                            : "Chưa nộp"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions depending on status */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {task.status === "TODO" && (
                      <button
                        onClick={() => handleSubmitTask(task.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-secondary-container hover:bg-secondary text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                      >
                        Nộp Ảnh Báo Cáo
                      </button>
                    )}
                    {task.status === "SUBMITTED" && (
                      <button
                        onClick={() => handleVerifyReward(task.id, task.rewardAmount)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          verified
                        </span>
                        <span>Bố Mẹ Duyệt Thưởng</span>
                      </button>
                    )}
                    {task.status === "REWARDED" && (
                      <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">
                          check
                        </span>
                        Đã cộng vào Heo Đất (0 Gas)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Savings Goal Tracker */}
            <div className="mt-2 p-4 rounded-xl bg-surface-container-high/40 border border-surface-container-high flex flex-col gap-2">
              <div className="flex justify-between items-center text-body-sm font-semibold">
                <span>🎯 Mục tiêu: Xe đạp địa hình mới</span>
                <span>80.00 / 150.00 USDC (53%)</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-surface-container overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: "53%" }}
                ></div>
              </div>
              <span className="text-xs text-on-surface-variant">
                Chỉ còn thiếu 70 USDC nữa thôi! Hãy chăm chỉ làm việc nhà và đạt
                điểm cao nhé!
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
