"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  HeartHandshake,
  Info,
  Lightbulb,
  PhoneCall,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Volume2,
  Wallet,
  Zap,
} from "lucide-react";
import { formatEther, parseEther } from "viem";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/hooks/useAuth";
import { useMemberTransaction } from "@/hooks/useMemberTransaction";
import { hubChain } from "@/contracts/config";
import {
  fetchVaultPolicy,
  useVaultPolicy,
  MemberVaultPolicy,
} from "@/hooks/useVaultPolicy";
import { parseAmount } from "@/lib/member";
import { useMemberPreferences } from "@/components/layout/MemberResponsiveShell";
import { EmptyState } from "./MemberPrimitives";
import { MemberFamily } from "./MemberFamily";
import { VaultExperience } from "@/components/vaults/VaultExperience";
import { ElderlySpeakerButton } from "./ElderlySpeakerButton";
import { ElderlyQuickWithdrawCard } from "./ElderlyQuickWithdrawCard";
import { ElderlyConfirmationModal } from "./ElderlyConfirmationModal";
import {
  ElderlyRequestTracker,
  WithdrawalRequestItem,
} from "./ElderlyRequestTracker";
import { ElderlyFamilySupport } from "./ElderlyFamilySupport";
import {
  formatElderlyAvax,
  formatElderlyDate,
  getElderlyRequestStatusInfo,
} from "./elderlyUtils";

interface ElderlyPortalProps {
  /** Chế độ xem trước của quản trị viên */
  preview?: boolean;
}

/**
 * Cổng giao diện di động chuẩn công thái học dành riêng cho Người cao tuổi (Ông bà / Senior).
 * Tuân thủ nghiêm ngặt chỉ dẫn ui-ux-pro-max:
 * 1. Khả năng tiếp cận & Công thái học:
 *    - Tương phản màu sắc WCAG AAA (>= 7:1) cả sáng và tối.
 *    - Vùng cảm ứng ngoại cỡ (>= 56px) với phản hồi chạm rõ ràng (active:scale-95).
 *    - Chữ to rõ (tối thiểu 18px body, 24px+ tiêu đề).
 *    - Nút đọc to âm thanh tiếng Việt được đặt nổi bật trên mọi thẻ chức năng (ElderlySpeakerButton).
 *    - Lucide SVG icons duy nhất, hoàn toàn không dùng emoji thô.
 * 2. Tính năng cốt lõi:
 *    - Thẻ rút tiền trợ cấp tức thì (0 gas, <1s từ bộ đệm L1) với chip chọn nhanh.
 *    - Trình theo dõi yêu cầu bình dị không hiển thị mã băm Web3 gây rối.
 *    - Thẻ hỗ trợ gia đình với nút gọi điện thoại 1-chạm trực tiếp cho con cháu.
 *    - Hộp thoại xác nhận đơn giản hóa với nút "ĐỒNG Ý RÚT" siêu to.
 */
