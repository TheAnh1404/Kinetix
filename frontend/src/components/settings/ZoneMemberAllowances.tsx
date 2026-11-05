"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  Lock,
  Unlock,
  Code2,
  Sparkles,
  Bot,
  UserCheck,
  Check,
  Zap,
} from "lucide-react";
import {
  WorkspaceMemberItem,
  MemberAllowancePolicyItem,
} from "@/hooks/useSettingsData";

const SPENDING_CATEGORIES = [
  { id: "FOOD", label: "Ăn uống & Nhu yếu", icon: "🍱" },
  { id: "EDUCATION", label: "Học tập & Sách vở", icon: "📚" },
  { id: "HEALTHCARE", label: "Y tế & Thuốc men", icon: "💊" },
  { id: "ENTERTAINMENT", label: "Giải trí & Du lịch", icon: "🎮" },
  { id: "SHOPPING", label: "Mua sắm cá nhân", icon: "🛍️" },
  { id: "UTILITIES", label: "Điện nước & Sinh hoạt", icon: "⚡" },
];

interface ZoneMemberAllowancesProps {
  members: WorkspaceMemberItem[];
  allowancePolicies: MemberAllowancePolicyItem[];
  isAdmin: boolean;
  uiMode: "LITE" | "PRO";
  l1HubAddress?: string;
  onSavePolicy: (policy: {
    targetMemberUserId: string;
    dailyLimitAmount: number;
    autoApproveThreshold: number;
    allowedCategories: string[];
    isFrozen: boolean;
  }) => Promise<void>;
  onToggleFreeze: (memberUserId: string, currentFreeze: boolean) => Promise<void>;
  busy?: boolean;
}

