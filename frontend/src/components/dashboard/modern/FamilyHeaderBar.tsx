"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Copy,
  Check,
  PlusCircle,
  ArrowDownToLine,
  UserPlus,
  Zap,
} from "lucide-react";
import { useFamily } from "@/context/FamilyContext";
import { useLanguage } from "@/context/LanguageContext";

interface FamilyHeaderBarProps {
  onOpenDeposit: () => void;
  onOpenCreateVault: () => void;
  onOpenAddMember: () => void;
}

export const FamilyHeaderBar: React.FC<FamilyHeaderBarProps> = ({
  onOpenDeposit,
  onOpenCreateVault,
  onOpenAddMember,
}) => {
  const { currentWorkspace, familyInfo } = useFamily();
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);

  const familyCode =
    currentWorkspace?.workspaceCode || familyInfo?.familyCode || "KNTX-8888";
  const workspaceName =
    currentWorkspace?.name || familyInfo?.name || "Không Gian Gia Đình";

  const handleCopy = () => {
    navigator.clipboard.writeText(familyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* --- CỘT TRÁI: TÊN KHÔNG GIAN GIA ĐÌNH, MÃ MỜI & CHỈ SỐ MẠNG --- */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-red-500/20 shrink-0">
            {workspaceName.charAt(0).toUpperCase()}
          </div>

          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 truncate">
                {workspaceName}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
                {language === "vi" ? "Chủ Hộ Gia Đình" : "Family Admin"}
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-xs text-slate-600 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-slate-500">
                  {language === "vi" ? "Mã mời:" : "Invite Code:"}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono font-bold text-xs transition-colors cursor-pointer border border-slate-300/80"
                  title={language === "vi" ? "Bấm để chép mã mời" : "Click to copy code"}
                >
                  <span>{familyCode}</span>
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-500" />
                  )}
                </button>
                {copied && (
                  <span className="text-emerald-700 font-bold text-xs">
                    {language === "vi" ? "Đã chép!" : "Copied!"}
                  </span>
                )}
              </div>

              {/* Huy hiệu kết nối Dual-Chain Teleporter gọn gàng, không bị co vỡ chữ */}
              <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100/90 text-slate-700 text-[11px] font-medium border border-slate-200/80 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="font-bold text-slate-800">Family L1 (0 Gas)</span>
                <span className="text-slate-300">⚡</span>
                <span className="text-emerald-700 font-bold">Fuji C-Chain (8% APY)</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- CỘT PHẢI: BỘ NÚT HÀNH ĐỘNG NHANH CỦA CHỦ NHÀ --- */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={onOpenDeposit}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-sm transition-all hover:shadow cursor-pointer active:scale-[0.98] whitespace-nowrap"
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>{language === "vi" ? "Nạp Tiền Vào Hũ" : "Deposit Funds"}</span>
          </button>

          <button
            type="button"
            onClick={onOpenCreateVault}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-300 shadow-2xs transition-all cursor-pointer active:scale-[0.98] whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4 text-slate-600" />
            <span>{language === "vi" ? "Thêm Hũ" : "New Vault"}</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddMember}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-300 shadow-2xs transition-all cursor-pointer active:scale-[0.98] whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4 text-slate-600" />
            <span>{language === "vi" ? "Thêm Người" : "Add Member"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
