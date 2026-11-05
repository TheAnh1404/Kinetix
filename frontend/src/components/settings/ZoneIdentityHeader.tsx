"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Camera,
  User,
  Sparkles,
} from "lucide-react";
import { SettingsUser } from "@/hooks/useSettingsData";
import { DEFAULT_AVATAR } from "./AvatarStudio";
import { ReceiveQrModal } from "./ReceiveQrModal";
import { SNOWTRACE_TESTNET_URL } from "@/contracts/config";

interface ZoneIdentityHeaderProps {
  user: SettingsUser;
  uiMode: "LITE" | "PRO";
  onOpenAvatarStudio: () => void;
}

export const ZoneIdentityHeader: React.FC<ZoneIdentityHeaderProps> = ({
  user,
  uiMode,
  onOpenAvatarStudio,
}) => {
  const [copied, setCopied] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);

  const primaryAddress = user.primaryWallet || "";

  const handleCopy = () => {
    if (!primaryAddress) return;
    navigator.clipboard?.writeText(primaryAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatShortAddress = (addr: string) => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-50 via-white to-red-50/20 dark:from-slate-900/90 dark:via-slate-900 dark:to-red-950/20 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
      {/* Decorative Background Accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: Avatar & Identity Details */}
        <div className="flex items-center gap-4">
          {/* Avatar with Camera Button */}
          <div className="relative group shrink-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-white dark:border-slate-800 shadow-md bg-slate-100 dark:bg-slate-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user.avatarUrl || DEFAULT_AVATAR}
                alt={user.fullName}
                className="w-full h-full object-cover"
              />
            </div>
            <button
              type="button"
              onClick={onOpenAvatarStudio}
              className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md transition-transform group-hover:scale-110 cursor-pointer"
              title="Mở Avatar Studio"
            >
              <Camera size={14} />
            </button>
          </div>

          {/* Text Details */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {user.fullName || "Người Dùng Kinetix"}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1 font-mono">
                <ShieldCheck size={12} />
                <span>eKYC Verified</span>
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {user.phoneNumber ? `SĐT: ${user.phoneNumber}` : "Tài khoản gia đình Kinetix"} •{" "}
              <span className="text-red-600 dark:text-red-400 font-semibold">
                {user.authMethod === "PASSKEY_EMBEDDED" ? "Passkey Không Hạt Giống" : "Ví Core Avalanche"}
              </span>
            </p>

            {/* Web3 Primary Address Badge */}
            {primaryAddress && (
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-slate-500">Ví chính:</span>
                  <span>
                    {uiMode === "PRO" ? primaryAddress : formatShortAddress(primaryAddress)}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="ml-1 p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                    title="Sao chép địa chỉ ví"
                  >
                    {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  </button>
                </div>

                {uiMode === "PRO" && (
                  <a
                    href={`${SNOWTRACE_TESTNET_URL}/address/${primaryAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-red-600 dark:text-red-400 hover:underline inline-flex items-center gap-0.5 font-bold"
                  >
                    <span>Explorer</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={() => setIsQrOpen(true)}
            disabled={!primaryAddress}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition-colors cursor-pointer"
          >
            <QrCode size={16} className="text-red-600" />
            <span>Mã QR Nhận Tiền</span>
          </button>

          <button
            type="button"
            onClick={onOpenAvatarStudio}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors cursor-pointer"
          >
            <Sparkles size={15} />
            <span className="hidden sm:inline">Avatar Studio</span>
          </button>
        </div>
      </div>

      {/* QR Modal */}
      <ReceiveQrModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        walletAddress={primaryAddress}
        userName={user.fullName}
      />
    </div>
  );
};
