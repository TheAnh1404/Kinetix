"use client";

import React from "react";
import {
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Target,
  ArrowDownToLine,
  ArrowUpFromLine,
  Plus,
  Coins,
} from "lucide-react";
import { DynamicVaultItem } from "@/types";
import { useFamily } from "@/context/FamilyContext";
import { useLanguage } from "@/context/LanguageContext";

interface VaultDeckGridProps {
  onSelectVault: (vault: DynamicVaultItem) => void;
  onDepositVault: (vault: DynamicVaultItem) => void;
  onFastWithdrawVault: (vault: DynamicVaultItem) => void;
  onCreateNewVault: () => void;
}

export const VaultDeckGrid: React.FC<VaultDeckGridProps> = ({
  onSelectVault,
  onDepositVault,
  onFastWithdrawVault,
  onCreateNewVault,
}) => {
  const { dynamicVaults } = useFamily();
  const { language } = useLanguage();

  const getVaultStyle = (ruleTemplate: string) => {
    switch (ruleTemplate) {
      case "SHIELD":
        return {
          icon: ShieldCheck,
          tag: language === "vi" ? "Bảo Vệ & Trợ Cấp" : "Shield & Allowance",
          colorClass: "text-red-700 bg-red-50 border-red-200",
          cardBorder: "hover:border-red-300",
        };
      case "MILESTONE":
        return {
          icon: Sparkles,
          tag: language === "vi" ? "Nhiệm Vụ & Thưởng" : "Chore-to-Earn",
          colorClass: "text-purple-700 bg-purple-50 border-purple-200",
          cardBorder: "hover:border-purple-300",
        };
      case "ROSCA":
        return {
          icon: RefreshCw,
          tag: language === "vi" ? "Góp Vốn Xoay Vòng" : "Rotating Savings",
          colorClass: "text-amber-800 bg-amber-50 border-amber-200",
          cardBorder: "hover:border-amber-300",
        };
      case "SHARED_GOAL":
      default:
        return {
          icon: Target,
          tag: language === "vi" ? "Mục Tiêu Chung" : "Shared Goal",
          colorClass: "text-blue-700 bg-blue-50 border-blue-200",
          cardBorder: "hover:border-blue-300",
        };
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            {language === "vi"
              ? "Danh Sách Hũ Tiền (Dynamic Vaults)"
              : "Dynamic Vaults"}
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {language === "vi"
              ? `Đang có ${dynamicVaults?.length || 0} hũ tiền hoạt động trên hợp đồng FamilyHub`
              : `${dynamicVaults?.length || 0} vaults active on FamilyHub contract`}
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateNewVault}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer border border-slate-300/80 active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{language === "vi" ? "Tạo Hũ Mới" : "New Vault"}</span>
        </button>
      </div>

      {/* Hiển thị hũ tiền thực tế */}
      {dynamicVaults && dynamicVaults.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {dynamicVaults.map((vault) => {
            const style = getVaultStyle(vault.ruleTemplate);
            const Icon = style.icon;
            const l1Bal = vault.l1BufferBalance || vault.cachedL1Buffer || 0;
            const cChainBal = vault.cChainPrincipal || vault.cachedCChainYield || 0;
            const totalBal =
              vault.totalBalance || vault.cachedTotalBalance || l1Bal + cChainBal;
            const bufferRatio = ((vault.bufferRatioBps || 1000) / 100).toFixed(0);

            return (
              <div
                key={vault.id}
                className={`bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl p-4 transition-all duration-200 flex flex-col justify-between ${style.cardBorder} hover:shadow-xs`}
              >
                <div>
                  {/* Header: Tag quy tắc + Icon */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${style.colorClass}`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{style.tag}</span>
                    </span>

                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      ID #{vault.onchainVaultId}
                    </span>
                  </div>

                  {/* Tên Hũ */}
                  <h3 className="font-bold text-sm text-slate-900 mb-1 leading-snug">
                    {vault.name}
                  </h3>

                  {/* Tổng số dư thực tế */}
                  <div className="my-2.5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black font-mono text-slate-900">
                        {totalBal.toFixed(2)}
                      </span>
                      <span className="text-xs font-bold text-slate-500">AVAX</span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-emerald-700 font-semibold">
                      <span>C-Chain Staking: {cChainBal.toFixed(2)} AVAX</span>
                    </div>
                  </div>

                  {/* Chi tiết phân bổ đệm */}
                  <div className="bg-white rounded-lg p-2.5 border border-slate-200/80 space-y-1.5 text-[11px] mb-3">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Đệm L1 (Rút tức thì):</span>
                      <strong className="font-mono text-slate-800">
                        {l1Bal.toFixed(2)} AVAX ({bufferRatio}%)
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>C-Chain (8% APY):</span>
                      <strong className="font-mono text-emerald-700">
                        {cChainBal.toFixed(2)} AVAX
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Hạn mức rút nhanh:</span>
                      <strong className="font-mono text-slate-800">
                        ≤ {vault.fastWithdrawLimit || 0.5} AVAX
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => onDepositVault(vault)}
                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer active:scale-95"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    <span>{language === "vi" ? "Nạp" : "Deposit"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onFastWithdrawVault(vault)}
                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition-all cursor-pointer active:scale-95"
                  >
                    <ArrowUpFromLine className="w-3.5 h-3.5 text-slate-500" />
                    <span>{language === "vi" ? "Rút Nhanh" : "Fast Pay"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-10 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Coins className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="font-bold text-sm text-slate-800">
            {language === "vi"
              ? "Chưa có hũ tiền nào được tạo trong không gian này"
              : "No vaults created in this workspace yet"}
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {language === "vi"
              ? "Khởi tạo hũ theo 1 trong 4 bộ quy tắc: SHIELD (An sinh), MILESTONE (Việc nhà), ROSCA (Hụi xoay vòng), SHARED_GOAL (Mục tiêu chung)."
              : "Create a vault with one of the 4 rule templates to start saving."}
          </p>
          <button
            type="button"
            onClick={onCreateNewVault}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === "vi" ? "Khởi Tạo Hũ Mới" : "Create New Vault"}</span>
          </button>
        </div>
      )}
    </div>
  );
};
