"use client";

import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export const LoginView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"WALLET" | "FAMILY">("WALLET");
  const [selectedMember, setSelectedMember] = useState<{
    role: "ELDERLY" | "CHILD";
    name: string;
    title: string;
    avatar: string;
  } | null>(null);

  const [pin, setPin] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { loginWithCoreWallet, loginAsFamilyMember, isLoading } = useAuth();

  const familyMembers = [
    {
      role: "ELDERLY" as const,
      name: "Ông Nội (Nguyễn Văn An)",
      title: "Kinetix Shield • Rút đi chợ <50$",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuB9RXFgUn83eP41jg2weE3YA8vd83fsVimUf5y0OcZS7SOQ3XPOzG_gbODV_xJIXeRQye9NHAh2TXP_28Oz-bPHhWTfscJFCZWXYRXq2gQAAtwAVTc1yseRsDx3GBa94HVhTHAal40UzoVwN7YY1IXQ5EmMOe0WhhEvzu4V7ZNBtixA0ZiaR61Ad1UJUADoRuNzug0ggIZW8eO5XEiktIZD-zCJ4THMAqG0i7Z1ivkCGPnUrjsBJg",
    },
    {
      role: "CHILD" as const,
      name: "Bé Na (Học sinh Lớp 6A)",
      title: "Kinetix Kids • Heo Đất & Việc Nhà",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAc1UhNj0E3eKWwrEAv9WJ4KTtp_4pnR4-fyhwEHSKncOxXMGgdr5EdEkF7AMpuaguOYSWTwC-3Ovp1jhOZtflnABlKorh-7E9pPfvKLow6TvFQHGxmf0EgQh_J7eX2WyhgY_obtzgCtT892o3CCd1-TKpF3WABb42fGzxm4wVTK6S7fWG0bKJKRZGbEsWybndKRK3uK6Aix2ehMS1hOr8zRyDG3ZRA0ODbqcIHWiDv1p2ayRMtyQ",
    },
  ];

  const handleWalletLogin = async () => {
    setErrorMsg(null);
    const res = await loginWithCoreWallet();
    if (!res.success && res.error) {
      setErrorMsg(res.error);
    }
  };

  const handleMemberSubmit = async (useDefaultPin: boolean = false) => {
    if (!selectedMember) return;
    setErrorMsg(null);
    const pinToSubmit = useDefaultPin ? "1234" : pin || "1234";

    const res = await loginAsFamilyMember(
      undefined,
      selectedMember.role,
      pinToSubmit
    );
    if (!res.success && res.error) {
      setErrorMsg(res.error);
    }
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
    }
  };

  const handlePinDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-surface text-on-surface relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-secondary/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-lg w-full bg-surface-container-lowest rounded-3xl p-6 sm:p-8 shadow-2xl border border-outline-variant/30 flex flex-col gap-6 relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-md">
            <span className="material-symbols-outlined text-[32px] text-secondary-container">
              family_restroom
            </span>
          </div>
          <div>
            <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
              Kinetix Family OS
            </h1>
            <p className="font-body-sm text-sm text-on-surface-variant mt-1">
              Hệ điều hành tài chính gia đình đa thế hệ trên Avalanche
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-surface-container-low rounded-2xl border border-outline-variant/20">
          <button
            onClick={() => {
              setActiveTab("WALLET");
              setSelectedMember(null);
              setErrorMsg(null);
            }}
            className={`py-2.5 px-3 rounded-xl font-label-lg text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "WALLET"
                ? "bg-surface-container-lowest text-on-surface font-bold shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">
              account_balance_wallet
            </span>
            <span>Bố Mẹ (Ví Core)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("FAMILY");
              setErrorMsg(null);
            }}
            className={`py-2.5 px-3 rounded-xl font-label-lg text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "FAMILY"
                ? "bg-surface-container-lowest text-on-surface font-bold shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">
              diversity_1
            </span>
            <span>Gia Đình (1-Chạm)</span>
          </button>
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: BỐ MẸ (VÍ AVALANCHE CORE) */}
        {activeTab === "WALLET" && (
          <div className="flex flex-col gap-5 py-2">
            <div className="p-4 bg-surface-container-low rounded-2xl flex flex-col gap-2 border border-outline-variant/20">
              <div className="flex items-center gap-2 text-secondary font-bold text-sm">
                <span className="material-symbols-outlined text-[20px]">
                  security
                </span>
                <span>Chuẩn Xác Thực EIP-4361 SIWE</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Đăng nhập mật mã không cần mật khẩu. Chữ ký số từ ví Avalanche
                Core được mã hóa thành phiên JWT an toàn 7 ngày trên Avalanche
                Family L1.
              </p>
            </div>

            <button
              onClick={handleWalletLogin}
              disabled={isLoading}
              className="w-full py-4 px-6 bg-secondary-container hover:bg-secondary text-white font-headline-sm text-base rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 cursor-pointer"
              type="button"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[22px]">
                    progress_activity
                  </span>
                  <span>Đang mở ví ký duyệt...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[24px]">
                    account_balance_wallet
                  </span>
                  <span>Kết nối ví Avalanche Core</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Tương thích Avalanche Fuji Testnet &amp; Family L1</span>
            </div>
          </div>
        )}

        {/* TAB 2: KHÔNG GIAN GIA ĐÌNH (ÔNG BÀ & CON NHỎ) */}
        {activeTab === "FAMILY" && !selectedMember && (
          <div className="flex flex-col gap-4 py-2">
            <p className="text-xs text-center text-on-surface-variant">
              Chọn tài khoản của bạn để vào ứng dụng ngay:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {familyMembers.map((m) => (
                <button
                  key={m.role}
                  onClick={() => setSelectedMember(m)}
                  className="p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 flex flex-col items-center text-center gap-3 transition-all hover:scale-102 cursor-pointer group shadow-sm"
                  type="button"
                >
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-secondary shadow-md group-hover:ring-4 group-hover:ring-secondary/20 transition-all">
                    <img
                      src={m.avatar}
                      alt={m.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-on-surface">
                      {m.name}
                    </h3>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      {m.title}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PIN DIALOG FOR SELECTED MEMBER */}
        {activeTab === "FAMILY" && selectedMember && (
          <div className="flex flex-col items-center gap-4 py-2 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 w-full p-3 bg-surface-container-low rounded-2xl border border-outline-variant/20">
              <img
                src={selectedMember.avatar}
                alt={selectedMember.name}
                className="w-12 h-12 rounded-full object-cover border border-secondary"
              />
              <div className="flex flex-col flex-1 text-left">
                <span className="font-bold text-sm text-on-surface">
                  {selectedMember.name}
                </span>
                <span className="text-xs text-on-surface-variant">
                  Nhập mã PIN 4 số (Mặc định: 1234)
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedMember(null);
                  setPin("");
                }}
                className="text-xs text-secondary hover:underline cursor-pointer"
              >
                Đổi người
              </button>
            </div>

            {/* PIN Dots */}
            <div className="flex items-center gap-4 my-2">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    pin.length > idx
                      ? "bg-secondary border-secondary scale-110"
                      : "border-outline-variant/60 bg-surface-container"
                  }`}
                />
              ))}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-[260px]">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handlePinInput(digit)}
                  className="h-12 rounded-xl bg-surface-container hover:bg-surface-container-high text-lg font-bold text-on-surface transition-all active:scale-95 cursor-pointer shadow-sm"
                  type="button"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={() => handleMemberSubmit(true)}
                className="h-12 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-secondary transition-all cursor-pointer"
                type="button"
              >
                Bỏ qua
              </button>
              <button
                onClick={() => handlePinInput("0")}
                className="h-12 rounded-xl bg-surface-container hover:bg-surface-container-high text-lg font-bold text-on-surface transition-all active:scale-95 cursor-pointer shadow-sm"
                type="button"
              >
                0
              </button>
              <button
                onClick={handlePinDelete}
                className="h-12 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">
                  backspace
                </span>
              </button>
            </div>

            {/* Submit Button */}
            <button
              onClick={() => handleMemberSubmit(false)}
              disabled={isLoading || pin.length < 4}
              className="w-full py-3.5 bg-secondary-container hover:bg-secondary text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer mt-1"
              type="button"
            >
              {isLoading ? "Đang xác thực..." : "Vào ứng dụng ngay"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
