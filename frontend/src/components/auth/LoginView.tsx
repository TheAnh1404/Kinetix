"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";

type AuthMode = "LOGIN" | "REGISTER_FAMILY" | "JOIN_FAMILY";
type LoginTab = "WALLET" | "FAMILY_CREDENTIALS";

export const LoginView: React.FC = () => {
  const [authMode, setAuthMode] = useState<AuthMode>("LOGIN");
  const [loginTab, setLoginTab] = useState<LoginTab>("WALLET");

  // State cho Form Đăng Nhập Thành Viên
  const [memberFamilyCode, setMemberFamilyCode] = useState<string>("");
  const [memberIdentifier, setMemberIdentifier] = useState<string>("");
  const [memberPin, setMemberPin] = useState<string>("");

  // State cho Form Tạo Gia Đình Mới
  const [newFamilyName, setNewFamilyName] = useState<string>("");
  const [newAdminName, setNewAdminName] = useState<string>("");
  const [newAdminPhone, setNewAdminPhone] = useState<string>("");
  const [newAdminPin, setNewAdminPin] = useState<string>("");

  // State cho Form Gia Nhập Gia Đình
  const [joinFamilyCode, setJoinFamilyCode] = useState<string>("");
  const [joinMemberName, setJoinMemberName] = useState<string>("");
  const [joinPhone, setJoinPhone] = useState<string>("");
  const [joinPin, setJoinPin] = useState<string>("");

  // Phản hồi & Trạng thái
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [unregisteredWallet, setUnregisteredWallet] = useState<string | null>(null);
  const [hasWallet, setHasWallet] = useState<boolean>(true);

  const {
    loginWithCoreWallet,
    loginAsMember,
    registerFamily,
    joinFamily,
    isWalletExtensionAvailable,
    isLoading,
  } = useAuth();

  const { language, toggleLanguage, t } = useLanguage();

  useEffect(() => {
    setHasWallet(isWalletExtensionAvailable());
  }, [isWalletExtensionAvailable]);

  // Xóa thông báo khi đổi tab/mode
  const resetFeedback = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setUnregisteredWallet(null);
  };

  /**
   * 1. Xử lý Đăng nhập bằng Ví Avalanche Core
   */
  const handleWalletLogin = async () => {
    resetFeedback();
    const res = await loginWithCoreWallet();
    if (!res.success) {
      if (res.isUnregistered && res.unregisteredAddress) {
        setUnregisteredWallet(res.unregisteredAddress);
        setErrorMsg(
          language === "vi"
            ? res.error || "Địa chỉ ví này chưa được đăng ký trong hệ thống."
            : "This wallet is not yet registered with any family in Kinetix."
        );
      } else {
        setErrorMsg(res.error || (language === "vi" ? "Đăng nhập ví thất bại." : "Wallet login failed."));
      }
    }
  };

  /**
   * 2. Xử lý Đăng nhập Thành viên (Family Code + SĐT/Tên + PIN)
   */
  const handleMemberLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (!memberFamilyCode.trim()) {
      setErrorMsg(language === "vi" ? "Vui lòng nhập Mã Gia Đình." : "Please enter your Family Code.");
      return;
    }
    if (!memberIdentifier.trim()) {
      setErrorMsg(language === "vi" ? "Vui lòng nhập Số điện thoại hoặc Họ tên." : "Please enter your Phone or Full Name.");
      return;
    }
    if (!memberPin.trim()) {
      setErrorMsg(language === "vi" ? "Vui lòng nhập Mã PIN bảo mật." : "Please enter your Security PIN.");
      return;
    }

    const res = await loginAsMember({
      familyCode: memberFamilyCode.trim().toUpperCase(),
      identifier: memberIdentifier.trim(),
      pinCode: memberPin.trim(),
    });

    if (!res.success && res.error) {
      setErrorMsg(res.error);
    }
  };

  /**
   * 3. Xử lý Tạo Gia Đình Mới (Register Family)
   */
  const handleRegisterFamilySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (!newFamilyName.trim()) {
      setErrorMsg(language === "vi" ? "Vui lòng nhập Tên Gia Đình." : "Please enter Family Name.");
      return;
    }
    if (!newAdminName.trim()) {
      setErrorMsg(language === "vi" ? "Vui lòng nhập Họ tên Người đại diện." : "Please enter Admin Full Name.");
      return;
    }

    const res = await registerFamily({
      familyName: newFamilyName.trim(),
      adminName: newAdminName.trim(),
      phoneNumber: newAdminPhone.trim() || undefined,
      pinCode: newAdminPin.trim() || "1234",
    });

    if (!res.success && res.error) {
      setErrorMsg(res.error);
    }
  };

  /**
   * 4. Xử lý Gia Nhập Gia Đình (Join Family)
   */
  const handleJoinFamilySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (!joinFamilyCode.trim()) {
      setErrorMsg(language === "vi" ? "Vui lòng nhập Mã Gia Đình cần tham gia." : "Please enter the Family Code.");
      return;
    }
    if (!joinMemberName.trim()) {
      setErrorMsg(language === "vi" ? "Vui lòng nhập Họ tên của bạn." : "Please enter your Full Name.");
      return;
    }

    const res = await joinFamily({
      familyCode: joinFamilyCode.trim().toUpperCase(),
      memberName: joinMemberName.trim(),
      phoneNumber: joinPhone.trim() || undefined,
      pinCode: joinPin.trim() || "1234",
    });

    if (!res.success && res.error) {
      setErrorMsg(res.error);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-surface text-on-surface relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-secondary/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-xl w-full bg-surface-container-lowest rounded-3xl p-6 sm:p-9 shadow-2xl border border-outline-variant/30 flex flex-col gap-6 relative z-10 transition-all">
        
        {/* Top bar with back to home & language toggle */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>{language === "vi" ? "Trang Chủ" : "Home"}</span>
          </Link>

          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-xs font-bold text-on-surface transition-all cursor-pointer shadow-sm"
            type="button"
          >
            <span>{language === "vi" ? "🇻🇳" : "🇬🇧"}</span>
            <span className="uppercase font-mono">{language === "vi" ? "VI" : "EN"}</span>
          </button>
        </div>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-md">
            <span className="material-symbols-outlined text-[32px] text-secondary-container">
              family_restroom
            </span>
          </div>
          <div>
            <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
              {t("auth.title")}
            </h1>
            <p className="font-body-sm text-sm text-on-surface-variant mt-1">
              {t("auth.subtitle")}
            </p>
          </div>
        </div>

        {/* Chế độ xác thực: Đăng Nhập / Tạo Gia Đình / Gia Nhập */}
        <div className="flex items-center justify-center p-1 bg-surface-container-low rounded-2xl border border-outline-variant/20 gap-1 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => {
              setAuthMode("LOGIN");
              resetFeedback();
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl transition-all cursor-pointer text-center ${
              authMode === "LOGIN"
                ? "bg-surface-container-lowest text-on-surface font-bold shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            type="button"
          >
            {t("auth.tab.login")}
          </button>

          <button
            onClick={() => {
              setAuthMode("REGISTER_FAMILY");
              resetFeedback();
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl transition-all cursor-pointer text-center ${
              authMode === "REGISTER_FAMILY"
                ? "bg-surface-container-lowest text-on-surface font-bold shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            type="button"
          >
            {t("auth.tab.register")}
          </button>

          <button
            onClick={() => {
              setAuthMode("JOIN_FAMILY");
              resetFeedback();
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl transition-all cursor-pointer text-center ${
              authMode === "JOIN_FAMILY"
                ? "bg-surface-container-lowest text-on-surface font-bold shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            type="button"
          >
            {t("auth.tab.join")}
          </button>
        </div>

        {/* Thông báo lỗi */}
        {errorMsg && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs sm:text-sm rounded-2xl flex items-start gap-2.5 animate-in fade-in duration-200">
            <span className="material-symbols-outlined text-[20px] text-red-600 shrink-0 mt-0.5">
              error
            </span>
            <div className="flex-1 leading-relaxed text-left">
              <span>{errorMsg}</span>

              {/* Nếu ví chưa đăng ký, hiển thị shortcut điều hướng */}
              {unregisteredWallet && (
                <div className="mt-2.5 pt-2 border-t border-red-500/20 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setAuthMode("REGISTER_FAMILY");
                      resetFeedback();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-secondary text-white font-bold text-xs shadow-sm hover:opacity-90 transition-opacity"
                    type="button"
                  >
                    + {language === "vi" ? "Tạo Gia Đình Mới với ví này" : "Create Family with this wallet"}
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode("JOIN_FAMILY");
                      resetFeedback();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface font-bold text-xs hover:bg-surface-container transition-colors"
                    type="button"
                  >
                    🔗 {language === "vi" ? "Nhập Mã Gia Nhập" : "Join Existing Family"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Thông báo thành công */}
        {successMsg && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm rounded-2xl flex items-center gap-2.5 animate-in fade-in duration-200">
            <span className="material-symbols-outlined text-[20px] text-emerald-600 shrink-0">
              check_circle
            </span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CHẾ ĐỘ 1: ĐĂNG NHẬP (SIGN IN) */}
        {/* ========================================================================= */}
        {authMode === "LOGIN" && (
          <div className="flex flex-col gap-5 animate-in fade-in duration-200">
            {/* Sub-tab Switcher: Ví Web3 vs Thành viên Gia đình */}
            <div className="grid grid-cols-2 p-1 bg-surface-container-low rounded-xl border border-outline-variant/20">
              <button
                onClick={() => {
                  setLoginTab("WALLET");
                  resetFeedback();
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  loginTab === "WALLET"
                    ? "bg-surface-container-lowest text-on-surface shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">
                  account_balance_wallet
                </span>
                <span>{t("auth.wallet.title")}</span>
              </button>

              <button
                onClick={() => {
                  setLoginTab("FAMILY_CREDENTIALS");
                  resetFeedback();
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  loginTab === "FAMILY_CREDENTIALS"
                    ? "bg-surface-container-lowest text-on-surface shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">
                  diversity_1
                </span>
                <span>{t("auth.credentials.title")}</span>
              </button>
            </div>

            {/* TAB A: ĐĂNG NHẬP VÍ CORE (SIWE) */}
            {loginTab === "WALLET" && (
              <div className="flex flex-col gap-4">
                <div className="p-4 bg-surface-container-low rounded-2xl flex flex-col gap-2 border border-outline-variant/20 text-left">
                  <div className="flex items-center gap-2 text-secondary font-bold text-sm">
                    <span className="material-symbols-outlined text-[20px]">
                      security
                    </span>
                    <span>{language === "vi" ? "Xác Thực Mật Mã EIP-4361 SIWE" : "SIWE EIP-4361 Cryptographic Auth"}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {language === "vi"
                      ? "Đăng nhập bảo mật không cần mật khẩu. Chữ ký mật mã từ ví Avalanche Core được đối soát trực tiếp với cơ sở dữ liệu gia đình."
                      : "Passwordless authentication. Signatures from Avalanche Core are matched directly against PostgreSQL family records."}
                  </p>
                </div>

                {!hasWallet && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-900 rounded-xl text-xs flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[20px] text-amber-600 shrink-0 mt-0.5">
                      info
                    </span>
                    <div className="flex-1 leading-relaxed text-left">
                      <p className="font-semibold">{language === "vi" ? "Chưa phát hiện tiện ích ví Avalanche Core" : "Avalanche Core extension not detected"}</p>
                      <p className="mt-0.5 text-amber-800/90">
                        {language === "vi" ? "Cài đặt tại " : "Install at "}
                        <a
                          href="https://core.app/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline font-bold text-secondary hover:text-secondary-container"
                        >
                          core.app
                        </a>{" "}
                        {language === "vi" ? "hoặc đăng nhập bằng tab Thành Viên (PIN/SĐT)." : "or sign in via the Family Member (PIN/Phone) tab."}
                      </p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleWalletLogin}
                  disabled={isLoading}
                  className="w-full py-4 px-6 bg-secondary-container hover:bg-secondary text-white font-headline-sm text-base rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
                  type="button"
                >
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[22px]">
                        progress_activity
                      </span>
                      <span>{t("auth.wallet.connecting")}</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[24px]">
                        login
                      </span>
                      <span>{t("auth.wallet.btn")}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* TAB B: ĐĂNG NHẬP THÀNH VIÊN GIA ĐÌNH (ÔNG BÀ, CON NHỎ) */}
            {loginTab === "FAMILY_CREDENTIALS" && (
              <form onSubmit={handleMemberLoginSubmit} className="flex flex-col gap-4 text-left">
                <div className="p-3.5 bg-surface-container-low rounded-2xl flex items-center gap-3 border border-outline-variant/20">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">family_star</span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {language === "vi"
                      ? "Dành cho Ông Bà, Con Nhỏ hoặc người thân đăng nhập thiết bị phụ không cần ví Web3."
                      : "For Grandparents, Children, or relatives signing in on secondary devices without Web3."}
                  </p>
                </div>

                {/* Mã gia đình */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wide">
                    {t("auth.member.familyCode")} <span className="text-secondary">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={memberFamilyCode}
                      onChange={(e) => setMemberFamilyCode(e.target.value.toUpperCase())}
                      placeholder="VD: KNTX-8888"
                      className="w-full p-3.5 pl-10 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface font-mono font-bold tracking-wider text-sm focus:outline-none focus:ring-2 focus:ring-secondary uppercase placeholder:normal-case placeholder:font-normal placeholder:tracking-normal"
                      required
                    />
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                      vpn_key
                    </span>
                  </div>
                </div>

                {/* Số điện thoại hoặc tên */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wide">
                    {t("auth.member.identifier")} <span className="text-secondary">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={memberIdentifier}
                      onChange={(e) => setMemberIdentifier(e.target.value)}
                      placeholder={language === "vi" ? "VD: 0901234567 hoặc Ông Nội" : "e.g. 0901234567 or Grandfather"}
                      className="w-full p-3.5 pl-10 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                      required
                    />
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                      person
                    </span>
                  </div>
                </div>

                {/* Mã PIN */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface uppercase tracking-wide">
                    {t("auth.member.pin")} <span className="text-secondary">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      maxLength={6}
                      value={memberPin}
                      onChange={(e) => setMemberPin(e.target.value)}
                      placeholder="••••"
                      className="w-full p-3.5 pl-10 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface font-mono text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-secondary"
                      required
                    />
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                      lock
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 px-6 bg-secondary-container hover:bg-secondary text-white font-headline-sm text-sm rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[20px]">
                        progress_activity
                      </span>
                      <span>{language === "vi" ? "Đang xác thực..." : "Verifying..."}</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">
                        arrow_forward
                      </span>
                      <span>{t("auth.member.btn")}</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* CHẾ ĐỘ 2: TẠO GIA ĐÌNH MỚI (REGISTER NEW FAMILY) */}
        {/* ========================================================================= */}
        {authMode === "REGISTER_FAMILY" && (
          <form onSubmit={handleRegisterFamilySubmit} className="flex flex-col gap-4 text-left animate-in fade-in duration-200">
            <div className="p-3.5 bg-surface-container-low rounded-2xl flex items-center gap-3 border border-outline-variant/20">
              <div className="w-9 h-9 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">add_home</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {language === "vi"
                  ? "Tạo tổ hợp tài chính mới trên Avalanche. Ví Core của bạn sẽ trở thành Người quản trị (Admin) gia đình."
                  : "Create a new family vault on Avalanche. Your Core Wallet will become the Family Admin."}
              </p>
            </div>

            {/* Tên gia đình */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface uppercase tracking-wide">
                {t("auth.register.familyName")} <span className="text-secondary">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={newFamilyName}
                  onChange={(e) => setNewFamilyName(e.target.value)}
                  placeholder={language === "vi" ? "VD: Gia đình Tuấn Anh" : "e.g. Miller Family Vault"}
                  className="w-full p-3.5 pl-10 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                  required
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                  cottage
                </span>
              </div>
            </div>

            {/* Tên người quản trị */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface uppercase tracking-wide">
                {t("auth.register.adminName")} <span className="text-secondary">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder={language === "vi" ? "VD: Nguyễn Tuấn Anh (Bố)" : "e.g. John Miller (Father)"}
                  className="w-full p-3.5 pl-10 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                  required
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                  badge
                </span>
              </div>
            </div>

            {/* Số điện thoại */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface uppercase tracking-wide">
                {t("auth.register.phone")}
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={newAdminPhone}
                  onChange={(e) => setNewAdminPhone(e.target.value)}
                  placeholder="VD: 0901234567"
                  className="w-full p-3.5 pl-10 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                  call
                </span>
              </div>
            </div>

            {/* Mã PIN quản trị */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface uppercase tracking-wide">
                {t("auth.register.pin")} <span className="text-secondary">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  maxLength={6}
                  value={newAdminPin}
                  onChange={(e) => setNewAdminPin(e.target.value)}
                  placeholder="1234"
                  className="w-full p-3.5 pl-10 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface font-mono text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-secondary"
                  required
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                  pin
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-6 bg-secondary-container hover:bg-secondary text-white font-headline-sm text-sm rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">
                    progress_activity
                  </span>
                  <span>{language === "vi" ? "Đang khởi tạo..." : "Initializing..."}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">
                    how_to_reg
                  </span>
                  <span>{t("auth.register.btn")}</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* CHẾ ĐỘ 3: GIA NHẬP GIA ĐÌNH CÓ SẴN (JOIN FAMILY) */}
        {/* ========================================================================= */}
        {authMode === "JOIN_FAMILY" && (
          <form onSubmit={handleJoinFamilySubmit} className="flex flex-col gap-4 text-left animate-in fade-in duration-200">
            <div className="p-3.5 bg-surface-container-low rounded-2xl flex items-center gap-3 border border-outline-variant/20">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">group_add</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {language === "vi"
                  ? "Dành cho các con / người bảo hộ kết nối ví Avalanche và tham gia vào một gia đình đã có sẵn."
                  : "For adult children and guardians to connect their Avalanche wallet and join an existing family."}
              </p>
            </div>

            {/* Mã gia đình */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface uppercase tracking-wide">
                {t("auth.join.familyCode")} <span className="text-secondary">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={joinFamilyCode}
                  onChange={(e) => setJoinFamilyCode(e.target.value.toUpperCase())}
                  placeholder="VD: KNTX-8888"
                  className="w-full p-3.5 pl-10 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface font-mono font-bold tracking-wider text-sm focus:outline-none focus:ring-2 focus:ring-secondary uppercase placeholder:normal-case placeholder:font-normal placeholder:tracking-normal"
                  required
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                  vpn_key
                </span>
              </div>
            </div>

            {/* Họ tên thành viên */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface uppercase tracking-wide">
                {t("auth.join.name")} <span className="text-secondary">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={joinMemberName}
                  onChange={(e) => setJoinMemberName(e.target.value)}
                  placeholder={language === "vi" ? "VD: Nguyễn Thị Mai (Cô Út)" : "e.g. Mary Miller (Guardian)"}
                  className="w-full p-3.5 pl-10 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                  required
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                  person
                </span>
              </div>
            </div>

            {/* Số điện thoại */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface uppercase tracking-wide">
                {t("auth.join.phone")}
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={joinPhone}
                  onChange={(e) => setJoinPhone(e.target.value)}
                  placeholder="VD: 0902345678"
                  className="w-full p-3.5 pl-10 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                  call
                </span>
              </div>
            </div>

            {/* Mã PIN */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface uppercase tracking-wide">
                {t("auth.join.pin")} <span className="text-secondary">*</span>
              </label>
              <div className="relative">
                <input
                  type="password"
                  maxLength={6}
                  value={joinPin}
                  onChange={(e) => setJoinPin(e.target.value)}
                  placeholder="1234"
                  className="w-full p-3.5 pl-10 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface font-mono text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-secondary"
                  required
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                  pin
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-6 bg-secondary-container hover:bg-secondary text-white font-headline-sm text-sm rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">
                    progress_activity
                  </span>
                  <span>{language === "vi" ? "Đang kết nối & gia nhập..." : "Joining..."}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">
                    group_add
                  </span>
                  <span>{t("auth.join.btn")}</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Chân trang an toàn */}
        <div className="flex items-center justify-center gap-2 text-xs text-on-surface-variant/80 border-t border-outline-variant/20 pt-4">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Avalanche Family L1 &amp; Neon Serverless PostgreSQL</span>
        </div>

      </div>
    </div>
  );
};
