"use client";

import React, { useState } from "react";
import { useFamily } from "@/context/FamilyContext";
import { useLanguage } from "@/context/LanguageContext";

interface MemberManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MemberManagementModal: React.FC<MemberManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { familyInfo, addMemberToFamily } = useFamily();
  const { t, language } = useLanguage();

  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"ADMIN" | "GUARDIAN" | "ELDERLY" | "CHILD">("CHILD");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    if (familyInfo?.familyCode) {
      navigator.clipboard.writeText(familyInfo.familyCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setErrorMessage(language === "vi" ? "Vui lòng nhập họ và tên." : "Please enter full name.");
      return;
    }

    if (pinCode && pinCode.length < 4) {
      setErrorMessage(language === "vi" ? "Mã PIN phải từ 4-6 số." : "PIN must be 4-6 digits.");
      return;
    }

    setIsSubmitting(true);
    const result = await addMemberToFamily({
      fullName: fullName.trim(),
      role,
      phoneNumber: phoneNumber.trim() || undefined,
      pinCode: pinCode.trim() || undefined,
      walletAddress: walletAddress.trim() || undefined,
    });
    setIsSubmitting(false);

    if (result.success) {
      setSuccessMessage(
        language === "vi"
          ? `Đã thêm thành viên "${fullName}" thành công vào gia đình!`
          : `Member "${fullName}" added to family successfully!`
      );
      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
        setFullName("");
        setPhoneNumber("");
        setPinCode("");
        setWalletAddress("");
      }, 1500);
    } else {
      setErrorMessage(result.error || (language === "vi" ? "Lỗi thêm thành viên" : "Failed to add member"));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest max-w-lg w-full rounded-2xl p-6 shadow-2xl flex flex-col gap-4 border border-outline-variant/30">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-container-low">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[24px]">group_add</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-lg font-bold text-on-surface">
                {t("dash.members.addTitle")}
              </h3>
              <p className="text-xs text-on-surface-variant font-medium">
                {t("dash.members.addDesc")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Quick Invite Code Banner */}
        {familyInfo?.familyCode && (
          <div className="p-3 bg-surface-container-low rounded-xl border border-secondary/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">vpn_key</span>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
                  {language === "vi" ? "Mã mời tự gia nhập" : "Family Invite Code"}
                </span>
                <span className="font-mono text-sm font-extrabold text-on-surface tracking-widest">
                  {familyInfo.familyCode}
                </span>
              </div>
            </div>
            <button
              onClick={handleCopyCode}
              type="button"
              className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">
                {copied ? "check" : "content_copy"}
              </span>
              <span>{copied ? (language === "vi" ? "Đã chép" : "Copied") : (language === "vi" ? "Sao chép" : "Copy")}</span>
            </button>
          </div>
        )}

        {/* Status Messages */}
        {errorMessage && (
          <div className="p-3 bg-error-container/30 border border-error/30 rounded-xl text-xs text-error font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Full Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-on-surface">
              {language === "vi" ? "Họ và Tên Thành Viên *" : "Member Full Name *"}
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={language === "vi" ? "VD: Bé Na hoặc Ông Nội" : "e.g. Baby Na or Grandfather"}
              className="px-3.5 py-2.5 bg-surface-container-low rounded-xl border border-outline-variant/30 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary-container"
              required
            />
          </div>

          {/* Role Selection */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-on-surface">
              {language === "vi" ? "Vai Trò Gia Đình *" : "Family Role *"}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "CHILD", labelVi: "Con Nhỏ (Chore-to-Earn)", labelEn: "Child (Chores & Save)", icon: "savings" },
                { id: "ELDERLY", labelVi: "Ông / Bà (Kinetix Shield)", labelEn: "Elderly (Anti-Scam)", icon: "elderly" },
                { id: "GUARDIAN", labelVi: "Người Bảo Hộ (2/3 Multisig)", labelEn: "Guardian (Multisig)", icon: "security" },
                { id: "ADMIN", labelVi: "Quản Trị Viên (Bố/Mẹ)", labelEn: "Administrator (Parent)", icon: "admin_panel_settings" },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id as any)}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                    role === r.id
                      ? "bg-secondary-container/15 border-secondary text-on-surface font-bold ring-1 ring-secondary"
                      : "bg-surface-container-low border-outline-variant/30 text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] text-secondary">
                    {r.icon}
                  </span>
                  <span className="text-xs">
                    {language === "vi" ? r.labelVi : r.labelEn}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Phone Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">
                {language === "vi" ? "Số Điện Thoại (Tùy chọn)" : "Phone Number (Optional)"}
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0908889999"
                className="px-3.5 py-2.5 bg-surface-container-low rounded-xl border border-outline-variant/30 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary-container"
              />
            </div>

            {/* PIN Code */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">
                {language === "vi" ? "Mã PIN Đăng Nhập (4-6 số)" : "Login PIN (4-6 digits)"}
              </label>
              <input
                type="password"
                maxLength={6}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="123456"
                className="px-3.5 py-2.5 bg-surface-container-low rounded-xl border border-outline-variant/30 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary-container font-mono"
              />
            </div>
          </div>

          {/* Optional Wallet */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-on-surface flex items-center justify-between">
              <span>{language === "vi" ? "Địa Chỉ Ví Web3 (Nếu có)" : "Web3 Wallet (Optional)"}</span>
              <span className="text-[10px] text-on-surface-variant font-normal">
                {language === "vi" ? "Tự cấp nếu để trống" : "Auto-generated if empty"}
              </span>
            </label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="0x..."
              className="px-3.5 py-2.5 bg-surface-container-low rounded-xl border border-outline-variant/30 text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary-container"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
            >
              {language === "vi" ? "Hủy" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-secondary-container hover:bg-secondary text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  <span>{language === "vi" ? "Đang thêm..." : "Adding..."}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">person_add</span>
                  <span>{language === "vi" ? "Xác Nhận Thêm" : "Confirm Member"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
