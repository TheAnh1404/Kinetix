"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Zap,
  TrendingUp,
  Users,
  Target,
  Trophy,
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  Sparkles,
  Info,
  Lock,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useFamily } from "@/context/FamilyContext";
import {
  getWorkspacePreset,
  DefaultVaultTemplate,
  WorkspaceType,
} from "@/config/workspacePresets";
import { VaultRule } from "../../../../shared/vaultCreation";

export interface CreateVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNext?: (vault: any, action: "deposit" | "chore") => void;
  onManage?: (draftId: string) => void;
  initialDraftId?: string;
}

/**
 * 3 Preset phân bổ thanh khoản chuẩn
 */
const BUFFER_PRESETS = [
  { label: "Chi tiêu liên tục", l1: 30, cchain: 70, desc: "Thanh khoản cao" },
  { label: "Cân bằng (Khuyến nghị)", l1: 10, cchain: 90, desc: "Chi tiêu & Sinh lời" },
  { label: "Tích lũy tối đa", l1: 0, cchain: 100, desc: "Tối ưu 100% lãi 8%" },
];

/**
 * Kinetix CreateVaultModal
 * 
 * Chuẩn mực Editorial Fintech & Anti-AI Slop:
 * - Nền Slate-50 (#F8FAFC) sáng sắc nét, Thẻ trắng tinh (#FFFFFF), Viền chuẩn 1px border-slate-200/90.
 * - Mobile-first: Dạng Bottom Sheet Drawer trượt mượt từ cạnh dưới trên điện thoại, Centered Modal trên máy tính.
 * - Số liệu tiền tệ tabular-nums thẳng hàng.
 * - 4 Bước trực quan hóa 100%:
 *   1. Chọn Mục Đích (ưu tiên theo loại Không Gian đang mở)
 *   2. Tên Hũ & Mục Tiêu / Hạn Mức
 *   3. Thanh Kéo Phân Bổ Đệm L1 & Sinh Lời C-Chain + Hộp Tính Nhẩm Dòng Tiền Trực Quan
 *   4. Chốt Chặn Bảo Vệ Đa Chữ Ký (M/N Chữ Ký & Hạn Mức Rút Nhanh)
 */
