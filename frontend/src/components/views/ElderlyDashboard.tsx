"use client";

import React, { useState } from "react";
import {
  PhoneCall,
  Volume2,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  AlertCircle,
  HelpCircle,
  Check,
  X,
  Heart,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/hooks/useAuth";

const USDC_TO_VND_RATE = 25400;

export interface ElderlyDashboardProps {
  onSwitchToAdmin?: () => void;
}

export const ElderlyDashboard: React.FC<ElderlyDashboardProps> = ({
  onSwitchToAdmin,
}) => {
  const {
    currentWorkspace,
    dynamicVaults,
    fastWithdrawFromVault,
    withdrawalRequests,
    requestVaultWithdrawal,
    members,
  } = useFamily();
  const { user } = useAuth();

  // Tìm hũ SHIELD (Hũ an sinh / Phụ dưỡng) của gia đình
  const shieldVault =
    dynamicVaults.find((v) => v.ruleTemplate === "SHIELD") ||
    dynamicVaults[0] || {
      id: "vault-elderly-default",
      onchainVaultId: 1,
      name: "Hũ Báo Hiếu & Trợ Cấp Cụ Ba",
      totalBalance: 850.0,
      l1BufferBalance: 85.0,
      cChainPrincipal: 765.0,
      fastWithdrawLimit: 50.0,
      requiredApprovals: 2,
    };

  // State rút tiền nhanh
  const [selectedAmount, setSelectedAmount] = useState<number>(20);
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);
  const [withdrawFeedback, setWithdrawFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Modal khẩn cấp gọi con
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);

  // Modal yêu cầu rút tiền lớn (Multisig)
  const [showLargeWithdrawModal, setShowLargeWithdrawModal] =
    useState<boolean>(false);
  const [largeAmount, setLargeAmount] = useState<string>("1000");
  const [largeReason, setLargeReason] = useState<string>(
    "Viện phí kiểm tra tim mạch đột xuất",
  );
  const [isSubmittingLarge, setIsSubmittingLarge] = useState<boolean>(false);

  // Âm thanh trợ thính (Speech synthesis)
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const totalBalance = shieldVault.totalBalance || 850.0;
  const l1Buffer = shieldVault.l1BufferBalance || 85.0;
  const cchainStaked = shieldVault.cChainPrincipal || 765.0;
  const totalVnd = Math.round(totalBalance * USDC_TO_VND_RATE);

  // Đọc to số dư bằng tiếng Việt
  const handleReadBalance = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const text = `Thưa cụ, số dư khả dụng trong hũ phụ dưỡng là ${totalBalance} đô la, tương đương khoảng ${totalVnd.toLocaleString("vi-VN")} đồng Việt Nam. Cụ có thể rút ngay tám mươi lăm đô la trong một giây mà không tốn phí.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "vi-VN";
      utterance.rate = 0.9;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Thực hiện rút tiền tức thì 0 gas từ đệm L1
  const handleFastWithdraw = async () => {
    setIsWithdrawing(true);
    setWithdrawFeedback(null);
    try {
      if (fastWithdrawFromVault) {
        await fastWithdrawFromVault(
          shieldVault.onchainVaultId || 1,
          selectedAmount,
        );
      }
      setWithdrawFeedback({
        type: "success",
        text: `Đã rút thành công ${selectedAmount} USDC (~${(selectedAmount * USDC_TO_VND_RATE).toLocaleString("vi-VN")} VNĐ) về tài khoản Cụ Ba trong 1 giây (0đ phí).`,
      });
      // Đọc thông báo thành công
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const msg = new SpeechSynthesisUtterance(
          `Đã rút ${selectedAmount} đô la thành công về tài khoản của cụ trong một giây.`,
        );
        msg.lang = "vi-VN";
        window.speechSynthesis.speak(msg);
      }
    } catch (err: any) {
      setWithdrawFeedback({
        type: "error",
        text: err?.message || "Chưa thể thực hiện rút tiền lúc này.",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Gửi yêu cầu rút lớn cần duyệt
  const handleSubmitLargeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingLarge(true);
    try {
      if (requestVaultWithdrawal) {
        await requestVaultWithdrawal(
          shieldVault.onchainVaultId || 1,
          parseFloat(largeAmount),
          largeReason,
        );
      }
      setShowLargeWithdrawModal(false);
      setWithdrawFeedback({
        type: "success",
        text: `Yêu cầu rút ${largeAmount} USDC đã được gửi đến con cháu! Cần 2/3 người ký duyệt để bảo vệ tài sản của cụ.`,
      });
    } catch (err: any) {
      setWithdrawFeedback({
        type: "error",
        text: err?.message || "Không thể gửi yêu cầu.",
      });
    } finally {
      setIsSubmittingLarge(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] text-slate-900 pb-20 font-sans">
      {/* THANH THÔNG TIN HỖ TRỢ TRÊN CÙNG */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xl shrink-0">
              👴
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Chế Độ Ông Bà
                </h1>
                <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  WCAG AAA
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                {currentWorkspace?.name || "Đại Gia Đình Họ Nguyễn"} • Dễ Nhìn,
                Dễ Dùng
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSwitchToAdmin && (
              <button
                type="button"
                onClick={onSwitchToAdmin}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                <span>Chế độ Quản trị</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* NÚT GỌI KHẨN CẤP CHO CON TRAI */}
            <button
              type="button"
              onClick={() => setShowEmergencyModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-extrabold text-sm sm:text-base shadow-md shadow-rose-600/20 active:scale-95 transition cursor-pointer"
            >
              <PhoneCall className="w-5 h-5 text-white animate-pulse" />
              <span>📞 Gọi Cho Con Trai</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* PHẢN HỒI THÔNG BÁO RÚT TIỀN */}
        {withdrawFeedback && (
          <div
            className={`p-4 rounded-2xl border flex items-start justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2 duration-200 ${
              withdrawFeedback.type === "success"
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : "bg-red-50 border-red-300 text-red-900"
            }`}
          >
            <div className="flex items-center gap-3">
              {withdrawFeedback.type === "success" ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
              )}
              <p className="text-base font-bold">{withdrawFeedback.text}</p>
            </div>
            <button
              type="button"
              onClick={() => setWithdrawFeedback(null)}
              className="p-1 hover:bg-black/5 rounded-lg text-slate-500 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* THẺ SỐ DƯ TỔNG QUAN NGOẠI CỠ (HIGH CONTRAST & TRỰC QUAN) */}
        <section className="bg-white rounded-3xl border-2 border-slate-300 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                Quỹ Phụng Dưỡng & An Sinh Dành Cho Cụ
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                {shieldVault.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleReadBalance}
              disabled={isSpeaking}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-sm font-bold cursor-pointer transition active:scale-95 self-start sm:self-auto"
            >
              <Volume2
                className={`w-5 h-5 ${isSpeaking ? "text-emerald-600 animate-spin" : "text-slate-600"}`}
              />
              <span>{isSpeaking ? "Đang đọc số dư..." : "🔊 Đọc to số dư"}</span>
            </button>
          </div>

          <div className="mt-6 flex flex-col md:flex-row md:items-baseline md:justify-between gap-2">
            <div>
              <div className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight tabular-nums font-mono">
                {totalBalance.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                <span className="text-2xl sm:text-3xl font-bold text-slate-500">
                  USDC
                </span>
              </div>
              <div className="mt-2 text-xl sm:text-2xl font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 inline-block px-3 py-1 rounded-xl tabular-nums">
                ≈ {totalVnd.toLocaleString("vi-VN")}{" "}
                <span className="text-base font-bold">VNĐ</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-slate-500 font-semibold bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 self-start md:self-auto mt-2 md:mt-0">
              Tỷ giá quy đổi cố định: 1 USDC = 25.400 VNĐ
            </div>
          </div>

          {/* ĐỆM THANH KHOẢN L1 & SINH LỜI C-CHAIN GIẢI THÍCH ĐƠN GIẢN */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 border-t border-slate-100">
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                Sẵn sàng rút ngay (Bộ đệm L1)
              </div>
              <div className="mt-1 text-2xl font-black text-emerald-900 tabular-nums font-mono">
                {l1Buffer.toFixed(2)} USDC
              </div>
              <p className="mt-1 text-xs text-emerald-700 font-medium">
                ⚡ Rút tức thì trong 1 giây, hoàn toàn 0đ phí giao dịch.
              </p>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Tích lũy sinh lời C-Chain (90%)
              </div>
              <div className="mt-1 text-2xl font-black text-blue-900 tabular-nums font-mono">
                {cchainStaked.toFixed(2)} USDC
              </div>
              <p className="mt-1 text-xs text-blue-700 font-medium">
                📈 Đang sinh lời ~8% APY (+
                {((cchainStaked * 0.08) / 12).toFixed(2)} USDC/tháng).
              </p>
            </div>
          </div>
        </section>

        {/* KHU VỰC RÚT TIỀN TỨC THÌ (CHO ÔNG BÀ ĐI CHỢ & MUA THUỐC) */}
        <section className="bg-white rounded-3xl border-2 border-slate-300 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-2 pb-3">
            <Wallet className="w-6 h-6 text-emerald-600" />
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              Rút Tiền Nhanh Đi Chợ & Sinh Hoạt
            </h3>
          </div>
          <p className="text-slate-600 text-base font-medium">
            Chọn số tiền cụ cần dùng. Tiền sẽ được rút tức thì từ bộ đệm L1 về
            ví trong 1 giây (0đ phí gas):
          </p>

          {/* 3 NÚT TIỀN CHỢ LỚN BẤM RẤT DỄ DÀNG */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5">
            {[
              {
                amount: 10,
                label: "Tiền đi chợ sáng",
                vnd: "254.000 VNĐ",
                icon: "🥬",
              },
              {
                amount: 20,
                label: "Mua thuốc & hoa quả",
                vnd: "508.000 VNĐ",
                icon: "💊",
              },
              {
                amount: 50,
                label: "Tiêu dùng cả tuần",
                vnd: "1.270.000 VNĐ",
                icon: "🛒",
              },
            ].map((item) => {
              const isSelected = selectedAmount === item.amount;
              return (
                <button
                  key={item.amount}
                  type="button"
                  onClick={() => setSelectedAmount(item.amount)}
                  className={`min-h-[100px] p-4 rounded-2xl border-2 text-left transition flex flex-col justify-between cursor-pointer active:scale-98 ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50/60 shadow-md ring-2 ring-emerald-600/30"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{item.icon}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isSelected
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.amount <= (shieldVault.fastWithdrawLimit || 50)
                        ? "0đ Gas"
                        : "Cần duyệt"}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums font-mono">
                      {item.amount}{" "}
                      <span className="text-base font-bold text-slate-500">
                        USDC
                      </span>
                    </div>
                    <div className="text-sm font-bold text-emerald-700">
                      ≈ {item.vnd}
                    </div>
                    <div className="text-xs text-slate-500 font-semibold mt-0.5">
                      {item.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* NÚT RÚT TIỀN KHỔNG LỒ XANH LÁ CÂY ĐẠT WCAG AAA */}
          <div className="mt-6">
            <button
              type="button"
              disabled={isWithdrawing}
              onClick={handleFastWithdraw}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xl sm:text-2xl py-5 px-6 rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-3 transition cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              {isWithdrawing ? (
                <>
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xử lý rút tiền trong 1 giây...</span>
                </>
              ) : (
                <>
                  <ArrowDownLeft className="w-8 h-8 stroke-[3]" />
                  <span>RÚT TIỀN NGAY ({selectedAmount} USDC - 0Đ PHÍ)</span>
                </>
              )}
            </button>
            <p className="text-center text-xs sm:text-sm text-slate-500 font-medium mt-2">
              ✓ Giải ngân tức thì từ đệm L1 • Không cần chờ biểu quyết • Miễn
              phí giao dịch 100%
            </p>
          </div>
        </section>

        {/* THẺ KHOÁ AN TOÀN GIA ĐÌNH (MULTISIG SAFETY LOCK CARD CHO RÚT LỚN) */}
        <section className="bg-white rounded-3xl border-2 border-slate-300 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-2xl shrink-0">
                🛡️
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  Khoá An Toàn Gia Đình (Bảo Vệ Chống Lừa Đảo)
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Rút số tiền lớn ({">"}
                  {shieldVault.fastWithdrawLimit || 50} USDC) cần tối thiểu 2/3
                  người thân ký duyệt để bảo vệ cụ.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowLargeWithdrawModal(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm sm:text-base rounded-xl transition cursor-pointer shadow-md shadow-amber-500/20 active:scale-95 self-start sm:self-auto shrink-0"
            >
              + Yêu Cầu Rút Lớn (Viện phí / Khẩn cấp)
            </button>
          </div>

          {/* TRẠNG THÁI YÊU CẦU ĐANG CHỜ DUYỆT */}
          <div className="mt-5 space-y-3">
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-300 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full">
                    ĐANG CHỜ 2/3 DUYỆT
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    Tạo lúc 08:30 hôm nay
                  </span>
                </div>
                <div className="text-lg font-black text-slate-900">
                  Cụ Ba yêu cầu rút 1,000.00 USDC (~25.400.000 VNĐ)
                </div>
                <p className="text-sm text-slate-700 font-medium flex items-center gap-1.5">
                  <span className="font-bold text-slate-900">Lý do:</span> Viện
                  phí khám sức khoẻ định kỳ & thuốc tim mạch
                </p>
              </div>

              {/* TIẾN TRÌNH KÝ DUYỆT CỦA CON CHÁU */}
              <div className="bg-white p-3 rounded-xl border border-amber-200 shrink-0 space-y-1.5">
                <div className="text-xs font-bold text-slate-600">
                  Tiến độ ký duyệt (1/3 đã ký):
                </div>
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <Check className="w-3.5 h-3.5" /> Bố Ba (Con cả - Đã ký)
                  </span>
                  <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    <Clock className="w-3.5 h-3.5" /> Chị Lan (Chờ ký)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LỊCH SỬ THU CHI GẦN ĐÂY DỄ HIỂU */}
        <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
            <span>Sổ Chi Tiêu Gần Đây Của Cụ</span>
          </h3>

          <div className="divide-y divide-slate-100">
            {[
              {
                title: "Rút tiền đi chợ sáng",
                amount: "-20.00 USDC",
                vnd: "-508.000 VNĐ",
                time: "07:15 hôm nay",
                status: "Đã nhận tiền • 0đ phí L1",
                isPlus: false,
              },
              {
                title: "Bố Ba gửi phụ dưỡng tháng này",
                amount: "+200.00 USDC",
                vnd: "+5.080.000 VNĐ",
                time: "Hôm qua",
                status: "Đã vào hũ",
                isPlus: true,
              },
              {
                title: "Lãi C-Chain cộng dồn tháng 10",
                amount: "+5.20 USDC",
                vnd: "+132.080 VNĐ",
                time: "Đầu tháng 11",
                status: "Lợi nhuận C-Chain 8% APY",
                isPlus: true,
              },
            ].map((tx, idx) => (
              <div
                key={idx}
                className="py-3.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-lg ${
                      tx.isPlus
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {tx.isPlus ? "+" : "↓"}
                  </div>
                  <div>
                    <div className="text-base font-extrabold text-slate-900">
                      {tx.title}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      {tx.time} • {tx.status}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-lg font-black tabular-nums font-mono ${
                      tx.isPlus ? "text-emerald-700" : "text-slate-900"
                    }`}
                  >
                    {tx.amount}
                  </div>
                  <div className="text-xs text-slate-500 font-bold">
                    {tx.vnd}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* MODAL GỌI KHẨN CẤP CHO CON TRAI */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-2 border-rose-300 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto text-3xl">
                📞
              </div>
              <h4 className="text-2xl font-black text-slate-900">
                Gọi Cho Con Trai
              </h4>
              <p className="text-slate-600 text-sm font-medium">
                Cụ có cần trợ giúp về tiền nong hay sức khoẻ không?
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
              <div className="text-xs text-rose-800 font-bold uppercase tracking-wider">
                Bố Ba (Con trai cả)
              </div>
              <div className="text-3xl font-black text-rose-900 font-mono tracking-wider mt-1">
                0903.123.456
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Luôn túc trực hỗ trợ 24/7
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href="tel:0903123456"
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition"
              >
                <PhoneCall className="w-5 h-5" />
                <span>Gọi Ngay</span>
              </a>
              <button
                type="button"
                onClick={() => setShowEmergencyModal(false)}
                className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-lg rounded-2xl transition cursor-pointer"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL YÊU CẦU RÚT TIỀN LỚN (MULTISIG APPROVAL REQUEST) */}
      {showLargeWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border-2 border-slate-300 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🛡️</span>
                <h4 className="text-xl font-black text-slate-900">
                  Yêu Cầu Rút Số Tiền Lớn
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowLargeWithdrawModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLargeRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Số tiền muốn rút (USDC):
                </label>
                <input
                  type="number"
                  min="51"
                  max={totalBalance}
                  value={largeAmount}
                  onChange={(e) => setLargeAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 font-black text-2xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
                <p className="text-xs text-slate-500 mt-1 font-semibold">
                  ≈ {(parseFloat(largeAmount || "0") * USDC_TO_VND_RATE).toLocaleString("vi-VN")} VNĐ
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Lý do chi tiêu (giúp con cháu an tâm duyệt):
                </label>
                <input
                  type="text"
                  value={largeReason}
                  onChange={(e) => setLargeReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 font-bold text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Ví dụ: Viện phí, Sửa nhà, Mua sắm lớn..."
                  required
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
                ⚠️ Khoản tiền này vượt quá giới hạn rút nhanh ({shieldVault.fastWithdrawLimit || 50} USDC). Sau khi gửi, con cháu trong gia đình sẽ nhận được thông báo để ký duyệt on-chain.
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLargeWithdrawModal(false)}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLarge}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-xl shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingLarge ? "Đang gửi..." : "Gửi Yêu Cầu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
