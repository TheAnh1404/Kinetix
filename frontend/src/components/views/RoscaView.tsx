"use client";

import React from "react";
import { VaultWorkflowPanel } from "@/components/vaults/VaultWorkflowPanel";
import { useFamily } from "@/context/FamilyContext";
import { formatEther } from "viem";

interface RoscaViewProps {
  currentMember?: unknown;
}

/**
 * Giao diện Quỹ Họ Hụi Xoay Vòng (Kinetix ROSCA Hub)
 * Thiết kế chuẩn Web3 Fintech:
 * - Minh bạch lượt nhận theo epoch và block timestamp Avalanche
 * - Vòng tròn luân chuyển lượt nhận & biểu đồ tiến độ các kỳ
 * - Chống giật hụi nhờ khóa quỹ hợp đồng thông minh
 */
export const RoscaView: React.FC<RoscaViewProps> = () => {
  const { dynamicVaults } = useFamily();
  const roscaVaults = dynamicVaults.filter((v) => v.ruleTemplate === "ROSCA");

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12">
      {/* 1. Header & Giới thiệu Quỹ Họ Hụi Minh Bạch */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20 shrink-0">
            <span className="material-symbols-outlined text-[26px]">groups</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Quỹ Góp Vốn Xoay Vòng (ROSCA)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold font-mono">
                Họ Hụi Minh Bạch
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Tích lũy tài chính cộng đồng, bảo vệ bởi hợp đồng thông minh Avalanche. Không ai có thể gian lận hay thay đổi lượt nhận.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <div className="px-3.5 py-2 rounded-2xl bg-white border border-amber-200 text-xs font-mono font-bold text-amber-900 shadow-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>{roscaVaults.length} Quỹ Đang Hoạt Động</span>
          </div>
        </div>
      </div>

      {/* 2. Nguyên Lý Hoạt Động 3 Bước Cho Mọi Độ Tuổi (Dễ hiểu cho cả Ông Bà & Thanh Niên) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm shrink-0">
            1
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Định Kỳ Góp Đều Đặn</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Mỗi thành viên đóng đúng số AVAX quy định vào hợp đồng một lần mỗi kỳ.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm shrink-0">
            2
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Khóa An Toàn On-Chain</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Tiền nhàn rỗi được bảo lưu an toàn. Chỉ mở khóa chi trả khi tất cả đã góp đủ.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-sm shrink-0">
            3
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Nhận Tiền Luân Phiên</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Lần lượt từng người nhận toàn bộ quỹ của kỳ theo thứ tự đã cam kết từ ban đầu.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Bàn Điều Khiển Chu Kỳ & Thao Tác Giao Dịch Web3 */}
      <VaultWorkflowPanel onlyRosca />
    </div>
  );
};
export default RoscaView;
