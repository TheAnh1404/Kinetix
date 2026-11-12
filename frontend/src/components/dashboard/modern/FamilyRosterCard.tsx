"use client";

import React, { useState } from "react";
import {
  Users,
  Shield,
  KeyRound,
  Sparkles,
  Sliders,
  CheckCircle2,
  Plus,
  Heart,
  Baby,
  UserPlus,
} from "lucide-react";
import { FamilyMember } from "@/types";
import { useFamily } from "@/context/FamilyContext";
import { useLanguage } from "@/context/LanguageContext";
import { SafeAvatar } from "@/components/ui/SafeAvatar";

interface FamilyRosterCardProps {
  onAddMemberClick?: () => void;
  onAssignChoreClick?: (childId?: string) => void;
}

export const FamilyRosterCard: React.FC<FamilyRosterCardProps> = ({
  onAddMemberClick,
  onAssignChoreClick,
}) => {
  const { members } = useFamily();
  const { language } = useLanguage();
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "GUARDIAN":
      case "ADMIN":
        return {
          label: language === "vi" ? "Chủ hộ / Giám hộ" : "Guardian",
          bg: "bg-red-50 text-red-700 border-red-200",
          icon: Shield,
        };
      case "ELDERLY":
        return {
          label: language === "vi" ? "Ông Bà (An Sinh)" : "Elderly",
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          icon: Heart,
        };
      case "CHILD":
        return {
          label: language === "vi" ? "Con Trẻ (Heo Đất)" : "Child",
          bg: "bg-purple-50 text-purple-700 border-purple-200",
          icon: Baby,
        };
      default:
        return {
          label: language === "vi" ? "Thành Viên" : "Member",
          bg: "bg-slate-50 text-slate-700 border-slate-200",
          icon: Users,
        };
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
      {/* Tiêu đề & Tổng số thành viên */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {language === "vi"
                ? "Vòng Tròn Gia Đình (Family Circle)"
                : "Family Circle"}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {language === "vi"
                ? `Đang có ${members?.length || 0} thành viên trong không gian`
                : `${members?.length || 0} active members in workspace`}
            </p>
          </div>
        </div>

        {onAddMemberClick && (
          <button
            type="button"
            onClick={onAddMemberClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer border border-slate-300/80 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === "vi" ? "Thêm Thành Viên" : "Add Member"}</span>
          </button>
        )}
      </div>

      {/* Hiển thị thành viên thực tế */}
      {members && members.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {members.map((mem) => {
            const badge = getRoleBadge(mem.role);
            const BadgeIcon = badge.icon;
            const address = mem.walletAddress || mem.address || "";
            const displayAddress = address
              ? `${address.slice(0, 6)}...${address.slice(-4)}`
              : "Passkey / PIN";

            return (
              <div
                key={mem.id}
                className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl p-4 transition-all hover:border-slate-300 hover:shadow-xs flex flex-col justify-between"
              >
                <div>
                  {/* Header: Avatar + Tên + Badge vai trò */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <SafeAvatar
                        avatar={mem.avatar}
                        name={mem.name || mem.title}
                        role={mem.role}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-sm text-slate-900 leading-tight truncate">
                          {mem.name || mem.title || "Thành viên"}
                        </h3>
                        <span className="text-[11px] font-mono text-slate-500 truncate block">
                          {displayAddress}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${badge.bg}`}
                    >
                      <BadgeIcon className="w-3 h-3" />
                      <span>{badge.label}</span>
                    </span>
                  </div>

                  {/* Trạng thái xác thực */}
                  <div className="flex items-center justify-between text-[11px] text-slate-600 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80 mb-3">
                    <span className="flex items-center gap-1.5 font-medium truncate">
                      <KeyRound className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {mem.role === "ELDERLY" || mem.role === "CHILD"
                          ? "Passkey / PIN 4 số"
                          : "Core Wallet (EIP-4361)"}
                      </span>
                    </span>
                    <span className="flex items-center gap-1 text-emerald-700 font-bold shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Sẵn sàng
                    </span>
                  </div>

                  {/* Số điện thoại / Thông tin liên hệ nếu có */}
                  {mem.phoneNumber && (
                    <div className="text-xs text-slate-500 mb-2">
                      SĐT: <span className="font-medium text-slate-700">{mem.phoneNumber}</span>
                    </div>
                  )}
                </div>

                {/* Nút hành động */}
                <div className="pt-2 border-t border-slate-200/70 mt-2 flex items-center justify-between gap-2">
                  {mem.role === "CHILD" ? (
                    <button
                      type="button"
                      onClick={() => onAssignChoreClick?.(mem.id)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors cursor-pointer border border-purple-200"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{language === "vi" ? "Giao Việc Nhà" : "Assign Chore"}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAddMemberClick?.()}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer border border-slate-200"
                    >
                      <Sliders className="w-3.5 h-3.5 text-slate-500" />
                      <span>{language === "vi" ? "Quản Lý Quyền" : "Manage Access"}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-10 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <UserPlus className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="font-bold text-sm text-slate-800">
            {language === "vi"
              ? "Chưa có thành viên nào trong không gian này"
              : "No members in this workspace"}
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {language === "vi"
              ? "Gửi mã mời hoặc thêm người thân (ông bà, con trẻ) để bắt đầu phân quyền chi tiêu và giao việc nhà."
              : "Invite family members to start managing allowances and chores."}
          </p>
          {onAddMemberClick && (
            <button
              type="button"
              onClick={onAddMemberClick}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{language === "vi" ? "Thêm Thành Viên Ngay" : "Add Member Now"}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
