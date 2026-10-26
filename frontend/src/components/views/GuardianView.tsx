"use client";

import React, { useState } from "react";
import { useFamily } from "@/context/FamilyContext";

export const GuardianView: React.FC = () => {
  const { withdrawalRequests, approveWithdrawal, vaults, currentMember } = useFamily();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  // Yêu cầu rút tiền đang chờ xử lý
  const activeRequest = withdrawalRequests.find((r) => r.status === 'PENDING') || withdrawalRequests[0];
  const isApproved = activeRequest?.status === 'EXECUTED' || (activeRequest?.approvalsCount ?? 0) >= 2;
  const approvalsCount = isApproved ? 2 : (activeRequest?.approvalsCount ?? 1);

  const handleApprove = async () => {
    if (!activeRequest) return;
    setIsSigning(true);
    const success = await approveWithdrawal(activeRequest.id);
    setIsSigning(false);
    if (success) {
      setFeedback(
        `🎉 BẠN (${currentMember.name}) ĐÃ KÝ DUYỆT THÀNH CÔNG! Đạt 2/3 chữ ký Guardians. Hợp đồng FamilyHub trên Avalanche Family L1 tự động giải ngân ${activeRequest.amount} USDC cho ${activeRequest.requesterName} với 0đ phí gas!`
      );
    }
  };

  const handleReject = () => {
    alert("Đã từ chối và tạm khóa yêu cầu để bảo vệ ví Ông Nội!");
  };

  const handleCall = () => {
    alert("Đang khởi tạo cuộc gọi video mã hóa trực tiếp tới điện thoại Ông Nội...");
  };

  return (
    <div className="max-w-7xl mx-auto px-gutter py-space-lg flex flex-col gap-space-lg w-full">
      {/* Feedback banner */}
      {feedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-start justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[28px] text-emerald-600">
              verified
            </span>
            <span className="text-body-md font-semibold">{feedback}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-gray-500 hover:text-black"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Top Header & Network Health */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-surface-container-high/60">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-sm flex-wrap">
            <span className="px-space-xs py-0.5 rounded-full bg-surface-container-high font-label-caps text-label-caps text-on-surface font-bold">
              KINETIX GUARDIAN OS
            </span>
            <span className="text-outline-variant">•</span>
            <span className="font-label-caps text-label-caps text-on-surface-variant font-medium">
              TIERED MULTISIG 2/3 ON-CHAIN
            </span>
          </div>
          <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">
            Quản Trị Quỹ Gia Đình Hạnh Phúc
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Bảng Quản Trị Trung Tâm &amp; Đa Chữ Ký (Multisig Guardian 2/3) •
            Đồng bộ dữ liệu thời gian thực trên Avalanche Family L1.
          </p>
        </div>

        {/* Network Badges */}
        <div className="flex flex-wrap items-center gap-space-sm">
          <div className="flex items-center gap-space-xs px-space-md py-space-xs bg-surface-container-low rounded-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary-container animate-pulse"></span>
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                AVALANCHE FAMILY L1
              </span>
              <span className="font-label-md text-label-md text-on-surface font-semibold">
                Zero Gas (0 Gwei)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs px-space-md py-space-xs bg-surface-container-low rounded-xl">
            <span
              className="material-symbols-outlined text-[18px] text-tertiary-fixed-dim"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              sync_alt
            </span>
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                TELEPORTER ICM
              </span>
              <span className="font-label-md text-label-md text-on-surface font-semibold">
                C-Chain Yield (~8% APY)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CRITICAL ALERT BANNER (Anti-Scam Multisig 2/3 Pending Approval) */}
      <div
        className={`relative overflow-hidden rounded-2xl p-space-lg shadow-md transition-all duration-300 border ${
          isApproved
            ? "bg-emerald-50/50 border-emerald-300"
            : "bg-secondary-fixed/30 border-secondary-container/50"
        }`}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-md mb-space-md">
          <div className="flex items-start gap-space-md">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                isApproved
                  ? "bg-emerald-600 text-white"
                  : "bg-secondary-container text-on-secondary-container animate-bounce"
              }`}
            >
              <span className="material-symbols-outlined text-[28px]">
                {isApproved ? "check_circle" : "notification_important"}
              </span>
            </div>
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center gap-space-sm flex-wrap">
                <span
                  className={`px-space-sm py-0.5 rounded-full font-label-caps text-label-caps uppercase tracking-wider font-bold ${
                    isApproved
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-secondary-container text-on-secondary-container"
                  }`}
                >
                  {isApproved
                    ? "ĐÃ GIẢI NGÂN THÀNH CÔNG"
                    : "YÊU CẦU KHẨN CẤP CHỜ DUYỆT"}
                </span>
                <span className="font-label-caps text-label-caps text-on-surface-variant">
                  KHÓA TELEPORTER TIME-LOCK: 47:58 CÒN LẠI
                </span>
              </div>
              <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">
                {isApproved
                  ? "Lệnh rút 1,000 USDC của Ông Nội đã hoàn tất"
                  : "CẢNH BÁO KHẨN CẤP: Ông Nội vừa tạo lệnh rút 1,000 USDC"}
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Lý do khai báo:{" "}
                <span className="font-title-md text-title-md text-on-surface font-semibold">
                  &quot;Khám bệnh đột xuất tại Bệnh viện Tim TW&quot;
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-space-xs bg-surface-container-lowest px-space-md py-space-sm rounded-xl shrink-0 shadow-sm border border-surface-container">
            <span className="material-symbols-outlined text-secondary text-[20px]">
              security
            </span>
            <span className="font-label-md text-label-md text-on-surface font-medium">
              Cơ chế bảo vệ 3 Lớp: Đang hoạt động
            </span>
          </div>
        </div>

        {/* Transaction details strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm bg-surface-container-lowest p-space-md rounded-xl mb-space-md border border-surface-container-high/40">
          <div className="flex flex-col">
            <span className="font-label-caps text-label-caps text-on-surface-variant font-bold">
              THỜI GIAN KHỞI TẠO
            </span>
            <span className="font-label-lg text-label-lg text-on-surface font-semibold">
              Hôm nay, 08:30 (Sáng)
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-caps text-label-caps text-on-surface-variant font-bold">
              ĐỊA CHỈ ĐÍCH (ALLOWLIST CHECK)
            </span>
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[16px] text-tertiary-fixed-dim">
                check_circle
              </span>
              <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                BV Tim TW (0x44a...92b - Đã Allowlist)
              </span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-label-caps text-label-caps text-on-surface-variant font-bold">
              ĐIỀU KIỆN GIẢI NGÂN L1
            </span>
            <span className="font-label-lg text-label-lg text-secondary font-semibold">
              Cần tối thiểu 2/3 Guardian xác nhận
            </span>
          </div>
        </div>

        {/* Multisig Signatures Status Bar */}
        <div className="bg-surface-container-lowest/90 p-space-md rounded-xl mb-space-lg flex flex-col gap-space-sm border border-surface-container-high/50">
          <div className="flex items-center justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant font-bold">
              TIẾN TRÌNH KÝ MULTISIG ({approvalsCount}/2 ĐÃ ĐẠT CHỈ TIÊU)
            </span>
            <span className="font-label-md text-label-md text-on-surface font-bold">
              {isApproved ? "100% Hoàn Tất" : "50% Hoàn Tất"}
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-surface-container-high overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${
                isApproved ? "bg-emerald-500 w-full" : "bg-secondary-container w-1/2"
              }`}
            ></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md pt-space-xs">
            {/* Guardian 1 */}
            <div className="flex items-center gap-space-sm p-space-sm rounded-lg bg-surface-container-low border border-surface-container">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-label-md text-label-md font-bold">
                AC
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-md text-label-md font-semibold text-on-surface truncate">
                  Guardian 1 - Anh Cả
                </span>
                <span className="font-label-caps text-label-caps text-on-tertiary-container flex items-center gap-1 font-bold">
                  ĐÃ KÝ DUYỆT ✅
                </span>
              </div>
            </div>

            {/* Guardian 2 (Current User - Bố Ba) */}
            <div
              className={`flex items-center gap-space-sm p-space-sm rounded-lg border ${
                isApproved
                  ? "bg-emerald-50 border-emerald-300"
                  : "bg-secondary-fixed/50 border-secondary-container/60 shadow-sm"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-label-md text-label-md font-bold">
                BB
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-md text-label-md font-semibold text-on-surface truncate">
                  Guardian 2 - Bạn (Bố Ba)
                </span>
                <span
                  className={`font-label-caps text-label-caps font-bold flex items-center gap-1 ${
                    isApproved
                      ? "text-emerald-700"
                      : "text-secondary animate-pulse"
                  }`}
                >
                  {isApproved ? "ĐÃ KÝ DUYỆT ✅" : "CHỜ BẠN DUYỆT ⏳"}
                </span>
              </div>
            </div>

            {/* Guardian 3 */}
            <div className="flex items-center gap-space-sm p-space-sm rounded-lg bg-surface-container-low opacity-75 border border-surface-container">
              <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface font-label-md text-label-md font-bold">
                CU
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-md text-label-md font-semibold text-on-surface truncate">
                  Guardian 3 - Cô Út
                </span>
                <span className="font-label-caps text-label-caps text-on-surface-variant font-medium">
                  {isApproved ? "ĐỦ ĐIỀU KIỆN (Bỏ qua)" : "CHỜ KÝ (Pending)"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <div className="flex flex-wrap items-center gap-space-sm">
            <button
              onClick={handleCall}
              className="flex items-center gap-space-xs px-space-md py-space-sm rounded-xl bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-lg text-label-lg shadow-sm transition-colors border border-surface-container"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">
                videocam
              </span>
              <span>Gọi Video Xác Minh Ông Nội</span>
            </button>
            <button
              onClick={handleReject}
              disabled={isApproved}
              className="flex items-center gap-space-xs px-space-md py-space-sm rounded-xl bg-surface-container hover:bg-error-container hover:text-on-error-container text-on-surface-variant font-label-lg text-label-lg transition-colors disabled:opacity-50"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">
                block
              </span>
              <span>Từ Chối (Nghi Vấn Scam)</span>
            </button>
          </div>

          <button
            onClick={handleApprove}
            disabled={isApproved}
            className={`flex items-center gap-space-xs px-space-xl py-space-sm rounded-xl font-label-lg text-label-lg shadow-md transition-all active:scale-95 ${
              isApproved
                ? "bg-emerald-600 text-white cursor-default"
                : "bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary"
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">
              {isApproved ? "done_all" : "verified"}
            </span>
            <span>
              {isApproved
                ? "ĐÃ GIẢI NGÂN (2/2 CHỮ KÝ)"
                : "PHÊ DUYỆT & GIẢI NGÂN (0 Gas)"}
            </span>
          </button>
        </div>
      </div>

      {/* 3 VAULTS DASHBOARD TABLE */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container-high/60 flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">
              Quản Trị 3 Hũ Tài Sản &amp; Tỷ Lệ Đệm 10/90
            </h3>
            <p className="text-body-sm text-on-surface-variant">
              Theo dõi phân bổ vốn thanh khoản tại Family L1 và vốn sinh lời tại
              Avalanche Fuji C-Chain
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-surface-container-high text-xs font-bold text-on-surface">
            Tổng tài sản: ${(vaults.retirementShield.total + vaults.kidsSavings.total + vaults.familyRosca.total).toLocaleString()} USDC
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-sm">
            <thead>
              <tr className="border-b border-surface-container text-on-surface-variant text-xs uppercase font-bold">
                <th className="py-3 px-4">Hũ Ngân Sách</th>
                <th className="py-3 px-4">10% Đệm L1 (Chi tiêu tức thì)</th>
                <th className="py-3 px-4">90% C-Chain (Sinh lời DeFi)</th>
                <th className="py-3 px-4">Tổng Số Dư</th>
                <th className="py-3 px-4 text-right">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              <tr>
                <td className="py-3.5 px-4 font-semibold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">
                    elderly
                  </span>
                  Hũ Báo Hiếu (RetirementShield)
                </td>
                <td className="py-3.5 px-4 font-mono font-medium">{vaults.retirementShield.localBuffer.toFixed(2)} USDC</td>
                <td className="py-3.5 px-4 font-mono text-emerald-700 font-medium">
                  {vaults.retirementShield.remoteYield.toFixed(2)} USDC (+8.0% APY)
                </td>
                <td className="py-3.5 px-4 font-bold text-on-surface">
                  {vaults.retirementShield.total.toFixed(2)} USDC
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                    Hoạt động
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    savings
                  </span>
                  Heo Đất Con Trẻ (KidsSavings)
                </td>
                <td className="py-3.5 px-4 font-mono font-medium">{vaults.kidsSavings.localBuffer.toFixed(2)} USDC</td>
                <td className="py-3.5 px-4 font-mono text-emerald-700 font-medium">
                  {vaults.kidsSavings.remoteYield.toFixed(2)} USDC (+8.0% APY)
                </td>
                <td className="py-3.5 px-4 font-bold text-on-surface">
                  {vaults.kidsSavings.total.toFixed(2)} USDC
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                    Hoạt động
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-[20px]">
                    groups
                  </span>
                  Quỹ Tương Trợ Họ Hàng (FamilyROSCA)
                </td>
                <td className="py-3.5 px-4 font-mono font-medium">{vaults.familyRosca.localBuffer.toFixed(2)} USDC</td>
                <td className="py-3.5 px-4 font-mono text-emerald-700 font-medium">
                  {vaults.familyRosca.remoteYield.toFixed(2)} USDC (+{vaults.familyRosca.accruedYield.toFixed(2)} lãi)
                </td>
                <td className="py-3.5 px-4 font-bold text-on-surface">
                  {vaults.familyRosca.total.toFixed(2)} USDC
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                    Kỳ 3/4
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
