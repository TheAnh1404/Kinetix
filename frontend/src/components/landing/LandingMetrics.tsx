"use client";

import React from "react";
import { Zap, TrendingUp, ShieldCheck, CheckCircle2 } from "lucide-react";
import styles from "./landing.module.css";

export const LandingMetrics: React.FC = () => {
  const metrics = [
    {
      icon: <Zap className="w-6 h-6 text-emerald-400" />,
      value: "0đ Phí Gas",
      label: "Family L1 Appchain",
      desc: "Custom Fee Config triệt tiêu rào cản chi phí cho người già & trẻ nhỏ.",
      badge: "Zero-Gas L1",
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-amber-400" />,
      value: "8.0% APY",
      label: "Avalanche Fuji C-Chain",
      desc: "Tích lũy lợi tức theo block.timestamp thực tế, không dùng mock time.",
      badge: "Real Yield",
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-[#E84142]" />,
      value: "2/3 Multisig",
      label: "Phòng Vệ Đa Chữ Ký",
      desc: "Hạn mức độc lập theo hũ, ngăn chặn triệt để các hành vi lừa đảo qua mạng.",
      badge: "Anti-Scam Guard",
    },
    {
      icon: <CheckCircle2 className="w-6 h-6 text-cyan-400" />,
      value: "287 / 287",
      label: "Unit & Integration Tests",
      desc: "Khắc phục triệt để AUD-01 đến AUD-14, tuân thủ chuẩn kiểm toán Avalanche.",
      badge: "Audited Invariants",
    },
  ];

  return (
    <section id="features" className="py-16 relative z-10 border-y border-white/10 bg-slate-950/60 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((item, idx) => (
            <div
              key={idx}
              className={`${styles.glassCard} p-6 rounded-2xl relative overflow-hidden group hover:border-white/25 transition-all duration-300`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                  {item.icon}
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                  {item.badge}
                </span>
              </div>
              <div className="text-3xl font-extrabold text-white tracking-tight">
                {item.value}
              </div>
              <div className="text-sm font-semibold text-slate-200 mt-1">
                {item.label}
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
