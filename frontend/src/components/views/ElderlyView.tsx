"use client";

import React, { useState } from "react";
import { useFamily } from "@/context/FamilyContext";
import { useLanguage } from "@/context/LanguageContext";

export const ElderlyView: React.FC = () => {
  const {
    dynamicVaults,
    currentWorkspace,
    fastWithdrawFromVault,
    requestVaultWithdrawal,
    quickWithdraw,
    requestLargeWithdraw,
    currentMember,
    members,
    vaults: fallbackVaults,
  } = useFamily();

  const { language } = useLanguage();

  // Tìm các Hũ tiền thuộc bộ quy tắc SHIELD (Bảo vệ & Trợ cấp)
  const shieldVaults = dynamicVaults.filter((v) => v.ruleTemplate === "SHIELD");
  const [selectedVaultId, setSelectedVaultId] = useState<number | null>(
    shieldVaults.length > 0 ? shieldVaults[0].onchainVaultId : null
  );

  const activeVault =
    shieldVaults.find((v) => v.onchainVaultId === selectedVaultId) || shieldVaults[0];

  // Hạn mức rút nhanh lấy từ Hũ tiền (mặc định 0.05 AVAX nếu chưa cấu hình)
  const fastLimit = activeVault?.fastWithdrawLimit ? Math.min(activeVault.fastWithdrawLimit, 0.05) : 0.05;
  const bufferBalance = activeVault
    ? (activeVault.cachedL1Buffer !== undefined ? activeVault.cachedL1Buffer : activeVault.l1BufferBalance || 0)
    : fallbackVaults.retirementShield.localBuffer;
  const cChainPrincipal = activeVault
    ? (activeVault.cachedTotalBalance !== undefined ? Math.max(0, activeVault.cachedTotalBalance - activeVault.cachedL1Buffer) : activeVault.cChainPrincipal || 0)
    : fallbackVaults.retirementShield.remoteYield;

  const [selectedPill, setSelectedPill] = useState<number>(0.02);
  const [largeAmount, setLargeAmount] = useState<string>("0.2");
  const [largeReason, setLargeReason] = useState<string>(
    "Khám bệnh định kỳ và mua thuốc tại Bệnh viện"
  );
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
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

  const adminOrGuardian = members.find((m) => m.role === "ADMIN" || m.role === "GUARDIAN");
  const emergencyPhone = adminOrGuardian?.phoneNumber || "0908889999";

  // Rút tiền tức thì < 1 giây, 0đ gas
  const handleQuickWithdraw = async () => {
    if (bufferBalance < selectedPill) {
      alert("Số dư đệm Family L1 của Hũ không đủ! Vui lòng nạp thêm hoặc yêu cầu rút lớn.");
      return;
    }
    setIsProcessing(true);
    try {
      let success = false;
      if (activeVault) {
        success = await fastWithdrawFromVault(activeVault.onchainVaultId, selectedPill);
      } else {
        success = await quickWithdraw(0, selectedPill);
      }

      if (success) {
        setNotification({
          show: true,
          title: "🎉 RÚT TIỀN ĐI CHỢ THÀNH CÔNG TỨC THÌ!",
          message: `Đã giải ngân ${selectedPill} AVAX (~${(selectedPill * 750000).toLocaleString(
            "vi-VN"
          )} VNĐ) từ đệm Family L1 trong <1 giây với 0đ phí gas!`,
          type: "success",
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Yêu cầu rút tiền lớn > hạn mức cần M/N Guardians ký duyệt
  const handleRequestLargeWithdrawal = async () => {
    const amt = parseFloat(largeAmount);
    if (!amt || amt <= fastLimit) {
      alert(
        `Khoản rút lớn phải trên ${fastLimit} AVAX. Khoản nhỏ xin dùng nút rút tức thì bên trái!`
      );
      return;
    }
    setIsProcessing(true);
    try {
      let success = false;
      let requestId: number | undefined;

      if (activeVault) {
        const res = await requestVaultWithdrawal(
          activeVault.onchainVaultId,
          amt,
          largeReason
        );
        success = res.success;
        requestId = res.requestId;
      } else {
        const res = await requestLargeWithdraw(0, amt, largeReason);
        success = res.success;
        requestId = res.requestId;
      }

      if (success) {
        const reqApprovals = activeVault?.requiredApprovals || 2;
        const guardianNames =
          members
            .filter((m) => m.role === "GUARDIAN" || m.role === "ADMIN")
            .map((m) => m.name)
            .join(", ") || "người bảo hộ";

        setNotification({
          show: true,
          title: "🛡️ ĐÃ KÍCH HOẠT BẢO VỆ CHỐNG LỪA ĐẢO AI (Multisig)!",
          message: `Yêu cầu rút ${amt} AVAX (Mã #${
            requestId || "001"
          } - "${largeReason}") đã ghi vào Smart Contract và gửi khẩn cấp tới các con (${guardianNames}). Cần tối thiểu ${reqApprovals} chữ ký Guardians duyệt mới giải ngân!`,
          type: "warning",
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
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
              <h4 className="font-headline-sm text-headline-sm font-bold">
                {notification.title}
              </h4>
              <p className="text-body-md mt-1">{notification.message}</p>
            </div>
          </div>
          <button
            onClick={() => setNotification({ ...notification, show: false })}
            className="text-gray-500 hover:text-black cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Top Warm Greeting & Emergency Assistance Bar */}
      <div className="w-full bg-white rounded-2xl p-5 md:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-200/80">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden shadow-inner bg-slate-100 border-2 border-red-500/30">
              <img
                className="w-full h-full object-cover"
                alt={currentMember?.name || "Ông Bà"}
                src={
                  currentMember?.avatar ||
                  "https://lh3.googleusercontent.com/aida-public/AB6AXuB9RXFgUn83eP41jg2weE3YA8vd83fsVimUf5y0OcZS7SOQ3XPOzG_gbODV_xJIXeRQye9NHAh2TXP_28Oz-bPHhWTfscJFCZWXYRXq2gQAAtwAVTc1yseRsDx3GBa94HVhTHAal40UzoVwN7YY1IXQ5EmMOe0WhhEvzu4V7ZNBtixA0ZiaR61Ad1UJUADoRuNzug0ggIZW8eO5XEiktIZD-zCJ4THMAqG0i7Z1ivkCGPnUrjsBJg"
                }
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-xs">
              <span className="flex h-5 w-5 rounded-full bg-red-600 animate-pulse items-center justify-center">
                <span className="material-symbols-outlined text-[13px] text-white">
                  verified_user
                </span>
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Chế độ Kinetix SHIELD: ĐANG BẬT</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Chào {currentMember?.name || "Ông Nội"} ❤️
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {currentWorkspace ? `Không gian: ${currentWorkspace.name} • ` : ""}Chúc Ông ngày mới an vui, mạnh khỏe và thảnh thơi.
            </p>

            {/* Selector if multiple SHIELD vaults */}
            {shieldVaults.length > 1 && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-semibold text-slate-500">Chọn Hũ:</span>
                {shieldVaults.map((vault) => (
                  <button
                    key={vault.id}
                    onClick={() => setSelectedVaultId(vault.onchainVaultId)}
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeVault?.onchainVaultId === vault.onchainVaultId
                        ? "bg-red-600 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                    type="button"
                  >
                    {vault.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick One-Tap Emergency Call Button */}
        <a
          className="w-full md:w-auto flex items-center justify-center gap-3 px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-sm transition-all active:scale-95 group shrink-0"
          href={`tel:${emergencyPhone}`}
        >
          <span className="material-symbols-outlined text-[28px] group-hover:animate-bounce">
            phone_in_talk
          </span>
          <div className="flex flex-col text-left">
            <span className="text-[10px] tracking-widest opacity-90 uppercase font-bold">
              Hỗ Trợ Gia Đình
            </span>
            <span className="text-sm font-bold">
              Cần trợ giúp? Bấm gọi con ngay
            </span>
          </div>
        </a>
      </div>

      {/* Main Hero Balance Card */}
      <div className="w-full bg-white rounded-2xl p-6 md:p-8 shadow-xs relative overflow-hidden flex flex-col gap-4 border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[26px] text-red-600">
              savings
            </span>
            <span className="text-base font-bold text-slate-700">
              {activeVault ? activeVault.name : "Tiền sinh hoạt sẵn sàng tiêu (Hũ Báo Hiếu)"}
            </span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px] text-emerald-600">lock_open</span>
            <span>Bộ đệm L1: Rút tức thì 0đ phí gas</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 relative z-10">
          <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 font-mono tracking-tight">
            {bufferBalance.toFixed(2)} AVAX
          </span>
          <span className="text-base sm:text-xl text-slate-500 font-semibold font-mono">
            ~ {(bufferBalance * 750000).toLocaleString("vi-VN")} VNĐ
          </span>
        </div>

        {/* Growth Note Badge */}
        <div className="relative z-10 flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 text-emerald-950 border border-emerald-200/60">
          <span className="material-symbols-outlined text-[24px] text-emerald-600 shrink-0">
            trending_up
          </span>
          <p className="text-xs sm:text-sm leading-relaxed">
            Phần vốn nhàn rỗi <strong>{cChainPrincipal.toFixed(2)} AVAX</strong> đang sinh lời tự động <strong>8% APY</strong> mỗi ngày từ Avalanche Fuji C-Chain và tự động chuyển về đệm L1 khi cần!
          </p>
        </div>
      </div>

      {/* Dual Action Area: High-Contrast Large Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Card A: Daily Spending (Fast & Immediate <= fastLimit) */}
        <div className="bg-white rounded-2xl p-6 shadow-xs flex flex-col justify-between gap-6 border border-slate-200/80">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[28px] text-emerald-600">
                shopping_basket
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                Rút Tức Thì (1 Chạm)
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Rút tiền chợ / Mua thuốc (≤ {fastLimit} AVAX)
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Dành cho chi tiêu nhỏ lẻ thường nhật. Nhận tiền về tài khoản trong 1 giây mà không cần con cháu duyệt, 0đ phí giao dịch.
            </p>

            {/* Quick Select Preset Pills */}
            <div className="flex flex-col gap-2 pt-1">
              <label className="text-xs font-bold text-slate-700">
                Chọn số tiền muốn lấy:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[0.01, 0.02, 0.05].map((val) => {
                  const isSelected = selectedPill === val;
                  return (
                    <button
                      key={val}
                      onClick={() => setSelectedPill(val)}
                      className={`py-2.5 px-2 rounded-xl text-center transition-all cursor-pointer border ${
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs font-bold"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200 font-medium"
                      }`}
                      type="button"
                    >
                      <div className="text-xs sm:text-sm font-bold font-mono">{val} AVAX</div>
                      <div
                        className={`text-[10px] font-mono ${
                          isSelected ? "text-white/80" : "text-slate-500"
                        }`}
                      >
                        {(val * 750000).toLocaleString("vi-VN")}đ
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={handleQuickWithdraw}
              disabled={isProcessing}
              className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60"
              type="button"
            >
              {isProcessing ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[22px]">
                    progress_activity
                  </span>
                  <span>Đang giải ngân tức thì...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[22px]">
                    bolt
                  </span>
                  <span>RÚT {selectedPill} AVAX NGAY (0đ Phí Gas)</span>
                </>
              )}
            </button>
            <span className="text-[11px] text-center text-slate-400">
              Bảo mật tự động bởi Hợp đồng FamilyHub trên Avalanche Family L1
            </span>
          </div>
        </div>

        {/* Card B: High-Value Spending (Anti-Scam Protection > fastLimit) */}
        <div className="bg-white rounded-2xl p-6 shadow-xs flex flex-col justify-between gap-6 border border-slate-200/80">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[28px] text-red-600">
                shield_with_heart
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold uppercase tracking-wider">
                Bảo Vệ Đa Chữ Ký Multisig ({activeVault?.requiredApprovals || 2} Chữ Ký)
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Rút khoản tiền lớn (&gt; {fastLimit} AVAX)
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Dùng khi khám chữa bệnh, sửa nhà hoặc việc hệ trọng. Tự động kích hoạt cơ chế chống lừa đảo AI và kẻ gian mạo danh.
            </p>

            {/* Input Amount & Reason */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-bold text-slate-700"
                  htmlFor="largeAmount"
                >
                  Nhập số tiền Ông cần rút (AVAX):
                </label>
                <div className="relative flex items-center">
                  <input
                    value={largeAmount}
                    onChange={(e) => setLargeAmount(e.target.value)}
                    className="w-full py-2.5 px-3.5 pr-14 bg-slate-50 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-bold font-mono"
                    id="largeAmount"
                    placeholder="Ví dụ: 0.2, 0.5, 1"
                    step="0.05"
                    type="number"
                  />
                  <span className="absolute right-3.5 text-xs text-slate-500 font-bold font-mono">
                    AVAX
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  className="text-xs font-bold text-slate-700"
                  htmlFor="largeReason"
                >
                  Lý do rút tiền (để các con yên tâm):
                </label>
                <input
                  value={largeReason}
                  onChange={(e) => setLargeReason(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-slate-50 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  id="largeReason"
                  placeholder="Ví dụ: Khám bệnh định kỳ, sửa mái nhà"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={handleRequestLargeWithdrawal}
              disabled={isProcessing}
              className="w-full py-3.5 px-6 bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60"
              type="button"
            >
              {isProcessing ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[22px]">
                    progress_activity
                  </span>
                  <span>Đang gửi yêu cầu...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[22px]">
                    send_time_extension
                  </span>
                  <span>GỬI YÊU CẦU CHO CÁC CON DUYỆT</span>
                </>
              )}
            </button>
            <span className="text-[11px] text-center text-slate-400">
              Bắt buộc tối thiểu {activeVault?.requiredApprovals || 2} Guardians ký duyệt mới giải ngân
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
