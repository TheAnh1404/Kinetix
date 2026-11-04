'use client';

import React, { useState } from 'react';
import { ChoreItem } from '@/context/FamilyContext';

interface ChoreProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  chore: ChoreItem | null;
  onApprove: (choreId: string | number, rewardAmount: number) => Promise<void>;
}

export const ChoreProofModal: React.FC<ChoreProofModalProps> = ({
  isOpen,
  onClose,
  chore,
  onApprove,
}) => {
  const [isApproving, setIsApproving] = useState(false);

  if (!isOpen || !chore) return null;

  const handleApproveClick = async () => {
    setIsApproving(true);
    try {
      await onApprove(chore.id, chore.rewardAmount);
      onClose();
    } finally {
      setIsApproving(false);
    }
  };

  const proofUrl =
    chore.proofImageUrl ||
    'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white max-w-lg w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-200 text-slate-900 animate-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base">
              📸
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Minh Chứng Việc Nhà Của Con
              </h3>
              <p className="text-xs text-slate-500">
                Xác thực hình ảnh trước khi mở khóa giải ngân AVAX từ Hũ MILESTONE
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Nội dung minh chứng (Ảnh + Chi tiết) */}
        <div className="p-4 sm:p-6 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          
          {/* Thông tin bài nộp */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-3">
              <img
                src={
                  chore.childAvatar ||
                  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150'
                }
                alt="Bé"
                className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900">
                  {chore.childName || 'Bé Na'}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Trạng thái: <span className="font-bold text-amber-600">Đã nộp bài, chờ bố mẹ duyệt</span>
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-mono uppercase block">Phần thưởng</span>
              <span className="text-base font-black font-mono text-emerald-600">
                +{chore.rewardAmount} AVAX
              </span>
            </div>
          </div>

          {/* Tên nhiệm vụ */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-slate-700">Tên nhiệm vụ hoàn thành:</span>
            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 text-sm font-bold text-emerald-950">
              {chore.title}
            </div>
          </div>

          {/* Khung ảnh minh chứng */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Ảnh chụp thực tế:</span>
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full font-bold">
                ✓ Đã chụp & xác thực
              </span>
            </div>
            
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-950 shadow-inner group">
              <img
                src={proofUrl}
                alt="Minh chứng hoàn thành"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Timestamp: Vừa nộp</span>
              </div>
            </div>
          </div>

          {/* Giải thích nghiệp vụ 0 gas */}
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900 leading-relaxed flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] text-blue-600 shrink-0">info</span>
            <span>
              Khi bấm duyệt thưởng, hợp đồng <strong>FamilyHub</strong> trên <strong>Family L1</strong> sẽ tự động trích thưởng từ Hũ MILESTONE vào heo đất của con với <strong>0đ phí gas</strong> và tốc độ tức thì.
            </span>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
          >
            Đóng
          </button>
          <button
            onClick={handleApproveClick}
            disabled={isApproving}
            type="button"
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span>{isApproving ? 'Đang giải ngân on-chain...' : `Duyệt Thưởng (+${chore.rewardAmount} AVAX)`}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
