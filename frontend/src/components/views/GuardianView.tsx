'use client';

import React, { useState } from 'react';
import { useFamily } from '@/context/FamilyContext';
import { useLanguage } from '@/context/LanguageContext';
import { FamilyStatsCards } from '@/components/dashboard/FamilyStatsCards';
import { MemberManagementModal } from '@/components/dashboard/MemberManagementModal';
import { CreateChoreModal } from '@/components/dashboard/CreateChoreModal';
import { CreateVaultModal } from '@/components/vaults/CreateVaultModal';
import { DepositVaultModal } from '@/components/vaults/DepositVaultModal';
import { DynamicVaultItem } from '@/types';

export const GuardianView: React.FC = () => {
  const {
    withdrawalRequests,
    approveWithdrawal,
    dynamicVaults,
    currentMember,
    members,
    chores,
    verifyAndRewardChore,
  } = useFamily();

  const { language } = useLanguage();

  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isChoreModalOpen, setIsChoreModalOpen] = useState(false);
  const [isCreateVaultOpen, setIsCreateVaultOpen] = useState(false);
  const [depositModalVault, setDepositModalVault] = useState<DynamicVaultItem | null>(null);

  // Yêu cầu rút tiền đang chờ duyệt (Pending Multisig Request)
  const pendingRequests = withdrawalRequests.filter((r) => r.status === 'PENDING');
  const activeRequest = pendingRequests[0] || withdrawalRequests[0];

  const handleApprove = async (requestId: string | number) => {
    setIsSigning(true);
    try {
      const success = await approveWithdrawal(requestId);
      if (success) {
        setFeedback(
          language === 'vi'
            ? `🎉 KÝ DUYỆT THÀNH CÔNG! Đạt đủ chữ ký Guardians. Hợp đồng FamilyHub trên Avalanche Family L1 đã tự động giải ngân với 0đ phí gas!`
            : `🎉 SIGNED SUCCESSFULLY! Multisig threshold reached. FamilyHub smart contract disbursed funds with 0 gas fee!`
        );
      }
    } finally {
      setIsSigning(false);
    }
  };

  const handleVerifyChore = async (taskId: string | number, rewardAmount: number) => {
    const success = await verifyAndRewardChore(taskId);
    if (success) {
      setFeedback(
        `🎉 ĐÃ DUYỆT BÀI VÀ THƯỞNG ${rewardAmount} AVAX CHO CON! Hợp đồng FamilyHub tự động chuyển từ Hũ MILESTONE sang heo đất của con với 0đ gas.`
      );
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      
      {/* 1. THÔNG BÁO FEEDBACK NỔI BẬT */}
      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-start justify-between gap-3 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[26px] text-emerald-600">verified</span>
            <span className="text-xs sm:text-sm font-bold leading-relaxed">{feedback}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer font-bold text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. KHỐI TỔNG QUAN TÀI SẢN (3 CHỈ SỐ LỚN CHO LAPTOP) */}
      <FamilyStatsCards />

      {/* 3. BỐ CỤC 2 CỘT CHÍNH CHO CHỦ GIA ĐÌNH TRÊN LAPTOP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* CỘT TRÁI (7 CỘT): DANH MỤC HŨ ĐỘNG (DYNAMIC VAULTS PORTFOLIO) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm">
                🏦
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">Danh Mục Hũ Tiền Động</h2>
                <p className="text-xs text-slate-500">Tự động phân bổ đệm L1 (0 gas) và vốn C-Chain (8% APY)</p>
              </div>
            </div>

            <button
              onClick={() => setIsCreateVaultOpen(true)}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>+ Tạo Hũ Mới</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {dynamicVaults.map((vault) => {
              const bufferPct = (vault.bufferRatioBps / 100).toFixed(0);
              const cChainPct = (100 - Number(bufferPct)).toFixed(0);

              return (
                <div
                  key={vault.id || vault.onchainVaultId}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        {vault.ruleTemplate} • Hũ #{vault.onchainVaultId}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 truncate mt-0.5" title={vault.name}>
                        {vault.name}
                      </h3>
                    </div>

                    <span
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        vault.ruleTemplate === 'SHIELD'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : vault.ruleTemplate === 'MILESTONE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : vault.ruleTemplate === 'ROSCA'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {vault.ruleTemplate}
                    </span>
                  </div>

                  <div>
                    <div className="text-xl font-extrabold text-slate-900 font-mono">
                      {vault.cachedTotalBalance.toFixed(2)}{' '}
                      <span className="text-xs font-sans font-bold text-slate-500">AVAX</span>
                    </div>

                    {/* Thanh Trượt Tỷ Lệ Đệm Thanh Khoản L1 / C-Chain */}
                    <div className="mt-2.5">
                      <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 mb-1">
                        <span>L1 Đệm: {bufferPct}%</span>
                        <span>C-Chain: {cChainPct}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${bufferPct}%` }}
                          className="bg-red-500 h-full"
                          title={`Bộ đệm L1: ${bufferPct}%`}
                        />
                        <div
                          style={{ width: `${cChainPct}%` }}
                          className="bg-emerald-500 h-full"
                          title={`Gửi C-Chain 8% APY: ${cChainPct}%`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setDepositModalVault(vault)}
                      type="button"
                      className="flex-1 py-1.5 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-600 text-xs font-bold transition-all border border-slate-200 cursor-pointer"
                    >
                      Nạp Quỹ
                    </button>
                    <span className="text-[10px] font-mono text-slate-400">
                      Duyệt {vault.requiredApprovals}/3
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CỘT PHẢI (5 CỘT): BÀN PHÊ DUYỆT ĐA CHỮ KÝ M/N (MULTISIG ACTION DESK) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                ✍️
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">Bàn Ký Duyệt Đa Chữ Ký</h2>
                <p className="text-xs text-slate-500">Các yêu cầu rút tiền lớn cần Guardians ký duyệt</p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {pendingRequests.length} lệnh chờ
            </span>
          </div>

          {activeRequest ? (
            <div className="bg-white p-5 rounded-2xl border-2 border-blue-200 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold font-mono uppercase">
                  {activeRequest.status === 'PENDING' ? '⏳ Chờ Duyệt On-Chain' : '✓ Đã Giải Ngân'}
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">
                  Phiếu #{activeRequest.id}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-xs text-slate-500">Số tiền yêu cầu giải ngân:</span>
                <div className="text-2xl font-black font-mono text-slate-900 my-0.5">
                  {activeRequest.amount} <span className="text-sm font-sans font-bold text-slate-500">AVAX</span>
                </div>
                <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-700">Mục đích:</span> {activeRequest.reason}
                </p>
              </div>

              {/* Tiến độ chữ ký Guardians M/N */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600">Tiến độ chữ ký:</span>
                  <span className="font-mono text-blue-600">
                    {activeRequest.approvalsCount ?? 1}/{activeRequest.requiredApprovals ?? 2} chữ ký
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        (((activeRequest.approvalsCount ?? 1) / (activeRequest.requiredApprovals ?? 2)) * 100)
                      )}%`,
                    }}
                    className="bg-blue-600 h-full rounded-full transition-all"
                  />
                </div>
              </div>

              {activeRequest.status === 'PENDING' ? (
                <button
                  onClick={() => handleApprove(activeRequest.id)}
                  disabled={isSigning}
                  type="button"
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">draw</span>
                  <span>{isSigning ? 'Đang xác nhận on-chain...' : 'Ký Duyệt Lệnh Rút (Bố Ba)'}</span>
                </button>
              ) : (
                <div className="w-full py-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-center font-bold text-xs">
                  ✓ Lệnh đã được giải ngân về ví người thụ hưởng
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
              Không có yêu cầu rút tiền lớn nào đang chờ duyệt. Mọi tài sản đang an toàn!
            </div>
          )}

          {/* DUYỆT THƯỞNG VIỆC NHÀ (CHORE-TO-EARN) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Việc Nhà Của Con Cần Duyệt</span>
              <button
                onClick={() => setIsChoreModalOpen(true)}
                type="button"
                className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
              >
                + Giao Việc Mới
              </button>
            </div>

            <div className="space-y-2">
              {chores.filter((c: any) => c.status === 'SUBMITTED').length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-2">
                  Chưa có bài tập nào con vừa nộp chờ duyệt.
                </p>
              ) : (
                chores
                  .filter((c: any) => c.status === 'SUBMITTED')
                  .map((chore: any) => (
                    <div
                      key={chore.id}
                      className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 flex items-center justify-between gap-2"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-900 truncate">{chore.title}</span>
                        <span className="text-[11px] text-emerald-700 font-mono font-bold">
                          Thưởng: {chore.rewardAmount} AVAX
                        </span>
                      </div>
                      <button
                        onClick={() => handleVerifyChore(chore.id, chore.rewardAmount)}
                        type="button"
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer shrink-0"
                      >
                        Duyệt Thưởng
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* 4. MODALS QUẢN TRỊ TRUNG TÂM */}
      <CreateVaultModal
        isOpen={isCreateVaultOpen}
        onClose={() => setIsCreateVaultOpen(false)}
      />

      <DepositVaultModal
        isOpen={Boolean(depositModalVault)}
        onClose={() => setDepositModalVault(null)}
      />

      <CreateChoreModal
        isOpen={isChoreModalOpen}
        onClose={() => setIsChoreModalOpen(false)}
      />

      <MemberManagementModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
      />

    </div>
  );
};
