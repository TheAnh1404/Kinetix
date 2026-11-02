'use client';

import React, { useState } from 'react';
import { useFamily } from '@/context/FamilyContext';

export const KidsView: React.FC = () => {
  const { chores, submitChoreProof, currentMember } = useFamily();
  const [toast, setToast] = useState<string | null>(null);
  const [submittingTaskId, setSubmittingTaskId] = useState<string | number | null>(null);

  const childName = currentMember?.name || 'Bé Na';

  // Danh sách việc nhà mẫu nếu danh sách on-chain trống
  const activeChores =
    chores.length > 0
      ? chores
      : [
          {
            id: 'chore-1',
            title: '🧹 Quét nhà & lau bàn học sạch sẽ',
            rewardAmount: 0.01,
            status: 'TODO',
          },
          {
            id: 'chore-2',
            title: '📚 Đọc 30 phút sách tiếng Anh',
            rewardAmount: 0.02,
            status: 'SUBMITTED',
          },
          {
            id: 'chore-3',
            title: '⭐ Đạt điểm 10 kiểm tra Toán',
            rewardAmount: 0.05,
            status: 'REWARDED',
          },
        ];

  // Tính tổng heo đất từ các nhiệm vụ đã nhận thưởng
  const totalEarned = activeChores
    .filter((c: any) => c.status === 'REWARDED')
    .reduce((sum: number, c: any) => sum + (Number(c.rewardAmount) || 0), 0.08);

  const handleSubmit = async (taskId: string | number) => {
    setSubmittingTaskId(taskId);
    try {
      const ok = await submitChoreProof(
        taskId,
        'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400'
      );
      if (ok) {
        setToast(`🌟 Tuyệt vời! Đã nộp ảnh báo cáo việc nhà cho Bố Ba duyệt thưởng!`);
      }
    } finally {
      setSubmittingTaskId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full text-slate-900">
      
      {/* Toast feedback */}
      {toast && (
        <div className="p-3.5 rounded-2xl bg-emerald-500 text-white shadow-lg flex items-start justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[24px]">celebration</span>
            <p className="text-xs font-bold leading-relaxed">{toast}</p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-white/80 hover:text-white cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* THẺ HEO ĐẤT TIẾT KIỆM KHỔNG LỒ */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white p-5 rounded-3xl shadow-lg flex items-center justify-between relative overflow-hidden">
        <div className="flex flex-col gap-1 z-10">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-100">
            Heo Đất Tiết Kiệm Của {childName}
          </span>
          <div className="text-3xl font-black font-mono tracking-tight my-0.5">
            {totalEarned.toFixed(2)}{' '}
            <span className="text-base font-sans font-bold text-amber-100">AVAX</span>
          </div>
          <p className="text-[11px] text-amber-100 font-medium">
            Tương đương ~{(totalEarned * 750000).toLocaleString('vi-VN')} VNĐ tiết kiệm
          </p>
        </div>

        <div className="text-5xl animate-bounce shrink-0 z-10 select-none">
          🐷
        </div>

        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
      </div>

      {/* DANH SÁCH VIỆC NHÀ HÔM NAY (CHORE-TO-EARN) */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs">
              📝
            </span>
            <h3 className="text-sm font-bold text-slate-900">Việc Nhà Kiếm Lì Xì Hôm Nay</h3>
          </div>
          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full font-mono">
            {activeChores.filter((c: any) => c.status !== 'REWARDED').length} việc cần làm
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {activeChores.map((chore: any) => {
            const isDone = chore.status === 'REWARDED';
            const isWaiting = chore.status === 'SUBMITTED';

            return (
              <div
                key={chore.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isDone
                    ? 'bg-slate-50 border-slate-200 opacity-60'
                    : isWaiting
                    ? 'bg-amber-50/60 border-amber-200'
                    : 'bg-white border-slate-200 hover:border-emerald-400 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold ${
                      isDone
                        ? 'bg-emerald-100 text-emerald-700'
                        : isWaiting
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {isDone ? '✓' : isWaiting ? '⏳' : '⭐'}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span
                      className={`text-xs font-bold truncate ${
                        isDone ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {chore.title}
                    </span>
                    <span className="text-[11px] font-bold font-mono text-emerald-600">
                      +{chore.rewardAmount} AVAX (~{(Number(chore.rewardAmount) * 750000).toLocaleString('vi-VN')}đ)
                    </span>
                  </div>
                </div>

                <div>
                  {isDone ? (
                    <span className="text-[10px] font-bold font-mono px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800">
                      Đã Nhận Thưởng
                    </span>
                  ) : isWaiting ? (
                    <span className="text-[10px] font-bold font-mono px-2 py-1 rounded-lg bg-amber-100 text-amber-800">
                      Chờ Bố Duyệt
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSubmit(chore.id)}
                      disabled={submittingTaskId === chore.id}
                      type="button"
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
                    >
                      {submittingTaskId === chore.id ? 'Đang nộp...' : 'Báo Đã Xong'}
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
