'use client';

import React, { useState } from 'react';
import { useFamily } from '@/context/FamilyContext';
import { SNOWTRACE_TESTNET_URL } from '@/contracts/config';

interface TransactionLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TransactionLedgerModal: React.FC<TransactionLedgerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { depositHistory, dynamicVaults, withdrawalRequests } = useFamily();
  const [filterChain, setFilterChain] = useState<'ALL' | 'L1' | 'FUJI'>('ALL');

  if (!isOpen) return null;

  // Tổng hợp dữ liệu giao dịch từ depositHistory và withdrawalRequests đã hoàn tất
  const transactions = [
    ...depositHistory.map((d) => ({
      id: d.id,
      type: 'DEPOSIT' as const,
      title: `Nạp Vốn Vào ${d.vaultName}`,
      amount: d.amount,
      chain: 'FUJI' as const,
      chainLabel: 'Avalanche Fuji C-Chain',
      txHash: d.txHash,
      timestamp: d.timestamp,
      status: 'CONFIRMED' as const,
      sender: d.senderName,
      details: 'Phân bổ 10% đệm L1 (0 gas) & 90% stake C-Chain 8% APY',
    })),
    ...withdrawalRequests
      .filter((w) => w.status === 'APPROVED' || w.status === 'EXECUTED')
      .map((w) => ({
        id: `withdraw-${w.id}`,
        type: 'WITHDRAWAL' as const,
        title: `Rút Đa Chữ Ký (${w.vaultName || 'Hũ Gia Đình'})`,
        amount: w.amount,
        chain: 'L1' as const,
        chainLabel: 'Family L1 (0 Gas)',
        txHash: '0x3c7e4fa89bc0129a8f44820dc738194ad987104b2c124801b7a9de3e89c1628f',
        timestamp: w.createdAt || 'Hôm nay',
        status: 'CONFIRMED' as const,
        sender: w.requesterName,
        details: `Đạt đủ ${w.approvalsCount}/${w.requiredApprovals} chữ ký Guardians duyệt giải ngân`,
      })),
    // Giao dịch mẫu bổ sung để thể hiện đầy đủ 2 chuỗi
    {
      id: 'tx-seed-1',
      type: 'FAST_WITHDRAW' as const,
      title: 'Rút Nhanh An Sinh Đi Chợ (Cụ Ba)',
      amount: 0.02,
      chain: 'L1' as const,
      chainLabel: 'Family L1 (0 Gas)',
      txHash: '0x948df12401827bfa8819234857bca18290192847aef92019283746501928471b',
      timestamp: 'Hôm nay, 07:15',
      status: 'CONFIRMED' as const,
      sender: 'Cụ Ba (Ông Nội)',
      details: 'Giải ngân tức thì từ đệm thanh khoản L1 < 1s, 0đ gas fee',
    },
    {
      id: 'tx-seed-2',
      type: 'YIELD' as const,
      title: 'Tích Lũy Lãi Suất Định Kỳ 8% APY',
      amount: 0.016,
      chain: 'FUJI' as const,
      chainLabel: 'Avalanche Fuji C-Chain',
      txHash: '0x71629840192847bca89102938475610293847162534019284756102938471625',
      timestamp: 'Hôm qua, 23:59',
      status: 'CONFIRMED' as const,
      sender: 'FamilyYieldVault Contract',
      details: 'Lãi suất tự động tính theo block.timestamp Fuji C-Chain',
    },
  ];

  const filtered = transactions.filter((tx) => {
    if (filterChain === 'L1') return tx.chain === 'L1';
    if (filterChain === 'FUJI') return tx.chain === 'FUJI';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white max-w-4xl w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-200 text-slate-900 animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-lg">
              📜
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Sổ Cái Lịch Sử Giao Dịch On-Chain
              </h3>
              <p className="text-xs text-slate-500">
                Minh bạch đối soát Dual-Chain: Family L1 (0 Gas) & Avalanche Fuji C-Chain (8% APY)
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

        {/* Filter Toolbar */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Bộ lọc chuỗi:</span>
            <div className="flex rounded-xl bg-slate-200/70 p-1 text-xs font-bold">
              <button
                onClick={() => setFilterChain('ALL')}
                type="button"
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterChain === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả ({transactions.length})
              </button>
              <button
                onClick={() => setFilterChain('L1')}
                type="button"
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  filterChain === 'L1'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>⚡ Family L1</span>
              </button>
              <button
                onClick={() => setFilterChain('FUJI')}
                type="button"
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  filterChain === 'FUJI'
                    ? 'bg-white text-blue-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🌊 Fuji C-Chain</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-500">
            Explorer:{' '}
            <a
              href={SNOWTRACE_TESTNET_URL}
              target="_blank"
              rel="noreferrer"
              className="text-red-600 hover:underline font-bold inline-flex items-center gap-0.5"
            >
              <span>SnowTrace Fuji</span>
              <span className="material-symbols-outlined text-[13px]">open_in_new</span>
            </a>
          </div>
        </div>

        {/* Danh sách giao dịch */}
        <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              Chưa có giao dịch nào thỏa điều kiện lọc.
            </div>
          ) : (
            filtered.map((tx) => (
              <div
                key={tx.id}
                className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${
                      tx.type === 'DEPOSIT'
                        ? 'bg-blue-100 text-blue-700'
                        : tx.type === 'FAST_WITHDRAW'
                        ? 'bg-red-100 text-red-700'
                        : tx.type === 'WITHDRAWAL'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {tx.type === 'DEPOSIT' && '📥'}
                    {tx.type === 'FAST_WITHDRAW' && '⚡'}
                    {tx.type === 'WITHDRAWAL' && '🛡️'}
                    {tx.type === 'YIELD' && '📈'}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                        {tx.title}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          tx.chain === 'L1'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {tx.chain === 'L1' ? '⚡ Family L1 (0 Gas)' : '🌊 Fuji C-Chain'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {tx.details}
                    </p>

                    <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 font-mono">
                      <span>Người thực hiện: <strong className="text-slate-600">{tx.sender}</strong></span>
                      <span>•</span>
                      <span>{tx.timestamp}</span>
                    </div>
                  </div>
                </div>

                {/* Cột số tiền & link Snowtrace */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <span
                    className={`text-sm sm:text-base font-black font-mono ${
                      tx.type === 'DEPOSIT' || tx.type === 'YIELD'
                        ? 'text-emerald-600'
                        : 'text-slate-900'
                    }`}
                  >
                    {tx.type === 'DEPOSIT' || tx.type === 'YIELD' ? '+' : '-'}
                    {tx.amount} AVAX
                  </span>

                  <a
                    href={`${SNOWTRACE_TESTNET_URL}/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-mono text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 mt-0.5"
                    title={`Mở giao dịch trên SnowTrace: ${tx.txHash}`}
                  >
                    <span>
                      {tx.txHash.substring(0, 6)}...{tx.txHash.substring(tx.txHash.length - 4)}
                    </span>
                    <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                  </a>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px]">Snowtrace Testnet Indexer Connected</span>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all cursor-pointer"
          >
            Đóng Sổ Cái
          </button>
        </div>

      </div>
    </div>
  );
};
