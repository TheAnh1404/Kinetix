"use client";

import React, { useState } from "react";
import { useFamily } from "@/context/FamilyContext";
import { useLanguage } from "@/context/LanguageContext";

interface CreateChoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateChoreModal: React.FC<CreateChoreModalProps> = ({ isOpen, onClose }) => {
  const { createChore, members } = useFamily();
  const { language } = useLanguage();

  const childMembers = members.filter((m) => m.role === "CHILD");
  const [title, setTitle] = useState("");
  const [rewardAmount, setRewardAmount] = useState<string>("0.02");
  const [childName, setChildName] = useState(childMembers[0]?.name || "Bé");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const quickSuggestions = [
    { vi: "Rửa bát & lau bàn ăn sạch sẽ", en: "Wash dishes & wipe dining table", reward: "0.01" },
    { vi: "Đạt điểm 10 bài kiểm tra Toán/Văn", en: "Score grade 10 in Math/Literature", reward: "0.05" },
    { vi: "Tưới cây ban công & gấp quần áo", en: "Water plants & fold laundry", reward: "0.02" },
    { vi: "Đọc xong 1 cuốn sách khoa học", en: "Finish reading a science book", reward: "0.03" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    const amt = parseFloat(rewardAmount) || 0.02;
    const targetChild = childMembers.find((c) => c.name === childName) || childMembers[0];
    const ok = await createChore({
      title: title.trim(),
      rewardAmount: amt,
      childName: targetChild?.name || childName,
      childId: targetChild?.id,
    });
    setIsSubmitting(false);

    if (ok) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setTitle("");
        setRewardAmount("0.02");
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest max-w-lg w-full rounded-2xl p-6 shadow-2xl flex flex-col gap-4 border border-outline-variant/30">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-container-low">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[24px]">assignment_add</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-lg font-bold text-on-surface">
                {language === "vi" ? "Giao Việc Nhà Cho Con (Chore-to-Earn)" : "Assign Chore-to-Earn Task"}
              </h3>
              <p className="text-xs text-on-surface-variant font-medium">
                {language === "vi" ? "Khuyến khích con học tài chính & lao động nhận thưởng" : "Incentivize work ethics and financial literacy with smart contract rewards"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer"
          >
            ✕
          </button>
        </div>

        {success ? (
          <div className="p-6 bg-emerald-50 rounded-xl flex flex-col items-center justify-center gap-2 text-center border border-emerald-300">
            <span className="material-symbols-outlined text-[44px] text-emerald-600">check_circle</span>
            <h4 className="font-headline-sm text-base text-emerald-800 font-bold">
              {language === "vi" ? "Đã Giao Việc Nhà Thành Công!" : "Task Successfully Assigned!"}
            </h4>
            <p className="text-xs text-emerald-700 font-medium">
              {language === "vi"
                ? `Bé "${childName}" đã nhận được thông báo nhiệm vụ "${title}" kèm phần thưởng ${rewardAmount} AVAX.`
                : `Child "${childName}" received task "${title}" with ${rewardAmount} AVAX reward.`}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Quick Suggestions */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface">
                {language === "vi" ? "Gợi Ý Nhanh" : "Quick Suggestions"}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quickSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTitle(language === "vi" ? item.vi : item.en);
                      setRewardAmount(item.reward);
                    }}
                    className="p-2 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-left text-xs transition-colors flex items-center justify-between gap-1 cursor-pointer"
                  >
                    <span className="truncate text-on-surface font-medium">
                      {language === "vi" ? item.vi : item.en}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-secondary-container/20 text-secondary text-[10px] font-bold shrink-0">
                      +{item.reward} AVAX
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Task Title */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">
                {language === "vi" ? "Tên Nhiệm Vụ *" : "Task Title *"}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={language === "vi" ? "VD: Lau dọn phòng ngủ ngăn nắp" : "e.g. Clean bedroom neatly"}
                className="px-3.5 py-2.5 bg-surface-container-low rounded-xl border border-outline-variant/30 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary-container"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Assign to child */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface">
                  {language === "vi" ? "Giao Cho Bé" : "Assign To"}
                </label>
                <select
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  className="px-3.5 py-2.5 bg-surface-container-low rounded-xl border border-outline-variant/30 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary-container"
                >
                  {childMembers.length > 0 ? (
                    childMembers.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))
                  ) : (
                    <option value="Bé Na">Bé Na (Lớp 6A)</option>
                  )}
                </select>
              </div>

              {/* Reward Amount */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface">
                  {language === "vi" ? "Mức Thưởng (AVAX) *" : "Reward (AVAX) *"}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0.001"
                    max="10"
                    step="0.005"
                    value={rewardAmount}
                    onChange={(e) => setRewardAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-14 bg-surface-container-low rounded-xl border border-outline-variant/30 text-sm text-on-surface font-mono font-bold focus:outline-none focus:ring-2 focus:ring-secondary-container"
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant font-mono">
                    AVAX
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
              >
                {language === "vi" ? "Hủy" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-secondary-container hover:bg-secondary text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    <span>{language === "vi" ? "Đang giao..." : "Assigning..."}</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    <span>{language === "vi" ? "Xác Nhận Giao Việc" : "Assign Chore"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
