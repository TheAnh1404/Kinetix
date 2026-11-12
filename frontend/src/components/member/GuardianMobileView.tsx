"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Shield,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Coins,
  Sparkles,
  Wallet,
  ExternalLink,
  Layers,
  Eye,
  RefreshCw,
  AlertCircle,
  Plus,
  ArrowUpRight,
  ChevronRight,
  UserCheck,
  Check,
  ArrowDownToLine,
  Activity,
  HeartHandshake,
  TrendingUp,
  PenTool,
  X,
} from "lucide-react";
import { useFamily, WithdrawalRequestItem, ChoreItem } from "@/context/FamilyContext";
import { useAuth } from "@/hooks/useAuth";
import { amountLabel } from "@/lib/member";
import { hubChain } from "@/contracts/config";
import { DynamicVaultItem } from "@/types";
import { SafeAvatar } from "@/components/ui/SafeAvatar";
import { DepositVaultModal } from "@/components/vaults/DepositVaultModal";
import { ChoreProofModal } from "@/components/dashboard/ChoreProofModal";

/**
 * GuardianMobileView: Giao diện điều hành di động cao cấp dành cho Người Giám Hộ (GUARDIAN / Cha Mẹ / Thành viên).
 * Thiết kế tối ưu hóa cho màn hình 375px - 430px (iPhone, Pixel, Galaxy), đạt chuẩn UI/UX Pro Max:
 * - Trung tâm phê duyệt rút tiền khẩn cấp & đa chữ ký (Mobile Approval Center).
 * - Trạm kiểm tra việc nhà & trao thưởng 1 chạm (Chore Verification Station).
 * - Bảng điều khiển thanh khoản Dual-Chain L1 Buffer vs C-Chain Staked (8% APY).
 * - Nút nạp quỹ nhanh 1 chạm (Quick Deposit).
 * - Tương thích hoàn toàn Dark Mode / Light Mode, kích thước vùng chạm >= 48px.
 */
