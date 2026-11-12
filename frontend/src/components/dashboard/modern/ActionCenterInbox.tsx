"use client";

import React, { useState } from "react";
import {
  Inbox,
  PenTool,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Coins,
  History,
} from "lucide-react";
import { useFamily } from "@/context/FamilyContext";
import { useLanguage } from "@/context/LanguageContext";
import { SafeAvatar } from "@/components/ui/SafeAvatar";

interface ActionCenterInboxProps {
  onApproveWithdrawal: (requestId: string | number) => Promise<void>;
  onVerifyChore: (choreId: string | number, rewardAmount: number) => Promise<boolean>;
  isSigning?: boolean;
}

export const ActionCenterInbox: React.FC<ActionCenterInboxProps> = ({
  onApproveWithdrawal,
  onVerifyChore,
  isSigning = false,
}) => {
  const { withdrawalRequests, chores, depositHistory } = useFamily();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<"multisig" | "chores" | "activity">("multisig");
  const [verifyingId, setVerifyingId] = useState<string | number | null>(null);

  // Chỉ lấy dữ liệu thực tế đang chờ duyệt
  const pendingWithdrawals = (withdrawalRequests || []).filter(
    (r) => r.status === "PENDING",
  );

  const pendingChores = (chores || []).filter(
    (c) => c.status === "SUBMITTED",
  );

  const handleChoreClick = async (id: string | number, reward: number) => {
    setVerifyingId(id);
    try {
      await onVerifyChore(id, reward);
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
      {/* Tiêu đề & Bộ chọn Tab */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
            <Inbox className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {language === "vi"
                ? "Hộp Thư Phê Duyệt Của Chủ Hộ (Action Center)"
                : "Admin Action Center"}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {language === "vi"
                ? "Phê duyệt các yêu cầu rút tiền lớn (Multisig) và xác nhận việc nhà của con"
                : "Approve multisig withdrawals and verify chores"}
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("multisig")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "multisig"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <PenTool className="w-3.5 h-3.5 text-red-600" />
            <span>Ký Duyệt Multisig</span>
            {pendingWithdrawals.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                {pendingWithdrawals.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("chores")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "chores"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Duyệt Việc Nhà</span>
            {pendingChores.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">
                {pendingChores.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("activity")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "activity"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Nhật Ký</span>
          </button>
        </div>
      </div>

      {/* --- TAB 1: KÝ DUYỆT MULTISIG --- */}
      {activeTab === "multisig" && (
        <div className="space-y-3">
          {pendingWithdrawals.length === 0 ? (
            <div className="py-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-sm text-slate-800">
                Không có yêu cầu rút tiền lớn nào đang chờ duyệt
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Các khoản chi nhỏ trong hạn mức sẽ giải ngân tức thì 0 gas từ đệm L1.
              </p>
            </div>
          ) : (
            pendingWithdrawals.map((req) => (
              <div
                key={req.id}
                className="bg-slate-50 hover:bg-slate-50/80 border border-slate-200 rounded-xl p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900">
                      {req.requesterName}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      ({req.requesterAddress?.slice(0, 6)}...{req.requesterAddress?.slice(-4)})
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 text-[10px] font-bold border border-red-200">
                      {req.vault || req.vaultName || "Hũ chi tiêu"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium">
                    Lý do: <span className="font-normal text-slate-600">{req.reason}</span>
                  </p>

                  <div className="flex items-center gap-3 text-xs text-slate-500 pt-0.5">
                    <span>Thời gian: {req.createdAt}</span>
                    <span>•</span>
                    <span className="font-bold text-slate-700">
                      Đã ký: {req.approvalsCount}/{req.requiredApprovals} Guardians
                    </span>
                  </div>
                </div>

                {/* Cột Phải: Số tiền & Nút ký duyệt */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-xl font-black font-mono text-slate-900 block">
                      {req.amount} AVAX
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Yêu cầu giải ngân
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isSigning}
                    onClick={() => onApproveWithdrawal(req.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-60 active:scale-95"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>{isSigning ? "Đang Ký..." : "Ký Duyệt Ngay"}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* --- TAB 2: DUYỆT VIỆC NHÀ CỦA CON --- */}
      {activeTab === "chores" && (
        <div className="space-y-3">
          {pendingChores.length === 0 ? (
            <div className="py-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="font-bold text-sm text-slate-800">
                Chưa có nhiệm vụ nào nộp chờ duyệt
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Khi con hoàn thành việc nhà được giao, bằng chứng sẽ xuất hiện tại đây để ba mẹ xác nhận.
              </p>
            </div>
          ) : (
            pendingChores.map((chore) => (
              <div
                key={chore.id}
                className="bg-purple-50/40 hover:bg-purple-50/60 border border-purple-100 rounded-xl p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SafeAvatar
                      avatar={chore.childAvatar}
                      name={chore.childName}
                      role="CHILD"
                      size="sm"
                    />
                    <span className="font-bold text-sm text-slate-900">
                      {chore.childName || "Con"}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
                      Đã nộp bài
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900">{chore.title}</h3>

                  {chore.description && (
                    <p className="text-xs text-slate-600 italic bg-white/80 p-2 rounded-lg border border-purple-100/80">
                      &quot;{chore.description}&quot;
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-lg font-black font-mono text-purple-700 block">
                      +{chore.rewardAmount} AVAX
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Phần thưởng heo đất
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={verifyingId === chore.id}
                    onClick={() => handleChoreClick(chore.id, chore.rewardAmount)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-60 active:scale-95"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {verifyingId === chore.id ? "Đang Duyệt..." : "Duyệt & Thưởng"}
                    </span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* --- TAB 3: NHẬT KÝ THỜI GIAN THỰC TẾ --- */}
      {activeTab === "activity" && (
        <div className="space-y-2">
          {depositHistory && depositHistory.length > 0 ? (
            depositHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      Nạp tiền vào {item.vaultName || `Hũ #${item.vaultId}`}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {item.timestamp}
                    </span>
                  </div>
                  <p className="text-slate-600">
                    Người gửi: {item.senderName || item.senderAddress}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-emerald-700 font-bold font-mono text-sm block">
                    +{item.amount} AVAX
                  </span>
                  {item.txHash && (
                    <a
                      href={`https://testnet.snowtrace.io/tx/${item.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-slate-400 hover:text-red-600 flex items-center gap-1 justify-end"
                    >
                      <span>Snowtrace</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <History className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="font-bold text-sm text-slate-800">
                Chưa có giao dịch nào được ghi nhận
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Các giao dịch nạp quỹ, rút tiền và trả thưởng việc nhà sẽ được ghi nhật ký tại đây.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
