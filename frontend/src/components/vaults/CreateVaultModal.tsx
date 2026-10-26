"use client";

import React, { useState } from "react";
import { useFamily } from "@/context/FamilyContext";

interface CreateVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateVaultModal: React.FC<CreateVaultModalProps> = ({ isOpen, onClose }) => {
  const { createCustomVault, members, currentMember } = useFamily();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [ruleTemplate, setRuleTemplate] = useState<"SHIELD" | "MILESTONE" | "ROSCA" | "SHARED_GOAL">("SHIELD");
  const [vaultName, setVaultName] = useState("");
  const [vaultDescription, setVaultDescription] = useState("");
  const [bufferRatioBps, setBufferRatioBps] = useState<number>(1000); // 1000 = 10%
  const [fastWithdrawLimit, setFastWithdrawLimit] = useState<number>(50);
  const [requiredApprovals, setRequiredApprovals] = useState<number>(2);
  const [selectedGuardianWallets, setSelectedGuardianWallets] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleTemplateSelect = (tmpl: "SHIELD" | "MILESTONE" | "ROSCA" | "SHARED_GOAL") => {
    setRuleTemplate(tmpl);
    if (tmpl === "SHIELD") {
      setBufferRatioBps(1000); // 10% L1
      setFastWithdrawLimit(50);
      setRequiredApprovals(2);
      if (!vaultName) setVaultName("Quỹ Bảo Vệ An Sinh");
    } else if (tmpl === "MILESTONE") {
      setBufferRatioBps(2000); // 20% L1
      setFastWithdrawLimit(20);
      setRequiredApprovals(2);
      if (!vaultName) setVaultName("Quỹ Khen Thưởng & Cột Mốc");
    } else if (tmpl === "ROSCA") {
      setBufferRatioBps(0); // 0% L1, 100% C-Chain
      setFastWithdrawLimit(0);
      setRequiredApprovals(2);
      if (!vaultName) setVaultName("Hụi Họ Tương Trợ");
    } else if (tmpl === "SHARED_GOAL") {
      setBufferRatioBps(1500); // 15% L1
      setFastWithdrawLimit(100);
      setRequiredApprovals(2);
      if (!vaultName) setVaultName("Quỹ Mục Tiêu Chung");
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultName.trim()) return;

    setIsSubmitting(true);
    const guardians = selectedGuardianWallets.length > 0
      ? selectedGuardianWallets
      : members.filter((m) => m.role === "GUARDIAN" || m.role === "ADMIN").map((m) => m.walletAddress);

    const res = await createCustomVault({
      name: vaultName.trim(),
      description: vaultDescription.trim(),
      ruleTemplate,
      bufferRatioBps,
      fastWithdrawLimit,
      requiredApprovals,
      guardianWallets: guardians,
      beneficiaryWallets: [currentMember.walletAddress],
    });
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      alert(res.error || "Lỗi tạo Hũ tiền");
    }
  };

  const bufferPercent = bufferRatioBps / 100;
  const yieldPercent = 100 - bufferPercent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-outline-variant/30 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-surface-container/60 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">savings</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-on-surface">Tạo Hũ Tiền Mới (Dynamic Vault)</h3>
              <p className="text-xs text-on-surface-variant">
                Bước {step}/3 • Tùy biến bộ quy tắc & đệm thanh khoản liên chuỗi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* STEP 1: CHỌN RULE TEMPLATE */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/80">
              Chọn 1 trong 4 Bộ Quy Tắc Hoạt Động
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Template 0: SHIELD */}
              <div
                onClick={() => handleTemplateSelect("SHIELD")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-primary hover:shadow-md ${
                  ruleTemplate === "SHIELD"
                    ? "border-primary bg-primary/5"
                    : "border-outline-variant/20 bg-surface-container-low"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-error/10 text-error flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">shield</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary-container/15 text-secondary-container">
                    8% APY
                  </span>
                </div>
                <h4 className="text-sm font-bold text-on-surface mb-1">SHIELD (Bảo Vệ)</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Bảo vệ người già: Rút nhỏ ≤ 50 AVAX giải ngân tức thì 0 gas; Rút lớn cần đa chữ ký 2/3.
                </p>
              </div>

              {/* Template 1: MILESTONE */}
              <div
                onClick={() => handleTemplateSelect("MILESTONE")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-primary hover:shadow-md ${
                  ruleTemplate === "MILESTONE"
                    ? "border-primary bg-primary/5"
                    : "border-outline-variant/20 bg-surface-container-low"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">military_tech</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary-container/15 text-secondary-container">
                    8% APY
                  </span>
                </div>
                <h4 className="text-sm font-bold text-on-surface mb-1">MILESTONE (Cột Mốc)</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Chore-to-Earn: Gốc gửi C-Chain sinh lời; mở thưởng tự động khi người bảo hộ duyệt bài.
                </p>
              </div>

              {/* Template 2: ROSCA */}
              <div
                onClick={() => handleTemplateSelect("ROSCA")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-primary hover:shadow-md ${
                  ruleTemplate === "ROSCA"
                    ? "border-primary bg-primary/5"
                    : "border-outline-variant/20 bg-surface-container-low"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">cached</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700">
                    100% Sinh Lãi
                  </span>
                </div>
                <h4 className="text-sm font-bold text-on-surface mb-1">ROSCA (Hụi Xoay Vòng)</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Góp vốn định kỳ: Vốn gom đẩy 100% sang Fuji C-Chain, đến kỳ giải ngân gốc và chia đều lãi.
                </p>
              </div>

              {/* Template 3: SHARED_GOAL */}
              <div
                onClick={() => handleTemplateSelect("SHARED_GOAL")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-primary hover:shadow-md ${
                  ruleTemplate === "SHARED_GOAL"
                    ? "border-primary bg-primary/5"
                    : "border-outline-variant/20 bg-surface-container-low"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">flag</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary-container/15 text-secondary-container">
                    8% APY
                  </span>
                </div>
                <h4 className="text-sm font-bold text-on-surface mb-1">SHARED_GOAL (Mục Tiêu)</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Góp tiền du lịch / mua sắm chung: Sinh lãi liên tục đến khi đạt target và đủ chữ ký giải ngân.
                </p>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
              >
                Tiếp tục (Bước 2) →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: TÙY CHỈNH TỶ LỆ ĐỆM L1 / C-CHAIN */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/80 mb-1">
                Tỷ Lệ Đệm Thanh Khoản Liên Chuỗi (Buffer Ratio)
              </div>
              <p className="text-xs text-on-surface-variant">
                Cơ chế chia vốn tự động: Một phần giữ tại Family L1 để rút tức thì 0 gas, phần còn lại chuyển tiếp sang Avalanche Fuji C-Chain tích lũy 8% APY DeFi.
              </p>
            </div>

            {/* Slider */}
            <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/20 space-y-4">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-primary flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                  Đệm L1 (Rút Tức Thì): {bufferPercent}%
                </span>
                <span className="text-secondary-container flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">trending_up</span>
                  DeFi C-Chain (8% APY): {yieldPercent}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={bufferPercent}
                onChange={(e) => setBufferRatioBps(Number(e.target.value) * 100)}
                className="w-full h-2.5 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
              />

              {/* Visual Split Bar */}
              <div className="h-4 w-full bg-surface-container rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${bufferPercent}%` }}
                  className="bg-primary transition-all duration-300 flex items-center justify-center text-[9px] font-bold text-white"
                  title={`Đệm L1: ${bufferPercent}%`}
                >
                  {bufferPercent > 5 && `${bufferPercent}%`}
                </div>
                <div
                  style={{ width: `${yieldPercent}%` }}
                  className="bg-secondary-container transition-all duration-300 flex items-center justify-center text-[9px] font-bold text-white"
                  title={`Sinh lời C-Chain: ${yieldPercent}%`}
                >
                  {yieldPercent}% Fuji C-Chain
                </div>
              </div>

              <div className="text-[11px] text-on-surface-variant bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/15 flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">info</span>
                <span>
                  Ví dụ: Khi nạp 100 AVAX, hệ thống sẽ tự động chuyển <strong>{bufferPercent} AVAX</strong> vào đệm Family L1 phục vụ chi tiêu tức thì, và <strong>{yieldPercent} AVAX</strong> sang C-Chain tạo lợi nhuận ~{(yieldPercent * 0.08).toFixed(2)} AVAX/năm.
                </span>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-all cursor-pointer"
              >
                ← Quay lại
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
              >
                Tiếp tục (Bước 3) →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: THIẾT LẬP THUỘC TÍNH & BẢO MẬT */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1">
                Tên Hũ Tiền
              </label>
              <input
                type="text"
                value={vaultName}
                onChange={(e) => setVaultName(e.target.value)}
                placeholder="Vd: Quỹ Hưu Trí Ông Bà, Quỹ Đi Phượt..."
                className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs sm:text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1">
                Mô Tả Mục Đích
              </label>
              <textarea
                value={vaultDescription}
                onChange={(e) => setVaultDescription(e.target.value)}
                placeholder="Ghi chú mục đích sử dụng và lưu ý cho các thành viên..."
                rows={2}
                className="w-full px-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">
                  Hạn Mức Rút Nhanh (AVAX)
                </label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={fastWithdrawLimit}
                  onChange={(e) => setFastWithdrawLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs sm:text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <span className="text-[10px] text-on-surface-variant">Rút ≤ số này giải ngân tức thì 0 gas</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant mb-1">
                  Chữ Ký Phê Duyệt (Multisig)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={requiredApprovals}
                  onChange={(e) => setRequiredApprovals(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs sm:text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <span className="text-[10px] text-on-surface-variant">Số chữ ký cần để rút khoản lớn</span>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-surface-container/60">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-all cursor-pointer"
              >
                ← Quay lại
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !vaultName.trim()}
                className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-xs font-bold text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Đang tạo Hũ..." : "Xác nhận tạo Hũ"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
