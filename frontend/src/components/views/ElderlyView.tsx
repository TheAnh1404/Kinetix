"use client";

import React, { useState } from "react";
import { useFamily } from "@/context/FamilyContext";
import { VaultType } from "@/contracts/config";

export const ElderlyView: React.FC = () => {
  const { vaults, quickWithdraw, requestLargeWithdraw } = useFamily();
  const [selectedPill, setSelectedPill] = useState<number>(20);
  const [largeAmount, setLargeAmount] = useState<string>("1000");
  const [largeReason, setLargeReason] = useState<string>(
    "Khám bệnh đột xuất tại Bệnh viện Tim TW"
  );
  const [notification, setNotification] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: "success" | "warning";
  }>({
    show: false,
    title: "",
    message: "",
    type: "success",
  });

  const bufferBalance = vaults.retirementShield.localBuffer;

  const handleQuickWithdraw = async () => {
    if (bufferBalance < selectedPill) {
      alert("Số dư đệm Family L1 không đủ!");
      return;
    }
    const success = await quickWithdraw(VaultType.RetirementShield, selectedPill);
    if (success) {
      setNotification({
        show: true,
        title: "🎉 RÚT TIỀN ĐI CHỢ THÀNH CÔNG TỨC THÌ!",
        message: `Đã giải ngân ${selectedPill} USDC (~${(selectedPill * 25000).toLocaleString(
          "vi-VN"
        )} VNĐ) từ đệm Family L1 trong <1 giây với 0đ phí gas!`,
        type: "success",
      });
    }
  };

  const handleRequestLargeWithdrawal = async () => {
    const amt = parseFloat(largeAmount);
    if (!amt || amt <= 50) {
      alert("Khoản rút lớn phải trên 50 USDC. Khoản nhỏ xin dùng nút rút tức thì bên trái!");
      return;
    }
    const { success, requestId } = await requestLargeWithdraw(
      VaultType.RetirementShield,
      amt,
      largeReason
    );
    if (success) {
      setNotification({
        show: true,
        title: "🛡️ ĐÃ KÍCH HOẠT BẢO VỆ CHỐNG LỪA ĐẢO AI (Multisig 2/3)!",
        message: `Yêu cầu rút ${amt} USDC (Mã #${requestId || '001'} - ${largeReason}) đã được ghi danh vào Smart Contract và gửi khẩn cấp tới 3 người con (Bố Ba, Anh Cả, Cô Út). Cần 2/3 con ký duyệt mới giải ngân!`,
        type: "warning",
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-gutter py-space-lg w-full flex flex-col gap-space-lg">
      {/* Toast Alert Notification */}
      {notification.show && (
        <div
          className={`p-4 rounded-2xl shadow-lg border flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-950"
              : "bg-amber-50 border-amber-300 text-amber-950"
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[28px] mt-0.5">
              {notification.type === "success" ? "check_circle" : "shield"}
            </span>
            <div>
              <h4 className="font-headline-sm text-headline-sm">
                {notification.title}
              </h4>
              <p className="text-body-md mt-1">{notification.message}</p>
            </div>
          </div>
          <button
            onClick={() => setNotification({ ...notification, show: false })}
            className="text-gray-500 hover:text-black"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Top Warm Greeting & Emergency Assistance Bar */}
      <div className="w-full bg-surface-container-lowest rounded-2xl p-space-md md:p-space-lg shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md border border-surface-container-high/60">
        <div className="flex items-center gap-space-md">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden shadow-inner bg-surface-container border-2 border-surface-container-highest">
              <img
                className="w-full h-full object-cover"
                alt="Ông Nội"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB9RXFgUn83eP41jg2weE3YA8vd83fsVimUf5y0OcZS7SOQ3XPOzG_gbODV_xJIXeRQye9NHAh2TXP_28Oz-bPHhWTfscJFCZWXYRXq2gQAAtwAVTc1yseRsDx3GBa94HVhTHAal40UzoVwN7YY1IXQ5EmMOe0WhhEvzu4V7ZNBtixA0ZiaR61Ad1UJUADoRuNzug0ggIZW8eO5XEiktIZD-zCJ4THMAqG0i7Z1ivkCGPnUrjsBJg"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-surface-container-lowest rounded-full p-1 shadow-sm">
              <span className="flex h-5 w-5 rounded-full bg-secondary-container animate-pulse items-center justify-center">
                <span className="material-symbols-outlined text-[14px] text-on-secondary-container">
                  verified_user
                </span>
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-space-xs">
            <div className="inline-flex items-center gap-space-xs px-space-sm py-0.5 rounded-full bg-surface-container-high w-fit">
              <span className="material-symbols-outlined text-[18px] text-tertiary-fixed-dim">
                shield
              </span>
              <span className="font-label-lg text-label-lg text-on-surface">
                Chế độ Bảo Vệ Kinetix Shield: <strong>ĐANG BẬT</strong>
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              Chào Ông Nội (Nguyễn Văn An) ❤️
            </h1>
            <p className="font-title-md text-title-md text-on-surface-variant font-normal">
              Chúc Ông ngày mới an vui, mạnh khỏe và thảnh thơi.
            </p>
          </div>
        </div>

        {/* Quick One-Tap Emergency Call Button */}
        <a
          className="w-full md:w-auto flex items-center justify-center gap-space-sm px-space-lg py-space-md bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary rounded-2xl shadow-md transition-all active:scale-95 group"
          href="tel:0908889999"
        >
          <span className="material-symbols-outlined text-[32px] group-hover:animate-bounce">
            phone_in_talk
          </span>
          <div className="flex flex-col text-left">
            <span className="font-label-caps text-label-caps tracking-widest opacity-90 uppercase">
              Hỗ Trợ Gia Đình
            </span>
            <span className="font-headline-sm text-headline-sm">
              Cần trợ giúp? Bấm gọi con ngay
            </span>
          </div>
        </a>
      </div>

      {/* Main Hero Balance Card (Simplified, Zero Jargon, Very Large Typography) */}
      <div className="w-full bg-surface-container-lowest rounded-2xl p-space-lg md:p-space-xl shadow-sm relative overflow-hidden flex flex-col gap-space-md border border-surface-container-high/60">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-surface-container-high/40 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-xs relative z-10">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-[28px] text-secondary">
              savings
            </span>
            <span className="font-headline-sm text-headline-sm text-on-surface-variant font-bold">
              Tiền sinh hoạt sẵn sàng tiêu (Hũ Báo Hiếu)
            </span>
          </div>
          <div className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container text-on-surface font-label-lg text-label-lg">
            <span className="material-symbols-outlined text-[18px]">lock</span>
            <span>Ví An Toàn Riêng Biệt (Allowlisted)</span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-baseline gap-space-sm lg:gap-space-lg relative z-10">
          <span className="font-display-lg text-display-lg md:text-[56px] md:leading-[64px] font-bold text-on-surface tracking-tight">
            {bufferBalance.toFixed(2)} USDC
          </span>
          <span className="font-headline-lg text-headline-lg text-outline font-semibold">
            ~ {(bufferBalance * 25000).toLocaleString("vi-VN")} VNĐ
          </span>
        </div>

        {/* Growth Note Badge */}
        <div className="relative z-10 flex items-center gap-space-sm p-space-md rounded-xl bg-surface-container-low text-on-surface">
          <span className="material-symbols-outlined text-[26px] text-tertiary-fixed-dim">
            eco
          </span>
          <p className="font-body-lg text-body-lg">
            Đã bao gồm <strong>28 USDC (~700.000 VNĐ)</strong> tiền lãi tháng
            này con cháu gửi tặng sinh lời tự động mỗi ngày từ Avalanche Fuji C-Chain.
          </p>
        </div>
      </div>

      {/* Dual Action Area: High-Contrast Large Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg w-full">
        {/* Card A: Daily Spending (Fast & Immediate <= 50 USDC) */}
        <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col justify-between gap-space-md border border-surface-container-high/60">
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center gap-space-xs text-on-tertiary-container">
              <span className="material-symbols-outlined text-[32px]">
                shopping_basket
              </span>
              <span className="font-label-caps text-label-caps bg-surface-container-high px-space-xs py-0.5 rounded uppercase font-bold text-on-surface">
                Rút Tức Thì (1 Chạm)
              </span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">
              Rút tiền chợ / Mua thuốc
            </h2>
            <p className="font-title-md text-title-md text-on-surface-variant font-normal">
              Dành cho chi tiêu nhỏ lẻ dưới 50 USDC. Nhận tiền về tài khoản trong
              1 giây mà không cần con cháu duyệt.
            </p>

            {/* Quick Select Preset Pills */}
            <div className="flex flex-col gap-space-xs pt-space-xs">
              <label className="font-label-lg text-label-lg text-on-surface-variant font-semibold">
                Chọn số tiền muốn lấy:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-xs">
                {[10, 20, 50].map((val) => {
                  const isSelected = selectedPill === val;
                  return (
                    <button
                      key={val}
                      onClick={() => setSelectedPill(val)}
                      className={`py-space-sm px-space-xs rounded-xl font-headline-sm text-headline-sm flex flex-col items-center justify-center transition-all ${
                        isSelected
                          ? "bg-secondary text-on-secondary shadow-md scale-[1.02]"
                          : "bg-surface-container hover:bg-surface-container-high text-on-surface"
                      }`}
                      type="button"
                    >
                      <span>{val} USDC</span>
                      <span
                        className={`font-label-md text-label-md ${
                          isSelected ? "text-white/80" : "text-on-surface-variant"
                        }`}
                      >
                        {(val * 25000).toLocaleString("vi-VN")}đ
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-space-md flex flex-col gap-space-xs">
            <button
              onClick={handleQuickWithdraw}
              className="w-full py-space-md px-space-lg bg-surface-container-high hover:bg-surface-container text-on-surface hover:text-on-surface font-headline-sm text-headline-sm rounded-xl shadow-md flex items-center justify-center gap-space-sm transition-all active:scale-[0.98]"
              type="button"
            >
              <span className="material-symbols-outlined text-[28px] text-tertiary-fixed-dim">
                bolt
              </span>
              <span>RÚT {selectedPill} USDC NGAY (Miễn phí 100%)</span>
            </button>
            <span className="font-label-md text-label-md text-center text-outline">
              Bảo mật tự động bởi Hợp đồng FamilyHub trên Avalanche Family L1
            </span>
          </div>
        </div>

        {/* Card B: High-Value Spending (Anti-Scam Protection > 50 USDC) */}
        <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col justify-between gap-space-md border border-surface-container-high/60">
          <div className="flex flex-col gap-space-sm">
            <div className="flex items-center gap-space-xs text-secondary">
              <span className="material-symbols-outlined text-[32px]">
                shield_with_heart
              </span>
              <span className="font-label-caps text-label-caps bg-secondary-fixed px-space-xs py-0.5 rounded uppercase font-bold text-on-secondary-fixed">
                Bảo Vệ Đa Chữ Ký Multisig
              </span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">
              Rút khoản tiền lớn (&gt; 50 USDC)
            </h2>
            <p className="font-title-md text-title-md text-on-surface-variant font-normal">
              Dùng khi khám chữa bệnh, sửa nhà hoặc việc hệ trọng. Tự động kích
              hoạt cơ chế chống lừa đảo AI và kẻ gian mạo danh.
            </p>

            {/* Input Amount & Reason */}
            <div className="flex flex-col gap-space-sm">
              <div className="flex flex-col gap-1">
                <label
                  className="font-label-lg text-label-lg text-on-surface-variant font-semibold"
                  htmlFor="largeAmount"
                >
                  Nhập số tiền Ông cần rút (USDC):
                </label>
                <div className="relative flex items-center">
                  <input
                    value={largeAmount}
                    onChange={(e) => setLargeAmount(e.target.value)}
                    className="w-full py-space-sm px-space-md bg-surface rounded-xl font-headline-sm text-headline-sm text-on-surface placeholder:text-outline border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-secondary"
                    id="largeAmount"
                    placeholder="Ví dụ: 100, 500, 1000"
                    type="number"
                  />
                  <span className="absolute right-space-md font-headline-sm text-headline-sm text-on-surface-variant">
                    USDC
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  className="font-label-lg text-label-lg text-on-surface-variant font-semibold"
                  htmlFor="largeReason"
                >
                  Lý do rút tiền (để các con yên tâm):
                </label>
                <input
                  value={largeReason}
                  onChange={(e) => setLargeReason(e.target.value)}
                  className="w-full py-2.5 px-space-md bg-surface rounded-xl text-body-md text-on-surface placeholder:text-outline border border-surface-container-high focus:outline-none focus:ring-2 focus:ring-secondary"
                  id="largeReason"
                  placeholder="Ví dụ: Khám bệnh định kỳ, sửa mái nhà"
                />
              </div>
            </div>
          </div>

          <div className="pt-space-md flex flex-col gap-space-xs">
            <button
              onClick={handleRequestLargeWithdrawal}
              className="w-full py-space-md px-space-lg bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary font-headline-sm text-headline-sm rounded-xl shadow-md flex items-center justify-center gap-space-sm transition-all active:scale-[0.98]"
              type="button"
            >
              <span className="material-symbols-outlined text-[28px]">
                send_time_extension
              </span>
              <span>GỬI YÊU CẦU CHO CÁC CON DUYỆT</span>
            </button>
            <span className="font-label-md text-label-md text-center text-outline">
              Bắt buộc tối thiểu 2/3 Guardians ký duyệt mới giải ngân
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
