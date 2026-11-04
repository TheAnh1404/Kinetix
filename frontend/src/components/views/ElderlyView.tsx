"use client";

import React, { useState } from "react";
import { useFamily } from "@/context/FamilyContext";
import { VideoCallModal } from "@/components/dashboard/VideoCallModal";

export const ElderlyView: React.FC = () => {
  const {
    dynamicVaults,
    fastWithdrawFromVault,
    requestVaultWithdrawal,
    members,
    vaults: fallbackVaults,
  } = useFamily();

  // Tìm Hũ tiền thuộc bộ quy tắc SHIELD (Báo Hiếu & An Sinh)
  const shieldVault =
    dynamicVaults.find((v) => v.ruleTemplate === "SHIELD") || dynamicVaults[0];
  const vaultId = shieldVault ? shieldVault.onchainVaultId : 1;

  const bufferBalance = shieldVault
    ? shieldVault.cachedL1Buffer !== undefined
      ? shieldVault.cachedL1Buffer
      : shieldVault.l1BufferBalance || 0
    : fallbackVaults.retirementShield.localBuffer;

  const totalVaultBalance = shieldVault
    ? (shieldVault.cachedTotalBalance ?? shieldVault.totalBalance ?? 0)
    : 0;

  const [selectedQuickAmount, setSelectedQuickAmount] = useState<number>(0.02);
  const [largeAmount, setLargeAmount] = useState<string>("0.2");
  const [largeReason, setLargeReason] = useState<string>(
    "Tiền thuốc và khám định kỳ bệnh viện",
  );
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(true);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState<boolean>(false);

  const adminGuardian = members.find(
    (m) => m.role === "ADMIN" || m.role === "GUARDIAN",
  );
  const emergencyPhone = adminGuardian?.phoneNumber || "0908.123.456";
  const guardianName = adminGuardian?.name || "Bố Ba (Con Trưởng)";

  // Hàm phát giọng đọc tiếng Việt trợ năng (Web Speech API)
  const speakText = (text: string) => {
    if (!isVoiceEnabled) return;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "vi-VN";
      utterance.rate = 0.9; // Tốc độ vừa phải, to rõ cho người cao tuổi
      window.speechSynthesis.speak(utterance);
    }
  };

  // 1. Rút tiền nhanh 1 chạm (<1s, 0đ gas)
  const handleQuickWithdraw = async (amount: number) => {
    if (bufferBalance < amount) {
      const msg =
        "Số dư đệm Family L1 của Hũ chưa đủ! Hãy báo con trưởng nạp thêm đệm.";
      alert(msg);
      speakText("Số dư đệm chưa đủ, xin báo con nạp thêm tiền!");
      return;
    }

    setIsProcessing(true);
    try {
      const ok = await fastWithdrawFromVault(vaultId, amount);
      if (ok) {
        const msg = `🎉 ĐÃ RÚT THÀNH CÔNG ${amount} AVAX (~${(amount * 750000).toLocaleString("vi-VN")} VNĐ) VÀO VÍ! Thời gian < 1 giây, 0đ phí giao dịch.`;
        setToastMessage(msg);
        speakText(
          `Kinetix xác nhận: Đã rút thành công ${amount} AVAX vào ví của Cụ, không đồng phí giao dịch! Chúc Cụ một ngày vui vẻ!`,
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Yêu cầu rút tiền lớn (gửi sang Bố Ba duyệt 2/3)
  const handleRequestLarge = async () => {
    const num = parseFloat(largeAmount);
    if (!num || num <= 0.05) {
      alert(
        "Khoản rút lớn phải trên 0.05 AVAX. Khoản nhỏ xin bấm nút Rút Đi Chợ ở trên!",
      );
      return;
    }

    setIsProcessing(true);
    try {
      const res = await requestVaultWithdrawal(vaultId, num, largeReason);
      if (res.success) {
        const msg = `📬 ĐÃ GỬI PHIẾU RÚT ${num} AVAX TỚI ${guardianName.toUpperCase()}! Vui lòng chờ con xác nhận ký duyệt trên điện thoại.`;
        setToastMessage(msg);
        speakText(
          `Đã gửi yêu cầu rút ${num} AVAX tới ${guardianName}, Cụ vui lòng đợi con duyệt nhé!`,
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full text-slate-900">
      {/* Toast thông báo lớn dễ đọc */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500 text-white shadow-lg flex items-start justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[24px]">
              verified
            </span>
            <p className="text-xs font-bold leading-relaxed">{toastMessage}</p>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* THẺ SỐ DƯ AN SINH KHỔNG LỒ KÈM NÚT TRỢ NĂNG GIỌNG NÓI */}
      <div className="bg-gradient-to-br from-red-600 to-rose-700 text-white p-5 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs uppercase font-bold text-red-100 tracking-wider">
            Quỹ Hưu Trí &amp; An Sinh Của Ông
          </span>

          <div className="flex items-center gap-1.5">
            {/* Nút bật/tắt giọng đọc */}
            <button
              onClick={() => {
                const nextState = !isVoiceEnabled;
                setIsVoiceEnabled(nextState);
                if (nextState) {
                  speakText("Đã bật giọng đọc trợ năng");
                }
              }}
              type="button"
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                isVoiceEnabled
                  ? "bg-white text-red-700 shadow-xs"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
              title="Bật/Tắt giọng đọc to"
            >
              <span className="material-symbols-outlined text-[13px]">
                {isVoiceEnabled ? "volume_up" : "volume_off"}
              </span>
              <span>{isVoiceEnabled ? "Giọng Đọc: BẬT" : "TẮT"}</span>
            </button>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              0 Gas Fee
            </span>
          </div>
        </div>

        <div className="text-3xl font-black font-mono tracking-tight my-1">
          {bufferBalance.toFixed(2)}{" "}
          <span className="text-base font-sans font-bold text-red-100">
            AVAX (L1)
          </span>
        </div>

        <p className="text-[11px] text-red-100/90 font-medium leading-relaxed">
          Số dư đệm rút tức thì trong ví. Tổng tài sản đang sinh lời trên
          C-Chain:{" "}
          <span className="font-bold font-mono text-white">
            {totalVaultBalance.toFixed(1)} AVAX
          </span>
          .
        </p>
      </div>

      {/* KHỐI 1: RÚT TIỀN ĐI CHỢ 1 CHẠM (<1 GIÂY) */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
            ⚡
          </span>
          <h3 className="text-sm font-bold text-slate-900">
            Rút Tiền Nhanh (Không Cần Chờ)
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleQuickWithdraw(0.02)}
            disabled={isProcessing}
            type="button"
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-red-50 border-2 border-slate-200 hover:border-red-500 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
          >
            <span className="text-lg font-black text-slate-900 font-mono">
              0.02 AVAX
            </span>
            <span className="text-[11px] font-bold text-red-600">
              Đi Chợ (~150k)
            </span>
          </button>

          <button
            onClick={() => handleQuickWithdraw(0.05)}
            disabled={isProcessing}
            type="button"
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-red-50 border-2 border-slate-200 hover:border-red-500 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
          >
            <span className="text-lg font-black text-slate-900 font-mono">
              0.05 AVAX
            </span>
            <span className="text-[11px] font-bold text-red-600">
              Mua Thuốc (~375k)
            </span>
          </button>
        </div>

        {/* Nút rút tùy chọn */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
          <span className="text-xs font-bold text-slate-700">
            Hoặc chọn nhanh:
          </span>
          <div className="flex items-center gap-1.5">
            {[0.01, 0.02, 0.03].map((amt) => (
              <button
                key={amt}
                onClick={() => setSelectedQuickAmount(amt)}
                type="button"
                className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  selectedQuickAmount === amt
                    ? "bg-red-600 text-white"
                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {amt}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => handleQuickWithdraw(selectedQuickAmount)}
          disabled={isProcessing}
          type="button"
          className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[20px]">bolt</span>
          <span>
            {isProcessing
              ? "Đang giải ngân on-chain..."
              : "Bấm Để Rút Tiền Ngay (0đ Phí)"}
          </span>
        </button>
      </div>

      {/* KHỐI 2: KHOẢN RÚT LỚN CÓ CON PHÊ DUYỆT */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
              🛡️
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Rút Khoản Lớn ({">"} 0.05 AVAX)
            </h3>
          </div>
          <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">
            Cần Con Ký
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.05"
            value={largeAmount}
            onChange={(e) => setLargeAmount(e.target.value)}
            placeholder="0.2"
            className="flex-1 p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <span className="text-xs font-bold text-slate-600 shrink-0">
            AVAX
          </span>
        </div>

        <input
          type="text"
          value={largeReason}
          onChange={(e) => setLargeReason(e.target.value)}
          placeholder="Lý do rút tiền..."
          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
        />

        <button
          onClick={handleRequestLarge}
          disabled={isProcessing}
          type="button"
          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[16px]">send</span>
          <span>
            {isProcessing ? "Đang gửi..." : "Gửi Lệnh Để Con Trai Duyệt"}
          </span>
        </button>
      </div>

      {/* KHỐI 3: GỌI NGƯỜI THÂN & GỌI VIDEO CHỐNG LỪA ĐẢO / DEEPFAKE */}
      <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">
                support_agent
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900">
                Nghi Ngờ Lừa Đảo Hoặc Cần Giúp?
              </span>
              <span className="text-[11px] text-amber-800 font-medium">
                Liên hệ {guardianName}: {emergencyPhone}
              </span>
            </div>
          </div>

          <a
            href={`tel:${emergencyPhone}`}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shrink-0 transition-all shadow-sm"
          >
            Gọi Thoại
          </a>
        </div>

        {/* Nút Gọi Video Call E2EE Trực Tiếp */}
        <button
          onClick={() => setIsVideoCallOpen(true)}
          type="button"
          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
        >
          <span className="material-symbols-outlined text-[18px]">
            videocam
          </span>
          <span>Gọi Video Trực Tiếp Nhìn Mặt Con (Chống Deepfake)</span>
        </button>
      </div>

      {/* Modal Video Call P2P */}
      <VideoCallModal
        isOpen={isVideoCallOpen}
        onClose={() => setIsVideoCallOpen(false)}
        grandparentName="Cụ Ba (Ông Nội)"
      />
    </div>
  );
};
