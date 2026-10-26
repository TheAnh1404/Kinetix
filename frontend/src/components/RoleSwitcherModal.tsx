"use client";

import React, { useState } from "react";
import { DemoMember } from "../types";
import { useFamily } from "@/context/FamilyContext";

interface RoleSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMember: DemoMember;
  onSelectMember: (member: DemoMember) => void;
}

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentMember,
  onSelectMember,
}) => {
  const { members, familyInfo, addMemberToFamily } = useFamily();

  // State thêm thành viên mới
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<"GUARDIAN" | "ELDERLY" | "CHILD">("ELDERLY");
  const [newPhone, setNewPhone] = useState("");
  const [newPin, setNewPin] = useState("1234");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    if (familyInfo?.familyCode) {
      navigator.clipboard.writeText(familyInfo.familyCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    if (!newFullName.trim()) {
      setErrorText("Vui lòng nhập Họ tên thành viên.");
      return;
    }

    setIsSubmitting(true);
    const res = await addMemberToFamily({
      fullName: newFullName.trim(),
      role: newRole,
      phoneNumber: newPhone.trim() || undefined,
      pinCode: newPin.trim() || "1234",
    });
    setIsSubmitting(false);

    if (res.success) {
      setIsAddingMember(false);
      setNewFullName("");
      setNewPhone("");
      setNewPin("1234");
    } else {
      setErrorText(res.error || "Thêm thành viên thất bại.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-outline-variant/30 flex flex-col gap-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-container-low">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-secondary-container text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">
                family_restroom
              </span>
            </div>
            <div>
              <h3 className="font-headline-sm text-base sm:text-lg font-bold text-on-surface">
                Thành Viên {familyInfo?.name || "Gia Đình"}
              </h3>
              <p className="text-[11px] text-on-surface-variant">
                Quản lý hồ sơ phân quyền 3 thế hệ trong cơ sở dữ liệu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Mã gia đình banner */}
        {familyInfo?.familyCode && (
          <div className="p-3 bg-surface-container-low rounded-2xl flex items-center justify-between border border-secondary/20">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-secondary">
                vpn_key
              </span>
              <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant">
                  Mã Mời Gia Đình (Family Code)
                </span>
                <span className="font-mono font-bold text-sm text-on-surface tracking-wider">
                  {familyInfo.familyCode}
                </span>
              </div>
            </div>
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-secondary text-on-surface hover:text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">
                {copiedCode ? "check" : "content_copy"}
              </span>
              <span>{copiedCode ? "Đã chép" : "Sao chép"}</span>
            </button>
          </div>
        )}

        {/* Danh sách thành viên hoặc Form Thêm mới */}
        {!isAddingMember ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface-variant uppercase">
                Danh sách thành viên ({members.length})
              </span>
              <button
                onClick={() => setIsAddingMember(true)}
                className="px-3 py-1 rounded-xl bg-secondary-container hover:bg-secondary text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Thêm Thành Viên</span>
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1">
              {members.map((member) => {
                const isSelected = member.id === currentMember.id;
                return (
                  <div
                    key={member.id}
                    onClick={() => {
                      onSelectMember(member);
                      onClose();
                    }}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-secondary/10 border-secondary shadow-sm ring-1 ring-secondary"
                        : "bg-surface-container-low/70 hover:bg-surface-container border-outline-variant/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-11 h-11 rounded-full object-cover shadow-sm bg-surface-container border border-outline-variant/30"
                        />
                        {isSelected && (
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-secondary rounded-full flex items-center justify-center text-[10px] text-white">
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-title-md text-sm font-bold text-on-surface">
                            {member.name}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              member.role === "ADMIN"
                                ? "bg-slate-900 text-white"
                                : member.role === "GUARDIAN"
                                ? "bg-blue-600 text-white"
                                : member.role === "ELDERLY"
                                ? "bg-amber-600 text-white"
                                : "bg-emerald-600 text-white"
                            }`}
                          >
                            {member.role}
                          </span>
                        </div>
                        <span className="text-xs text-on-surface-variant line-clamp-1">
                          {member.title}
                        </span>
                        {member.phoneNumber && (
                          <span className="text-[11px] text-on-surface-variant font-medium">
                            SĐT: {member.phoneNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-surface-container text-on-surface">
                        {member.defaultTab}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Form Thêm Thành Viên Mới trực tiếp vào DB */
          <form onSubmit={handleAddMemberSubmit} className="flex flex-col gap-3 text-left animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-1 border-b border-surface-container-low">
              <span className="text-xs font-bold text-on-surface uppercase">
                Thêm Thành Viên Vào Gia Đình
              </span>
              <button
                type="button"
                onClick={() => setIsAddingMember(false)}
                className="text-xs text-secondary hover:underline cursor-pointer"
              >
                Quay lại
              </button>
            </div>

            {errorText && (
              <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg">
                {errorText}
              </p>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">
                Họ &amp; Tên Thành Viên <span className="text-secondary">*</span>
              </label>
              <input
                type="text"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="VD: Bà Ngoại (Nguyễn Thị Mai)"
                className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs focus:outline-none focus:ring-2 focus:ring-secondary"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">
                Vai Trò Trong Gia Đình <span className="text-secondary">*</span>
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs focus:outline-none focus:ring-2 focus:ring-secondary"
              >
                <option value="ELDERLY">Ông / Bà (Kinetix Shield • Người cao tuổi)</option>
                <option value="CHILD">Con Nhỏ (Kinetix Kids • Heo đất việc nhà)</option>
                <option value="GUARDIAN">Người Bảo Hộ (Guardian • Ký duyệt đa chữ ký)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">
                Số Điện Thoại (Dùng để đăng nhập)
              </label>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="VD: 0912345678"
                className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface">
                Mã PIN Đăng Nhập Cho Thành Viên (4-6 số) <span className="text-secondary">*</span>
              </label>
              <input
                type="password"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="1234"
                className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-secondary"
                required
              />
              <span className="text-[10px] text-on-surface-variant">
                Thành viên sẽ dùng Mã Gia Đình + SĐT + Mã PIN này để đăng nhập.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingMember(false)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-secondary-container hover:bg-secondary text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
              >
                {isSubmitting ? "Đang lưu..." : "Lưu Vào Database"}
              </button>
            </div>
          </form>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-container text-on-surface font-label-lg text-xs hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
