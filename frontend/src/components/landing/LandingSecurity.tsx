"use client";

import React from "react";
import { ShieldCheck, Lock, Clock, FileCheck2, Code2, AlertTriangle } from "lucide-react";
import styles from "./landing.module.css";

export const LandingSecurity: React.FC = () => {
  const points = [
    {
      icon: <Clock className="w-5 h-5 text-amber-400" />,
      title: "Tính Lãi Dựa Trên block.timestamp Thực Tế",
      desc: "Kiên quyết loại bỏ mọi hàm hack hoặc mock time-travel. Công thức tính lãi suất 8% APY dựa hoàn toàn trên giây trôi qua thực tế trên mạng Avalanche.",
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      title: "Xác Thực Thông Điệp Teleporter 3 Lớp",
      desc: "Tuân thủ checklist audit.md của Avalanche: Kiểm tra msg.sender == Messenger, originChainID == Family L1, originSenderAddress == FamilyHub.",
    },
    {
      icon: <Lock className="w-5 h-5 text-cyan-400" />,
      title: "Tách Bạch Kho Lưu Ký & Logic Nghiệp Vụ",
      desc: "VaultCashflow.sol nắm giữ AVAX tách biệt với FamilyHub.sol. Giảm thiểu tối đa bề mặt tấn công và áp dụng chặt chẽ mẫu thiết kế Checks-Effects-Interactions (CEI).",
    },
    {
      icon: <FileCheck2 className="w-5 h-5 text-purple-400" />,
      title: "Khôi Phục Ví Xã Hội (Social Recovery AUD-13)",
      desc: "Bảo vệ tài sản khi người thân làm mất ví. Đa số Người bảo hộ có thể bỏ phiếu di dời quyền thụ hưởng sang ví mới mà không phá vỡ vòng quay ROSCA.",
    },
  ];

  return (
    <section id="security" className="py-24 relative z-10 bg-slate-950/60 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[#E84142] text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>KIỂM TOÁN VÀ BẢO CHỨNG BẢO MẬT</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            An Toàn Tuyệt Đối Cho Dòng Tiền Gia Đình
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Áp dụng các tiêu chuẩn an ninh nghiêm ngặt nhất của Avalanche. Mọi đồng tiền nạp vào đều được bảo chứng thanh khoản 1-1, không tạo vốn khống xuyên chuỗi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-12">
          {points.map((p, idx) => (
            <div
              key={idx}
              className={`${styles.glassCard} p-6 sm:p-8 rounded-2xl border border-white/10 space-y-3 hover:border-white/20 transition-all`}
            >
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 w-fit">
                {p.icon}
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">{p.title}</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {p.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Security Terminal Summary */}
        <div className="max-w-4xl mx-auto p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 text-xs font-mono text-slate-300 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Code2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>
              <strong>Hardhat Suite:</strong> 287 passing tests (0 failures, 0 pending) · ReentrancyGuard · Nonce Idempotency.
            </span>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold shrink-0">
            AUD-01 to AUD-14 VERIFIED
          </span>
        </div>
      </div>
    </section>
  );
};
