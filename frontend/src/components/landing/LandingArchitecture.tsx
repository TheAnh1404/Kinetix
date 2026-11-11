"use client";

import React, { useState, useMemo } from "react";
import { Sliders, ArrowRightLeft, Shield, Network, Coins, Info } from "lucide-react";
import styles from "./landing.module.css";

export const LandingArchitecture: React.FC = () => {
  const [depositAmount, setDepositAmount] = useState<number>(1000);
  const [bufferRatio, setBufferRatio] = useState<number>(10); // 10% default (1000 bps)

  const l1Buffer = useMemo(() => {
    return (depositAmount * bufferRatio) / 100;
  }, [depositAmount, bufferRatio]);

  const cChainYield = useMemo(() => {
    return depositAmount - l1Buffer;
  }, [depositAmount, l1Buffer]);

  const yearlyYieldReturn = useMemo(() => {
    return ((cChainYield * 8) / 100).toFixed(2);
  }, [cChainYield]);

  return (
    <section id="architecture" className="py-24 relative z-10 overflow-hidden">
      <div className={styles.floatingOrb3} aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
            <Network className="w-3.5 h-3.5" />
            <span>ĐỘT PHÁ CÔNG NGHỆ AVALANCHE</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Kiến Trúc Dual-Chain & Avalanche Teleporter
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Kết hợp sự an toàn, 0 phí gas của <strong>Family L1 (Appchain)</strong> với tính thanh khoản mở và lợi tức <strong>8% APY của Avalanche C-Chain</strong> thông qua giao thức truyền tin bản địa Avalanche Teleporter (ICM).
          </p>
        </div>

        {/* Interactive Capital Allocation Simulator */}
        <div className={`${styles.glassCard} p-6 sm:p-10 rounded-3xl border border-white/15 max-w-4xl mx-auto shadow-2xl relative mb-16`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-white/10 gap-4">
            <div>
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4" /> BỘ MÔ PHỎNG ĐỆM THANH KHOẢN (LIQUIDITY BUFFER SIMULATOR)
              </span>
              <h3 className="text-lg font-bold text-white mt-1">
                Tự Động Cân Bằng Dòng Tiền Theo Tỷ Lệ Đệm Linh Hoạt
              </h3>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 font-medium">
              Chuẩn công thức: <code className="text-amber-400">FamilyHub.sol</code>
            </div>
          </div>

          {/* Controls: Deposit and Slider */}
          <div className="py-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-3">
              <label htmlFor="sim-deposit" className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Số Vốn Nạp Giả Lập</span>
                <span className="text-cyan-400 font-bold">{depositAmount.toLocaleString()} AVAX</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="sim-deposit"
                  type="range"
                  min="100"
                  max="10000"
                  step="100"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#E84142]"
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                <span>100 AVAX</span>
                <span>5,000 AVAX</span>
                <span>10,000 AVAX</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="sim-buffer" className="text-xs font-semibold text-slate-300">
                  Tỷ Lệ Giữ Lại Đệm L1 (<code className="text-amber-400">{bufferRatio * 100} bps</code>)
                </label>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {bufferRatio}% L1 / {100 - bufferRatio}% C-Chain
                </span>
              </div>
              <input
                id="sim-buffer"
                type="range"
                min="0"
                max="100"
                step="5"
                value={bufferRatio}
                onChange={(e) => setBufferRatio(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                <span>0% (100% C-Chain)</span>
                <span>Khuyến nghị: 10%</span>
                <span>100% (100% L1)</span>
              </div>
            </div>
          </div>

          {/* Dual-Chain Visual Split */}
          <div className="relative pt-6 border-t border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
              {/* Box 1: Family L1 */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/30 relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="text-xs font-bold text-white tracking-wide">FAMILY L1 (CUSTOM APPCHAIN)</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300">
                    0đ Gas Fee
                  </span>
                </div>
                <div className="text-3xl font-black text-emerald-400 mb-1">
                  {l1Buffer.toLocaleString()} AVAX
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Đệm thanh khoản sẵn sàng chi trả tức thì (&lt;1s) cho các nhu cầu sinh hoạt của Ông Bà và Trẻ Em mà không cần đợi duyệt đa chữ ký.
                </p>
              </div>

              {/* Box 2: Avalanche Fuji C-Chain */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-amber-500/30 relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="text-xs font-bold text-white tracking-wide">AVALANCHE FUJI C-CHAIN</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300">
                    8.0% APY Pool
                  </span>
                </div>
                <div className="text-3xl font-black text-amber-400 mb-1">
                  {cChainYield.toLocaleString()} AVAX
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Vốn nhàn rỗi được chuyển tiếp an toàn để stake nhận lợi tức danh nghĩa ước tính:{" "}
                  <strong className="text-white">+{yearlyYieldReturn} AVAX / năm</strong>.
                </p>
              </div>
            </div>

            {/* Connecting Teleporter ICM Animated Beam */}
            <div className="mt-6 p-4 rounded-xl bg-slate-950/80 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <ArrowRightLeft className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>
                  <strong>Avalanche Teleporter (ICM):</strong> Mã hóa và đối soát thông điệp xuyên chuỗi 3 lớp bảo mật.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-16 bg-slate-800 rounded-full overflow-hidden relative">
                  <span className="absolute inset-0 bg-cyan-400 animate-pulse" />
                </span>
                <span className="text-[11px] font-mono text-cyan-400">1-2s Finality</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Avalanche Architectural Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`${styles.glassCard} p-6 rounded-2xl border border-white/10 space-y-3`}>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-[#E84142]">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Transaction Allowlist Precompile</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Kiểm soát giao dịch tại tầng đồng thuận của Subnet-EVM. Chỉ các địa chỉ thành viên trong gia đình được cấp quyền mới có thể gửi giao dịch, ngăn chặn 100% hợp đồng rút ví độc hại từ bên ngoài.
            </p>
          </div>

          <div className={`${styles.glassCard} p-6 rounded-2xl border border-white/10 space-y-3`}>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Coins className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Custom Fee Config (0đ Gas)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Family L1 được thiết lập cấu hình phí bằng 0. Trẻ em nhận thưởng việc nhà hoặc Người cao tuổi nhận tiền an sinh không cần sở hữu AVAX để trả phí mạng, xóa bỏ hoàn toàn rào cản Web3.
            </p>
          </div>

          <div className={`${styles.glassCard} p-6 rounded-2xl border border-white/10 space-y-3`}>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Network className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Teleporter Native Warp (Không Cầu Bên Thứ 3)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sử dụng chữ ký validator bản địa của Avalanche Warp Messaging. Không phụ thuộc vào các cầu nối đa chữ ký tập trung, loại bỏ rủi ro hack cầu nối phổ biến trong DeFi.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
};
