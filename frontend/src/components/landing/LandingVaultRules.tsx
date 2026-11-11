"use client";

import React, { useState } from "react";
import { Shield, Sparkles, RefreshCw, Target, Check, ArrowRight } from "lucide-react";
import styles from "./landing.module.css";

export const LandingVaultRules: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);

  const rules = [
    {
      id: 0,
      name: "SHIELD",
      title: "Kinetix SHIELD · Bảo Vệ & Trợ Cấp",
      tagline: "Rút nhanh 0 gas cho sinh hoạt & Đa chữ ký phòng vệ chống lừa đảo",
      icon: <Shield className="w-6 h-6 text-[#E84142]" />,
      badgeColor: "bg-red-500/10 text-red-400 border-red-500/30",
      accentColor: "border-[#E84142]/30",
      features: [
        "Hạn mức rút nhanh (fastWithdrawLimit) giải ngân ngay trong 1 giây, 0 gas phí mạng.",
        "Khoản chi lớn vượt hạn mức tự động đưa vào hàng đợi M/N chữ ký Người bảo hộ.",
        "Cơ chế Social Recovery (AUD-13) khôi phục ví mất của người thân mà không mất số dư.",
      ],
      idealFor: "Chi tiêu an sinh cho Ông Bà, cấp dưỡng con cái, quỹ y tế khẩn cấp.",
      sampleLimit: "Hạn mức đề xuất: 20 AVAX/ngày · 2/3 chữ ký bảo hộ",
    },
    {
      id: 1,
      name: "MILESTONE",
      title: "Kinetix KIDS · Chore-to-Earn",
      tagline: "Gắn việc nhà với phần thưởng giáo dục tài chính sớm",
      icon: <Sparkles className="w-6 h-6 text-purple-400" />,
      badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
      accentColor: "border-purple-500/30",
      features: [
        "Phụ huynh tạo nhiệm vụ (rửa bát, học bài, dọn phòng) kèm phần thưởng AVAX.",
        "Bé nộp hình ảnh minh chứng ngay trên ứng dụng di động một cách hào hứng.",
        "Sau khi phụ huynh bấm xác nhận, hợp đồng tự động mở khóa tiền vào Heo Đất 4.0.",
      ],
      idealFor: "Giáo dục tư duy tích lũy và lao động có mục tiêu cho trẻ em từ 6–16 tuổi.",
      sampleLimit: "Thưởng nhiệm vụ: 1–5 AVAX · Tích lũy heo đất sinh lãi 8% APY",
    },
    {
      id: 2,
      name: "ROSCA",
      title: "Kinetix ROSCA · Góp Vốn Xoay Vòng",
      tagline: "Số hóa mô hình Chơi Hụi / Họ truyền thống trên blockchain Avalanche",
      icon: <RefreshCw className="w-6 h-6 text-amber-400" />,
      badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      accentColor: "border-amber-500/30",
      features: [
        "Định kỳ đóng tiền góp vốn theo lượt minh bạch ghi nhận trên smart contract.",
        "Tiền nhàn rỗi trong chu kỳ tự động stake nhận lãi 8% APY trên Avalanche C-Chain.",
        "Đến kỳ giải ngân, người nhận nhận trọn vốn gốc của kỳ cộng phần lãi đã sinh ra.",
      ],
      idealFor: "Nhóm anh chị em ruột, hội bạn thân, CLB kinh doanh cùng tích lũy vốn đầu tư.",
      sampleLimit: "Chu kỳ: 30 ngày/kỳ · Đóng góp định kỳ tự động hóa",
    },
    {
      id: 3,
      name: "SHARED_GOAL",
      title: "SHARED GOAL · Mục Tiêu Chung",
      tagline: "Cả nhóm cùng tích lũy cho kỳ nghỉ gia đình, mua sắm lớn hay quỹ học tập",
      icon: <Target className="w-6 h-6 text-cyan-400" />,
      badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
      accentColor: "border-cyan-500/30",
      features: [
        "Đặt mục tiêu số tiền cần đạt và mốc hạn chót (Deadline) cụ thể.",
        "Tất cả thành viên trong nhóm đóng góp theo khả năng, tiền sinh lãi đều đặn.",
        "Hợp đồng khóa rút cho đến khi đạt mục tiêu hoặc hết hạn và được đa số đồng thuận chi.",
      ],
      idealFor: "Quỹ du lịch hè của đại gia đình, mua xe chung, quỹ học đại học cho con.",
      sampleLimit: "Mục tiêu mẫu: 500 AVAX · Khóa quỹ đến khi đủ 100% mục tiêu",
    },
  ];

  return (
    <section id="vault-rules" className="py-24 relative z-10 bg-slate-950/40 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>4 BỘ QUY TẮC TÙY BIẾN (COMPOSABLE RULES)</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Khởi Tạo Hũ Tiền Không Giới Hạn Theo Mọi Nhu Cầu
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Mỗi không gian có thể tạo N Hũ tiền với quy tắc độc lập: tự do cấu hình hạn mức rút nhanh, tỷ lệ đệm thanh khoản và số lượng người phê duyệt.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {rules.map((rule) => (
            <button
              key={rule.id}
              type="button"
              onClick={() => setActiveTab(rule.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 ${
                activeTab === rule.id
                  ? "bg-white text-slate-950 shadow-lg shadow-white/10 scale-105"
                  : "bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10"
              }`}
            >
              {rule.icon}
              <span>{rule.name}</span>
            </button>
          ))}
        </div>

        {/* Active Rule Showcase Card */}
        <div className="max-w-4xl mx-auto">
          {rules
            .filter((r) => r.id === activeTab)
            .map((r) => (
              <div
                key={r.id}
                className={`${styles.glassCard} p-8 sm:p-12 rounded-3xl border ${r.accentColor} shadow-2xl relative animate-in fade-in zoom-in-95 duration-300`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                      {r.icon}
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                        {r.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                        {r.tagline}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${r.badgeColor}`}>
                    Mẫu Quy Tắc #{r.id}
                  </span>
                </div>

                <div className="py-8 space-y-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    ĐẶC TÍNH NỔI BẬT:
                  </h4>
                  <ul className="space-y-3">
                    {r.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-200">
                        <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400 mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
                  <div>
                    <strong className="text-slate-300">Phù hợp cho:</strong> {r.idealFor}
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-amber-400 font-mono font-medium">
                    {r.sampleLimit}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </section>
  );
};
