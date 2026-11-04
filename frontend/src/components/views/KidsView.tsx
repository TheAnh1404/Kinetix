'use client';

import React, { useState } from 'react';
import { useFamily } from '@/context/FamilyContext';
import { ConfettiCelebration } from '@/components/ui/ConfettiCelebration';

export const KidsView: React.FC = () => {
  const { chores, submitChoreProof, currentMember } = useFamily();
  const [toast, setToast] = useState<string | null>(null);
  const [submittingTaskId, setSubmittingTaskId] = useState<string | number | null>(null);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [selectedProofModalChore, setSelectedProofModalChore] = useState<any | null>(null);

  const childName = currentMember?.name || 'Bé Na';

  // Danh mục ảnh minh chứng mẫu để con chọn nộp
  const PROOF_PRESETS = [
    {
      id: 'proof-1',
      title: '🧹 Bàn học & phòng ngủ gọn gàng',
      url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600',
    },
    {
      id: 'proof-2',
      title: '📚 Vở bài tập làm xong điểm 10',
      url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600',
    },
    {
      id: 'proof-3',
      title: '🍽️ Rửa bát & dọn bếp sạch sẽ',
      url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600',
    },
  ];

  const [selectedProofUrl, setSelectedProofUrl] = useState<string>(PROOF_PRESETS[0].url);

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
            proofImageUrl: PROOF_PRESETS[1].url,
          },
          {
            id: 'chore-3',
            title: '⭐ Đạt điểm 10 kiểm tra Toán',
            rewardAmount: 0.05,
            status: 'REWARDED',
            proofImageUrl: PROOF_PRESETS[1].url,
          },
        ];

  // Tính tổng heo đất từ các nhiệm vụ đã nhận thưởng
  const totalEarned = activeChores
    .filter((c: any) => c.status === 'REWARDED')
    .reduce((sum: number, c: any) => sum + (Number(c.rewardAmount) || 0), 0.08);

  const handleOpenProofModal = (chore: any) => {
    setSelectedProofModalChore(chore);
    // Chọn sẵn ảnh preset hợp với bài
    if (chore.title.includes('Toán') || chore.title.includes('sách')) {
      setSelectedProofUrl(PROOF_PRESETS[1].url);
    } else if (chore.title.includes('bát') || chore.title.includes('bếp')) {
      setSelectedProofUrl(PROOF_PRESETS[2].url);
    } else {
      setSelectedProofUrl(PROOF_PRESETS[0].url);
    }
  };

  const handleConfirmSubmitProof = async () => {
    if (!selectedProofModalChore) return;
    const taskId = selectedProofModalChore.id;

    setSubmittingTaskId(taskId);
    try {
      const ok = await submitChoreProof(taskId, selectedProofUrl);
      if (ok) {
        setToast(`🌟 Tuyệt vời! Đã nộp ảnh báo cáo việc nhà cho Bố Ba duyệt thưởng!`);
        setShowConfetti(true);
      }
    } finally {
      setSubmittingTaskId(null);
      setSelectedProofModalChore(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full text-slate-900 relative">
      
      {/* Hiệu ứng pháo hoa Confetti chúc mừng */}
      <ConfettiCelebration
        isActive={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />

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

        <button
          onClick={() => setShowConfetti(true)}
          type="button"
          title="Bấm để ăn mừng!"
          className="text-5xl animate-bounce shrink-0 z-10 select-none cursor-pointer hover:scale-110 transition-transform"
        >
          🐷
        </button>

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
                      onClick={() => handleOpenProofModal(chore)}
                      type="button"
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer shrink-0 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                      <span>Chụp &amp; Nộp</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL CHỌN ẢNH MINH CHỨNG KHI CON NỘP BÀI */}
      {selectedProofModalChore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white max-w-sm w-full rounded-3xl p-5 border border-slate-200 shadow-2xl flex flex-col gap-4 text-slate-900 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📸</span>
                <h4 className="text-sm font-bold">Chụp Ảnh Nộp Báo Cáo</h4>
              </div>
              <button
                onClick={() => setSelectedProofModalChore(null)}
                type="button"
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Nhiệm vụ: <strong className="text-slate-900">{selectedProofModalChore.title}</strong>
            </p>

            {/* Chọn ảnh minh chứng */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase">
                Chọn ảnh chụp minh chứng:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {PROOF_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedProofUrl(preset.url)}
                    type="button"
                    className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer ${
                      selectedProofUrl === preset.url
                        ? 'border-emerald-600 ring-2 ring-emerald-400'
                        : 'border-slate-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.title}
                      className="w-full h-full object-cover"
                    />
                    {selectedProofUrl === preset.url && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                        ✓
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview ảnh to */}
            <div className="relative rounded-2xl overflow-hidden aspect-video border border-slate-200 bg-slate-950">
              <img
                src={selectedProofUrl}
                alt="Minh chứng chọn"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-white font-mono">
                Minh chứng gửi Bố Ba
              </div>
            </div>

            {/* Nút gửi */}
            <button
              onClick={handleConfirmSubmitProof}
              disabled={submittingTaskId === selectedProofModalChore.id}
              type="button"
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">send</span>
              <span>
                {submittingTaskId === selectedProofModalChore.id
                  ? 'Đang gửi cho Bố...'
                  : `Nộp Báo Cáo Nhận +${selectedProofModalChore.rewardAmount} AVAX`}
              </span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
