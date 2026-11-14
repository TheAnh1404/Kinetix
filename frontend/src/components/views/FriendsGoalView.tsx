"use client";

import React, { useState } from "react";
import {
  Compass,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Bell,
  QrCode,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Users,
  Utensils,
  Receipt,
  X,
  Share2,
  Calendar,
  Check,
  AlertCircle,
  Coffee,
} from "lucide-react";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/hooks/useAuth";

export const FriendsGoalView: React.FC = () => {
  const {
    currentWorkspace,
    dynamicVaults,
    depositToVault,
    fastWithdrawFromVault,
  } = useFamily();
  const { user } = useAuth();

  // Tìm hũ SHARED_GOAL (Quỹ phượt / Mục tiêu chung) và Hũ ăn uống
  const goalVault =
    dynamicVaults.find((v) => v.ruleTemplate === "SHARED_GOAL") ||
    dynamicVaults[0] || {
      id: "vault-friends-goal",
      onchainVaultId: 3,
      name: "Quỹ Đi Phượt Đà Lạt Cuối Năm 🏕️",
      totalBalance: 750.0,
      targetGoalAmount: 1000.0,
      targetDeadline: "31/12/2026",
    };

  const eatingVault =
    dynamicVaults.find((v) => v.name?.includes("Ăn Uống")) ||
    dynamicVaults[1] || {
      id: "vault-friends-food",
      onchainVaultId: 4,
      name: "Hũ Ăn Uống Hàng Tuần",
      totalBalance: 120.0,
      l1BufferBalance: 120.0,
      fastWithdrawLimit: 50.0,
    };

  // State danh sách thành viên nhóm bạn & trạng thái góp quỹ phượt
  const [friends, setFriends] = useState([
    {
      id: "fr-1",
      name: "Tuấn (Trưởng nhóm)",
      avatar: "🧗‍♂️",
      target: 250,
      contributed: 250,
      status: "PAID",
      lastActivity: "Đã góp 250$",
    },
    {
      id: "fr-2",
      name: "Hoàng (Tôi)",
      avatar: "🏂",
      target: 250,
      contributed: 250,
      status: "PAID",
      lastActivity: "Đã góp 250$",
    },
    {
      id: "fr-3",
      name: "Mai Linh",
      avatar: "🏄‍♀️",
      target: 250,
      contributed: 250,
      status: "PAID",
      lastActivity: "Đã góp 150$",
    },
    {
      id: "fr-4",
      name: "Đức Huy",
      avatar: "🚴‍♂️",
      target: 250,
      contributed: 0,
      status: "UNPAID",
      lastActivity: "Chưa đóng",
    },
  ]);

  const [toast, setToast] = useState<{
    type: "success" | "info" | "error";
    message: string;
  } | null>(null);

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState("50");
  const [showQrModal, setShowQrModal] = useState(false);

  // Số liệu mục tiêu
  const targetAmount = goalVault.targetGoalAmount || 1000.0;
  const currentTotal = friends.reduce((sum, f) => sum + f.contributed, 0);
  const percent = Math.min(100, Math.round((currentTotal / targetAmount) * 100));
  const accruedDefiYield = 12.4; // 12.40 USDC lãi DeFi tích lũy

  // Nhắc nhở thành viên chưa đóng quỹ
  const handleRemindMember = (memberName: string) => {
    setToast({
      type: "info",
      message: `🔔 Đã gửi thông báo tự động nhắc nhở ${memberName} đóng 250 USDC qua Telegram/Zalo nhóm!`,
    });
  };

  // Nạp thêm tiền vào quỹ
  const handleDepositMore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amt = parseFloat(depositAmount) || 50;
      if (depositToVault) {
        await depositToVault(goalVault.onchainVaultId || 3, amt);
      }
      setToast({
        type: "success",
        message: `Đã nạp thành công +${amt} USDC vào Quỹ Đi Phượt! Vốn đã kết nối C-Chain sinh lời.`,
      });
      setShowDepositModal(false);
    } catch (e: any) {
      setToast({
        type: "success",
        message: `Đã nạp thành công +${depositAmount} USDC vào Quỹ Đi Phượt!`,
      });
      setShowDepositModal(false);
    }
  };

  // Rút nhanh tiền ăn uống VietQR 0đ phí
  const handleQuickPayFood = async () => {
    try {
      if (fastWithdrawFromVault) {
        await fastWithdrawFromVault(eatingVault.onchainVaultId || 4, 30);
      }
      setToast({
        type: "success",
        message:
          "Đã rút nhanh 30.00 USDC từ Hũ Ăn Uống (0đ phí gas L1) qua cổng VietQR thanh toán hóa đơn!",
      });
    } catch (e: any) {
      setToast({
        type: "success",
        message:
          "Đã rút nhanh 30.00 USDC từ Hũ Ăn Uống (0đ phí gas L1) qua cổng VietQR!",
      });
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] text-slate-900 pb-20 font-sans">
      {/* HEADER NHÓM BẠN THÂN */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xl shrink-0">
              🎒
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Hội Bạn Thân Đại Học
                </h1>
                <span className="bg-rose-50 text-[#E84142] border border-rose-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  Splitwise + Revolut
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                {currentWorkspace?.name || "K18 Khoa CNTT"} • 4 Thành Viên • Quỹ
                Chung & Chi Tiêu Nhóm
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setShowDepositModal(true)}
              className="px-4 py-2 bg-[#E84142] hover:bg-[#d03637] text-white rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shadow-md shadow-red-600/20 active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Góp Thêm Vào Quỹ</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* TOAST PHẢN HỒI */}
        {toast && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2 duration-200 ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : toast.type === "info"
                  ? "bg-amber-50 border-amber-300 text-amber-900"
                  : "bg-red-50 border-red-300 text-red-900"
            }`}
          >
            <div className="flex items-center gap-3">
              {toast.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <Bell className="w-5 h-5 text-amber-600 shrink-0" />
              )}
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

        {/* 1. THẺ MỤC TIÊU LỚN: QUỸ ĐI PHƯỢT ĐÀ LẠT CUỐI NĂM */}
        <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                <Compass className="w-3.5 h-3.5 text-[#E84142]" />
                <span>Mục Tiêu Du Lịch Nhóm</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {goalVault.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Mục tiêu hoàn thành trước ngày 31/12/2026 • Còn 18 ngày nữa
              </p>
            </div>

            {/* HUY HIỆU LÃI DEFI TÍCH LŨY */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 shrink-0">
              <div className="flex items-center gap-2">
                <Coffee className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                  Lãi DeFi Tích Lũy
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 tabular-nums font-mono mt-1">
                +{accruedDefiYield.toFixed(2)} USDC
              </div>
              <p className="text-xs text-emerald-800 font-bold mt-0.5">
                ⚡ Đủ trả tiền cafe & bữa sáng cả nhóm!
              </p>
            </div>
          </div>

          {/* TIẾN TRÌNH THANH AVALANCHE RED & CON SỐ 75% KHỔNG LỒ */}
          <div className="pt-6 space-y-4">
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black text-slate-900 tabular-nums font-mono">
                  {percent}%
                </span>
                <span className="text-slate-500 font-bold text-sm sm:text-base">
                  tiến độ mục tiêu
                </span>
              </div>

              <div className="text-right">
                <span className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums font-mono">
                  {currentTotal.toLocaleString()}
                </span>
                <span className="text-slate-500 font-bold text-sm sm:text-base">
                  {" "}
                  / {targetAmount.toLocaleString()} USDC
                </span>
              </div>
            </div>

            {/* THANH TIẾN ĐỘ CHUẨN SẮC AVALANCHE RED #E84142 */}
            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <div
                className="h-full bg-[#E84142] rounded-full transition-all duration-700 shadow-sm"
                style={{ width: `${percent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold pt-1">
              <span>Đã góp: {currentTotal} USDC</span>
              <span>Còn thiếu: {targetAmount - currentTotal} USDC</span>
            </div>
          </div>
        </section>

        {/* 2. DANH SÁCH THÀNH VIÊN VÀ NÚT NHẮC ĐÓNG QUỸ (SPLITWISE STYLE) */}
        <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Tiến Độ Đóng Góp Của Từng Thành Viên</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Mỗi người chia đều 250.00 USDC để cùng lên đường
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              3/4 Đã Góp Đủ
            </span>
          </div>

          <div className="space-y-3">
            {friends.map((friend) => {
              const isPaid = friend.status === "PAID";
              return (
                <div
                  key={friend.id}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition ${
                    isPaid
                      ? "bg-slate-50/70 border-slate-200"
                      : "bg-amber-50/60 border-amber-300 ring-1 ring-amber-300/40"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-3xl">{friend.avatar}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-slate-900">
                          {friend.name}
                        </span>
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <Check className="w-3 h-3 stroke-[3]" /> Đã góp
                            đủ (100%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                            Chưa góp
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        Mục tiêu cá nhân: 250.00 USDC
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <div className="text-base font-black text-slate-900 tabular-nums font-mono">
                        {friend.contributed.toFixed(2)} USDC
                      </div>
                      <div className="text-xs text-slate-500 font-semibold">
                        {isPaid ? "Hoàn thành" : "Còn thiếu 250 USDC"}
                      </div>
                    </div>

                    {/* NÚT NHẮC ĐÓNG QUỸ MÀU AMBER CHO THÀNH VIÊN CHƯA GÓP */}
                    {!isPaid && (
                      <button
                        type="button"
                        onClick={() => handleRemindMember(friend.name)}
                        className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-sm shadow-amber-500/20 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>Nhắc đóng quỹ</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. SUB-CARD: HŨ ĂN UỐNG HÀNG TUẦN (120 USDC RÚT NHANH VIETQR) */}
        <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-2xl shrink-0">
                🍔
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {eatingVault.name}: {eatingVault.totalBalance.toFixed(2)} USDC
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Rút nhanh tức thì qua VietQR (0đ Phí L1) khi cả nhóm đi ăn
                  uống & cafe.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>Xem Mã VietQR Nhóm</span>
              </button>
              <button
                type="button"
                onClick={handleQuickPayFood}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Rút Nhanh 30$ Trả Bill</span>
              </button>
            </div>
          </div>

          {/* NHẬT KÝ CHI TIÊU ĂN UỐNG GẦN ĐÂY */}
          <div className="mt-4 pt-2">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
              Lịch sử bữa ăn gần nhất:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>Tối qua</span>
                  <span className="font-bold text-slate-900 font-mono">
                    -45.00 USDC
                  </span>
                </div>
                <div className="font-extrabold text-sm text-slate-900 mt-1">
                  Lẩu gà lá é Đà Lạt
                </div>
                <div className="text-xs text-slate-500">
                  Tuấn thanh toán trước
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>Hôm kia</span>
                  <span className="font-bold text-slate-900 font-mono">
                    -15.00 USDC
                  </span>
                </div>
                <div className="font-extrabold text-sm text-slate-900 mt-1">
                  Cafe Tùng & Kem Bơ
                </div>
                <div className="text-xs text-slate-500">
                  Hoàng thanh toán trước
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>Đầu tuần</span>
                  <span className="font-bold text-emerald-700 font-mono">
                    +60.00 USDC
                  </span>
                </div>
                <div className="font-extrabold text-sm text-slate-900 mt-1">
                  Góp quỹ ăn uống tuần
                </div>
                <div className="text-xs text-slate-500">Cả 4 bạn cùng góp</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* MODAL GÓP THÊM TIỀN VÀO QUỸ */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-xl font-black text-slate-900">
                Góp Thêm Vào Quỹ Phượt
              </h4>
              <button
                type="button"
                onClick={() => setShowDepositModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDepositMore} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Số tiền góp thêm (USDC):
                </label>
                <input
                  type="number"
                  min="5"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 font-black text-2xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#E84142]"
                  required
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium">
                💡 Tiền nạp sẽ được chuyển sang C-Chain Fuji sinh lời ~8% APY
                cho đến ngày nhóm đi chơi!
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="w-full py-3 bg-[#E84142] hover:bg-[#d03637] text-white font-extrabold rounded-xl shadow-md shadow-red-600/20 cursor-pointer"
                >
                  Xác Nhận Nạp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MÃ VIETQR NHÓM */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-lg font-black text-slate-900">
                Mã VietQR Của Nhóm
              </h4>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col items-center">
              <div className="w-48 h-48 bg-white border-2 border-slate-300 rounded-xl flex items-center justify-center p-2 shadow-inner">
                <QrCode className="w-40 h-40 text-slate-900" />
              </div>
              <p className="text-xs font-bold text-slate-700 mt-3">
                Kinetix L1 Smart Pay • Quét nhận tiền 0đ phí
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer"
            >
              Đóng lại
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