export function CreateVaultModal({
  isOpen,
  onClose,
  onNext,
}: CreateVaultModalProps) {
  const { currentWorkspace, members, createCustomVault } = useFamily();
  const workspaceType = (currentWorkspace?.type || "FAMILY") as WorkspaceType;
  const currentPreset = useMemo(() => getWorkspacePreset(workspaceType), [workspaceType]);

  // Bước hiện tại trong Wizard (1 đến 4)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states
  const [selectedTemplate, setSelectedTemplate] = useState<DefaultVaultTemplate | null>(null);
  const [ruleTemplate, setRuleTemplate] = useState<VaultRule>("SHIELD");
  const [vaultName, setVaultName] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("500");
  const [fastWithdrawLimit, setFastWithdrawLimit] = useState("50");
  const [bufferPercent, setBufferPercent] = useState<number>(10); // 10% L1 mặc định
  const [requiredApprovals, setRequiredApprovals] = useState<number>(2);
  const [selectedGuardianIds, setSelectedGuardianIds] = useState<string[]>([]);

  // Processing states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successVault, setSuccessVault] = useState<any | null>(null);

  // Khởi tạo các giá trị mẫu theo preset khi mở modal
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setErrorMessage(null);
      setSuccessVault(null);
      setIsSubmitting(false);

      const defaultTpl = currentPreset.defaultVaultTemplates[0];
      if (defaultTpl) {
        setSelectedTemplate(defaultTpl);
        setRuleTemplate(defaultTpl.ruleTemplate);
        setVaultName(defaultTpl.name);
        setDescription(defaultTpl.description);
        setBufferPercent(defaultTpl.bufferRatioBps / 100);
        setFastWithdrawLimit(String(defaultTpl.fastWithdrawLimit || 50));
        setRequiredApprovals(defaultTpl.requiredApprovals || 2);
        setTargetAmount(String(defaultTpl.targetGoalAmount || defaultTpl.roscaRoundContribution || 500));
      }

      // Mặc định chọn các Guardians hiện có
      const defaultGuardians = members
        .filter((m) => m.role === "ADMIN" || m.role === "GUARDIAN")
        .map((m) => m.id);
      setSelectedGuardianIds(defaultGuardians.length > 0 ? defaultGuardians : members.slice(0, 2).map((m) => m.id));
    }
  }, [isOpen, currentPreset, members]);

  // Phím ESC đóng modal an toàn
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  // Tính toán tỷ lệ C-Chain và lợi tức ước tính dựa trên 1,000 USDC
  const cchainPercent = 100 - bufferPercent;
  const sim1000Buffer = (1000 * (bufferPercent / 100)).toFixed(0);
  const sim1000Cchain = (1000 * (cchainPercent / 100)).toFixed(0);
  const sim1000YieldYear = (1000 * (cchainPercent / 100) * 0.08).toFixed(1);
  const effectiveApy = (cchainPercent * 0.08).toFixed(1);

  // Danh sách Guardians tiềm năng
  const availableGuardians = members.filter(
    (m) => m.role === "ADMIN" || m.role === "GUARDIAN" || m.role === "ELDERLY",
  );

  // Chọn template mẫu
  const handleSelectTemplate = (tpl: DefaultVaultTemplate) => {
    setSelectedTemplate(tpl);
    setRuleTemplate(tpl.ruleTemplate);
    setVaultName(tpl.name);
    setDescription(tpl.description);
    setBufferPercent(tpl.bufferRatioBps / 100);
    setFastWithdrawLimit(String(tpl.fastWithdrawLimit || 50));
    setRequiredApprovals(tpl.requiredApprovals || 2);
    if (tpl.targetGoalAmount) setTargetAmount(String(tpl.targetGoalAmount));
    if (tpl.roscaRoundContribution) setTargetAmount(String(tpl.roscaRoundContribution));
  };

  const toggleGuardianSelection = (id: string) => {
    setSelectedGuardianIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Submit tạo Hũ Tiền
  const handleCreateVault = async () => {
    if (!vaultName.trim()) {
      setErrorMessage("Vui lòng nhập tên Hũ tiền.");
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const bufferRatioBps = Math.round(bufferPercent * 100);
      const guardianWallets = members
        .filter((m) => selectedGuardianIds.includes(m.id))
        .map((m) => m.walletAddress || m.address)
        .filter(Boolean);

      const beneficiaryWallets = members
        .filter((m) => m.role === "CHILD" || m.role === "ELDERLY")
        .map((m) => m.walletAddress || m.address)
        .filter(Boolean);

      const result = await createCustomVault({
        name: vaultName.trim(),
        bufferRatioBps,
        ruleTemplate,
        guardianWallets: guardianWallets.length > 0 ? guardianWallets : [members[0]?.walletAddress || "0x0000000000000000000000000000000000000000"],
        beneficiaryWallets: beneficiaryWallets.length > 0 ? beneficiaryWallets : [members[0]?.walletAddress || "0x0000000000000000000000000000000000000000"],
        requiredApprovals: Math.min(requiredApprovals, Math.max(1, guardianWallets.length)),
        fastWithdrawLimit: fastWithdrawLimit || "50",
        targetGoalAmount: targetAmount || "500",
        targetDeadline: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
        roscaRoundDuration: "2592000",
        roscaRoundContribution: targetAmount || "250",
        draftId: `vault-draft-${Date.now()}`,
      });

      if (result.success && result.vault) {
        setSuccessVault(result.vault);
      } else if (result.success) {
        // Fallback hiển thị thành công
        setSuccessVault({
          name: vaultName.trim(),
          ruleTemplate,
          bufferRatioBps,
        });
      } else {
        setErrorMessage(result.error || "Không thể khởi tạo Hũ tiền. Vui lòng thử lại.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Đã xảy ra lỗi trong quá trình khởi tạo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-vault-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
    >
      <div
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-xl flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
                {currentPreset.titleVi} • Hũ Tiền Động
              </div>
              <h2
                id="create-vault-title"
                className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-tight"
              >
                Khởi Tạo Hũ Tiền Mới
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 flex items-center justify-center transition-colors disabled:opacity-50"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4-Step Indicator Bar */}
        <div className="px-5 py-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center justify-between text-xs">
            {[
              { num: 1, title: "1. Mục đích" },
              { num: 2, title: "2. Tên & Hạn mức" },
              { num: 3, title: "3. Tỷ lệ đệm L1" },
              { num: 4, title: "4. Chốt bảo vệ" },
            ].map((s) => {
              const isActive = step === s.num;
              const isDone = step > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => !isSubmitting && s.num < step && setStep(s.num as any)}
                  className={`flex items-center gap-1.5 font-medium transition-colors ${
                    isActive
                      ? "text-[#E84142] font-semibold"
                      : isDone
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-400"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive
                        ? "bg-[#E84142] text-white"
                        : isDone
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                    }`}
                  >
                    {isDone ? "✓" : s.num}
                  </span>
                  <span className="hidden sm:inline text-[11px]">{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Màn hình thành công */}
          {successVault ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Đã Khởi Tạo Hũ Thành Công!
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Hũ <strong className="text-slate-800 dark:text-slate-200">"{vaultName}"</strong> đã sẵn sàng hoạt động với tỷ lệ đệm {bufferPercent}% L1 và {cchainPercent}% gửi sinh lời C-Chain.
                </p>
              </div>

              <div className="pt-4 flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    if (onNext) onNext(successVault, "deposit");
                    onClose();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#E84142] hover:bg-[#d63839] text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  Nạp Tiền Vào Hũ Ngay
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* BƯỚC 1: CHỌN MỤC ĐÍCH */}
              {step === 1 && (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Bước 1: Chọn mẫu hũ phù hợp cho {currentPreset.titleVi}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Các mẫu bên dưới đã được tối ưu hóa cấu hình quy tắc và tỷ lệ sinh lời cho nhóm của bạn.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {currentPreset.defaultVaultTemplates.map((tpl, idx) => {
                      const isSelected = selectedTemplate?.name === tpl.name;
                      return (
                        <div
                          key={idx}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSelectTemplate(tpl)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleSelectTemplate(tpl);
                            }
                          }}
                          className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                            isSelected
                              ? "border-[#E84142] bg-red-50/20 dark:bg-red-950/20 shadow-sm ring-1 ring-[#E84142]/30"
                              : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-xl mb-1">{tpl.icon}</span>
                            {isSelected && (
                              <span className="w-4 h-4 rounded-full bg-[#E84142] text-white flex items-center justify-center text-[10px]">
                                ✓
                              </span>
                            )}
                          </div>
                          <div className="font-semibold text-xs text-slate-900 dark:text-white mt-1">
                            {tpl.name}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                            {tpl.description}
                          </div>
                          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-mono">
                            <span className="text-sky-600 dark:text-sky-400">
                              {tpl.bufferRatioBps / 100}% L1 Rút 0đ
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              +8% APY
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* BƯỚC 2: TÊN & HẠN MỨC */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Bước 2: Đặt tên và định mức tài chính
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Đặt tên dễ nhớ cho các thành viên và xác định hạn mức hoặc mục tiêu hũ.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Tên Hũ Tiền <span className="text-[#E84142]">*</span>
                      </label>
                      <input
                        type="text"
                        value={vaultName}
                        onChange={(e) => setVaultName(e.target.value)}
                        placeholder="Ví dụ: Quỹ Khẩn Cấp Bố Mẹ..."
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#E84142] transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Mục tiêu quỹ / Hạn mức dự kiến (USDC)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={targetAmount}
                          onChange={(e) => setTargetAmount(e.target.value)}
                          placeholder="500"
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono tabular-nums focus:outline-none focus:border-[#E84142] transition-colors"
                        />
                        <span className="absolute right-3.5 top-2.5 text-xs font-semibold text-slate-400 font-mono">
                          USDC
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Định mức để theo dõi tiến độ hoàn thành hoặc giới hạn chi tiêu an toàn.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Ghi chú mục đích (Tùy chọn)
                      </label>
                      <textarea
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Mô tả ngắn gọn mục đích chi tiêu hoặc quy ước nhóm..."
                        className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200/90 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[#E84142] transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* BƯỚC 3: PHÂN BỔ ĐỆM L1 VÀ SINH LỜI C-CHAIN (ĐIỂM NHẤN UX) */}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Bước 3: Phân bổ đệm rút nhanh & Lợi nhuận
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Công nghệ Lõi Kinetix: Tự động phân chia tiền nạp giữa Family L1 (0đ gas) và Fuji C-Chain (lãi 8%/năm).
                    </p>
                  </div>

                  {/* 3 Nút chọn nhanh Presets */}
                  <div className="grid grid-cols-3 gap-2">
                    {BUFFER_PRESETS.map((p, idx) => {
                      const isSelected = bufferPercent === p.l1;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setBufferPercent(p.l1)}
                          className={`p-2.5 rounded-xl border text-center transition-all ${
                            isSelected
                              ? "border-[#E84142] bg-red-50/20 dark:bg-red-950/20 text-[#E84142] font-semibold ring-1 ring-[#E84142]/30"
                              : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                          }`}
                        >
                          <div className="text-[11px] font-semibold truncate leading-tight">
                            {p.label}
                          </div>
                          <div className="text-[10px] font-mono tabular-nums text-slate-500 mt-1">
                            {p.l1}% / {p.cchain}%
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Thanh ngang 2 màu trực quan */}
                  <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                        <Zap className="w-3.5 h-3.5" />
                        <span>Đệm Rút Nhanh L1: {bufferPercent}% (0đ gas)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Sinh Lời C-Chain: {cchainPercent}% (+8% APY)</span>
                      </div>
                    </div>

                    {/* Dual-color bar */}
                    <div className="h-6 w-full bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden flex p-0.5">
                      <div
                        style={{ width: `${Math.max(5, bufferPercent)}%` }}
                        className="h-full bg-sky-500 rounded-l-lg transition-all duration-200 flex items-center justify-center text-[10px] font-bold text-white font-mono tabular-nums"
                      >
                        {bufferPercent >= 10 && `${bufferPercent}%`}
                      </div>
                      <div
                        style={{ width: `${Math.max(5, cchainPercent)}%` }}
                        className="h-full bg-emerald-500 rounded-r-lg transition-all duration-200 flex items-center justify-center text-[10px] font-bold text-white font-mono tabular-nums"
                      >
                        {cchainPercent >= 10 && `${cchainPercent}%`}
                      </div>
                    </div>

                    {/* Thanh kéo Slider */}
                    <div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={bufferPercent}
                        onChange={(e) => setBufferPercent(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#E84142]"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                        <span>0% (100% Sinh lời)</span>
                        <span>50%</span>
                        <span>100% (100% Rút nhanh)</span>
                      </div>
                    </div>

                    {/* Hộp tính nhẩm trực tiếp dòng tiền */}
                    <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 space-y-1">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Diễn giải trực quan dòng tiền (Ví dụ nạp 1,000 USDC):</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                        💡 Với mỗi <strong className="font-mono tabular-nums text-slate-800 dark:text-slate-200">1,000 USDC</strong> nạp vào:{" "}
                        <strong className="text-sky-600 dark:text-sky-400 font-mono tabular-nums">{sim1000Buffer} USDC</strong> luôn sẵn sàng rút trong 1 giây (0đ phí);{" "}
                        <strong className="text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">{sim1000Cchain} USDC</strong> tự động chuyển qua Avalanche ICM sang C-Chain sinh lời{" "}
                        <strong className="text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">~{sim1000YieldYear} USDC/năm</strong> (Lợi suất thực tế: <span className="font-mono">{effectiveApy}% APY</span>).
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* BƯỚC 4: CHỐT CHẶN BẢO VỆ ĐA CHỮ KÝ */}
              {step === 4 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Bước 4: Chốt chặn an toàn đa chữ ký
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Cơ chế bảo vệ: Khoản chi nhỏ rút tức thì 0 gas; khoản chi lớn cần đủ số người duyệt ký xác nhận on-chain.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* Hạn mức rút nhanh */}
                    <div className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>Hạn mức rút nhanh tức thì (Không cần hỏi ý kiến)</span>
                        </label>
                        <span className="text-xs font-bold font-mono tabular-nums text-[#E84142]">
                          ≤ {fastWithdrawLimit} USDC
                        </span>
                      </div>
                      <input
                        type="number"
                        value={fastWithdrawLimit}
                        onChange={(e) => setFastWithdrawLimit(e.target.value)}
                        placeholder="50"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono tabular-nums focus:outline-none focus:border-[#E84142]"
                      />
                      <p className="text-[11px] text-slate-500">
                        Các khoản chi từ <strong className="font-mono tabular-nums text-slate-700 dark:text-slate-300">{fastWithdrawLimit} USDC</strong> trở xuống được giải ngân ngay lập tức từ đệm L1 (0đ gas fee).
                      </p>
                    </div>

                    {/* Ngưỡng chữ ký M/N */}
                    <div className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Số chữ ký duyệt khoản chi lớn (M/N Multisig)</span>
                        </label>
                        <span className="text-xs font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                          {requiredApprovals} / {Math.max(requiredApprovals, selectedGuardianIds.length || 1)} người duyệt
                        </span>
                      </div>

                      <div className="flex gap-2">
                        {[1, 2, 3].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setRequiredApprovals(num)}
                            className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold font-mono tabular-nums transition-colors ${
                              requiredApprovals === num
                                ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                                : "border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {num} chữ ký
                          </button>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                          Chọn thành viên giữ khóa duyệt chi:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {availableGuardians.map((m) => {
                            const isSelected = selectedGuardianIds.includes(m.id);
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => toggleGuardianSelection(m.id)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border flex items-center gap-1 transition-colors ${
                                  isSelected
                                    ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900"
                                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                {isSelected ? "✓" : "+"} {m.name} ({m.title || m.role})
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Actions Bar */}
        {!successVault && (
          <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 flex items-center justify-between gap-3 shrink-0">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((step - 1) as any)}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium transition-colors disabled:opacity-50"
              >
                Hủy bỏ
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 2 && !vaultName.trim()) {
                    setErrorMessage("Vui lòng nhập tên hũ tiền.");
                    return;
                  }
                  setErrorMessage(null);
                  setStep((step + 1) as any);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#E84142] hover:bg-[#d63839] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <span>Tiếp theo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreateVault}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#E84142] hover:bg-[#d63839] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang khởi tạo on-chain...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Tạo Hũ Tiền Ngay</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CreateVaultModal;
