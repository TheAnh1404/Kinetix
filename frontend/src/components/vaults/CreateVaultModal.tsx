"use client";

import React, { useEffect, useState } from "react";
import { useFamily } from "@/context/FamilyContext";
import { isAddress } from "viem";

interface CreateVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateVaultModal: React.FC<CreateVaultModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { createCustomVault, members, currentMember } = useFamily();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [ruleTemplate, setRuleTemplate] = useState<
    "SHIELD" | "MILESTONE" | "ROSCA" | "SHARED_GOAL"
  >("SHIELD");
  const [vaultName, setVaultName] = useState("");
  const [vaultDescription, setVaultDescription] = useState("");
  const [bufferRatioBps, setBufferRatioBps] = useState<number>(10000); // 1000 = 10%
  const [fastWithdrawLimit, setFastWithdrawLimit] = useState<string>("0.01");
  const [requiredApprovals, setRequiredApprovals] = useState<number>(1);
  const [selectedGuardianWallets, setSelectedGuardianWallets] = useState<
    string[]
  >([]);
  const [selectedBeneficiaryWallets, setSelectedBeneficiaryWallets] = useState<
    string[]
  >([]);
  // Thuộc tính chuyên biệt theo quy tắc ROSCA & SHARED_GOAL
  const [targetGoalAmount, setTargetGoalAmount] = useState<string>("1");
  const [targetDeadline, setTargetDeadline] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [roscaRoundDuration, setRoscaRoundDuration] = useState<number>(
    7 * 24 * 3600,
  ); // 7 ngày
  const [roscaRoundContribution, setRoscaRoundContribution] =
    useState<string>("0.01"); // 10 AVAX
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedGuardianWallets(
        isAddress(currentMember.walletAddress)
          ? [currentMember.walletAddress]
          : [],
      );
      setSelectedBeneficiaryWallets([]);
    }
  }, [isOpen, currentMember.id]);
  if (!isOpen) return null;

  const handleTemplateSelect = (
    tmpl: "SHIELD" | "MILESTONE" | "ROSCA" | "SHARED_GOAL",
  ) => {
    setRuleTemplate(tmpl);
    if (tmpl === "SHIELD") {
      setBufferRatioBps(10000);
      setFastWithdrawLimit("0.01");
      setRequiredApprovals(1);
      if (!vaultName) setVaultName("Quỹ Bảo Vệ An Sinh");
    } else if (tmpl === "MILESTONE") {
      setBufferRatioBps(10000);
      setFastWithdrawLimit("0");
      setRequiredApprovals(1);
      if (!vaultName) setVaultName("Quỹ Khen Thưởng & Cột Mốc");
    } else if (tmpl === "ROSCA") {
      setBufferRatioBps(10000);
      setFastWithdrawLimit("0");
      setRequiredApprovals(1);
      if (!vaultName) setVaultName("Hụi Họ Tương Trợ");
    } else if (tmpl === "SHARED_GOAL") {
      setBufferRatioBps(10000);
      setFastWithdrawLimit("0");
      setRequiredApprovals(1);
      if (!vaultName) setVaultName("Quỹ Mục Tiêu Chung");
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultName.trim()) return;

    setIsSubmitting(true);
    const guardians = selectedGuardianWallets;
    if (
      guardians.length < requiredApprovals ||
      selectedBeneficiaryWallets.length === 0
    ) {
      setIsSubmitting(false);
      return;
    }

    const res = await createCustomVault({
      name: vaultName.trim(),
      description: vaultDescription.trim(),
      ruleTemplate,
      bufferRatioBps,
      fastWithdrawLimit: ruleTemplate === "SHIELD" ? fastWithdrawLimit : "0",
      requiredApprovals,
      guardianWallets: guardians,
      beneficiaryWallets: selectedBeneficiaryWallets,
      targetGoalAmount: ruleTemplate === "SHARED_GOAL" ? targetGoalAmount : "0",
      targetDeadline:
        ruleTemplate === "SHARED_GOAL" ? targetDeadline : undefined,
      roscaRoundDuration: ruleTemplate === "ROSCA" ? roscaRoundDuration : 0,
      roscaRoundContribution:
        ruleTemplate === "ROSCA" ? roscaRoundContribution : "0",
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
              <span className="material-symbols-outlined text-[24px]">
                savings
              </span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-on-surface">
                Tạo Hũ Tiền Mới (Dynamic Vault)
              </h3>
              <p className="text-xs text-on-surface-variant">
                Bước {step}/3 • Cấu hình hũ AVAX trên Fuji
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
                    <span className="material-symbols-outlined text-[20px]">
                      shield
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary-container/15 text-secondary-container">
                    T1 Fuji
                  </span>
                </div>
                <h4 className="text-sm font-bold text-on-surface mb-1">
                  SHIELD (Bảo Vệ)
                </h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Rút nhanh theo hạn mức đã chọn; mỗi ngày tối đa hai lần hạn
                  mức. Khoản lớn cần quorum của hũ.
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
                    <span className="material-symbols-outlined text-[20px]">
                      military_tech
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary-container/15 text-secondary-container">
                    T1 Fuji
                  </span>
                </div>
                <h4 className="text-sm font-bold text-on-surface mb-1">
                  MILESTONE (Cột Mốc)
                </h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Giữ chỗ tiền thưởng; đủ số Guardian đã cấu hình xác nhận mới
                  chi trả.
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
                    <span className="material-symbols-outlined text-[20px]">
                      cached
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700">
                    Góp đủ kỳ
                  </span>
                </div>
                <h4 className="text-sm font-bold text-on-surface mb-1">
                  ROSCA (Hụi Xoay Vòng)
                </h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Góp vốn định kỳ: tiền giữ trên Fuji; đủ khoản của mọi thành
                  viên và đến kỳ giải ngân gốc và chia đều lãi.
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
                    <span className="material-symbols-outlined text-[20px]">
                      flag
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary-container/15 text-secondary-container">
                    T1 Fuji
                  </span>
                </div>
                <h4 className="text-sm font-bold text-on-surface mb-1">
                  SHARED_GOAL (Mục Tiêu)
                </h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Góp tiền du lịch / mua sắm chung: Sinh lãi liên tục đến khi
                  đạt target và đủ chữ ký giải ngân.
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
            <div className="p-5 rounded-2xl bg-slate-50 border space-y-3">
              <h4 className="font-bold">
                T1 Fuji · 100% tài sản trên cùng chain
              </h4>
              <p>
                Tiền nạp nằm tại kho Cashflow, được chi theo quy tắc của hũ.
                Core hiển thị phí mạng trước khi ký.
              </p>
              <p>
                Chưa bật bridge, ERC20 hoặc lợi suất. Hạn mức và quorum được
                khóa lúc tạo.
              </p>
              <p>
                ROSCA kết thúc sau một chu kỳ thành viên. Kỳ thiếu khoản tiếp
                tục chờ; T1 không có hoàn tiền tự động.
              </p>
              <p>
                SHARED_GOAL hết hạn có thể tạo yêu cầu quyết toán cần đủ
                Guardian; không tự hoàn tiền theo người góp.
              </p>
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
                  type="text"
                  min="0"
                  disabled={ruleTemplate !== "SHIELD"}
                  inputMode="decimal"
                  step="any"
                  value={fastWithdrawLimit}
                  onChange={(e) => setFastWithdrawLimit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs sm:text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <span className="text-[10px] text-on-surface-variant">
                  Chỉ SHIELD. Hạn mức ngày = 2 × hạn mức mỗi lần.
                </span>
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
                <span className="text-[10px] text-on-surface-variant">
                  Số chữ ký cần để rút khoản lớn
                </span>
              </div>
            </div>

            <fieldset className="rounded-2xl border border-outline-variant/30 p-4 space-y-3">
              <legend className="px-2 text-xs font-bold">
                Người ký duyệt · ví đã xác minh
              </legend>
              {members
                .filter(
                  (member) =>
                    ["ADMIN", "GUARDIAN"].includes(member.role) &&
                    isAddress(member.walletAddress),
                )
                .map((member) => (
                  <label
                    key={member.id}
                    className="flex items-center gap-3 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGuardianWallets.includes(
                        member.walletAddress,
                      )}
                      onChange={(event) =>
                        setSelectedGuardianWallets((current) =>
                          event.target.checked
                            ? [...current, member.walletAddress]
                            : current.filter(
                                (address) => address !== member.walletAddress,
                              ),
                        )
                      }
                    />
                    {member.name}
                  </label>
                ))}
              {selectedGuardianWallets.length < requiredApprovals && (
                <p className="text-xs text-red-600">
                  Chọn ít nhất {requiredApprovals} người ký duyệt hoặc giảm
                  ngưỡng chữ ký.
                </p>
              )}
            </fieldset>
            <fieldset className="rounded-2xl border border-outline-variant/30 p-4 space-y-3">
              <legend className="px-2 text-xs font-bold">
                Người thụ hưởng · ví đã xác minh
              </legend>
              {members
                .filter((member) => isAddress(member.walletAddress))
                .map((member) => (
                  <label
                    key={member.id}
                    className="flex items-center gap-3 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBeneficiaryWallets.includes(
                        member.walletAddress,
                      )}
                      onChange={(event) =>
                        setSelectedBeneficiaryWallets((current) =>
                          event.target.checked
                            ? [...current, member.walletAddress]
                            : current.filter(
                                (address) => address !== member.walletAddress,
                              ),
                        )
                      }
                    />
                    {member.name}
                  </label>
                ))}
              {!selectedBeneficiaryWallets.length && (
                <p className="text-xs text-amber-700">
                  Chọn người thụ hưởng. Thành viên chưa liên kết Core cần hoàn
                  tất kích hoạt trước.
                </p>
              )}
            </fieldset>

            {/* Cấu hình đặc thù cho ROSCA */}
            {ruleTemplate === "ROSCA" && (
              <div className="p-3.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <span className="material-symbols-outlined text-[18px]">
                    cached
                  </span>
                  <span>Cấu Hình Kỳ Hụi Xoay Vòng (ROSCA Policy)</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                      Chu Kỳ Mỗi Kỳ
                    </label>
                    <select
                      value={roscaRoundDuration}
                      onChange={(e) =>
                        setRoscaRoundDuration(Number(e.target.value))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-xs text-on-surface focus:outline-none"
                    >
                      <option value={7 * 86400}>7 ngày (1 tuần)</option>
                      <option value={14 * 86400}>14 ngày (2 tuần)</option>
                      <option value={30 * 86400}>30 ngày (1 tháng)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                      Đóng Góp Mỗi Kỳ (AVAX)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={roscaRoundContribution}
                      onChange={(e) =>
                        setRoscaRoundContribution(e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-xs font-mono text-on-surface focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Cấu hình đặc thù cho SHARED_GOAL */}
            {ruleTemplate === "SHARED_GOAL" && (
              <div className="p-3.5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 space-y-3">
                <div className="flex items-center gap-2 text-indigo-800 font-bold text-xs">
                  <span className="material-symbols-outlined text-[18px]">
                    flag
                  </span>
                  <span>Mục Tiêu Quỹ Chung (Shared Goal Policy)</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                      Mục Tiêu Cần Gom (AVAX)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={targetGoalAmount}
                      onChange={(e) => setTargetGoalAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-xs font-mono text-on-surface focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant mb-1">
                      Hạn Chót Mục Tiêu
                    </label>
                    <input
                      type="date"
                      value={targetDeadline}
                      onChange={(e) => setTargetDeadline(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-xs text-on-surface focus:outline-none"
                      required
                    />
                  </div>
                </div>
                <span className="text-[10px] text-on-surface-variant block">
                  * Hũ sẽ tự động khóa giải ngân cho tới khi gom đủ số tiền mục
                  tiêu hoặc quá hạn chót.
                </span>
              </div>
            )}

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
                disabled={
                  isSubmitting ||
                  !vaultName.trim() ||
                  selectedGuardianWallets.length < requiredApprovals ||
                  selectedBeneficiaryWallets.length === 0
                }
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
