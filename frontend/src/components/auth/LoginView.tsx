"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/context/LanguageContext";

type AuthCategory = "ADMIN_PORTAL" | "MEMBER_PORTAL";
type AdminSubTab = "CORE_WALLET" | "REGISTER_SPACE";
type MemberSubTab = "MEMBER_LOGIN" | "JOIN_SPACE";

export const LoginView: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<AuthCategory>("ADMIN_PORTAL");
  const [adminTab, setAdminTab] = useState<AdminSubTab>("CORE_WALLET");
  const [memberTab, setMemberTab] = useState<MemberSubTab>("MEMBER_LOGIN");

  // State cho Form Đăng Nhập Thành Viên
  const [memberFamilyCode, setMemberFamilyCode] = useState<string>("");
  const [memberIdentifier, setMemberIdentifier] = useState<string>("");
  const [memberPin, setMemberPin] = useState<string>("");

  // State cho Form Tạo Không Gian Mới (Chủ Gia Đình)
  const [newFamilyName, setNewFamilyName] = useState<string>("");
  const [newAdminName, setNewAdminName] = useState<string>("");
  const [newAdminPhone, setNewAdminPhone] = useState<string>("");
  const [newAdminPin, setNewAdminPin] = useState<string>("1234");

  // State cho Form Gia Nhập Không Gian
  const [joinFamilyCode, setJoinFamilyCode] = useState<string>("");
  const [joinMemberName, setJoinMemberName] = useState<string>("");
  const [joinPhone, setJoinPhone] = useState<string>("");
  const [joinPin, setJoinPin] = useState<string>("1234");

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
   * 1. Xử lý Đăng nhập bằng Ví Avalanche Core (Dành cho Chủ Gia Đình)
   */
  const handleWalletLogin = async () => {
    resetFeedback();
    const res = await loginWithCoreWallet();
    if (!res.success) {
      if (res.isUnregistered && res.unregisteredAddress) {
        setUnregisteredWallet(res.unregisteredAddress);
        setErrorMsg(
          language === "vi"
            ? "Địa chỉ ví này chưa được khởi tạo Không gian trên Kinetix. Vui lòng chuyển sang tab 'Đăng Ký Tạo Mới' để thiết lập."
            : "This wallet has no registered Workspace yet. Please switch to 'Create Workspace' to initialize."
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
      setErrorMsg(language === "vi" ? "Vui lòng nhập Mã Không Gian Gia Đình (Family Code)." : "Please enter Family Code.");
      return;
    }
    if (!memberIdentifier.trim()) {
      setErrorMsg(language === "vi" ? "Vui lòng nhập Số điện thoại hoặc Tên đăng nhập." : "Please enter your Phone or Username.");
      return;
    }
    if (!memberPin.trim()) {
      setErrorMsg(language === "vi" ? "Vui lòng nhập Mã PIN bảo mật." : "Please enter security PIN.");
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
   * 3. Xử lý Tạo Không Gian Mới (Register Workspace)
   */
  const handleRegisterFamilySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (!newFamilyName.trim()) {
      setErrorMsg(language === "vi" ? "Vui lòng nhập Tên Không Gian / Gia Đình." : "Please enter Family Name.");
      return;
    }
    if (!newAdminName.trim()) {
      setErrorMsg(language === "vi" ? "Vui lòng nhập Họ tên Người đại diện (Chủ hộ)." : "Please enter Admin Full Name.");
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
   * 4. Xử lý Gia Nhập Không Gian (Join Workspace)
   */
  const handleJoinFamilySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (!joinFamilyCode.trim()) {
      setErrorMsg(language === "vi" ? "Vui lòng nhập Mã Gia Đình cần tham gia." : "Please enter Family Code.");
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
    <div className="min-h-screen w-full flex items-center justify-center p-3 sm:p-6 bg-slate-950 text-slate-100 relative overflow-x-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-xl w-full bg-slate-900/90 backdrop-blur-xl rounded-3xl p-5 sm:p-8 shadow-2xl border border-slate-800/80 flex flex-col gap-6 relative z-10">
        
        {/* Top bar with back to home & language toggle */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>{language === "vi" ? "Về Trang Chủ" : "Home"}</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[11px] font-mono font-bold">
              Avalanche Family L1
            </span>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-xs font-bold text-slate-200 transition-all cursor-pointer shadow-sm"
              type="button"
            >
              <span>{language === "vi" ? "🇻🇳" : "🇬🇧"}</span>
              <span className="uppercase font-mono">{language === "vi" ? "VI" : "EN"}</span>
            </button>
          </div>
        </div>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white shadow-lg shadow-red-950/50">
            <span className="material-symbols-outlined text-[32px]">
              hub
            </span>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              KINETIX OS
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
              {language === "vi"
                ? "Cổng Xác Thực & Quản Lý Không Gian Tài Chính Gia Đình Trên Avalanche"
                : "Cryptographic Authentication & Family Financial Workspace on Avalanche"}
            </p>
          </div>
        </div>

        {/* 2 Danh Mục Phân Luồng Chính: Chủ Gia Đình (Laptop) vs Thành Viên (Điện Thoại) */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800 gap-1.5 text-xs font-bold">
          <button
            onClick={() => {
              setActiveCategory("ADMIN_PORTAL");
              resetFeedback();
            }}
            className={`py-3 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-center ${
              activeCategory === "ADMIN_PORTAL"
                ? "bg-red-600 text-white shadow-md shadow-red-900/30 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">laptop_mac</span>
            <span>{language === "vi" ? "Chủ Gia Đình (Laptop)" : "Parent Admin (Laptop)"}</span>
          </button>

          <button
            onClick={() => {
              setActiveCategory("MEMBER_PORTAL");
              resetFeedback();
            }}
            className={`py-3 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 text-center ${
              activeCategory === "MEMBER_PORTAL"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">smartphone</span>
            <span>{language === "vi" ? "Thành Viên (Điện Thoại)" : "Members (Mobile)"}</span>
          </button>
        </div>

        {/* Thông báo lỗi */}
        {errorMsg && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-300 text-xs sm:text-sm rounded-2xl flex items-start gap-2.5 animate-in fade-in duration-200">
            <span className="material-symbols-outlined text-[20px] text-red-400 shrink-0 mt-0.5">
              error
            </span>
            <div className="flex-1 leading-relaxed text-left">
              <span>{errorMsg}</span>
              {unregisteredWallet && (
                <div className="mt-2.5 pt-2 border-t border-red-500/20 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setActiveCategory("ADMIN_PORTAL");
                      setAdminTab("REGISTER_SPACE");
                      resetFeedback();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold text-xs shadow-sm hover:bg-red-700 transition-colors"
                    type="button"
                  >
                    + {language === "vi" ? "Tạo Không Gian Mới với ví này" : "Create Workspace with this wallet"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Thông báo thành công */}
        {successMsg && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm rounded-2xl flex items-center gap-2.5 animate-in fade-in duration-200">
            <span className="material-symbols-outlined text-[20px] text-emerald-400 shrink-0">
              check_circle
            </span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PHÂN LUỒNG 1: DÀNH CHO CHỦ GIA ĐÌNH / QUẢN TRỊ VIÊN (LAPTOP / CORE WALLET) */}
        {/* ========================================================================= */}
        {activeCategory === "ADMIN_PORTAL" && (
          <div className="flex flex-col gap-5 animate-in fade-in duration-200">
            {/* Header giải thích phân luồng */}
            <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 flex items-center gap-3 text-left">
              <div className="w-9 h-9 rounded-xl bg-red-600/10 text-red-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">laptop</span>
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">
                  {language === "vi" ? "Cổng Quản Trị Viên Chủ Hộ (Dành Cho Laptop)" : "Parent Admin Workspace (Laptop View)"}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {language === "vi"
                    ? "Sử dụng ví Avalanche Core để ký mật mã SIWE và truy cập Master Command Center toàn cảnh."
                    : "Use Avalanche Core Wallet to authenticate via SIWE EIP-4361 and access the Master Command Center."}
                </p>
              </div>
            </div>

            {/* Sub-tab: Đăng nhập ví vs Tạo Không Gian Mới */}
            <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  setAdminTab("CORE_WALLET");
                  resetFeedback();
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  adminTab === "CORE_WALLET"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                <span>{language === "vi" ? "Kết Nối Ví Core" : "Connect Core Wallet"}</span>
              </button>

              <button
                onClick={() => {
                  setAdminTab("REGISTER_SPACE");
                  resetFeedback();
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  adminTab === "REGISTER_SPACE"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">add_business</span>
                <span>{language === "vi" ? "Đăng Ký Tạo Mới" : "Create Workspace"}</span>
              </button>
            </div>

            {/* TAB ADMIN 1: KẾT NỐI VÍ CORE */}
            {adminTab === "CORE_WALLET" && (
              <div className="flex flex-col gap-4">
                <div className="p-4 bg-slate-950/60 rounded-2xl flex flex-col gap-2 border border-slate-800/80 text-left">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                    <span className="material-symbols-outlined text-[18px]">
                      security
                    </span>
                    <span>{language === "vi" ? "Xác Thực Mật Mã EIP-4361 SIWE" : "SIWE EIP-4361 Cryptographic Auth"}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {language === "vi"
                      ? "Đăng nhập an toàn không cần mật khẩu. Chữ ký mật mã từ ví Avalanche Core được đối soát trực tiếp với cơ sở dữ liệu gia đình và hợp đồng FamilyHub trên Family L1."
                      : "Passwordless authentication. Signatures from Avalanche Core are matched directly against family records and FamilyHub contract."}
                  </p>
                </div>

                {!hasWallet && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-xs flex items-start gap-2.5 text-left">
                    <span className="material-symbols-outlined text-[20px] text-amber-400 shrink-0 mt-0.5">
                      info
                    </span>
                    <div className="flex-1 leading-relaxed">
                      <p className="font-semibold">{language === "vi" ? "Chưa phát hiện tiện ích ví Avalanche Core" : "Avalanche Core extension not detected"}</p>
                      <p className="mt-0.5 text-amber-400/80">
                        {language === "vi" ? "Cài đặt tại " : "Install at "}
                        <a
                          href="https://core.app/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline font-bold text-red-400 hover:text-red-300"
                        >
                          core.app
                        </a>{" "}
                        {language === "vi" ? "hoặc đăng nhập bằng tab Thành Viên (Mã PIN)." : "or sign in via the Family Member tab."}
                      </p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleWalletLogin}
                  disabled={isLoading}
                  className="w-full py-4 px-6 bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base rounded-2xl shadow-lg shadow-red-950/40 transition-all active:scale-95 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
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
                      <span>{language === "vi" ? "Ký Ví Core & Mở Bàn Điều Hành" : "Sign Core Wallet & Open Desk"}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* TAB ADMIN 2: TẠO KHÔNG GIAN MỚI */}
            {adminTab === "REGISTER_SPACE" && (
              <form onSubmit={handleRegisterFamilySubmit} className="flex flex-col gap-4 text-left">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                    {t("auth.register.familyName")} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newFamilyName}
                    onChange={(e) => setNewFamilyName(e.target.value)}
                    placeholder={language === "vi" ? "VD: Đại Gia Đình Tuấn Anh" : "e.g. Miller Family Vault"}
                    className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                    {t("auth.register.adminName")} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    placeholder={language === "vi" ? "VD: Nguyễn Tuấn Anh (Chủ Hộ)" : "e.g. John Miller"}
                    className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                      {t("auth.register.phone")}
                    </label>
                    <input
                      type="tel"
                      value={newAdminPhone}
                      onChange={(e) => setNewAdminPhone(e.target.value)}
                      placeholder="0901234567"
                      className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                      {t("auth.register.pin")} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={newAdminPin}
                      onChange={(e) => setNewAdminPin(e.target.value)}
                      placeholder="1234"
                      className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 px-6 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
                  <span>{language === "vi" ? "Ký Ví & Khởi Tạo Không Gian" : "Sign & Create Workspace"}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* PHÂN LUỒNG 2: DÀNH CHO THÀNH VIÊN GIA ĐÌNH (ĐIỆN THOẠI / PIN 4 SỐ) */}
        {/* ========================================================================= */}
        {activeCategory === "MEMBER_PORTAL" && (
          <div className="flex flex-col gap-5 animate-in fade-in duration-200">
            {/* Header giải thích phân luồng */}
            <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 flex items-center gap-3 text-left">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">smartphone</span>
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">
                  {language === "vi" ? "Cổng Thành Viên Gia Đình (Tối Ưu Cho Điện Thoại)" : "Family Member Portal (Optimized for Mobile)"}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {language === "vi"
                    ? "Dành cho Ông Bà, Con Nhỏ & Người thân đăng nhập bằng Mã PIN bảo mật không cần ví Web3."
                    : "For Grandparents, Children & Relatives to log in with security PIN without Web3 wallet."}
                </p>
              </div>
            </div>

            {/* Sub-tab: Đăng nhập PIN vs Gia nhập gia đình */}
            <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  setMemberTab("MEMBER_LOGIN");
                  resetFeedback();
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  memberTab === "MEMBER_LOGIN"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">key</span>
                <span>{language === "vi" ? "Mã Gia Đình + PIN" : "PIN Login"}</span>
              </button>

              <button
                onClick={() => {
                  setMemberTab("JOIN_SPACE");
                  resetFeedback();
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  memberTab === "JOIN_SPACE"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">group_add</span>
                <span>{language === "vi" ? "Gia Nhập Bằng Mã" : "Join by Code"}</span>
              </button>
            </div>

            {/* TAB MEMBER 1: ĐĂNG NHẬP THÀNH VIÊN VỚI PIN */}
            {memberTab === "MEMBER_LOGIN" && (
              <form onSubmit={handleMemberLoginSubmit} className="flex flex-col gap-4 text-left">
                {/* Mã gia đình */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                    {language === "vi" ? "Mã Không Gian Gia Đình (Family Code)" : "Family Code"} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={memberFamilyCode}
                    onChange={(e) => setMemberFamilyCode(e.target.value.toUpperCase())}
                    placeholder="VD: KNTX-8888"
                    className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold tracking-wider text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                    required
                  />
                </div>

                {/* Số điện thoại hoặc tên */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                    {language === "vi" ? "Số điện thoại hoặc Tên đăng nhập" : "Phone or Username"} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={memberIdentifier}
                    onChange={(e) => setMemberIdentifier(e.target.value)}
                    placeholder={language === "vi" ? "VD: 0904567890 hoặc Ông Nội hoặc Bé Na" : "e.g. 0904567890 or Grandfather"}
                    className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                {/* Mã PIN */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                    {language === "vi" ? "Mã PIN bảo mật" : "Security PIN"} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={memberPin}
                    onChange={(e) => setMemberPin(e.target.value)}
                    placeholder="••••"
                    className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  <span>{language === "vi" ? "Đăng Nhập Vào Không Gian ➔" : "Sign In to Workspace ➔"}</span>
                </button>
              </form>
            )}

            {/* TAB MEMBER 2: GIA NHẬP BẰNG MÃ */}
            {memberTab === "JOIN_SPACE" && (
              <form onSubmit={handleJoinFamilySubmit} className="flex flex-col gap-4 text-left">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                    {language === "vi" ? "Mã Không Gian Gia Đình" : "Family Code"} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={joinFamilyCode}
                    onChange={(e) => setJoinFamilyCode(e.target.value.toUpperCase())}
                    placeholder="VD: KNTX-8888"
                    className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold tracking-wider text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                    {language === "vi" ? "Họ tên của bạn" : "Your Name"} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={joinMemberName}
                    onChange={(e) => setJoinMemberName(e.target.value)}
                    placeholder={language === "vi" ? "VD: Cô Út hoặc Anh Cả" : "e.g. Sister Mary"}
                    className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                      {language === "vi" ? "Số điện thoại" : "Phone"}
                    </label>
                    <input
                      type="tel"
                      value={joinPhone}
                      onChange={(e) => setJoinPhone(e.target.value)}
                      placeholder="0902345678"
                      className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                      {language === "vi" ? "Mã PIN 4 số" : "4-digit PIN"} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={joinPin}
                      onChange={(e) => setJoinPin(e.target.value)}
                      placeholder="1234"
                      className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[20px]">group_add</span>
                  <span>{language === "vi" ? "Gia Nhập Không Gian Ngay" : "Join Workspace"}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Chân trang an toàn */}
        <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 pt-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-mono text-[11px]">Avalanche Family L1 &amp; Fuji C-Chain</span>
          </div>
          <span className="font-mono text-[11px]">Teleporter ICM • ICTT</span>
        </div>

      </div>
    </div>
  );
};