function ContractElderlyPortal({ preview = false }: ElderlyPortalProps) {
  const family = useFamily();
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const query = useSearchParams();
  const preferences = useMemberPreferences();
  const tx = useMemberTransaction();

  // Xác định các hũ hỗ trợ an sinh (Quy tắc SHIELD)
  const shieldVaults = family.dynamicVaults.filter(
    (v) => v.ruleTemplate === "SHIELD" && v.isActive
  );

  // ID hũ đang chọn
  const [vaultId, setVaultId] = useState(
    query.get("vault") || (shieldVaults.length > 0 ? shieldVaults[0].id : "")
  );

  // Tự động chọn hũ nếu chỉ có 1 hũ
  useEffect(() => {
    if (!vaultId && shieldVaults.length > 0) {
      setVaultId(shieldVaults[0].id);
    }
  }, [shieldVaults, vaultId]);

  const selectedVault =
    shieldVaults.find((v) => v.id === vaultId) ||
    (shieldVaults.length === 1 ? shieldVaults[0] : undefined);

  // Lấy chính sách hũ từ smart contract
  const policyState = useVaultPolicy(preview ? undefined : selectedVault?.id);
  const policy = policyState.policy;

  // Lấy các yêu cầu rút tiền của người dùng hiện tại
  const myRequests: WithdrawalRequestItem[] = family.withdrawalRequests
    .filter((req) => req.requesterId === auth.user?.id)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const asset = hubChain.nativeCurrency.symbol || "AVAX";
  const mode = pathname.split("/")[3]; // "requests" | "family" | "withdraw" | undefined

  // State quản lý Hộp thoại xác nhận rút tiền
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    amount: string;
    isLarge: boolean;
    reason: string;
  }>({
    isOpen: false,
    amount: "0.5",
    isLarge: false,
    reason: "Sinh hoạt hàng ngày",
  });

  // Mở modal xác nhận từ thẻ rút nhanh
  const handleOpenConfirm = ({
    amount,
    isLarge,
    reason,
  }: {
    amount: string;
    isLarge: boolean;
    reason: string;
  }) => {
    setConfirmModal({
      isOpen: true,
      amount,
      isLarge,
      reason,
    });
  };

  // Đóng modal xác nhận
  const handleCloseConfirm = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    // Nếu giao dịch thành công thì làm mới số dư
    if (tx.state === "success") {
      family.refreshBalances();
    }
  };

  // Thực thi giao dịch rút tiền khi nhấn "ĐỒNG Ý RÚT"
  const handleExecuteWithdraw = async () => {
    if (!selectedVault || !policy) return;

    try {
      const value = parseAmount(confirmModal.amount);
      await tx.execute({
        functionName: confirmModal.isLarge
          ? "requestLargeWithdrawal"
          : "fastWithdraw",
        args: [
          BigInt(selectedVault.onchainVaultId),
          value,
          ...(confirmModal.isLarge ? [confirmModal.reason] : []),
        ],
        path: confirmModal.isLarge ? "/api/withdrawals/create" : "/api/vaults",
        method: confirmModal.isLarge ? "POST" : "PATCH",
        body: confirmModal.isLarge
          ? { vaultId: selectedVault.id }
          : { vaultId: selectedVault.id, action: "WITHDRAW" },
        preflight: async () => {
          const latest = await fetchVaultPolicy(selectedVault.id);
          if (!latest.isActive || !latest.isBeneficiary) {
            throw new Error(
              "Quyền thụ hưởng đã thay đổi. Hãy tải lại trang trước khi xác nhận."
            );
          }
          if (
            value > parseEther(latest.fastWithdrawLimit) !==
              confirmModal.isLarge ||
            latest.requiredApprovals !== policy.requiredApprovals
          ) {
            throw new Error(
              "Chính sách hũ đã đổi. Vui lòng tải lại trang và kiểm tra lại."
            );
          }
        },
      });
    } catch (error: any) {
      console.error("Lỗi xác nhận rút tiền:", error);
    }
  };

  // =========================================================================
  // SUB-VIEW 1: MÀN HÌNH CHI TIẾT 1 YÊU CẦU HOẶC TOÀN BỘ DANH SÁCH YÊU CẦU
  // =========================================================================
  if (!preview && mode === "requests") {
    const requestId = pathname.split("/")[4];

    // Xem chi tiết 1 yêu cầu cụ thể
    if (requestId) {
      const request = myRequests.find((r) => r.id === requestId);
      return (
        <div className="space-y-6 pb-24">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/elderly/requests"
              className="min-h-[56px] min-w-[56px] px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center gap-2 font-bold text-lg active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-400"
            >
              <ArrowLeft className="w-6 h-6" aria-hidden="true" />
              <span>Quay lại</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-slate-50">
              Chi tiết yêu cầu rút tiền
            </h1>
          </div>

          {!request ? (
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-3xl p-8 text-center space-y-4">
              <Info className="w-12 h-12 mx-auto text-amber-600" aria-hidden="true" />
              <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                Không tìm thấy yêu cầu này
              </h2>
              <p className="text-lg text-slate-700 dark:text-slate-300">
                Yêu cầu có thể đã được cập nhật hoặc không thuộc tài khoản hiện tại.
              </p>
              <Link
                href="/dashboard/elderly/requests"
                className="inline-flex min-h-[56px] px-6 items-center justify-center rounded-2xl bg-emerald-700 text-white font-bold text-lg"
              >
                Về danh sách yêu cầu
              </Link>
            </div>
          ) : (
            (() => {
              const statusInfo = getElderlyRequestStatusInfo(
                request.status,
                request.approvalsCount,
                request.requiredApprovals
              );
              const amountFormatted = formatElderlyAvax(request.exactAmount);
              const detailSpeech = `Chi tiết yêu cầu rút tiền. Số tiền ${amountFormatted} AVAX cho mục đích ${
                request.reason || "Sinh hoạt"
              }. Tình trạng: ${statusInfo.title}. ${statusInfo.subTitle}.`;

              return (
                <section className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-3xl p-6 md:p-8 shadow-md space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-slate-200 dark:border-slate-800">
                    <span
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-black ${statusInfo.badgeClass}`}
                    >
                      {statusInfo.isExecuted ? (
                        <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
                      ) : (
                        <Clock className="w-6 h-6" aria-hidden="true" />
                      )}
                      <span>{statusInfo.title}</span>
                    </span>

                    <ElderlySpeakerButton
                      textToSpeak={detailSpeech}
                      label="Nghe chi tiết"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-lg font-bold text-slate-600 dark:text-slate-400">
                      Số tiền yêu cầu rút:
                    </p>
                    <p className="text-4xl sm:text-5xl font-black text-slate-950 dark:text-slate-50">
                      {amountFormatted} <span className="text-3xl font-bold">{asset}</span>
                    </p>
                    <p className="text-xl font-bold text-emerald-800 dark:text-emerald-300">
                      Hũ nguồn: {request.vaultName} · Mục đích: {request.reason}
                    </p>
                  </div>

                  {/* Tiến độ duyệt */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-300 dark:border-slate-700 space-y-4">
                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
                      Tiến độ con cháu duyệt:
                    </h3>
                    <div className="flex items-center justify-between text-lg font-bold">
                      <span>Đã có người đồng ý:</span>
                      <span className="text-2xl font-black text-emerald-800 dark:text-emerald-300">
                        {request.approvalsCount} / {request.requiredApprovals} người
                      </span>
                    </div>
                    <div className="w-full h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            100,
                            (request.approvalsCount / (request.requiredApprovals || 1)) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Thời gian */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-lg">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                      <p className="text-slate-600 dark:text-slate-400 font-medium">
                        Thời gian gửi yêu cầu:
                      </p>
                      <p className="font-black text-slate-950 dark:text-slate-50 mt-1">
                        {formatElderlyDate(request.createdAt)}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                      <p className="text-slate-600 dark:text-slate-400 font-medium">
                        Hạn chót duyệt:
                      </p>
                      <p className="font-black text-slate-950 dark:text-slate-50 mt-1">
                        {request.deadline
                          ? formatElderlyDate(request.deadline)
                          : "Đang kiểm tra với mạng gia đình"}
                      </p>
                    </div>
                  </div>

                  {/* Nút gọi con cháu hỗ trợ duyệt */}
                  {statusInfo.isPending && (
                    <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-600 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="text-lg font-black text-amber-950 dark:text-amber-100">
                          Cần nhận tiền gấp?
                        </p>
                        <p className="text-base text-amber-900 dark:text-amber-200">
                          Bấm nút gọi ngay để con cháu mở máy và bấm duyệt cho ông bà.
                        </p>
                      </div>
                      <Link
                        href="/dashboard/elderly/family"
                        className="min-h-[56px] px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xl flex items-center justify-center gap-2 active:scale-95 transition-all flex-shrink-0"
                      >
                        <PhoneCall className="w-6 h-6" aria-hidden="true" />
                        <span>Gọi người thân</span>
                      </Link>
                    </div>
                  )}
                </section>
              );
            })()
          )}
        </div>
      );
    }

    // Danh sách toàn bộ yêu cầu
    return (
      <div className="space-y-6 pb-24">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/elderly"
            className="min-h-[56px] min-w-[56px] px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center gap-2 font-bold text-lg active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-400"
          >
            <ArrowLeft className="w-6 h-6" aria-hidden="true" />
            <span>Về trang chính</span>
          </Link>
          <div>
            <span className="text-xs font-black tracking-wider uppercase text-emerald-800 dark:text-emerald-300">
              Minh bạch · An tâm
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-slate-50">
              Toàn bộ yêu cầu trợ cấp
            </h1>
          </div>
        </div>

        <ElderlyRequestTracker
          requests={myRequests}
          asset={asset}
          title="Tất cả yêu cầu rút tiền của ông bà"
        />
      </div>
    );
  }

  // =========================================================================
  // SUB-VIEW 2: MÀN HÌNH NGƯỜI THÂN HỖ TRỢ / DANH BẠ GIA ĐÌNH
  // =========================================================================
  if (!preview && mode === "family") {
    return (
      <div className="space-y-6 pb-24">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/elderly"
            className="min-h-[56px] min-w-[56px] px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center gap-2 font-bold text-lg active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-400"
          >
            <ArrowLeft className="w-6 h-6" aria-hidden="true" />
            <span>Về trang chính</span>
          </Link>
          <div>
            <span className="text-xs font-black tracking-wider uppercase text-rose-800 dark:text-rose-300">
              Liên lạc gia đình
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-slate-50">
              Người thân bảo hộ
            </h1>
          </div>
        </div>

        <ElderlyFamilySupport
          workspaceId={family.currentWorkspace?.id}
          title="Danh bạ người bảo hộ gia đình"
        />
      </div>
    );
  }

  // =========================================================================
  // SUB-VIEW 3: MÀN HÌNH RÚT TIỀN TRỰC TIẾP
  // =========================================================================
  if (!preview && mode === "withdraw") {
    return (
      <div className="space-y-6 pb-24">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/elderly"
            className="min-h-[56px] min-w-[56px] px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center gap-2 font-bold text-lg active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-400"
          >
            <ArrowLeft className="w-6 h-6" aria-hidden="true" />
            <span>Về trang chính</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-slate-50">
            Rút tiền trợ cấp về ví
          </h1>
        </div>

        {selectedVault ? (
          <ElderlyQuickWithdrawCard
            vaults={shieldVaults}
            selectedVault={selectedVault}
            onSelectVault={setVaultId}
            policy={policy}
            asset={asset}
            onRequestWithdraw={handleOpenConfirm}
            isBusy={tx.busy}
          />
        ) : (
          <EmptyState
            title={
              shieldVaults.length
                ? "Hãy chọn hũ hỗ trợ"
                : "Chưa có hũ hỗ trợ phù hợp"
            }
          >
            Người bảo hộ cần cấp quyền thụ hưởng cho bạn trên hũ SHIELD.
          </EmptyState>
        )}

        <ElderlyConfirmationModal
          isOpen={confirmModal.isOpen}
          onClose={handleCloseConfirm}
          onConfirm={handleExecuteWithdraw}
          amount={confirmModal.amount}
          asset={asset}
          vaultName={selectedVault?.name || "Hũ an sinh"}
          isLarge={confirmModal.isLarge}
          reason={confirmModal.reason}
          recipientAddress={auth.linkedWallet?.address}
          txState={tx.state}
          txMessage={tx.message}
          txError={tx.state === "error" ? tx.message : undefined}
        />
      </div>
    );
  }

  // =========================================================================
  // MAIN VIEW: TRANG CHỦ TIỆN ÍCH CHO NGƯỜI CAO TUỔI (HOME DASHBOARD)
  // =========================================================================
  if (!selectedVault && shieldVaults.length === 0) {
    return (
      <EmptyState title="Chưa có hũ hỗ trợ phù hợp">
        Người bảo hộ cần cấp quyền thụ hưởng cho bạn trên hũ SHIELD.
      </EmptyState>
    );
  }

  const availableNowNum = policy?.availableNow
    ? parseFloat(policy.availableNow)
    : 0;
  const totalBalanceNum = policy?.totalBalance
    ? parseFloat(policy.totalBalance)
    : selectedVault?.exactTotalBalance
    ? parseFloat(selectedVault.exactTotalBalance)
    : 0;

  // Giọng nói đọc trang chủ
  const welcomeSpeech = `Kính chào ông bà ${
    auth.user?.fullName || ""
  }. Hũ an sinh gia đình ${selectedVault?.name || ""} đang có sẵn ${formatElderlyAvax(
    availableNowNum
  )} AVAX để rút ngay tức thì không mất phí. Ông bà có thể chọn rút tiền nhanh ở thẻ bên dưới hoặc bấm nút gọi con cháu khi cần giúp đỡ.`;

  return (
    <div className="space-y-6 pb-28">
      {/* 1. THANH CHÀO HỎI & TRỢ LÝ TRUY CẬP (ACCESSIBILITY TOOLBAR) */}
      <header className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-sm font-black tracking-wider uppercase bg-emerald-950/60 text-emerald-200 border border-emerald-400/40">
              <Sparkles className="w-4 h-4 text-emerald-300" aria-hidden="true" />
              Kinetix An Sinh · Avalanche Family L1
            </span>

            {/* Nút bật/tắt cỡ chữ siêu lớn */}
            <button
              type="button"
              onClick={preferences.toggleLarge}
              aria-pressed={preferences.largeText}
              className={`min-h-[56px] px-5 py-2.5 rounded-2xl font-black text-lg border-2 transition-all active:scale-95 flex items-center gap-2 focus:outline-none focus:ring-4 focus:ring-emerald-300 ${
                preferences.largeText
                  ? "bg-white text-emerald-950 border-white shadow-lg"
                  : "bg-emerald-950/50 hover:bg-emerald-950/80 text-white border-emerald-400/60"
              }`}
            >
              <span className="text-2xl leading-none">A+</span>
              <span>{preferences.largeText ? "Cỡ chữ lớn: BẬT" : "Cỡ chữ lớn"}</span>
            </button>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white pt-1">
            Kính chào, {auth.user?.fullName || "Ông Bà"}
          </h1>

          <p className="text-xl sm:text-2xl text-emerald-100 max-w-2xl font-medium">
            Khoản hỗ trợ từ con cháu luôn sẵn sàng, dễ xem và dễ rút về ví.
          </p>

          {/* Hàng nút trợ lý đọc màn hình */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <ElderlySpeakerButton
              textToSpeak={welcomeSpeech}
              label="Nghe đọc trang này"
              className="bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-400 font-black"
            />
            <span className="text-base text-emerald-200 font-medium inline-flex items-center gap-1.5">
              <Lightbulb className="w-5 h-5 text-emerald-300 flex-shrink-0" aria-hidden="true" />
              Bấm vào nút loa ở bất kỳ thẻ nào để nghe giọng đọc to rõ.
            </span>
          </div>
        </div>

        {/* Trang trí nền */}
        <div
          className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-emerald-700/20 pointer-events-none blur-2xl"
          aria-hidden="true"
        />
      </header>

      {/* Cảnh báo nếu có lỗi chính sách */}
      {policyState.error && (
        <div
          role="alert"
          className="p-5 rounded-3xl bg-rose-50 dark:bg-rose-950 border-2 border-rose-500 text-rose-950 dark:text-rose-100 space-y-3"
        >
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-rose-600 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xl font-black">Chưa kiểm tra được hũ an sinh</p>
              <p className="text-lg">{policyState.error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={policyState.retry}
            className="min-h-[56px] px-6 rounded-2xl bg-white dark:bg-slate-800 border-2 border-rose-600 text-rose-900 dark:text-rose-200 font-bold text-lg active:scale-95"
          >
            Thử kiểm tra lại
          </button>
        </div>
      )}

      {/* 2. THẺ TỔNG QUAN SỐ DƯ HŨ AN SINH (BALANCE SUMMARY CARD) */}
      <section
        className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-3xl p-6 sm:p-8 shadow-md"
        aria-labelledby="balance-summary-title"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 border-2 border-emerald-600 dark:border-emerald-400 flex items-center justify-center text-emerald-900 dark:text-emerald-200 flex-shrink-0">
              <ShieldCheck className="w-8 h-8" aria-hidden="true" />
            </div>
            <div>
              <span className="text-xs font-black tracking-wider uppercase text-emerald-800 dark:text-emerald-300">
                Quỹ an sinh gia đình
              </span>
              <h2
                id="balance-summary-title"
                className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-slate-50 mt-0.5"
              >
                {selectedVault?.name || "Hũ An Sinh"}
              </h2>
            </div>
          </div>

          <ElderlySpeakerButton
            textToSpeak={`Số dư hũ an sinh ${selectedVault?.name || ""}. Số tiền có thể rút ngay tức thì là ${formatElderlyAvax(
              availableNowNum
            )} AVAX. Tổng quỹ đang có là ${formatElderlyAvax(
              totalBalanceNum
            )} AVAX, tiền nhàn rỗi được gửi sinh lãi tám phần trăm một năm trên Fuji C-Chain.`}
            label="Nghe số dư"
          />
        </div>

        {/* Khối số dư to lớn (36px+) */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cột 1: Rút ngay tức thì */}
          <div className="p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-400 dark:border-emerald-600 space-y-2">
            <div className="flex items-center gap-2 text-emerald-950 dark:text-emerald-200 text-lg font-bold">
              <Zap className="w-6 h-6 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              <span>Có thể rút ngay tức thì:</span>
            </div>
            <p className="text-4xl sm:text-5xl font-black text-emerald-800 dark:text-emerald-300">
              {formatElderlyAvax(availableNowNum)}{" "}
              <span className="text-2xl font-bold">{asset}</span>
            </p>
            <p className="text-base font-semibold text-emerald-900 dark:text-emerald-200 inline-flex items-center gap-1.5">
              <Zap className="w-5 h-5 text-emerald-700 dark:text-emerald-400 flex-shrink-0" aria-hidden="true" />
              Không cần chờ duyệt · 0 Gas · Nhận dưới 1 giây
            </p>
          </div>

          {/* Cột 2: Tổng số dư quỹ */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-300 dark:border-slate-700 space-y-2">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-lg font-bold">
              <TrendingUp className="w-6 h-6 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              <span>Tổng số dư quỹ an sinh:</span>
            </div>
            <p className="text-4xl sm:text-5xl font-black text-slate-950 dark:text-slate-50">
              {formatElderlyAvax(totalBalanceNum)}{" "}
              <span className="text-2xl font-bold">{asset}</span>
            </p>
            <p className="text-base font-semibold text-slate-600 dark:text-slate-400 inline-flex items-center gap-1.5">
              <TrendingUp className="w-5 h-5 text-emerald-700 dark:text-emerald-400 flex-shrink-0" aria-hidden="true" />
              Tiền nhàn rỗi sinh lời ~8% APY trên Fuji C-Chain
            </p>
          </div>
        </div>
      </section>

      {/* 3. THẺ RÚT TIỀN TRỢ CẤP TỨC THÌ (QUICK ALLOWANCE WITHDRAWAL CARD) */}
      <ElderlyQuickWithdrawCard
        vaults={shieldVaults}
        selectedVault={selectedVault}
        onSelectVault={setVaultId}
        policy={policy}
        asset={asset}
        onRequestWithdraw={handleOpenConfirm}
        isBusy={tx.busy}
      />

      {/* 4. TRÌNH THEO DÕI YÊU CẦU BÌNH DỊ (PLAIN-LANGUAGE REQUEST TRACKER) */}
      <ElderlyRequestTracker
        requests={myRequests}
        asset={asset}
        limit={2}
        title="Yêu cầu trợ cấp gần đây"
        showViewAllLink={myRequests.length > 2}
      />

      {/* 5. THẺ HỖ TRỢ GIA ĐÌNH & GỌI ĐIỆN THOẠI 1-CHẠM (FAMILY SUPPORT CARD) */}
      <ElderlyFamilySupport
        workspaceId={family.currentWorkspace?.id}
        title="Gọi trợ giúp con cháu"
        compact={true}
      />

      {/* 6. HỘP THOẠI XÁC NHẬN RÚT TIỀN ĐƠN GIẢN HÓA (CONFIRMATION MODAL) */}
      <ElderlyConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={handleCloseConfirm}
        onConfirm={handleExecuteWithdraw}
        amount={confirmModal.amount}
        asset={asset}
        vaultName={selectedVault?.name || "Hũ an sinh"}
        isLarge={confirmModal.isLarge}
        reason={confirmModal.reason}
        recipientAddress={auth.linkedWallet?.address}
        txState={tx.state}
        txMessage={tx.message}
        txError={tx.state === "error" ? tx.message : undefined}
      />
    </div>
  );
}

/**
 * Xuất khẩu ElderlyPortal với lớp bọc VaultExperience (tương thích cả ví chung Core và Smart Contract).
 */
export function ElderlyPortal({ preview = false }: ElderlyPortalProps) {
  const pathname = usePathname();
  if (pathname.includes("/family")) return <MemberFamily elderly />;
  return (
    <VaultExperience
      kind="SHIELD"
      legacy={<ContractElderlyPortal preview={preview} />}
    />
  );
}
