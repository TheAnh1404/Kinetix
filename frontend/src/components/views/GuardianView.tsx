"use client";

import React, { useState } from "react";
import { useFamily } from "@/context/FamilyContext";
import { useLanguage } from "@/context/LanguageContext";
import { FamilyStatsCards } from "@/components/dashboard/FamilyStatsCards";
import { MemberManagementModal } from "@/components/dashboard/MemberManagementModal";
import { CreateChoreModal } from "@/components/dashboard/CreateChoreModal";
import { VideoCallModal } from "@/components/dashboard/VideoCallModal";
import { VaultType } from "@/contracts/config";

type DashboardSubTab = "overview" | "vaults" | "members" | "chores" | "audit";

export const GuardianView: React.FC = () => {
  const {
    withdrawalRequests,
    approveWithdrawal,
    vaults,
    currentMember,
    members,
    familyInfo,
    chores,
    verifyAndRewardChore,
    compoundYield,
  } = useFamily();

  const { t, language } = useLanguage();

  const [activeSubTab, setActiveSubTab] = useState<DashboardSubTab>("overview");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isChoreModalOpen, setIsChoreModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [compoundingVault, setCompoundingVault] = useState<number | null>(null);

  // Yêu cầu rút tiền đang chờ xử lý
  const activeRequest =
    withdrawalRequests.find((r) => r.status === "PENDING") || withdrawalRequests[0];
  const isApproved =
    activeRequest?.status === "EXECUTED" || (activeRequest?.approvalsCount ?? 0) >= 2;
  const approvalsCount = isApproved ? 2 : (activeRequest?.approvalsCount ?? 1);

  const handleApprove = async () => {
    if (!activeRequest) return;
    setIsSigning(true);
    const success = await approveWithdrawal(activeRequest.id);
    setIsSigning(false);
    if (success) {
      setFeedback(
        language === "vi"
          ? `🎉 BẠN (${currentMember.name}) ĐÃ KÝ DUYỆT THÀNH CÔNG! Đạt 2/3 chữ ký Guardians. Hợp đồng FamilyHub trên Avalanche Family L1 tự động giải ngân ${activeRequest.amount} USDC cho ${activeRequest.requesterName} với 0đ phí gas!`
          : `🎉 YOU (${currentMember.name}) SIGNED SUCCESSFULLY! Reached 2/3 Guardians. FamilyHub smart contract disbursed ${activeRequest.amount} USDC with 0 gas fee!`
      );
    }
  };

  const handleReject = () => {
    alert(
      language === "vi"
        ? "Đã từ chối và tạm khóa yêu cầu để bảo vệ ví Ông Nội!"
        : "Request rejected and timelock frozen to protect funds!"
    );
  };

  const handleCompound = async (vaultType: VaultType) => {
    setCompoundingVault(vaultType);
    await compoundYield(vaultType);
    setCompoundingVault(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 w-full">
      {/* Feedback banner */}
      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-start justify-between gap-3 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[28px] text-emerald-600">
              verified
            </span>
            <span className="text-sm font-semibold">{feedback}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-gray-500 hover:text-black cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Top Header & Executive Command Center Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/30">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-secondary-container/15 text-secondary font-mono text-[11px] font-bold uppercase tracking-wider">
              {familyInfo?.familyCode ? `MÃ: ${familyInfo.familyCode}` : "KINETIX GUARDIAN OS"}
            </span>
            <span className="text-outline-variant">•</span>
            <span className="text-[11px] text-on-surface-variant font-medium">
              TIERED MULTISIG 2/3 ON-CHAIN
            </span>
            <span className="text-outline-variant">•</span>
            <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Family L1 Active
            </span>
          </div>
          <h1 className="font-display-sm text-2xl lg:text-3xl font-extrabold text-on-surface tracking-tight">
            {familyInfo?.name ? familyInfo.name : t("dash.title")}
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant">
            {t("dash.subtitle")}
          </p>
        </div>

        {/* Quick Action Buttons Group */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsMemberModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-xs font-bold text-on-surface shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            type="button"
          >
            <span className="material-symbols-outlined text-[17px] text-primary">person_add</span>
            <span>{t("dash.actions.addMember")}</span>
          </button>

          <button
            onClick={() => setIsChoreModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-xs font-bold text-on-surface shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            type="button"
          >
            <span className="material-symbols-outlined text-[17px] text-amber-600">assignment_add</span>
            <span>{t("dash.actions.createChore")}</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-surface-container-low rounded-xl border border-secondary/20">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-on-surface-variant">
                Avalanche L1
              </span>
              <span className="text-xs font-bold text-on-surface font-mono">
                0 Gas (0 Gwei)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 HIGH-IMPACT FINANCIAL STATS CARDS */}
      <FamilyStatsCards />

      {/* DASHBOARD NAVIGATION SUB-TABS */}
      <div className="flex items-center gap-2 border-b border-surface-container overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "overview", label: t("dash.tab.overview"), icon: "dashboard" },
          { id: "vaults", label: t("dash.tab.vaults"), icon: "savings" },
          { id: "members", label: t("dash.tab.members"), icon: "groups" },
          { id: "chores", label: t("dash.tab.chores"), icon: "task_alt" },
          { id: "audit", label: t("dash.tab.audit"), icon: "receipt_long" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id as DashboardSubTab)}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === tab.id
                ? "bg-secondary-container text-white shadow-sm ring-1 ring-secondary"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {tab.icon}
            </span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB CONTENT 1: OVERVIEW & MULTISIG APPROVALS */}
      {activeSubTab === "overview" && (
        <div className="flex flex-col gap-6">
          {/* Critical Alert Multisig Panel */}
          <div
            className={`relative overflow-hidden rounded-2xl p-6 shadow-md transition-all duration-300 border ${
              isApproved
                ? "bg-emerald-50/60 border-emerald-300"
                : "bg-secondary-fixed/30 border-secondary-container/50"
            }`}
          >
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                    isApproved
                      ? "bg-emerald-600 text-white"
                      : "bg-secondary-container text-white animate-bounce"
                  }`}
                >
                  <span className="material-symbols-outlined text-[28px]">
                    {isApproved ? "check_circle" : "notification_important"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold ${
                        isApproved
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-secondary-container text-white"
                      }`}
                    >
                      {isApproved
                        ? (language === "vi" ? "ĐÃ GIẢI NGÂN THÀNH CÔNG" : "DISBURSED SUCCESSFULLY")
                        : (language === "vi" ? "YÊU CẦU KHẨN CẤP CHỜ DUYỆT" : "PENDING MULTISIG APPROVAL")}
                    </span>
                    <span className="text-xs text-on-surface-variant font-mono">
                      {t("dash.multisig.timelock")}
                    </span>
                  </div>
                  <h2 className="font-headline-md text-xl font-bold text-on-surface tracking-tight">
                    {isApproved
                      ? (language === "vi"
                          ? "Lệnh rút 1,000 USDC của Ông Nội đã hoàn tất on-chain"
                          : "Grandparent's 1,000 USDC withdrawal executed on-chain")
                      : (language === "vi"
                          ? "CẢNH BÁO KHẨN CẤP: Ông Nội vừa tạo lệnh rút 1,000 USDC"
                          : "EMERGENCY: Grandfather requested 1,000 USDC withdrawal")}
                  </h2>
                  <p className="text-xs sm:text-sm text-on-surface-variant">
                    {language === "vi" ? "Lý do khai báo: " : "Stated Reason: "}
                    <span className="font-semibold text-on-surface">
                      &quot;Khám bệnh đột xuất tại Bệnh viện Tim TW&quot;
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-surface-container-lowest px-3.5 py-2 rounded-xl shrink-0 shadow-sm border border-surface-container">
                <span className="material-symbols-outlined text-secondary text-[20px]">
                  security
                </span>
                <span className="text-xs font-semibold text-on-surface">
                  {language === "vi" ? "Bảo vệ 3 Lớp: Đang hoạt động" : "3-Tier Shield: Active"}
                </span>
              </div>
            </div>

            {/* Details strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-surface-container-lowest p-4 rounded-xl mb-4 border border-outline-variant/20">
              <div className="flex flex-col">
                <span className="text-[11px] uppercase font-bold text-on-surface-variant">
                  {language === "vi" ? "THỜI GIAN KHỞI TẠO" : "INITIATED TIME"}
                </span>
                <span className="text-sm font-semibold text-on-surface">
                  {language === "vi" ? "Hôm nay, 08:30 (Sáng)" : "Today, 08:30 AM"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] uppercase font-bold text-on-surface-variant">
                  {language === "vi" ? "ĐỊA CHỈ ĐÍCH (ALLOWLIST)" : "TARGET DESTINATION"}
                </span>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-emerald-600">
                    check_circle
                  </span>
                  <span className="text-sm font-mono font-semibold text-on-surface truncate">
                    BV Tim TW (0x44a...92b - Allowlisted)
                  </span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] uppercase font-bold text-on-surface-variant">
                  {language === "vi" ? "ĐIỀU KIỆN GIẢI NGÂN L1" : "DISBURSEMENT RULE"}
                </span>
                <span className="text-sm font-semibold text-secondary">
                  {language === "vi" ? "Cần tối thiểu 2/3 Guardian xác nhận" : "Requires >= 2/3 Guardians"}
                </span>
              </div>
            </div>

            {/* Multisig Signatures Progress */}
            <div className="bg-surface-container-lowest p-4 rounded-xl mb-4 flex flex-col gap-3 border border-outline-variant/20">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold text-on-surface-variant">
                  {t("dash.multisig.progress")} ({approvalsCount}/2)
                </span>
                <span className="text-xs font-bold text-on-surface font-mono">
                  {isApproved ? "100% Complete" : "50% Complete"}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-surface-container-high overflow-hidden">
                <div
                  className={`h-full transition-all duration-700 ${
                    isApproved ? "bg-emerald-500 w-full" : "bg-secondary-container w-1/2"
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                {/* Guardian 1 */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low border border-surface-container">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                    AC
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-on-surface truncate">
                      Guardian 1 - Anh Cả
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold">
                      {t("dash.multisig.signed")}
                    </span>
                  </div>
                </div>

                {/* Guardian 2 (Current User) */}
                <div
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    isApproved
                      ? "bg-emerald-50 border-emerald-300"
                      : "bg-secondary-fixed/40 border-secondary-container/60 shadow-sm"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-white text-xs font-bold">
                    BB
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-on-surface truncate">
                      Guardian 2 - {currentMember.name} (Bạn)
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        isApproved ? "text-emerald-700" : "text-secondary animate-pulse"
                      }`}
                    >
                      {isApproved ? t("dash.multisig.signed") : t("dash.multisig.pending")}
                    </span>
                  </div>
                </div>

                {/* Guardian 3 */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low opacity-75 border border-surface-container">
                  <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface text-xs font-bold">
                    CU
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-on-surface truncate">
                      Guardian 3 - Cô Út
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-medium">
                      {isApproved ? (language === "vi" ? "ĐỦ ĐIỀU KIỆN (Bỏ qua)" : "QUALIFIED") : t("dash.multisig.waiting")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsVideoModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-container-lowest hover:bg-surface-container text-on-surface text-xs font-bold shadow-sm transition-colors border border-surface-container cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px] text-secondary">
                    videocam
                  </span>
                  <span>{t("dash.actions.videoCall")}</span>
                </button>
                <button
                  onClick={handleReject}
                  disabled={isApproved}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-container hover:bg-error-container hover:text-error text-on-surface-variant text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">block</span>
                  <span>{t("dash.actions.reject")}</span>
                </button>
              </div>

              <button
                onClick={handleApprove}
                disabled={isApproved || isSigning}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer ${
                  isApproved
                    ? "bg-emerald-600 text-white cursor-default"
                    : "bg-secondary-container hover:bg-secondary text-white"
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[19px]">
                  {isApproved ? "done_all" : "verified"}
                </span>
                <span>
                  {isApproved
                    ? (language === "vi" ? "ĐÃ GIẢI NGÂN (2/2 CHỮ KÝ)" : "DISBURSED (2/2 SIGNATURES)")
                    : isSigning
                    ? (language === "vi" ? "Đang ký on-chain..." : "Signing on-chain...")
                    : t("dash.actions.approve")}
                </span>
              </button>
            </div>
          </div>

          {/* Quick Buffer Visualization */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-headline-sm text-base font-bold text-on-surface">
                  {language === "vi" ? "Tỷ Lệ Phân Bổ Vốn Đệm Thanh Khoản 10/90" : "10/90 Liquidity Buffer Architecture"}
                </h3>
                <p className="text-xs text-on-surface-variant">
                  {language === "vi"
                    ? "10% Giữ trên Family L1 để rút tức thì, 90% Tự động chuyển qua Avalanche Teleporter sang C-Chain sinh lời ~8% APY"
                    : "10% kept on Family L1 for instant spends, 90% forwarded via Avalanche Teleporter to C-Chain earning ~8% APY"}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-secondary-container/15 text-secondary font-mono text-xs font-bold">
                Teleporter ICM
              </span>
            </div>

            <div className="w-full h-4 rounded-full bg-surface-container-high overflow-hidden flex">
              <div className="bg-secondary-container h-full w-[10%] flex items-center justify-center text-[10px] text-white font-mono font-bold" title="10% Buffer">
                10%
              </div>
              <div className="bg-emerald-600 h-full w-[90%] flex items-center justify-center text-[10px] text-white font-mono font-bold" title="90% Yield">
                90% Staked
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-secondary-container shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-on-surface">
                      {language === "vi" ? "10% Đệm Thanh Khoản (Family L1)" : "10% Liquid Buffer (Family L1)"}
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      {language === "vi" ? "Tốc độ < 0.8s, Phí Gas = 0đ" : "Speed < 0.8s, Gas = $0.00"}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-sm font-bold text-on-surface">
                  ${(vaults.retirementShield.localBuffer + vaults.kidsSavings.localBuffer + vaults.familyRosca.localBuffer).toFixed(2)} USDC
                </span>
              </div>

              <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-600 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-on-surface">
                      {language === "vi" ? "90% Sinh Lời DeFi (Fuji C-Chain)" : "90% Yield Engine (Fuji C-Chain)"}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold font-mono">
                      ~8.0% APY Compound
                    </span>
                  </div>
                </div>
                <span className="font-mono text-sm font-bold text-emerald-700">
                  ${(vaults.retirementShield.remoteYield + vaults.kidsSavings.remoteYield + vaults.familyRosca.remoteYield).toFixed(2)} USDC
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: 3 FINANCIAL VAULTS */}
      {activeSubTab === "vaults" && (
        <div className="flex flex-col gap-6">
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-headline-sm text-lg font-bold text-on-surface">
                  {t("dash.tab.vaults")}
                </h3>
                <p className="text-xs sm:text-sm text-on-surface-variant">
                  {language === "vi"
                    ? "Quản trị phân bổ dòng tiền 3 thế hệ và điều chuyển thanh khoản liên chuỗi"
                    : "Manage 3-generation asset pots and cross-chain liquidity rebalancing"}
                </p>
              </div>
              <span className="px-3.5 py-1.5 rounded-full bg-surface-container text-xs font-bold text-on-surface font-mono">
                {language === "vi" ? "Tổng Quỹ: " : "Total: "}${(vaults.retirementShield.total + vaults.kidsSavings.total + vaults.familyRosca.total).toLocaleString()} USDC
              </span>
            </div>

            {/* 3 Vaults Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Vault 1: Retirement Shield */}
              <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-[20px]">elderly</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-on-surface">Hũ Báo Hiếu</h4>
                      <span className="text-[10px] text-on-surface-variant uppercase font-mono">Retirement Shield</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                    8.0% APY
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Đệm L1 (10%):</span>
                    <span className="font-mono font-bold text-on-surface">{vaults.retirementShield.localBuffer.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">C-Chain (90%):</span>
                    <span className="font-mono font-bold text-emerald-700">{vaults.retirementShield.remoteYield.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-surface-container">
                    <span className="font-bold text-on-surface">Tổng số dư:</span>
                    <span className="font-mono font-extrabold text-sm text-on-surface">{vaults.retirementShield.total.toFixed(2)} USDC</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCompound(VaultType.RetirementShield)}
                  disabled={compoundingVault === VaultType.RetirementShield}
                  className="w-full py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-xs font-bold text-on-surface transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-secondary">auto_mode</span>
                  <span>{compoundingVault === VaultType.RetirementShield ? "Đang gộp lãi..." : t("dash.actions.compound")}</span>
                </button>
              </div>

              {/* Vault 2: Kids Savings */}
              <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[20px]">savings</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-on-surface">Heo Đất Con Trẻ</h4>
                      <span className="text-[10px] text-on-surface-variant uppercase font-mono">Kids Savings</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                    8.0% APY
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Đệm L1 (10%):</span>
                    <span className="font-mono font-bold text-on-surface">{vaults.kidsSavings.localBuffer.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">C-Chain (90%):</span>
                    <span className="font-mono font-bold text-emerald-700">{vaults.kidsSavings.remoteYield.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-surface-container">
                    <span className="font-bold text-on-surface">Tổng số dư:</span>
                    <span className="font-mono font-extrabold text-sm text-on-surface">{vaults.kidsSavings.total.toFixed(2)} USDC</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCompound(VaultType.KidsSavings)}
                  disabled={compoundingVault === VaultType.KidsSavings}
                  className="w-full py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-xs font-bold text-on-surface transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-secondary">auto_mode</span>
                  <span>{compoundingVault === VaultType.KidsSavings ? "Đang gộp lãi..." : t("dash.actions.compound")}</span>
                </button>
              </div>

              {/* Vault 3: Family ROSCA */}
              <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-tertiary/15 flex items-center justify-center text-tertiary">
                      <span className="material-symbols-outlined text-[20px]">groups</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-on-surface">Quỹ Tương Trợ Họ</h4>
                      <span className="text-[10px] text-on-surface-variant uppercase font-mono">Family ROSCA</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                    Kỳ 3/4
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Đệm L1 (10%):</span>
                    <span className="font-mono font-bold text-on-surface">{vaults.familyRosca.localBuffer.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">C-Chain (90%):</span>
                    <span className="font-mono font-bold text-emerald-700">{vaults.familyRosca.remoteYield.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-surface-container">
                    <span className="font-bold text-on-surface">Tổng số dư:</span>
                    <span className="font-mono font-extrabold text-sm text-on-surface">{vaults.familyRosca.total.toFixed(2)} USDC</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCompound(VaultType.FamilyROSCA)}
                  disabled={compoundingVault === VaultType.FamilyROSCA}
                  className="w-full py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-xs font-bold text-on-surface transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-secondary">auto_mode</span>
                  <span>{compoundingVault === VaultType.FamilyROSCA ? "Đang gộp lãi..." : t("dash.actions.compound")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: FAMILY MEMBERS & PERMISSIONS */}
      {activeSubTab === "members" && (
        <div className="flex flex-col gap-6">
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-headline-sm text-lg font-bold text-on-surface">
                  {t("dash.members.title")}
                </h3>
                <p className="text-xs text-on-surface-variant">
                  {t("dash.members.desc")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMemberModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-secondary-container hover:bg-secondary text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <span className="material-symbols-outlined text-[17px]">person_add</span>
                <span>{t("dash.actions.addMember")}</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-surface-container text-on-surface-variant text-[11px] uppercase font-bold tracking-wider">
                    <th className="py-3 px-3 sm:px-4">{t("dash.members.name")}</th>
                    <th className="py-3 px-3 sm:px-4">{t("dash.members.role")}</th>
                    <th className="py-3 px-3 sm:px-4">{t("dash.members.wallet")}</th>
                    <th className="py-3 px-3 sm:px-4 text-center">{t("dash.members.allowlist")}</th>
                    <th className="py-3 px-3 sm:px-4 text-right">{t("dash.members.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3.5 px-3 sm:px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-8 h-8 rounded-full object-cover border border-outline-variant/40"
                          />
                          <div className="flex flex-col">
                            <span className="font-semibold text-on-surface">
                              {member.name}
                            </span>
                            <span className="text-[11px] text-on-surface-variant">
                              {member.title || member.role}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 sm:px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            member.role === "ADMIN"
                              ? "bg-primary/10 text-primary"
                              : member.role === "GUARDIAN"
                              ? "bg-secondary-container/15 text-secondary"
                              : member.role === "ELDERLY"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {member.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 sm:px-4 font-mono text-xs text-on-surface-variant">
                        {member.walletAddress ? (
                          <span className="flex items-center gap-1 font-mono truncate max-w-[140px] sm:max-w-none">
                            {member.walletAddress.slice(0, 6)}...{member.walletAddress.slice(-4)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-on-surface-variant italic">
                            Passkey / PIN Login
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 sm:px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          Allowlisted
                        </span>
                      </td>

                      <td className="py-3.5 px-3 sm:px-4 text-right">
                        <span className="text-xs text-secondary font-bold cursor-pointer hover:underline">
                          {language === "vi" ? "Chỉnh sửa" : "Edit"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: CHORES & REWARDS (CHORE-TO-EARN) */}
      {activeSubTab === "chores" && (
        <div className="flex flex-col gap-6">
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-headline-sm text-lg font-bold text-on-surface">
                  {t("dash.chores.title")}
                </h3>
                <p className="text-xs text-on-surface-variant">
                  {t("dash.chores.desc")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsChoreModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-secondary-container hover:bg-secondary text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <span className="material-symbols-outlined text-[17px]">assignment_add</span>
                <span>{t("dash.chores.newBtn")}</span>
              </button>
            </div>

            {/* Chores Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chores.map((chore) => (
                <div
                  key={chore.id}
                  className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col justify-between gap-3 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={chore.childAvatar || "https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150"}
                        alt={chore.childName || "Bé Na"}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <span className="text-xs font-bold text-on-surface">
                        {chore.childName || "Bé Na"}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        chore.status === "REWARDED"
                          ? "bg-emerald-100 text-emerald-800"
                          : chore.status === "SUBMITTED"
                          ? "bg-amber-100 text-amber-800 animate-pulse"
                          : "bg-surface-container text-on-surface-variant"
                      }`}
                    >
                      {chore.status === "REWARDED"
                        ? t("dash.chores.rewarded")
                        : chore.status === "SUBMITTED"
                        ? t("dash.chores.submitted")
                        : t("dash.chores.todo")}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-on-surface line-clamp-1">
                      {chore.title}
                    </h4>
                    <span className="text-xs font-mono font-bold text-secondary">
                      +{chore.rewardAmount} USDC
                    </span>
                  </div>

                  {chore.proofImageUrl && (
                    <div className="w-full h-24 rounded-xl overflow-hidden border border-outline-variant/30">
                      <img
                        src={chore.proofImageUrl}
                        alt="Bằng chứng làm việc"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="pt-1 border-t border-surface-container flex items-center justify-between">
                    <span className="text-[11px] text-on-surface-variant font-medium">
                      {language === "vi" ? "Hạn: " : "Deadline: "}
                      {chore.deadline || (language === "vi" ? "Hôm nay" : "Today")}
                    </span>

                    {chore.status === "SUBMITTED" ? (
                      <button
                        type="button"
                        onClick={() => verifyAndRewardChore(chore.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                      >
                        {t("dash.chores.verifyBtn")}
                      </button>
                    ) : chore.status === "REWARDED" ? (
                      <span className="text-xs text-emerald-700 font-bold flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[15px]">done</span>
                        {language === "vi" ? "Đã trao thưởng" : "Rewarded"}
                      </span>
                    ) : (
                      <span className="text-xs text-on-surface-variant italic">
                        {language === "vi" ? "Bé đang làm" : "In progress"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: AUDIT LOG & CASH FLOW HISTORY */}
      {activeSubTab === "audit" && (
        <div className="flex flex-col gap-6">
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 flex flex-col gap-5">
            <div>
              <h3 className="font-headline-sm text-lg font-bold text-on-surface">
                {t("dash.audit.title")}
              </h3>
              <p className="text-xs text-on-surface-variant">
                {t("dash.audit.desc")}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-surface-container text-on-surface-variant text-[11px] uppercase font-bold tracking-wider">
                    <th className="py-3 px-3 sm:px-4">{t("dash.audit.time")}</th>
                    <th className="py-3 px-3 sm:px-4">{t("dash.audit.type")}</th>
                    <th className="py-3 px-3 sm:px-4">{t("dash.audit.amount")}</th>
                    <th className="py-3 px-3 sm:px-4">{t("dash.audit.executor")}</th>
                    <th className="py-3 px-3 sm:px-4 text-right">{t("dash.audit.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {[
                    {
                      time: "Hôm nay, 08:30",
                      type: "Rút tiền lớn (Multisig 2/3)",
                      amount: "-1,000.00 USDC",
                      user: "Ông Nội (Báo Hiếu)",
                      status: isApproved ? "Đã giải ngân" : "Chờ ký duyệt",
                      statusColor: isApproved ? "text-emerald-700 bg-emerald-50" : "text-amber-800 bg-amber-50",
                    },
                    {
                      time: "Hôm nay, 07:15",
                      type: "Rút tiền nhỏ đi chợ (Fast Withdraw)",
                      amount: "-20.00 USDC",
                      user: "Bà Ngoại (Báo Hiếu)",
                      status: "Thành công (0 Gas)",
                      statusColor: "text-emerald-700 bg-emerald-50",
                    },
                    {
                      time: "Hôm qua, 18:45",
                      type: "Thưởng việc nhà (Chore-to-Earn)",
                      amount: "+5.00 USDC",
                      user: "Bé Na (Heo Đất)",
                      status: "Thành công (0 Gas)",
                      statusColor: "text-emerald-700 bg-emerald-50",
                    },
                    {
                      time: "24/10/2026",
                      type: "Nạp Quỹ Gia Đình (10/90 Bridge)",
                      amount: "+2,000.00 USDC",
                      user: "Bố Ba (Admin)",
                      status: "Bridge ICM C-Chain",
                      statusColor: "text-blue-700 bg-blue-50",
                    },
                    {
                      time: "22/10/2026",
                      type: "Tái đầu tư lãi kép (Compound Yield)",
                      amount: "+45.20 USDC",
                      user: "Smart Contract (Auto)",
                      status: "+8.2% APY Đã nhập gốc",
                      statusColor: "text-emerald-700 bg-emerald-50",
                    },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="py-3.5 px-3 sm:px-4 text-on-surface-variant font-mono">
                        {row.time}
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 font-semibold text-on-surface">
                        {row.type}
                      </td>
                      <td className={`py-3.5 px-3 sm:px-4 font-mono font-bold ${row.amount.startsWith("-") ? "text-error" : "text-emerald-700"}`}>
                        {row.amount}
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-on-surface-variant">
                        {row.user}
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-right">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${row.statusColor}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <MemberManagementModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
      />

      <CreateChoreModal
        isOpen={isChoreModalOpen}
        onClose={() => setIsChoreModalOpen(false)}
      />

      <VideoCallModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        grandparentName={activeRequest?.requesterName || "Ông Nội"}
        onVerified={() => {
          setFeedback(
            language === "vi"
              ? "✅ Đã xác minh hình ảnh và giọng nói Ông Nội thành công! Sẵn sàng ký duyệt giải ngân an toàn."
              : "✅ Identity verified via video call! Ready to safely sign and disburse."
          );
        }}
      />
    </div>
  );
};
