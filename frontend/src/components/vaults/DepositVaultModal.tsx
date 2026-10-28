'use client';

import React, { useState, useEffect } from 'react';
import { useFamily } from '@/context/FamilyContext';
import { useLanguage } from '@/context/LanguageContext';
import { SNOWTRACE_TESTNET_URL } from '@/contracts/config';

interface DepositVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultVaultId?: number;
}

export const DepositVaultModal: React.FC<DepositVaultModalProps> = ({
  isOpen,
  onClose,
  defaultVaultId,
}) => {
  const { dynamicVaults, depositToVault, connectedWalletAddress, currentWorkspace } = useFamily();
  const { language } = useLanguage();

  const [selectedVaultId, setSelectedVaultId] = useState<number>(
    defaultVaultId !== undefined ? defaultVaultId : 1
  );
  const [depositAmount, setDepositAmount] = useState<number>(0.02);
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositResult, setDepositResult] = useState<{
    txHash: string;
    amount: number;
    vaultName: string;
    vaultId: number;
  } | null>(null);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  useEffect(() => {
    if (defaultVaultId !== undefined) {
      setSelectedVaultId(defaultVaultId);
    } else if (dynamicVaults.length > 0) {
      setSelectedVaultId(dynamicVaults[0].onchainVaultId);
    }
  }, [defaultVaultId, dynamicVaults]);

  useEffect(() => {
    if (!isOpen) {
      setDepositResult(null);
      setDepositError(null);
      setCopiedHash(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const targetVault =
    dynamicVaults.find((v) => v.onchainVaultId === selectedVaultId) ||
    dynamicVaults[0] || {
      id: 'v-fallback',
      onchainVaultId: 1,
      name: 'Hũ Báo Hiếu (SHIELD)',
      ruleTemplate: 'SHIELD',
      bufferRatioBps: 1000,
    };

  const bufferPct = targetVault.bufferRatioBps / 100;
  const yieldPct = 100 - bufferPct;
  const l1Amount = (depositAmount * targetVault.bufferRatioBps) / 10000;
  const cchainAmount = (depositAmount * (10000 - targetVault.bufferRatioBps)) / 10000;

  const handleDeposit = async () => {
    if (depositAmount <= 0) return;
    setIsDepositing(true);
    setDepositError(null);

    const res = await depositToVault(targetVault.onchainVaultId, depositAmount);
    setIsDepositing(false);

    if (res.success && res.txHash) {
      setDepositResult({
        txHash: res.txHash,
        amount: depositAmount,
        vaultName: targetVault.name,
        vaultId: targetVault.onchainVaultId,
      });
    } else {
      setDepositError(res.error || (language === 'vi' ? 'Nạp tiền on-chain thất bại' : 'Deposit failed'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-outline-variant/30 space-y-5">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">add_card</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-on-surface">
                {language === 'vi' ? 'Nạp Quỹ Vào Hũ Động' : 'Deposit to Dynamic Vault'}
              </h3>
              <p className="text-xs text-on-surface-variant font-mono">
                {currentWorkspace?.name ? `${currentWorkspace.name} • ` : ''}Avalanche Fuji C-Chain
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {depositResult ? (
          /* Success Screen with Real TxHash and SnowTrace Link */
          <div className="space-y-4 py-1 animate-in fade-in">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col items-center text-center gap-2.5">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md animate-bounce">
                <span className="material-symbols-outlined text-[28px]">verified</span>
              </div>
              <div>
                <h4 className="text-base font-bold text-emerald-900">
                  {language === 'vi' ? 'Giao Dịch Đã Xác Nhận On-Chain!' : 'Transaction Confirmed On-Chain!'}
                </h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  {language === 'vi'
                    ? 'Hợp đồng FamilyHub trên Avalanche Fuji đã ghi nhận số dư thành công.'
                    : 'FamilyHub smart contract on Avalanche Fuji recorded balance successfully.'}
                </p>
              </div>
            </div>

            <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">{language === 'vi' ? 'Hũ nhận vốn:' : 'Target Vault:'}</span>
                <span className="font-bold text-on-surface">{depositResult.vaultName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">{language === 'vi' ? 'Số lượng nạp:' : 'Amount:'}</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">+{depositResult.amount} AVAX</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">{language === 'vi' ? 'Mạng Blockchain:' : 'Network:'}</span>
                <span className="font-mono font-semibold text-primary">Avalanche Fuji C-Chain (43113)</span>
              </div>
              <div className="pt-2 border-t border-surface-container flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  {language === 'vi' ? 'Mã Giao Dịch (TxHash Real):' : 'Transaction Hash (Real):'}
                </span>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-surface-container font-mono text-[11px] text-on-surface break-all border border-outline-variant/30">
                  <span className="flex-1 select-all">{depositResult.txHash}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(depositResult.txHash);
                      setCopiedHash(true);
                      setTimeout(() => setCopiedHash(false), 2000);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-surface-container-highest hover:bg-surface-container-high text-xs font-bold shrink-0 transition-colors cursor-pointer"
                  >
                    {copiedHash ? (language === 'vi' ? 'Đã copy!' : 'Copied!') : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <a
                href={`${SNOWTRACE_TESTNET_URL}/tx/${depositResult.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>{language === 'vi' ? 'Tra Cứu Real-time Trên SnowTrace Testnet' : 'Inspect on SnowTrace Testnet'}</span>
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </a>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-all cursor-pointer"
              >
                {language === 'vi' ? 'Hoàn tất & Đóng' : 'Done & Close'}
              </button>
            </div>
          </div>
        ) : (
          /* Deposit Input Form */
          <div className="space-y-4">
            {/* Account & Network Status */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-on-surface-variant">Ví Avalanche Core:</span>
                <span className="font-mono font-bold text-on-surface">
                  {connectedWalletAddress
                    ? `${connectedWalletAddress.slice(0, 6)}...${connectedWalletAddress.slice(-4)}`
                    : 'Đang kết nối...'}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-secondary-container/15 text-secondary font-mono text-[10px] font-bold">
                Fuji C-Chain (43113)
              </span>
            </div>

            {/* Select Target Vault */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface-variant">
                {language === 'vi' ? 'Chọn Hũ Tiền Cần Nạp' : 'Select Target Vault'}
              </label>
              <select
                value={selectedVaultId}
                onChange={(e) => setSelectedVaultId(Number(e.target.value))}
                className="p-2.5 bg-surface-container-low rounded-xl border border-outline-variant/30 text-on-surface font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
              >
                {dynamicVaults.map((vault) => (
                  <option key={vault.id} value={vault.onchainVaultId}>
                    {vault.name} (#{vault.onchainVaultId} • {vault.ruleTemplate} - Đệm {vault.bufferRatioBps / 100}% L1)
                  </option>
                ))}
              </select>
            </div>

            {/* Deposit Amount Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-on-surface-variant">
                  {language === 'vi' ? 'Số Lượng Nạp (AVAX)' : 'Deposit Amount (AVAX)'}
                </label>
                <span className="text-[11px] text-on-surface-variant font-mono">
                  ≈ ${(depositAmount * 30).toFixed(2)} USD (~{(depositAmount * 750000).toLocaleString('vi-VN')} đ)
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.005"
                  min="0.001"
                  max="100"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-sm font-mono font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-bold text-primary font-mono">
                  AVAX
                </span>
              </div>

              {/* Quick Select Amount Pills */}
              <div className="flex items-center gap-2 mt-2">
                {[0.01, 0.02, 0.05, 0.1].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDepositAmount(amt)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      depositAmount === amt
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    +{amt} AVAX
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Split Breakdown */}
            <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-2 text-xs">
              <div className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                {language === 'vi' ? 'Cơ Chế Phân Bổ Tự Động (Teleporter ICTT)' : 'Automated Liquidity Split'}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">
                  {language === 'vi' ? `Đệm Family L1 (${bufferPct}%):` : `L1 Liquid Buffer (${bufferPct}%):`}
                </span>
                <span className="font-mono font-bold text-primary">
                  {l1Amount.toFixed(4)} AVAX ({language === 'vi' ? 'Rút tức thì 0 gas' : 'Instant 0 gas'})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">
                  {language === 'vi' ? `Fuji C-Chain (${yieldPct}% @ 8% APY):` : `Fuji C-Chain (${yieldPct}% @ 8% APY):`}
                </span>
                <span className="font-mono font-bold text-secondary-container">
                  {cchainAmount.toFixed(4)} AVAX ({language === 'vi' ? 'DeFi Staking' : 'Yield Engine'})
                </span>
              </div>
            </div>

            {/* Error Banner */}
            {depositError && (
              <div className="p-3 rounded-xl bg-error/10 border border-error/30 text-error text-xs flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                <div className="flex-1">
                  <p className="font-bold">{language === 'vi' ? 'Lỗi giao dịch:' : 'Transaction error:'}</p>
                  <p className="text-[11px]">{depositError}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-all cursor-pointer"
              >
                {language === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDepositing || depositAmount <= 0}
                onClick={handleDeposit}
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isDepositing ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                    <span>{language === 'vi' ? 'Đang ký trên Core Wallet...' : 'Signing on Core Wallet...'}</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">bolt</span>
                    <span>{language === 'vi' ? 'Ký & Nạp Quỹ On-Chain' : 'Sign & Deposit On-Chain'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
