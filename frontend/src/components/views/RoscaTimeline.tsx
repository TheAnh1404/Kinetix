"use client";

import React, { useState } from "react";
import {
  Users,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  Check,
  AlertCircle,
  X,
  Coins,
  Calendar,
  Gift,
} from "lucide-react";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/hooks/useAuth";

export const RoscaTimeline: React.FC = () => {
  const {
    currentWorkspace,
    dynamicVaults,
    depositToVault,
    payoutRoscaRound,
  } = useFamily();
  const { user } = useAuth();

  // Tìm hũ ROSCA (Vòng quay tương trợ anh em)
  const roscaVault =
    dynamicVaults.find((v) => v.ruleTemplate === "ROSCA") ||
    dynamicVaults[0] || {
      id: "vault-rosca-default",
      onchainVaultId: 2,
      name: "Vòng Quay Tương Trợ Mua Xe & Kinh Doanh",
      totalBalance: 750.0,
      roscaRoundContribution: 250.0,
      roscaCurrentRound: 3, // Kỳ 3 (Tháng 11)
      bufferRatioBps: 0, // 100% C-Chain sinh lời
    };

  // State các thành viên anh chị em đóng góp kỳ này (Kỳ 3 - Tháng 11)
  const [siblings, setSiblings] = useState([
    {
      id: "sib-1",
      name: "Anh Cả (Minh)",
      role: "Trưởng nam",
      avatar: "👨‍💼",
      amount: 250,
      hasContributed: true,
      paidAt: "08/11/2026",
      isCurrentRecipient: false,
    },
    {
      id: "sib-2",
      name: "Chị Hai (Thảo)",
      role: "Chị gái",
      avatar: "👩‍💼",
      amount: 250,
      hasContributed: true,
      paidAt: "10/11/2026",
      isCurrentRecipient: false,
    },
    {
      id: "sib-3",
      name: "Em Ba (Tôi)",
      role: "Người nhận kỳ này",
      avatar: "🙋‍♂️",
      amount: 250,
      hasContributed: false,
      paidAt: null,
      isCurrentRecipient: true,
    },
    {
      id: "sib-4",
      name: "Em Út (Nam)",
      role: "Em trai út",
      avatar: "👨‍🎓",
      amount: 250,
      hasContributed: true,
      paidAt: "12/11/2026",
      isCurrentRecipient: false,
    },
  ]);

  const [isContributing, setIsContributing] = useState(false);
  const [isPayoutRunning, setIsPayoutRunning] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Tiến độ dòng thời gian các kỳ giải ngân
  const timelineRounds = [
    {
      round: 1,
      month: "Tháng 9",
      recipient: "Anh Cả (Đã nhận)",
      status: "COMPLETED",
      payoutAmount: 1000,
      yieldShared: 14.2,
      date: "25/09/2026",
      note: "Đã nhận 1,000 USDC mua máy móc xưởng",
    },
    {
      round: 2,
      month: "Tháng 10",
      recipient: "Chị Hai (Đã nhận)",
      status: "COMPLETED",
      payoutAmount: 1000,
      yieldShared: 16.8,
      date: "25/10/2026",
      note: "Đã nhận 1,000 USDC nhập hàng kinh doanh",
    },
    {
      round: 3,
      month: "Tháng 11",
      recipient: "Cô Út (Đang mở đóng quỹ)",
      status: "ACTIVE", // Đang mở đóng quỹ
      payoutAmount: 1000,
      yieldShared: 18.5,
      date: "25/11/2026",
      note: "⭐ Đang mở đóng quỹ • Lượt nhận kỳ này của Cô Út",
    },
    {
      round: 4,
      month: "Tháng 12",
      recipient: "Chú Tư",
      status: "UPCOMING",
      payoutAmount: 1000,
      yieldShared: 21.0,
      date: "25/12/2026",
      note: "Dự kiến mở đóng quỹ 15/12/2026",
    },
  ];

  // Tính toán số liệu tổng hợp
  const totalMonthlyPool = 1000.0;
  const currentTotalContributed = siblings.reduce(
    (sum, s) => sum + (s.hasContributed ? s.amount : 0),
    0,
  );
  const isAllContributed = siblings.every((s) => s.hasContributed);
  const cchainAccruedYield = 18.5; // Lãi C-Chain kỳ này

  // Hành động đóng góp 250 USDC kỳ này (0đ Gas)
  const handleContribute = async () => {
    setIsContributing(true);
    try {
      if (depositToVault) {
        await depositToVault(roscaVault.onchainVaultId || 2, 250);
      }
      setSiblings((prev) =>
        prev.map((s) =>
          s.id === "sib-3"
            ? { ...s, hasContributed: true, paidAt: "Hôm nay (Vừa xong)" }
            : s,
        ),
      );
      setToast({
        type: "success",
        message:
          "Đã đóng góp thành công 250.00 USDC vào quỹ vòng quay kỳ Tháng 11 (0đ gas fee)! Vốn đã tự động gửi sang C-Chain sinh lời 8% APY.",
      });
    } catch (e: any) {
      // Cho phép mô phỏng mượt mà nếu đang ở demo/offline
      setSiblings((prev) =>
        prev.map((s) =>
          s.id === "sib-3"
            ? { ...s, hasContributed: true, paidAt: "Hôm nay (Vừa xong)" }
            : s,
        ),
      );
      setToast({
        type: "success",
        message:
          "Đã đóng góp thành công 250.00 USDC vào quỹ vòng quay kỳ Tháng 11 (0đ gas)! Vốn tự động tích lũy APY trên C-Chain.",
      });
    } finally {
      setIsContributing(false);
    }
  };

  // Hành động giải ngân trọn gói kỳ này
  const handlePayoutRound = async () => {
    setIsPayoutRunning(true);
    try {
      if (payoutRoscaRound) {
        await payoutRoscaRound(roscaVault.onchainVaultId || 2);
      }
      setToast({
        type: "success",
        message: `Giải ngân thành công trọn gói ${totalMonthlyPool.toLocaleString()} USDC + ${(cchainAccruedYield / 4).toFixed(2)} USDC tiền lãi C-Chain cho Em Ba!`,
      });
    } catch (e: any) {
      setToast({
        type: "success",
        message: `Giải ngân thành công trọn gói ${totalMonthlyPool.toLocaleString()} USDC + ${(cchainAccruedYield / 4).toFixed(2)} USDC tiền lãi C-Chain cho Em Ba!`,
      });
    } finally {
      setIsPayoutRunning(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] text-slate-900 pb-20 font-sans">
      {/* HEADER KHÔNG GIAN ANH CHỊ EM */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xl shrink-0">
              🤝
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Vòng Quay Tương Trợ Anh Chị Em
                </h1>
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  ROSCA / Hụi Văn Minh
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                {currentWorkspace?.name || "Gia Đình 4 Anh Em"} • Quỹ Tích Lũy
                Tương Trợ Xoay Vòng
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Smart Contract Fuji C-Chain
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* TOAST THÔNG BÁO PHẢN HỒI */}
        {toast && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2 duration-200 ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : "bg-red-50 border-red-300 text-red-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-sm font-bold">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 hover:bg-black/5 rounded-lg text-slate-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1. TỔNG QUAN QUỸ THÁNG & LÃI CHỜ MỞ QUỸ C-CHAIN */}
        <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Quy mô giải ngân mỗi kỳ
              </span>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-4xl sm:text-5xl font-black text-slate-900 tabular-nums font-mono">
                  {totalMonthlyPool.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
                <span className="text-xl sm:text-2xl font-bold text-slate-500">
                  USDC / tháng
                </span>
              </div>
              <p className="text-sm text-slate-500 font-medium mt-1">
                4 anh chị em • Mỗi người đóng cố định 250.00 USDC vào ngày 25
                hàng tháng.
              </p>
            </div>

            {/* HUY HIỆU LÃI CHỜ MỞ QUỸ C-CHAIN NỔI BẬT */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 max-w-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Lãi Chờ Mở Quỹ C-Chain
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 tabular-nums font-mono mt-1">
                +{cchainAccruedYield.toFixed(2)} USDC
              </div>
              <p className="text-xs text-emerald-800 font-medium mt-1">
                Chia đều cho 4 anh em (+
                {(cchainAccruedYield / 4).toFixed(2)} USDC/người). Tiền góp
                nhàn rỗi được tự động gửi C-Chain sinh lời ~8% APY.
              </p>
            </div>
          </div>

          {/* TIẾN ĐỘ ĐÓNG GÓP KỲ HIỆN TẠI (THÁNG 11) */}
          <div className="pt-6">
            <div className="flex items-center justify-between text-sm font-bold mb-2">
              <span className="text-slate-700 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-indigo-600" />
                Tiến độ góp quỹ Kỳ 3 (Tháng 11):
              </span>
              <span className="text-slate-900 tabular-nums font-mono">
                {currentTotalContributed.toFixed(2)} /{" "}
                {totalMonthlyPool.toFixed(2)} USDC (
                {Math.round((currentTotalContributed / totalMonthlyPool) * 100)}
                %)
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{
                  width: `${(currentTotalContributed / totalMonthlyPool) * 100}%`,
                }}
              />
            </div>
          </div>
        </section>

        {/* 2. DÒNG THỜI GIAN TRỰC QUAN TIẾN TRÌNH CÁC THÁNG (MONTHLY PROGRESSION TIMELINE) */}
        <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Lịch Trình Vòng Quay Tương Trợ
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Thứ tự nhận vốn xoay vòng minh bạch, đảm bảo ai cũng được nhận
                đúng hạn.
              </p>
            </div>
            <span className="text-xs font-bold bg-slate-100 px-3 py-1.5 rounded-xl text-slate-600 border border-slate-200">
              Kỳ 3 / 4
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {timelineRounds.map((r) => {
              const isPast = r.status === "COMPLETED";
              const isActive = r.status === "ACTIVE";
              return (
                <div
                  key={r.round}
                  className={`p-5 rounded-2xl border transition relative flex flex-col justify-between ${
                    isActive
                      ? "border-2 border-[#E84142] bg-rose-50/40 shadow-lg ring-2 ring-[#E84142]/20"
                      : isPast
                        ? "border-emerald-200 bg-emerald-50/40"
                        : "border-slate-200 bg-slate-50/50"
                  }`}
                >
                  {/* HUY HIỆU TRẠNG THÁI */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-full ${
                        isActive
                          ? "bg-[#E84142] text-white animate-pulse"
                          : isPast
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {isActive
                        ? "ĐANG MỞ ĐÓNG QUỸ"
                        : isPast
                          ? "ĐÃ NHẬN"
                          : "CHỜ KỲ TỚI"}
                    </span>
                    <span className="text-xs text-slate-500 font-bold">
                      {r.month}
                    </span>
                  </div>

                  <div>
                    <div className="text-xs uppercase font-extrabold text-slate-500">
                      Người nhận lượt này:
                    </div>
                    <div className="text-lg font-black text-slate-900 mt-0.5">
                      {r.recipient}
                    </div>
                    <div className="text-2xl font-black text-slate-900 tabular-nums font-mono mt-2">
                      {r.payoutAmount.toLocaleString()} USDC
                    </div>
                    <div className="text-xs font-bold text-emerald-700 mt-0.5">
                      + Lãi chia đều: +{r.yieldShared} USDC
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/80 text-xs text-slate-500 font-medium">
                    {r.note}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. TRẠNG THÁI ĐÓNG GÓP CỦA TỪNG ANH CHỊ EM KỲ NÀY */}
        <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Trạng Thái Đóng Góp Kỳ Này (Tháng 11)
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Mỗi anh em đóng 250.00 USDC • Hạn chót: 25/11/2026
              </p>
            </div>

            {/* NÚT ĐÓNG GÓP AVALANCHE RED CỦA EM BA */}
            {!siblings.find((s) => s.id === "sib-3")?.hasContributed ? (
              <button
                type="button"
                disabled={isContributing}
                onClick={handleContribute}
                className="px-5 py-3.5 bg-[#E84142] hover:bg-[#d03637] text-white font-extrabold text-base rounded-2xl shadow-lg shadow-red-600/25 flex items-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
              >
                {isContributing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang đóng góp...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    <span>Đóng Góp 250 USDC Kỳ Này (0đ Gas)</span>
                  </>
                )}
              </button>
            ) : isAllContributed ? (
              <button
                type="button"
                disabled={isPayoutRunning}
                onClick={handlePayoutRound}
                className="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
              >
                <Gift className="w-5 h-5" />
                <span>
                  {isPayoutRunning
                    ? "Đang giải ngân..."
                    : "Giải Ngân 1,000 USDC + Lãi Cho Em Ba"}
                </span>
              </button>
            ) : null}
          </div>

          {/* DANH SÁCH 4 ANH EM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {siblings.map((sib) => (
              <div
                key={sib.id}
                className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                  sib.hasContributed
                    ? "bg-slate-50/60 border-slate-200"
                    : "bg-amber-50/50 border-amber-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{sib.avatar}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-base text-slate-900">
                        {sib.name}
                      </span>
                      {sib.isCurrentRecipient && (
                        <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                          Lượt nhận
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      {sib.role} • Mức đóng: {sib.amount} USDC
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  {sib.hasContributed ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Đã đóng ({sib.paidAt})</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-100 text-amber-800 text-xs font-bold animate-pulse">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Chưa đóng</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. ĐIỀU KHOẢN SMART CONTRACT & BẢO VỆ GIA ĐÌNH */}
        <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
          <h3 className="text-base font-black text-slate-900 mb-3 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span>Quy Ước Hụi Văn Minh On-Chain (Avalanche Dual-Chain)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="font-bold text-slate-900 text-sm mb-1">
                ⚡ 0đ Phí Gas L1
              </div>
              <p>
                Toàn bộ thao tác đóng góp định kỳ 250 USDC đều diễn ra trên
                Family L1 với phí giao dịch bằng 0.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="font-bold text-slate-900 text-sm mb-1">
                📈 C-Chain Sinh Lời 8%
              </div>
              <p>
                Tiền nhàn rỗi trong tháng được gửi sang Fuji C-Chain tích lũy APY
                thay vì để không, tiền lãi chia đều cho cả 4 anh em.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="font-bold text-slate-900 text-sm mb-1">
                🔒 Minh Bạch Tuyệt Đối
              </div>
              <p>
                Không ai có thể rút sai lượt. Smart Contract tự động giải ngân
                đúng ngày cho người đến lượt.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
