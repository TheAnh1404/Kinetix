'use client';

import React, { useState } from 'react';
import { useFamily } from '@/context/FamilyContext';

export const RoscaView: React.FC<any> = () => {
  const { dynamicVaults, depositToVault, payoutRoscaRound } = useFamily();

  // Tìm Hũ thuộc bộ quy tắc ROSCA hoặc SHARED_GOAL
  const roscaVault =
    dynamicVaults.find((v) => v.ruleTemplate === 'ROSCA' || v.ruleTemplate === 'SHARED_GOAL') ||
    dynamicVaults[0];

  const vaultId = roscaVault ? roscaVault.onchainVaultId : 3;
  const vaultName = roscaVault?.name || 'Hụi Họ Thân Tộc';
  const totalFund = roscaVault?.cachedTotalBalance || roscaVault?.totalBalance || 15;
  const contributionPerRound = 0.02; // 0.02 AVAX mỗi kỳ

  const [isContributing, setIsContributing] = useState(false);
  const [isPayouting, setIsPayouting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // 1. Nạp tiền góp hụi kỳ này (1 chạm)
  const handleContribute = async () => {
    setIsContributing(true);
    try {
      const res = await depositToVault(vaultId, contributionPerRound);
      if (res.success) {
        setToast(`🎉 ĐÃ GÓP THÀNH CÔNG ${contributionPerRound} AVAX VÀO HŨ! Vốn đang sinh lời 8% APY trên C-Chain.`);
      }
    } finally {
      setIsContributing(false);
    }
  };

  // 2. Nhận tiền quỹ khi đến kỳ
  const handlePayout = async () => {
    setIsPayouting(true);
    try {
      const ok = await payoutRoscaRound(vaultId);
      if (ok) {
        setToast(`💰 CHÚC MỪNG BẠN! Toàn bộ quỹ kỳ này đã được giải ngân về ví kèm tiền lãi.`);
      }
    } finally {
      setIsPayouting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full text-slate-900">
      
      {/* Toast feedback */}
      {toast && (
        <div className="p-3.5 rounded-2xl bg-purple-600 text-white shadow-lg flex items-start justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[24px]">verified</span>
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

      {/* THẺ TỔNG QUỸ HỌ HỤI & SINH LỜI C-CHAIN */}
      <div className="bg-gradient-to-br from-purple-700 to-indigo-800 text-white p-5 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs uppercase font-bold text-purple-200 tracking-wider">
            {vaultName}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold font-mono">
            +8.0% APY
          </span>
        </div>

        <div className="text-3xl font-black font-mono tracking-tight my-1">
          {Number(totalFund).toFixed(2)}{' '}
          <span className="text-base font-sans font-bold text-purple-200">AVAX</span>
        </div>

        <p className="text-[11px] text-purple-200/90 font-medium leading-relaxed">
          100% tiền nhàn rỗi trong lúc chờ kỳ giải ngân được tự động gửi sinh lời trên Avalanche Fuji C-Chain.
        </p>
      </div>

      {/* KHỐI 1: NẠP GÓP TIỀN ĐỊNH KỲ (1 CHẠM) */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
              💰
            </span>
            <h3 className="text-sm font-bold text-slate-900">Đến Kỳ Góp Quỹ (Kỳ 2/6)</h3>
          </div>
          <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
            {contributionPerRound} AVAX
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Mỗi thành viên đóng <span className="font-bold text-slate-900">0.02 AVAX (~150.000 VNĐ)</span> vào hũ dòng tiền chung.
        </p>

        <button
          onClick={handleContribute}
          disabled={isContributing}
          type="button"
          className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">payments</span>
          <span>{isContributing ? 'Đang xác nhận...' : 'Nạp Góp 0.02 AVAX (1 Chạm)'}</span>
        </button>
      </div>

      {/* KHỐI 2: THÔNG TIN LƯỢT NHẬN TIỀN */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
            🎯
          </span>
          <h3 className="text-sm font-bold text-slate-900">Thứ Tự Xoay Vòng Nhận Quỹ</h3>
        </div>

        <div className="space-y-2">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-200 text-[10px] font-bold flex items-center justify-center">1</span>
              <span className="text-xs font-bold text-slate-700">Kỳ 1: Bác Cả</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-500">Đã Nhận</span>
          </div>

          <div className="p-3 rounded-2xl bg-purple-50 border border-purple-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">2</span>
              <span className="text-xs font-bold text-purple-900">Kỳ 2: Anh Cả (Lượt Hiện Tại)</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-purple-700 animate-pulse">Đang Diễn Ra</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-200 text-[10px] font-bold flex items-center justify-center">3</span>
              <span className="text-xs font-bold text-slate-700">Kỳ 3: Cô Út</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-500">Chờ Lượt</span>
          </div>
        </div>

        <button
          onClick={handlePayout}
          disabled={isPayouting}
          type="button"
          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
        >
          <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
          <span>{isPayouting ? 'Đang giải ngân...' : 'Kích Hoạt Giải Ngân Đến Kỳ'}</span>
        </button>
      </div>

    </div>
  );
};
