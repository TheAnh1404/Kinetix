"use client";

import React, { useState } from "react";
import {
  Wallet,
  Shield,
  Fuel,
  Key,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Star,
  ExternalLink,
  ShieldCheck,
  Check,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  LinkedWalletItem,
  SessionKeyItem,
  SecurityScoreData,
} from "@/hooks/useSettingsData";
import { SNOWTRACE_TESTNET_URL } from "@/contracts/config";

interface ZoneSecurityWalletsGasProps {
  linkedWallets: LinkedWalletItem[];
  sessionKeys: SessionKeyItem[];
  securityScore: SecurityScoreData;
  gasPreference: "SPONSORED" | "STABLECOIN" | "NATIVE";
  uiMode: "LITE" | "PRO";
  onSetPrimaryWallet: (walletId: string) => Promise<void>;
  onLinkWallet: (payload: {
    walletAddress: string;
    walletType: "EMBEDDED_MPC" | "EXTERNAL_CORE" | "EXTERNAL_METAMASK";
    label?: string;
    isPrimaryReceiving?: boolean;
  }) => Promise<void>;
  onUpdateGasPref: (gas: "SPONSORED" | "STABLECOIN" | "NATIVE") => Promise<void>;
  onRevokeSession: (sessionId: string) => Promise<void>;
  busy?: boolean;
}

