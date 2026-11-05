"use client";

import React, { useState } from "react";
import { Check, Copy, QrCode, X, ExternalLink, ShieldCheck } from "lucide-react";
import { SNOWTRACE_TESTNET_URL } from "@/contracts/config";

interface ReceiveQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  userName?: string;
}

export const ReceiveQrModal: React.FC<ReceiveQrModalProps> = ({
  isOpen,
  onClose,
  walletAddress,
  userName = "Thành viên Kinetix",
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!walletAddress) return;
    navigator.clipboard?.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Tạo URL mã QR qua dynamic Google Chart API hoặc SVG pattern
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(walletAddress)}`;

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative text-center text-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center mx-auto mb-3 font-bold">
          <QrCode size={24} />
        </div>

        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Mã QR Nhận Tiền
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          {userName} • Avalanche Fuji / L1
        </p>

        {/* QR Code Container */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 inline-block shadow-inner mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt="Mã QR Ví Kinetix"
            className="w-48 h-48 mx-auto rounded-lg"
          />
        </div>

        {/* Address Display & Copy */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 mb-4 flex items-center justify-between">
          <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
            {walletAddress}
          </span>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-600" />
                <span className="text-emerald-600">Đã chép</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Sao chép</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 mb-2">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>Hỗ trợ nhận AVAX, USDC và các tài sản Avalanche Fuji</span>
        </div>

        {walletAddress && (
          <a
            href={`${SNOWTRACE_TESTNET_URL}/address/${walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-bold hover:underline"
          >
            <span>Xem trên Snowtrace Explorer</span>
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
};