export const ZoneMemberAllowances: React.FC<ZoneMemberAllowancesProps> = ({
  members,
  allowancePolicies,
  isAdmin,
  uiMode,
  l1HubAddress,
  onSavePolicy,
  onToggleFreeze,
  busy = false,
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    members[0]?.id || "",
  );

  // Form states for selected member
  const [dailyLimit, setDailyLimit] = useState<number>(50);
  const [autoApprove, setAutoApprove] = useState<number>(10);
  const [categories, setCategories] = useState<string[]>([
    "FOOD",
    "EDUCATION",
    "HEALTHCARE",
  ]);
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Sync states when selected member or policies change
  useEffect(() => {
    if (!selectedMemberId && members.length > 0) {
      setSelectedMemberId(members[0].id);
    }
    const policy = allowancePolicies.find(
      (p) => p.memberUserId === selectedMemberId,
    );
    if (policy) {
      setDailyLimit(Number(policy.dailyLimitAmount) || 50);
      setAutoApprove(Number(policy.autoApproveThreshold) || 10);
      setCategories(
        Array.isArray(policy.allowedCategories)
          ? policy.allowedCategories
          : ["FOOD", "EDUCATION"],
      );
      setIsFrozen(Boolean(policy.isFrozen));
      setHasChanges(false);
    }
  }, [selectedMemberId, allowancePolicies, members]);

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  const handleCategoryToggle = (catId: string) => {
    setCategories((prev) => {
      const next = prev.includes(catId)
        ? prev.filter((c) => c !== catId)
        : [...prev, catId];
      setHasChanges(true);
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedMemberId) return;
    await onSavePolicy({
      targetMemberUserId: selectedMemberId,
      dailyLimitAmount: dailyLimit,
      autoApproveThreshold: autoApprove,
      allowedCategories: categories,
      isFrozen,
    });
    setHasChanges(false);
  };

  const targetWallet =
    selectedMember?.walletAddress || "0x0000000000000000000000000000000000000000";

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
      {/* Title & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center font-bold">
              <Sliders size={18} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Phân Quyền & Hạn Mức Chi Tiêu Quỹ (Programmable Allowances)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {uiMode === "PRO"
              ? "Cấu hình on-chain allowance policy, auto-approve threshold và emergency freeze"
              : "Quản lý số tiền tự động rút mỗi ngày và danh mục chi tiêu cho từng thành viên"}
          </p>
        </div>
      </div>

      {/* Member Selector Tabs */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">
          Chọn Thành Viên Quản Lý:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {members.map((member) => {
            const isSelected = member.id === selectedMemberId;
            const pol = allowancePolicies.find(
              (p) => p.memberUserId === member.id,
            );
            const memberFrozen = pol?.isFrozen;

            return (
              <button
                key={member.id}
                type="button"
                onClick={() => setSelectedMemberId(member.id)}
                className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col gap-1 cursor-pointer ${
                  isSelected
                    ? "bg-red-50/80 dark:bg-red-950/30 border-red-500 shadow-xs ring-1 ring-red-500"
                    : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {memberFrozen && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[9px] font-bold">
                    ĐÃ KHÓA
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200">
                    {member.role === "ADMIN" ? (
                      <UserCheck size={14} className="text-red-600" />
                    ) : (
                      member.fullName.charAt(0)
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {member.fullName}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>{member.role}</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {pol?.dailyLimitAmount || "50"} AVAX/ngày
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Member Detail Control Panel */}
      {selectedMember && (
        <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-6">
          {/* Top Info of selected member */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-700/60 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Đang chỉnh sửa: {selectedMember.fullName}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold">
                  {selectedMember.role}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                Ví: {targetWallet}
              </p>
            </div>

            {/* Emergency Freeze Button */}
            {isAdmin && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onToggleFreeze(selectedMember.id, isFrozen)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                  isFrozen
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
                }`}
              >
                {isFrozen ? (
                  <>
                    <Unlock size={14} />
                    <span>Mở Khóa Chi Tiêu</span>
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    <span>Đóng Băng Khẩn Cấp</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* 1. Programmable Allowance Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-white block">
                  Hạn Mức Chi Tiêu Tự Động Mỗi Ngày:
                </label>
                <p className="text-[11px] text-slate-500">
                  {uiMode === "PRO"
                    ? "Gasless fast withdraw quota từ bộ đệm L1 Buffer"
                    : "Số tiền tối đa thành viên có thể rút tức thì mỗi ngày (không cần xin phép)"}
                </p>
              </div>
              <div className="flex items-baseline gap-1 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-base font-bold text-red-600 font-mono">
                  {dailyLimit}
                </span>
                <span className="text-[11px] text-slate-500 font-bold">AVAX/ngày</span>
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={500}
              step={5}
              value={dailyLimit}
              onChange={(e) => {
                setDailyLimit(Number(e.target.value));
                setHasChanges(true);
              }}
              disabled={isFrozen || !isAdmin}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>0 AVAX (Khóa chi tiêu)</span>
              <span>100 AVAX</span>
              <span>250 AVAX</span>
              <span>500 AVAX (Tối đa)</span>
            </div>
          </div>

          {/* 2. Auto Approve Threshold Slider */}
          <div className="space-y-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-white block">
                  Ngưỡng Tự Động Phê Duyệt (Fast-Track Threshold):
                </label>
                <p className="text-[11px] text-slate-500">
                  Khoản chi $\le$ mức này sẽ giải ngân lập tức, vượt quá sẽ cần Guardians duyệt
                </p>
              </div>
              <div className="flex items-baseline gap-1 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-base font-bold text-amber-600 font-mono">
                  {autoApprove}
                </span>
                <span className="text-[11px] text-slate-500 font-bold">AVAX</span>
              </div>
            </div>

            <input
              type="range"
              min={1}
              max={dailyLimit || 50}
              step={1}
              value={autoApprove}
              onChange={(e) => {
                setAutoApprove(Number(e.target.value));
                setHasChanges(true);
              }}
              disabled={isFrozen || !isAdmin}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
          </div>

          {/* 3. Allowed Categories Selector (Off-chain metadata) */}
          <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            <label className="text-xs font-bold text-slate-900 dark:text-white block">
              Danh Mục Được Phép Chi Tiêu:
            </label>
            <p className="text-[11px] text-slate-500">
              Giao dịch ngoài các danh mục này sẽ gửi thông báo cảnh báo tức thì tới gia đình
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {SPENDING_CATEGORIES.map((cat) => {
                const isChecked = categories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryToggle(cat.id)}
                    disabled={isFrozen || !isAdmin}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                      isChecked
                        ? "bg-white dark:bg-slate-900 border-red-500/80 text-slate-900 dark:text-white shadow-xs"
                        : "bg-slate-100/60 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 text-slate-400"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </span>
                    {isChecked ? (
                      <Check size={14} className="text-red-600 font-bold" />
                    ) : (
                      <span className="w-3 h-3 rounded-full border border-slate-300" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PRO MODE: Smart Contract Calldata Preview */}
          {uiMode === "PRO" && (
            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <Code2 size={14} />
                  <span>On-chain Calldata Preview:</span>
                </span>
                <span>Fuji C-Chain / Family L1</span>
              </div>
              <pre className="text-[11px] font-mono text-emerald-400 bg-slate-950 p-3 rounded-lg overflow-x-auto border border-slate-800">
{`// Contract Address: ${l1HubAddress || "0x0000000000000000000000000000000000000000"}
FamilyHub.setVaultDailyLimit(
  vaultId: 1,
  limitWei: ${BigInt(Math.floor(dailyLimit * 1e18)).toString()} // ${dailyLimit} AVAX
);
FamilyHub.setAllowlistStatus(
  account: "${targetWallet}",
  status: ${!isFrozen} // Active = ${!isFrozen}
);`}
              </pre>
            </div>
          )}

          {/* Save Button */}
          {isAdmin && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={busy || !hasChanges}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  hasChanges
                    ? "bg-red-600 hover:bg-red-700 text-white shadow-md animate-bounce"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                }`}
              >
                <Zap size={14} />
                <span>Lưu Hạn Mức & Đồng Bộ Kép</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