export const ZoneSecurityWalletsGas: React.FC<ZoneSecurityWalletsGasProps> = ({
  linkedWallets,
  sessionKeys,
  securityScore,
  gasPreference,
  uiMode,
  onSetPrimaryWallet,
  onLinkWallet,
  onUpdateGasPref,
  onRevokeSession,
  busy = false,
}) => {
  const [isAddingWallet, setIsAddingWallet] = useState(false);
  const [newWalletAddress, setNewWalletAddress] = useState("");
  const [newWalletType, setNewWalletType] = useState<
    "EMBEDDED_MPC" | "EXTERNAL_CORE" | "EXTERNAL_METAMASK"
  >("EXTERNAL_CORE");
  const [newWalletLabel, setNewWalletLabel] = useState("");
  const [walletError, setWalletError] = useState("");

  const handleAddWalletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalletError("");
    const addr = newWalletAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      setWalletError("Địa chỉ ví không đúng định dạng EVM 40 ký tự hex.");
      return;
    }
    try {
      await onLinkWallet({
        walletAddress: addr,
        walletType: newWalletType,
        label: newWalletLabel.trim() || undefined,
        isPrimaryReceiving: linkedWallets.length === 0,
      });
      setNewWalletAddress("");
      setNewWalletLabel("");
      setIsAddingWallet(false);
    } catch (err: any) {
      setWalletError(err.message || "Lỗi liên kết ví.");
    }
  };

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* 1. THƯỚC ĐO ĐIỂM AN TOÀN BẢO MẬT (SECURITY SCORE) */}
      {/* ============================================================== */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center font-bold">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Điểm An Toàn Bảo Mật (Security Health Score)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Đánh giá mức độ an toàn quỹ và khả năng chống gian lận
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {securityScore.score}/100
            </span>
            <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
              Mức độ: {securityScore.level}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              securityScore.score >= 80
                ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                : securityScore.score >= 50
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                  : "bg-gradient-to-r from-rose-500 to-red-400"
            }`}
            style={{ width: `${securityScore.score}%` }}
          />
        </div>

        {/* Factors Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {securityScore.factors.map((factor, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800"
            >
              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
              <span>{factor}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. HYBRID WALLET SWITCHER (QUẢN LÝ VÍ LAI) */}
      {/* ============================================================== */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center font-bold">
              <Wallet size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Bộ Chuyển Đổi Ví Lai (Hybrid Wallet Switcher)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Kết hợp song song Ví tích hợp (Passkey) và Ví ngoài (Core/MetaMask)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingWallet(!isAddingWallet)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Thêm Ví Mới</span>
          </button>
        </div>

        {/* Add Wallet Form Drawer */}
        {isAddingWallet && (
          <form
            onSubmit={handleAddWalletSubmit}
            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in"
          >
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Liên kết Ví Web3 mới vào tài khoản:
            </h4>
            {walletError && (
              <p className="text-xs text-rose-600 font-semibold">{walletError}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Địa chỉ ví (0x...)"
                value={newWalletAddress}
                onChange={(e) => setNewWalletAddress(e.target.value)}
                required
                className="col-span-1 sm:col-span-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
              />
              <select
                value={newWalletType}
                onChange={(e: any) => setNewWalletType(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="EXTERNAL_CORE">Avalanche Core Wallet</option>
                <option value="EXTERNAL_METAMASK">MetaMask / EVM Wallet</option>
                <option value="EMBEDDED_MPC">Passkey MPC Embedded</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nhãn ghi nhớ (ví dụ: Ví lạnh Ledger Bố)"
                value={newWalletLabel}
                onChange={(e) => setNewWalletLabel(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Lưu Ví
              </button>
            </div>
          </form>
        )}

        {/* Wallets List */}
        <div className="space-y-2">
          {linkedWallets.map((w) => (
            <div
              key={w.id}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                w.isPrimaryReceiving
                  ? "bg-red-50/50 dark:bg-red-950/20 border-red-300 dark:border-red-900"
                  : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                    w.isPrimaryReceiving
                      ? "bg-red-600 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <Wallet size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {w.label || "Ví Kinetix"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                      {w.walletType}
                    </span>
                    {w.isPrimaryReceiving && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold font-mono">
                        VÍ NHẬN MẶC ĐỊNH ★
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                    {w.walletAddress}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {uiMode === "PRO" && (
                  <a
                    href={`${SNOWTRACE_TESTNET_URL}/address/${w.walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    title="Xem trên Snowtrace"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
                {!w.isPrimaryReceiving && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onSetPrimaryWallet(w.id)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Đặt Làm Mặc Định
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. GAS TANK & PAYMASTER CONFIGURATION */}
      {/* ============================================================== */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center font-bold">
            <Fuel size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Cấu Hình Trả Phí Mạng (Gas Tank & Paymaster)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Chọn cơ chế thanh toán phí giao dịch khi thành viên thực hiện thao tác
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              id: "SPONSORED" as const,
              title: "Tài Trợ 100% (Khuyến Nghị)",
              desc: "Gia đình hoặc Appchain tài trợ 0 gas fee cho thành viên",
              badge: "0 Gas • Miễn Phí",
              color: "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20",
            },
            {
              id: "STABLECOIN" as const,
              title: "Trừ Phí Bằng USDC",
              desc: "Tự động quy đổi và trừ phí mạng vào số dư USDC",
              badge: "Tiện Lợi",
              color: "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
            },
            {
              id: "NATIVE" as const,
              title: "Tự Chi Trả Bằng AVAX",
              desc: "Thành viên dùng số dư AVAX gốc của ví để ký gửi giao dịch",
              badge: "Web3 Native",
              color: "border-red-500 bg-red-50/50 dark:bg-red-950/20",
            },
          ].map((item) => {
            const isSelected = gasPreference === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={busy}
                onClick={() => onUpdateGasPref(item.id)}
                className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? `${item.color} ring-2 ring-red-500 shadow-xs`
                    : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {item.title}
                    </span>
                    {isSelected && (
                      <CheckCircle2 size={16} className="text-red-600 font-bold" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">{item.desc}</p>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 mt-3 block">
                  {item.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. SECURITY SHIELD & SESSION KEYS (QUẢN LÝ PHIÊN KÝ TỰ ĐỘNG) */}
      {/* ============================================================== */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center font-bold">
              <Key size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Phiên Ký Tự Động & Session Keys
              </h3>
              <p className="text-[11px] text-slate-500">
                Ủy quyền có giới hạn cho AI Agent hoặc các lệnh giải ngân định kỳ
              </p>
            </div>
          </div>
        </div>

        {sessionKeys.length === 0 ? (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-center text-xs text-slate-500">
            Chưa có Session Key nào đang hoạt động. Các tác vụ định kỳ sẽ yêu cầu ký thủ công.
          </div>
        ) : (
          <div className="space-y-2">
            {sessionKeys.map((s) => (
              <div
                key={s.id}
                className="p-3.5 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {s.label}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                        s.isRevoked
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      }`}
                    >
                      {s.isRevoked ? "ĐÃ THU HỒI" : "ĐANG HOẠT ĐỘNG"}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                    Khóa: {s.sessionKeyAddress}
                  </p>
                </div>

                {!s.isRevoked && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onRevokeSession(s.id)}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    Thu Hồi Quyền
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