export function GuardianMobileView() {
  const {
    currentWorkspace,
    withdrawalRequests,
    chores,
    dynamicVaults,
    currentMember,
    members,
    approveWithdrawal,
    verifyAndRewardChore,
    refreshBalances,
    isDataLoading,
  } = useFamily();
  const auth = useAuth();

  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab");

  // Tab điều hướng nhanh trên di động: 'all' | 'approvals' | 'chores' | 'liquidity'
  const [activeSegment, setActiveSegment] = useState<
    "all" | "approvals" | "chores" | "liquidity"
  >(
    tabParam === "approvals" || tabParam === "requests"
      ? "approvals"
      : tabParam === "chores"
        ? "chores"
        : tabParam === "liquidity" || tabParam === "vaults"
          ? "liquidity"
          : "all"
  );

  useEffect(() => {
    if (tabParam === "approvals" || tabParam === "requests") {
      setActiveSegment("approvals");
    } else if (tabParam === "chores") {
      setActiveSegment("chores");
    } else if (tabParam === "liquidity" || tabParam === "vaults") {
      setActiveSegment("liquidity");
    }
  }, [tabParam]);

  // Bộ lọc danh sách việc nhà: 'pending' (chờ duyệt) | 'all' (tất cả)
  const [choreFilter, setChoreFilter] = useState<"pending" | "all">("pending");

  // State quản lý Modals
  const [depositModalVault, setDepositModalVault] = useState<DynamicVaultItem | null>(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [selectedProofChore, setSelectedProofChore] = useState<ChoreItem | null>(null);

  // State phản hồi tức thì (Instant Status Feedback)
  const [signingRequestId, setSigningRequestId] = useState<string | null>(null);
  const [rewardingChoreId, setRewardingChoreId] = useState<string | number | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  // 1. Dữ liệu Phê duyệt rút tiền (Withdrawal Requests)
  const pendingRequests = useMemo(() => {
    return (withdrawalRequests || []).filter((req) => req.status === "PENDING");
  }, [withdrawalRequests]);

  // 2. Dữ liệu Nhiệm vụ việc nhà (Chores)
  const pendingChores = useMemo(() => {
    return (chores || []).filter((chore) => chore.status === "SUBMITTED");
  }, [chores]);

  const displayedChores = useMemo(() => {
    if (choreFilter === "pending") {
      return pendingChores;
    }
    return chores || [];
  }, [chores, choreFilter, pendingChores]);

  // 3. Tính toán số dư thanh khoản đa chuỗi (Dual-Chain Liquidity Calculation)
  const liquiditySummary = useMemo(() => {
    const activeVaults = (dynamicVaults || []).filter(
      (v) => v.isActive && v.workspaceId === currentWorkspace?.id
    );

    let totalBuffer = 0;
    let totalCChain = 0;
    let totalBalance = 0;

    activeVaults.forEach((v) => {
      totalBuffer += Number(v.l1BufferBalance || v.cachedL1Buffer || 0);
      totalCChain += Number(v.cChainPrincipal || v.cachedCChainYield || 0);
      totalBalance += Number(v.totalBalance || v.cachedTotalBalance || 0);
    });

    // Nếu tổng bằng 0 hoặc chưa đồng bộ, dùng tỷ lệ đệm mặc định
    const calculatedSum = totalBuffer + totalCChain;
    const effectiveTotal = calculatedSum > 0 ? calculatedSum : (totalBalance > 0 ? totalBalance : 0);
    const bufferPercent =
      effectiveTotal > 0 ? Math.round((totalBuffer / effectiveTotal) * 100) : 15;
    const cChainPercent = 100 - bufferPercent;

    return {
      activeVaults,
      totalBuffer,
      totalCChain,
      effectiveTotal,
      bufferPercent,
      cChainPercent,
    };
  }, [dynamicVaults, currentWorkspace?.id]);

  // Hành vi 1-tap Ký duyệt rút tiền on-chain
  const handleApproveWithdrawal = async (req: WithdrawalRequestItem) => {
    if (signingRequestId) return;
    setSigningRequestId(req.id);
    try {
      const ok = await approveWithdrawal(req.id, req.onchainRequestId);
      if (ok) {
        showToast(
          "success",
          `Ký duyệt thành công yêu cầu ${amountLabel(req.exactAmount || req.amount)} AVAX! Dữ liệu đa chữ ký đã cập nhật.`
        );
      } else {
        showToast("error", "Ký duyệt không thành công hoặc giao dịch bị từ chối.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Lỗi khi gửi chữ ký phê duyệt.");
    } finally {
      setSigningRequestId(null);
    }
  };

  // Hành vi 1-tap Duyệt việc nhà & Trao thưởng
  const handleVerifyChore = async (chore: ChoreItem) => {
    if (rewardingChoreId) return;
    setRewardingChoreId(chore.id);
    try {
      const ok = await verifyAndRewardChore(chore.id);
      if (ok) {
        showToast(
          "success",
          `Đã duyệt việc "${chore.title}"! Thưởng +${amountLabel(chore.exactRewardAmount || chore.rewardAmount)} AVAX đã trao cho bé.`
        );
        setSelectedProofChore(null);
      } else {
        showToast("error", "Không thể hoàn tất trao thưởng. Vui lòng thử lại.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Lỗi khi trao thưởng nhiệm vụ.");
    } finally {
      setRewardingChoreId(null);
    }
  };

  // Mở modal nạp tiền nhanh
  const handleOpenDeposit = (vault?: DynamicVaultItem) => {
    if (vault) {
      setDepositModalVault(vault);
    } else {
      setDepositModalVault(liquiditySummary.activeVaults[0] || null);
    }
    setIsDepositModalOpen(true);
  };

  // Kiểm tra thành viên đã ký chưa dựa vào địa chỉ hoặc tên
  const hasUserSigned = (req: WithdrawalRequestItem) => {
    const userWallet = auth.user?.walletAddress?.toLowerCase();
    const userName = auth.user?.fullName?.toLowerCase();
    if (!req.guardianSignatures || req.guardianSignatures.length === 0) return false;
    return req.guardianSignatures.some(
      (sig) =>
        sig.signed &&
        (sig.guardianName?.toLowerCase() === userName ||
          (userWallet && sig.guardianName?.toLowerCase().includes(userWallet.slice(2, 8))))
    );
  };

  return (
    <div className="guardian-mobile-view w-full max-w-2xl mx-auto px-3.5 sm:px-6 pt-2 pb-28 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Toast thông báo trạng thái nổi */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-4 left-4 right-4 z-50 max-w-md mx-auto p-3.5 rounded-2xl shadow-xl border flex items-center gap-3 backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2 duration-200 ${
            feedback.type === "success"
              ? "bg-emerald-500/95 text-white border-emerald-400"
              : feedback.type === "error"
                ? "bg-red-500/95 text-white border-red-400"
                : "bg-slate-900/95 text-white border-slate-700"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-white" />
          ) : feedback.type === "error" ? (
            <AlertCircle className="w-5 h-5 shrink-0 text-white" />
          ) : (
            <Sparkles className="w-5 h-5 shrink-0 text-white" />
          )}
          <p className="text-xs sm:text-sm font-medium flex-1 leading-snug">
            {feedback.message}
          </p>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="min-h-[48px] min-w-[48px] p-2 rounded-lg hover:bg-white/20 active:scale-95 transition-transform flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Đóng thông báo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Header Điều Hành Của Người Giám Hộ (Executive Mobile Greeting) */}
      <section className="mb-4 pt-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <SafeAvatar
              avatar={auth.user?.avatarUrl || currentMember?.avatar}
              name={auth.user?.fullName || "Giám hộ"}
              role="GUARDIAN"
              size="md"
              className="ring-2 ring-emerald-500/30 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  Người Giám Hộ
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                  {currentWorkspace?.name || "Gia đình"}
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate mt-0.5">
                {auth.user?.fullName || "Bảng Điều Hành Gia Đình"}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void refreshBalances()}
            disabled={isDataLoading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-95 transition-all shadow-xs shrink-0"
            title="Tải lại số dư và yêu cầu"
            aria-label="Tải lại dữ liệu"
          >
            <RefreshCw
              className={`w-4 h-4 ${isDataLoading ? "animate-spin text-emerald-600" : ""}`}
            />
          </button>
        </div>

        {/* Thanh đếm nhanh chỉ số trọng yếu (Quick KPI Chips) */}
        <div className="grid grid-cols-3 gap-2 mt-3.5">
          <div
            onClick={() => setActiveSegment("approvals")}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              pendingRequests.length > 0
                ? "bg-rose-50/70 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/60"
                : "bg-slate-50 border-slate-200/80 dark:bg-slate-800/50 dark:border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-[11px]">Chờ ký</span>
              <PenTool className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
                {pendingRequests.length}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">mục</span>
            </div>
          </div>

          <div
            onClick={() => setActiveSegment("chores")}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              pendingChores.length > 0
                ? "bg-purple-50/70 border-purple-200 dark:bg-purple-950/30 dark:border-purple-900/60"
                : "bg-slate-50 border-slate-200/80 dark:bg-slate-800/50 dark:border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-[11px]">Việc nhà</span>
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-black text-purple-600 dark:text-purple-400 font-mono">
                {pendingChores.length}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">bài</span>
            </div>
          </div>

          <div
            onClick={() => setActiveSegment("liquidity")}
            className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-800 cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-[11px]">Ngân quỹ</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {liquiditySummary.effectiveTotal.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">AVAX</span>
            </div>
          </div>
        </div>

        {/* Thanh phân đoạn màn hình di động (Segmented Pills Control) */}
        <div className="flex items-center gap-1.5 p-1 mt-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSegment("all")}
            className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all text-center whitespace-nowrap cursor-pointer ${
              activeSegment === "all"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => setActiveSegment("approvals")}
            className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all text-center whitespace-nowrap flex items-center justify-center gap-1 cursor-pointer ${
              activeSegment === "approvals"
                ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>Phê duyệt</span>
            {pendingRequests.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveSegment("chores")}
            className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all text-center whitespace-nowrap flex items-center justify-center gap-1 cursor-pointer ${
              activeSegment === "chores"
                ? "bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>Việc nhà</span>
            {pendingChores.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center">
                {pendingChores.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveSegment("liquidity")}
            className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all text-center whitespace-nowrap cursor-pointer ${
              activeSegment === "liquidity"
                ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Hũ & Lãi
          </button>
        </div>
      </section>

      {/* --- MỤC 1: TRUNG TÂM PHÊ DUYỆT RÚT TIỀN (MOBILE APPROVAL CENTER) --- */}
      {(activeSegment === "all" || activeSegment === "approvals") && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight uppercase">
                Yêu Cầu Rút Cần Ký Duyệt
              </h2>
            </div>
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
              {pendingRequests.length} đang chờ
            </span>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Không có yêu cầu rút tiền nào cần duyệt
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Tất cả các khoản rút của Ông Bà và Con Cái đều đã được xử lý hoặc giải ngân tức thì 0 gas từ đệm L1.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req) => {
                const isSigningThis = signingRequestId === req.id;
                const alreadySigned = hasUserSigned(req);
                const progressPercent = Math.min(
                  100,
                  Math.round(
                    (req.approvalsCount / Math.max(1, req.requiredApprovals)) * 100
                  )
                );

                // Tìm thông tin người gửi yêu cầu trong danh sách thành viên gia đình
                const requesterMember = members.find(
                  (m) =>
                    m.id === req.requesterId ||
                    m.walletAddress?.toLowerCase() === req.requesterAddress?.toLowerCase()
                );

                return (
                  <article
                    key={req.id}
                    className="p-4 rounded-2xl border border-rose-200/90 dark:border-rose-900/60 bg-gradient-to-b from-white to-rose-50/20 dark:from-slate-900 dark:to-slate-900/90 shadow-sm hover:shadow-md transition-all"
                  >
                    {/* Hàng 1: Người yêu cầu, Role Badge & Tên Hũ */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <SafeAvatar
                          avatar={requesterMember?.avatar}
                          name={req.requesterName || requesterMember?.name}
                          role={requesterMember?.role || "ELDERLY"}
                          size="sm"
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {req.requesterName || requesterMember?.name || "Thành viên"}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {requesterMember?.role === "ELDERLY"
                                ? "Người cao tuổi"
                                : requesterMember?.role === "CHILD"
                                  ? "Trẻ nhỏ"
                                  : "Thành viên"}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            {req.requesterAddress
                              ? `${req.requesterAddress.slice(0, 6)}...${req.requesterAddress.slice(-4)}`
                              : ""}
                          </span>
                        </div>
                      </div>

                      {/* Tên hũ tiền nguồn */}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0">
                        {req.vault || req.vaultName || "Hũ chi tiêu"}
                      </span>
                    </div>

                    {/* Hàng 2: Lý do & Số tiền */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 mb-3 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          Số tiền xin rút:
                        </span>
                        <div className="text-right">
                          <span className="text-base sm:text-lg font-black font-mono text-rose-600 dark:text-rose-400">
                            {amountLabel(req.exactAmount || req.amount)} {hubChain.nativeCurrency.symbol}
                          </span>
                        </div>
                      </div>

                      <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300">
                        <span className="text-slate-400 dark:text-slate-500 mr-1 font-medium">Lý do:</span>
                        <span className="font-semibold italic">&ldquo;{req.reason}&rdquo;</span>
                      </div>
                    </div>

                    {/* Hàng 3: Thanh tiến độ chữ ký M/N */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          Tiến độ biểu quyết:
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                          {req.approvalsCount} / {req.requiredApprovals} Chữ ký
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-300 rounded-full"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>

                      {/* Danh sách chữ ký người giám hộ nếu có */}
                      {req.guardianSignatures && req.guardianSignatures.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {req.guardianSignatures.map((sig, idx) => (
                            <span
                              key={idx}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                sig.signed
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                              }`}
                            >
                              {sig.signed ? <Check className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                              {sig.guardianName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Hàng 4: Nút Ký Duyệt 1-Tap Ergonomic (Chiều cao >= 48px cho thao tác ngón cái di động) */}
                    {alreadySigned ? (
                      <div className="w-full min-h-[48px] rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Bạn đã hoàn thành ký duyệt yêu cầu này</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isSigningThis}
                        onClick={() => handleApproveWithdrawal(req)}
                        className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                        aria-label={`Ký duyệt giải ngân ${req.amount} AVAX`}
                      >
                        {isSigningThis ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Đang ký giao dịch on-chain...</span>
                          </>
                        ) : (
                          <>
                            <PenTool className="w-4 h-4" />
                            <span>Ký Duyệt Rút Tiền Ngay (1-Tap)</span>
                          </>
                        )}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* --- MỤC 2: TRẠM KIỂM TRA VIỆC NHÀ CỦA CON (CHORE VERIFICATION STATION) --- */}
      {(activeSegment === "all" || activeSegment === "chores") && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-600 dark:bg-purple-950/70 dark:text-purple-400 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight uppercase">
                Trạm Kiểm Tra Việc Nhà & Thưởng
              </h2>
            </div>

            {/* Bộ lọc việc nộp vs tất cả */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px]">
              <button
                type="button"
                onClick={() => setChoreFilter("pending")}
                className={`px-2 py-0.5 rounded font-bold transition-all ${
                  choreFilter === "pending"
                    ? "bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                }`}
              >
                Chờ duyệt ({pendingChores.length})
              </button>
              <button
                type="button"
                onClick={() => setChoreFilter("all")}
                className={`px-2 py-0.5 rounded font-bold transition-all ${
                  choreFilter === "all"
                    ? "bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                }`}
              >
                Tất cả
              </button>
            </div>
          </div>

          {displayedChores.length === 0 ? (
            <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 text-center">
              <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-2">
                <Sparkles className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {choreFilter === "pending"
                  ? "Tất cả việc nhà đã được kiểm tra xong"
                  : "Chưa có việc nhà nào được giao"}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Khi các con nộp bài kèm ảnh minh chứng, thẻ việc sẽ hiển thị tại đây để ba mẹ duyệt và trao thưởng vào heo đất.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedChores.map((chore) => {
                const isRewardingThis = rewardingChoreId === chore.id;
                const isSubmitted = chore.status === "SUBMITTED";
                const isRewarded = chore.status === "REWARDED" || chore.status === "VERIFIED";

                return (
                  <article
                    key={chore.id}
                    className="p-4 rounded-2xl border border-purple-200/90 dark:border-purple-900/60 bg-gradient-to-b from-white to-purple-50/20 dark:from-slate-900 dark:to-slate-900/90 shadow-sm hover:shadow-md transition-all"
                  >
                    {/* Hàng 1: Avatar Con & Trạng thái nộp */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <SafeAvatar
                          avatar={chore.childAvatar}
                          name={chore.childName || "Con"}
                          role="CHILD"
                          size="sm"
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
                            {chore.childName || "Con"}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {chore.createdAt ? `Nộp: ${chore.createdAt}` : "Chore-to-Earn"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSubmitted
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                              : isRewarded
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {isSubmitted ? "Đã nộp bài" : isRewarded ? "Đã trao thưởng" : "Chưa làm"}
                        </span>
                      </div>
                    </div>

                    {/* Tiêu đề & Mô tả việc */}
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                      {chore.title}
                    </h3>
                    {chore.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-purple-50/50 dark:bg-purple-950/20 p-2 rounded-xl mb-2.5 border border-purple-100/60 dark:border-purple-900/40">
                        &ldquo;{chore.description}&rdquo;
                      </p>
                    )}

                    {/* Xem ảnh minh chứng / Bằng chứng */}
                    {chore.proofImageUrl && (
                      <div className="mb-3">
                        <button
                          type="button"
                          onClick={() => setSelectedProofChore(chore)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 hover:underline"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem ảnh bằng chứng của con</span>
                        </button>
                      </div>
                    )}

                    {/* Hàng nút hành động và số tiền thưởng */}
                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                          Phần thưởng heo đất
                        </span>
                        <div className="flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-sm font-black font-mono text-purple-700 dark:text-purple-400">
                            +{amountLabel(chore.exactRewardAmount || chore.rewardAmount)} AVAX
                          </span>
                        </div>
                      </div>

                      {isSubmitted ? (
                        <button
                          type="button"
                          disabled={isRewardingThis}
                          onClick={() => handleVerifyChore(chore)}
                          className="min-h-[48px] px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                        >
                          {isRewardingThis ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Đang thưởng...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Duyệt & Trao Thưởng</span>
                            </>
                          )}
                        </button>
                      ) : isRewarded ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Đã trả thưởng</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Chờ con làm xong</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* --- MỤC 3: TỔNG QUAN THANH KHOẢN VÀ SINH LỜI (VAULT LIQUIDITY & YIELD OVERVIEW) --- */}
      {(activeSegment === "all" || activeSegment === "liquidity") && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white tracking-tight uppercase">
                Thanh Khoản Dual-Chain (L1 & C-Chain)
              </h2>
            </div>

            <button
              type="button"
              onClick={() => handleOpenDeposit()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nạp Quỹ</span>
            </button>
          </div>

          {/* Thẻ Chỉ Báo Thanh Khoản Kép Độc Quyền Kinetix (Dual-Chain Indicator Card) */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50 to-emerald-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 shadow-sm">
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                  Tổng Giá Trị Tài Sản Gia Đình
                </span>
                <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                  {liquiditySummary.effectiveTotal.toFixed(4)}{" "}
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    AVAX
                  </span>
                </span>
              </div>
              <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Avalanche Subnet
              </span>
            </div>

            {/* Thanh Phân Tách Tỷ Lệ Đệm Thanh Khoản Dual-Chain */}
            <div className="my-3">
              <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Đệm L1: {liquiditySummary.bufferPercent}%
                </span>
                <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                  Fuji C-Chain: {liquiditySummary.cChainPercent}%
                </span>
              </div>

              <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex p-0.5">
                <div
                  className="h-full bg-emerald-500 rounded-l-full transition-all duration-300"
                  style={{ width: `${liquiditySummary.bufferPercent}%` }}
                />
                <div
                  className="h-full bg-blue-500 rounded-r-full transition-all duration-300"
                  style={{ width: `${liquiditySummary.cChainPercent}%` }}
                />
              </div>
            </div>

            {/* Chi tiết 2 dòng tiền */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 block uppercase">
                  Đệm Family L1
                </span>
                <span className="text-sm font-black font-mono text-emerald-700 dark:text-emerald-400 block mt-0.5">
                  {liquiditySummary.totalBuffer.toFixed(4)} AVAX
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                  Rút tức thì &lt;1s · 0 gas phí
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300 block uppercase">
                  Sinh Lời C-Chain
                </span>
                <span className="text-sm font-black font-mono text-blue-700 dark:text-blue-400 block mt-0.5">
                  {liquiditySummary.totalCChain.toFixed(4)} AVAX
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                  Fuji C-Chain · Lãi 8% APY
                </span>
              </div>
            </div>
          </div>

          {/* Danh sách các Hũ Tiền Đang Hoạt Động (Active Vaults Quick Carousel/Deck) */}
          <div className="mt-3.5 space-y-2">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Các Hũ Đang Hoạt Động ({liquiditySummary.activeVaults.length})
            </h3>

            {liquiditySummary.activeVaults.map((vault) => (
              <div
                key={vault.id}
                className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-800 transition-all"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {vault.name}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {vault.ruleTemplate}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                    <span>
                      Đệm: {Math.round((vault.bufferRatioBps || 1000) / 100)}%
                    </span>
                    <span>•</span>
                    <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                      {Number(vault.totalBalance || vault.cachedTotalBalance || 0).toFixed(2)} AVAX
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenDeposit(vault)}
                  className="min-h-[44px] px-3 py-2 rounded-lg bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold text-xs transition-colors flex items-center gap-1 shrink-0"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>Nạp</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* --- CÁC DIALOG / MODAL HỖ TRỢ --- */}

      {/* 1. Modal Nạp tiền vào Hũ (DepositVaultModal) */}
      {isDepositModalOpen && (
        <DepositVaultModal
          isOpen={isDepositModalOpen}
          onClose={() => {
            setIsDepositModalOpen(false);
            setDepositModalVault(null);
          }}
          defaultVaultId={depositModalVault?.onchainVaultId}
        />
      )}

      {/* 2. Modal Xem Bằng Chứng Việc Nhà (ChoreProofModal) */}
      {selectedProofChore && (
        <ChoreProofModal
          isOpen={Boolean(selectedProofChore)}
          chore={selectedProofChore}
          onClose={() => setSelectedProofChore(null)}
          onApprove={async (choreId, reward) => {
            await handleVerifyChore(selectedProofChore);
          }}
        />
      )}
    </div>
  );
}
