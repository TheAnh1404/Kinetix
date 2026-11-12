"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { parseEther, formatEther, isAddress } from "viem";
import { useFamily } from "@/context/FamilyContext";
import { authRequest, useAuth } from "@/hooks/useAuth";
import {
  RuleTemplate,
  VaultRuleType,
  VAULT_TEMPLATES,
  getVaultTemplate,
  calculateProjectedYield,
  bpsToPercent,
  percentToBps,
  ruleIdToEnum,
  enumToRuleId,
  ProjectedYieldResult,
  VaultTemplateDefinition,
  calculateEffectiveApy,
  simulateVaultYield,
  getMultisigRecommendations,
} from "@/lib/vaultTemplates";
import {
  CreationPhase,
  ResolvedVaultConfig,
  validateVaultForm,
} from "../../../shared/vaultCreation";

export type TransactionStep =
  | "idle"
  | "validating"
  | "awaiting_wallet"
  | "broadcasting"
  | "confirming"
  | "success"
  | "error";

export type StepNumber = 1 | 2 | 3 | 4;

export interface VaultDraftForm {
  ruleTemplate: VaultRuleType;
  name: string;
  description: string;
  bufferRatioBps: number;
  fastWithdrawLimit: string;
  requiredApprovals: number;
  guardianIds: string[];
  beneficiaryIds: string[];
  targetGoalAmount: string;
  targetDeadline: string;
  roscaRoundDuration: string;
  roscaRoundContribution: string;
  policyAccepted: boolean;
}

export interface MemberCandidate {
  id: string;
  fullName: string;
  role: string;
  address: string | null;
  linked: boolean;
  permission: string;
  reason?: string;
  canGuard: boolean;
}

export interface UseCreateVaultStateOptions {
  isOpen?: boolean;
  initialDraftId?: string;
  onSuccess?: (vault: any) => void;
  onError?: (error: string) => void;
}

export interface UseCreateVaultStateReturn {
  // Step progression
  step: StepNumber;
  setStep: (step: StepNumber) => void;
  nextStep: () => boolean;
  prevStep: () => void;
  goToStep: (step: StepNumber) => boolean;
  canProceed: boolean;

  // Form State & Current Template
  form: VaultDraftForm;
  template: VaultTemplateDefinition;

  // Field Setters & Actions
  selectTemplate: (templateId: VaultRuleType) => void;
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setBufferRatioBps: (bps: number) => void;
  setBufferPercent: (percent: number) => void;
  setFastWithdrawLimit: (limit: string) => void;
  setRequiredApprovals: (count: number) => void;
  toggleGuardian: (memberId: string) => void;
  toggleBeneficiary: (memberId: string) => void;
  setGuardians: (ids: string[]) => void;
  setBeneficiaries: (ids: string[]) => void;
  selectAllBeneficiaries: () => void;
  setTargetGoalAmount: (amount: string) => void;
  setTargetDeadline: (deadline: string) => void;
  setRoscaRoundDuration: (seconds: string) => void;
  setRoscaRoundContribution: (amount: string) => void;
  setPolicyAccepted: (accepted: boolean) => void;
  resetForm: () => void;

  // Real-time Dual-Chain Yield & APY
  bufferPercent: number;
  cchainPercent: number;
  effectiveApy: number;
  simulationPrincipal: number;
  setSimulationPrincipal: (val: number) => void;
  projectedYield: ProjectedYieldResult;

  // Candidates & Governance Context
  candidates: MemberCandidate[];
  selectedGuardians: MemberCandidate[];
  selectedBeneficiaries: MemberCandidate[];
  isLoadingCandidates: boolean;

  // Validation
  errors: Record<string, string>;
  validateCurrentStep: () => boolean;
  validateAll: () => boolean;
  hasErrors: boolean;

  // Transaction Lifecycle
  txStatus: TransactionStep;
  statusMessage: string;
  txHash: string | null;
  createdVault: any | null;
  errorMessage: string | null;
  isBusy: boolean;
  isSuccess: boolean;
  isError: boolean;
  executeCreateVault: () => Promise<{
    success: boolean;
    vault?: any;
    txHash?: string;
    error?: string;
  }>;
  resetTransaction: () => void;

  // Draft Persistence
  draftId: string | null;
  isDraftSaving: boolean;
  lastSavedAt: string | null;
  saveDraft: () => Promise<string | null>;
}

/** Chuyển đổi định dạng ngày giờ sang ISO chuẩn có timezone */
function normalizeToIsoString(dateInput: string): string {
  if (!dateInput) return "";
  if (/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$/.test(dateInput)) {
    return dateInput;
  }
  const parsed = Date.parse(dateInput);
  if (Number.isFinite(parsed)) {
    return new Date(parsed).toISOString();
  }
  return dateInput;
}

/** Sinh ngày hạn chót mặc định (30 ngày tới, định dạng ISO) */
function getDefaultTargetDeadline(daysAhead = 30): string {
  const target = new Date(Date.now() + daysAhead * 86400 * 1000);
  return target.toISOString();
}

/** Khởi tạo form trống với template SHIELD mặc định */
export function createDefaultVaultForm(templateId: VaultRuleType = "SHIELD"): VaultDraftForm {
  const tpl = getVaultTemplate(templateId);
  return {
    ruleTemplate: templateId,
    name: "",
    description: "",
    bufferRatioBps: tpl.defaultBufferRatioBps,
    fastWithdrawLimit: tpl.defaultFastWithdrawLimit,
    requiredApprovals: tpl.defaultRequiredApprovals,
    guardianIds: [],
    beneficiaryIds: [],
    targetGoalAmount: tpl.defaultTargetGoalAmount || "10",
    targetDeadline: tpl.defaultTargetDays ? getDefaultTargetDeadline(tpl.defaultTargetDays) : "",
    roscaRoundDuration: tpl.defaultRoscaRoundDuration || "604800",
    roscaRoundContribution: tpl.defaultRoscaRoundContribution || "0.5",
    policyAccepted: false,
  };
}

export function useCreateVaultState(options: UseCreateVaultStateOptions = {}): UseCreateVaultStateReturn {
  const { isOpen = true, initialDraftId, onSuccess, onError } = options;
  const family = useFamily();
  const auth = useAuth();

  const workspaceId = family.currentWorkspace?.id;
  const mountedRef = useRef(true);
  const draftIdRef = useRef<string | null>(initialDraftId || null);

  // 1. Wizard Step State
  const [step, setStepState] = useState<StepNumber>(1);

  // 2. Form Draft State
  const [form, setForm] = useState<VaultDraftForm>(() => createDefaultVaultForm("SHIELD"));

  // 3. Candidates Context
  const [candidates, setCandidates] = useState<MemberCandidate[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);

  // 4. Yield Simulation Principal (AVAX)
  const [simulationPrincipal, setSimulationPrincipal] = useState<number>(10);

  // 5. Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 6. Transaction & Blockchain Execution State
  const [txStatus, setTxStatus] = useState<TransactionStep>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [createdVault, setCreatedVault] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 7. Draft Persistence State
  const [draftId, setDraftId] = useState<string | null>(initialDraftId || null);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Sync draftId ref
  useEffect(() => {
    draftIdRef.current = draftId;
  }, [draftId]);

  // Current Template Definition
  const template = useMemo(() => {
    return getVaultTemplate(form.ruleTemplate);
  }, [form.ruleTemplate]);

  // Derived Dual-Chain Allocations
  const bufferPercent = useMemo(() => bpsToPercent(form.bufferRatioBps), [form.bufferRatioBps]);
  const cchainPercent = useMemo(() => Number((100 - bufferPercent).toFixed(2)), [bufferPercent]);
  const effectiveApy = useMemo(() => calculateEffectiveApy(form.bufferRatioBps), [form.bufferRatioBps]);

  // Real-time Projected Yield
  const projectedYield = useMemo(() => {
    return calculateProjectedYield(simulationPrincipal, form.bufferRatioBps, 365);
  }, [simulationPrincipal, form.bufferRatioBps]);

  // Map candidates to selected lists
  const selectedGuardians = useMemo(() => {
    return candidates.filter((c) => form.guardianIds.includes(c.id));
  }, [candidates, form.guardianIds]);

  const selectedBeneficiaries = useMemo(() => {
    return candidates.filter((c) => form.beneficiaryIds.includes(c.id));
  }, [candidates, form.beneficiaryIds]);

  // Load Candidates from API or fallback to family.members
  const loadCandidates = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoadingCandidates(true);
    try {
      const res = await authRequest(`/api/workspaces/${workspaceId}/vault-creation`, undefined, "GET");
      if (mountedRef.current && res?.data?.candidates) {
        setCandidates(res.data.candidates);
        return;
      }
    } catch {
      // Fallback to family.members
    }

    if (mountedRef.current && family.members && family.members.length > 0) {
      const fallback: MemberCandidate[] = family.members.map((m) => ({
        id: m.id,
        fullName: m.name || m.role,
        role: m.role,
        address: m.walletAddress || null,
        linked: Boolean(m.walletAddress),
        permission: m.role === "ADMIN" ? "ADMIN" : "MEMBER",
        canGuard: m.role === "ADMIN" || m.role === "GUARDIAN",
      }));
      setCandidates(fallback);
    }
    if (mountedRef.current) {
      setIsLoadingCandidates(false);
    }
  }, [workspaceId, family.members]);

  useEffect(() => {
    if (isOpen && workspaceId) {
      void loadCandidates();
    }
  }, [isOpen, workspaceId, loadCandidates]);

  // Auto-select smart initial guardians and beneficiaries when candidates are loaded
  useEffect(() => {
    if (candidates.length === 0) return;

    setForm((prev) => {
      let updated = false;
      const nextGuardians = [...prev.guardianIds];
      const nextBeneficiaries = [...prev.beneficiaryIds];

      // Auto-assign guardian if empty
      if (nextGuardians.length === 0) {
        // Find current user or an admin who can guard
        const currentCand = candidates.find(
          (c) =>
            c.linked &&
            (c.address?.toLowerCase() === auth.connectedAddress?.toLowerCase() || c.canGuard),
        ) || candidates.find((c) => c.canGuard && c.linked) || candidates[0];

        if (currentCand) {
          nextGuardians.push(currentCand.id);
          updated = true;
        }
      }

      // Auto-assign beneficiaries if empty
      if (nextBeneficiaries.length === 0) {
        candidates.forEach((c) => {
          if (c.linked) nextBeneficiaries.push(c.id);
        });
        if (nextBeneficiaries.length === 0 && candidates.length > 0) {
          nextBeneficiaries.push(candidates[0].id);
        }
        updated = true;
      }

      // Ensure requiredApprovals <= guardian count
      const clampedApprovals = Math.max(1, Math.min(prev.requiredApprovals, Math.max(1, nextGuardians.length)));
      if (clampedApprovals !== prev.requiredApprovals) {
        updated = true;
      }

      if (!updated) return prev;

      return {
        ...prev,
        guardianIds: nextGuardians,
        beneficiaryIds: nextBeneficiaries,
        requiredApprovals: clampedApprovals,
      };
    });
  }, [candidates, auth.connectedAddress]);

  // -------------------------------------------------------------
  // Field-level & Step Validation
  // -------------------------------------------------------------

  const clearFieldError = useCallback((field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  }, []);

  const validateStep1 = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    const trimmedName = form.name.trim();

    if (!trimmedName) {
      errs.name = "Vui lòng đặt tên cho Hũ tiền của bạn.";
    } else if (trimmedName.length > 80) {
      errs.name = "Tên hũ không được vượt quá 80 ký tự.";
    }

    setErrors((prev) => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  }, [form.name]);

  const validateStep2 = useCallback((): boolean => {
    const errs: Record<string, string> = {};

    // Buffer ratio check
    if (!Number.isSafeInteger(form.bufferRatioBps) || form.bufferRatioBps < 0 || form.bufferRatioBps > 10000) {
      errs.bufferRatioBps = "Tỷ lệ đệm phải từ 0% đến 100%.";
    }

    // Template specific checks
    if (form.ruleTemplate === "SHIELD") {
      if (!/^\d+(\.\d{1,18})?$/.test(form.fastWithdrawLimit)) {
        errs.fastWithdrawLimit = "Hạn mức rút nhanh phải là số hợp lệ (tối đa 18 số thập phân).";
      } else {
        try {
          const val = parseEther(form.fastWithdrawLimit);
          if (val < 0n) errs.fastWithdrawLimit = "Hạn mức rút nhanh không thể âm.";
        } catch {
          errs.fastWithdrawLimit = "Hạn mức rút nhanh không hợp lệ.";
        }
      }
    } else if (form.ruleTemplate === "SHARED_GOAL") {
      if (!/^\d+(\.\d{1,18})?$/.test(form.targetGoalAmount)) {
        errs.targetGoalAmount = "Mục tiêu gom tiền phải là số lớn hơn 0.";
      } else {
        try {
          const val = parseEther(form.targetGoalAmount);
          if (val <= 0n) errs.targetGoalAmount = "Mục tiêu gom tiền phải lớn hơn 0 AVAX.";
        } catch {
          errs.targetGoalAmount = "Mục tiêu không hợp lệ.";
        }
      }

      if (!form.targetDeadline) {
        errs.targetDeadline = "Vui lòng chọn thời hạn đạt mục tiêu.";
      } else {
        const deadlineMs = Date.parse(form.targetDeadline);
        if (!Number.isFinite(deadlineMs) || deadlineMs <= Date.now()) {
          errs.targetDeadline = "Hạn chót mục tiêu phải là thời điểm trong tương lai.";
        }
      }
    } else if (form.ruleTemplate === "ROSCA") {
      if (!/^\d+$/.test(form.roscaRoundDuration)) {
        errs.roscaRoundDuration = "Chu kỳ vòng họ phải là số nguyên (giây).";
      } else {
        const secs = BigInt(form.roscaRoundDuration);
        if (secs < 60n || secs > 31536000n) {
          errs.roscaRoundDuration = "Chu kỳ từ 1 phút (60s) đến 365 ngày (31,536,000s).";
        }
      }

      if (!/^\d+(\.\d{1,18})?$/.test(form.roscaRoundContribution)) {
        errs.roscaRoundContribution = "Mức đóng mỗi kỳ phải lớn hơn 0 AVAX.";
      } else {
        try {
          const val = parseEther(form.roscaRoundContribution);
          if (val <= 0n) errs.roscaRoundContribution = "Mức đóng phải lớn hơn 0 AVAX.";
        } catch {
          errs.roscaRoundContribution = "Mức đóng không hợp lệ.";
        }
      }
    }

    setErrors((prev) => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  }, [
    form.bufferRatioBps,
    form.ruleTemplate,
    form.fastWithdrawLimit,
    form.targetGoalAmount,
    form.targetDeadline,
    form.roscaRoundDuration,
    form.roscaRoundContribution,
  ]);

  const validateStep3 = useCallback((): boolean => {
    const errs: Record<string, string> = {};

    if (form.guardianIds.length === 0) {
      errs.guardianIds = "Vui lòng chọn ít nhất 1 Người bảo hộ (Guardian).";
    }

    if (form.beneficiaryIds.length === 0) {
      errs.beneficiaryIds = "Vui lòng chọn ít nhất 1 Người thụ hưởng.";
    }

    if (form.requiredApprovals < 1 || form.requiredApprovals > form.guardianIds.length) {
      errs.requiredApprovals = `Số chữ ký duyệt phải từ 1 đến ${Math.max(1, form.guardianIds.length)}.`;
    }

    // Role separation for MILESTONE
    if (form.ruleTemplate === "MILESTONE") {
      const hasOverlap = form.beneficiaryIds.some((id) => form.guardianIds.includes(id));
      if (hasOverlap) {
        errs.beneficiaryIds = "Ở Hũ Nhiệm Vụ, Người nhận thưởng phải tách biệt với Người bảo hộ duyệt thưởng.";
      }
    }

    setErrors((prev) => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  }, [form.guardianIds, form.beneficiaryIds, form.requiredApprovals, form.ruleTemplate]);

  const validateStep4 = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!form.policyAccepted) {
      errs.policyAccepted = "Vui lòng xác nhận bạn đã hiểu và đồng ý với quy tắc vận hành của Hũ.";
    }
    setErrors((prev) => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  }, [form.policyAccepted]);

  const validateCurrentStep = useCallback((): boolean => {
    switch (step) {
      case 1:
        return validateStep1();
      case 2:
        return validateStep2();
      case 3:
        return validateStep3();
      case 4:
        return validateStep4();
      default:
        return true;
    }
  }, [step, validateStep1, validateStep2, validateStep3, validateStep4]);

  const validateAll = useCallback((): boolean => {
    const s1 = validateStep1();
    const s2 = validateStep2();
    const s3 = validateStep3();
    const s4 = validateStep4();
    return s1 && s2 && s3 && s4;
  }, [validateStep1, validateStep2, validateStep3, validateStep4]);

  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);

  const canProceed = useMemo(() => {
    if (step === 1) return Boolean(form.name.trim().length >= 1 && form.name.trim().length <= 80);
    if (step === 2) {
      if (form.ruleTemplate === "SHIELD") return Boolean(form.fastWithdrawLimit && !errors.fastWithdrawLimit);
      if (form.ruleTemplate === "SHARED_GOAL") return Boolean(form.targetGoalAmount && form.targetDeadline && !errors.targetGoalAmount && !errors.targetDeadline);
      if (form.ruleTemplate === "ROSCA") return Boolean(form.roscaRoundContribution && form.roscaRoundDuration && !errors.roscaRoundContribution && !errors.roscaRoundDuration);
      return true;
    }
    if (step === 3) return form.guardianIds.length > 0 && form.beneficiaryIds.length > 0 && form.requiredApprovals <= form.guardianIds.length;
    if (step === 4) return form.policyAccepted && txStatus === "idle";
    return true;
  }, [step, form, errors, txStatus]);

  // -------------------------------------------------------------
  // Draft Persistence Actions
  // -------------------------------------------------------------

  const saveDraft = useCallback(
    async (targetStep: number = step): Promise<string | null> => {
      if (!workspaceId) return null;
      setIsDraftSaving(true);
      try {
        const endpoint = draftIdRef.current
          ? `/api/workspaces/${workspaceId}/vault-drafts/${draftIdRef.current}`
          : `/api/workspaces/${workspaceId}/vault-drafts`;
        const method = draftIdRef.current ? "PATCH" : "POST";

        const res = await authRequest(
          endpoint,
          {
            id: draftIdRef.current || undefined,
            config: {
              ...form,
              targetDeadline: normalizeToIsoString(form.targetDeadline),
            },
            step: targetStep,
          },
          method,
        );

        if (res?.draft?.id) {
          draftIdRef.current = res.draft.id;
          if (mountedRef.current) {
            setDraftId(res.draft.id);
            setLastSavedAt(new Date().toLocaleTimeString("vi-VN"));
          }
          return res.draft.id;
        }
      } catch {
        // Silent draft save failure
      } finally {
        if (mountedRef.current) setIsDraftSaving(false);
      }
      return null;
    },
    [workspaceId, step, form],
  );

  // -------------------------------------------------------------
  // Step Navigation
  // -------------------------------------------------------------

  const nextStep = useCallback((): boolean => {
    if (!validateCurrentStep()) return false;
    if (step < 4) {
      const next = (step + 1) as StepNumber;
      setStepState(next);
      void saveDraft(next);
      return true;
    }
    return false;
  }, [step, validateCurrentStep, saveDraft]);

  const prevStep = useCallback(() => {
    if (step > 1) {
      const prev = (step - 1) as StepNumber;
      setStepState(prev);
    }
  }, [step]);

  const goToStep = useCallback(
    (targetStep: StepNumber): boolean => {
      if (targetStep < step) {
        setStepState(targetStep);
        return true;
      }
      if (validateCurrentStep()) {
        setStepState(targetStep);
        void saveDraft(targetStep);
        return true;
      }
      return false;
    },
    [step, validateCurrentStep, saveDraft],
  );

  // -------------------------------------------------------------
  // Form Setters & Template Switching
  // -------------------------------------------------------------

  const selectTemplate = useCallback((templateId: VaultRuleType) => {
    const tpl = getVaultTemplate(templateId);
    setForm((prev) => ({
      ...prev,
      ruleTemplate: templateId,
      bufferRatioBps: tpl.defaultBufferRatioBps,
      fastWithdrawLimit: tpl.defaultFastWithdrawLimit,
      requiredApprovals: Math.min(tpl.defaultRequiredApprovals, Math.max(1, prev.guardianIds.length)),
      targetGoalAmount: tpl.defaultTargetGoalAmount || prev.targetGoalAmount || "10",
      targetDeadline: tpl.defaultTargetDays ? getDefaultTargetDeadline(tpl.defaultTargetDays) : prev.targetDeadline,
      roscaRoundDuration: tpl.defaultRoscaRoundDuration || prev.roscaRoundDuration || "604800",
      roscaRoundContribution: tpl.defaultRoscaRoundContribution || prev.roscaRoundContribution || "0.5",
      policyAccepted: false,
    }));
    setErrors({});
  }, []);

  const setName = useCallback(
    (name: string) => {
      setForm((prev) => ({ ...prev, name }));
      clearFieldError("name");
    },
    [clearFieldError],
  );

  const setDescription = useCallback((description: string) => {
    setForm((prev) => ({ ...prev, description }));
  }, []);

  const setBufferRatioBps = useCallback(
    (bps: number) => {
      const clamped = Math.max(0, Math.min(10000, bps));
      setForm((prev) => ({ ...prev, bufferRatioBps: clamped }));
      clearFieldError("bufferRatioBps");
    },
    [clearFieldError],
  );

  const setBufferPercent = useCallback(
    (percent: number) => {
      setBufferRatioBps(percentToBps(percent));
    },
    [setBufferRatioBps],
  );

  const setFastWithdrawLimit = useCallback(
    (limit: string) => {
      setForm((prev) => ({ ...prev, fastWithdrawLimit: limit }));
      clearFieldError("fastWithdrawLimit");
    },
    [clearFieldError],
  );

  const setRequiredApprovals = useCallback(
    (count: number) => {
      setForm((prev) => ({
        ...prev,
        requiredApprovals: Math.max(1, Math.min(count, Math.max(1, prev.guardianIds.length))),
      }));
      clearFieldError("requiredApprovals");
    },
    [clearFieldError],
  );

  const toggleGuardian = useCallback(
    (memberId: string) => {
      setForm((prev) => {
        const exists = prev.guardianIds.includes(memberId);
        const nextGuardians = exists
          ? prev.guardianIds.filter((id) => id !== memberId)
          : [...prev.guardianIds, memberId];

        // Ensure at least 1 remains or clamp approvals
        const maxApprovals = Math.max(1, nextGuardians.length);
        const nextApprovals = Math.min(prev.requiredApprovals, maxApprovals);

        // Role separation check for MILESTONE
        let nextBeneficiaries = prev.beneficiaryIds;
        if (!exists && prev.ruleTemplate === "MILESTONE" && nextBeneficiaries.includes(memberId)) {
          nextBeneficiaries = nextBeneficiaries.filter((id) => id !== memberId);
        }

        return {
          ...prev,
          guardianIds: nextGuardians,
          beneficiaryIds: nextBeneficiaries,
          requiredApprovals: nextApprovals,
        };
      });
      clearFieldError("guardianIds");
    },
    [clearFieldError],
  );

  const toggleBeneficiary = useCallback(
    (memberId: string) => {
      setForm((prev) => {
        const exists = prev.beneficiaryIds.includes(memberId);
        let nextBeneficiaries = exists
          ? prev.beneficiaryIds.filter((id) => id !== memberId)
          : [...prev.beneficiaryIds, memberId];

        // Role separation check for MILESTONE
        let nextGuardians = prev.guardianIds;
        if (!exists && prev.ruleTemplate === "MILESTONE" && nextGuardians.includes(memberId)) {
          nextGuardians = nextGuardians.filter((id) => id !== memberId);
        }

        return {
          ...prev,
          guardianIds: nextGuardians,
          beneficiaryIds: nextBeneficiaries,
        };
      });
      clearFieldError("beneficiaryIds");
    },
    [clearFieldError],
  );

  const setGuardians = useCallback(
    (ids: string[]) => {
      setForm((prev) => ({
        ...prev,
        guardianIds: ids,
        requiredApprovals: Math.max(1, Math.min(prev.requiredApprovals, Math.max(1, ids.length))),
      }));
      clearFieldError("guardianIds");
    },
    [clearFieldError],
  );

  const setBeneficiaries = useCallback(
    (ids: string[]) => {
      setForm((prev) => ({
        ...prev,
        beneficiaryIds: ids,
      }));
      clearFieldError("beneficiaryIds");
    },
    [clearFieldError],
  );

  const selectAllBeneficiaries = useCallback(() => {
    const allLinkedIds = candidates.filter((c) => c.linked).map((c) => c.id);
    setForm((prev) => ({
      ...prev,
      beneficiaryIds: allLinkedIds.length > 0 ? allLinkedIds : candidates.map((c) => c.id),
    }));
    clearFieldError("beneficiaryIds");
  }, [candidates, clearFieldError]);

  const setTargetGoalAmount = useCallback(
    (amount: string) => {
      setForm((prev) => ({ ...prev, targetGoalAmount: amount }));
      clearFieldError("targetGoalAmount");
    },
    [clearFieldError],
  );

  const setTargetDeadline = useCallback(
    (deadline: string) => {
      setForm((prev) => ({ ...prev, targetDeadline: deadline }));
      clearFieldError("targetDeadline");
    },
    [clearFieldError],
  );

  const setRoscaRoundDuration = useCallback(
    (seconds: string) => {
      setForm((prev) => ({ ...prev, roscaRoundDuration: seconds }));
      clearFieldError("roscaRoundDuration");
    },
    [clearFieldError],
  );

  const setRoscaRoundContribution = useCallback(
    (amount: string) => {
      setForm((prev) => ({ ...prev, roscaRoundContribution: amount }));
      clearFieldError("roscaRoundContribution");
    },
    [clearFieldError],
  );

  const setPolicyAccepted = useCallback(
    (accepted: boolean) => {
      setForm((prev) => ({ ...prev, policyAccepted: accepted }));
      clearFieldError("policyAccepted");
    },
    [clearFieldError],
  );

  const resetForm = useCallback(() => {
    setForm(createDefaultVaultForm("SHIELD"));
    setErrors({});
    setStepState(1);
    setTxStatus("idle");
    setTxHash(null);
    setCreatedVault(null);
    setErrorMessage(null);
  }, []);

  const resetTransaction = useCallback(() => {
    setTxStatus("idle");
    setStatusMessage("");
    setErrorMessage(null);
  }, []);

  // -------------------------------------------------------------
  // On-Chain Transaction Execution
  // -------------------------------------------------------------

  const executeCreateVault = useCallback(async (): Promise<{
    success: boolean;
    vault?: any;
    txHash?: string;
    error?: string;
  }> => {
    if (!mountedRef.current) return { success: false, error: "Hủy thao tác" };

    // 1. Validate toàn bộ dữ liệu
    if (!validateAll()) {
      setTxStatus("error");
      setErrorMessage("Vui lòng hoàn tất và sửa các trường thông tin chưa hợp lệ.");
      return { success: false, error: "Dữ liệu chưa hợp lệ" };
    }

    if (!workspaceId) {
      setTxStatus("error");
      setErrorMessage("Không tìm thấy không gian làm việc. Hãy tải lại trang.");
      return { success: false, error: "Chưa chọn không gian" };
    }

    // 2. Chuẩn bị Wallet Addresses
    const walletMap = new Map<string, string>();
    candidates.forEach((c) => {
      if (c.address && isAddress(c.address)) {
        walletMap.set(c.id, c.address.toLowerCase());
      }
    });

    const guardianWallets = form.guardianIds
      .map((id) => walletMap.get(id))
      .filter((addr): addr is string => Boolean(addr));
    const beneficiaryWallets = form.beneficiaryIds
      .map((id) => walletMap.get(id))
      .filter((addr): addr is string => Boolean(addr));

    if (guardianWallets.length === 0 || beneficiaryWallets.length === 0) {
      setTxStatus("error");
      setErrorMessage("Một số thành viên chưa liên kết ví Avalanche Core hợp lệ.");
      return { success: false, error: "Chưa có địa chỉ ví hợp lệ" };
    }

    // 3. Tiến trình khởi tạo State Machine
    setTxStatus("validating");
    setStatusMessage("Đang lưu bản nháp và kiểm tra hợp đồng...");
    setErrorMessage(null);

    try {
      // Lưu draft lên backend trước khi ký
      const currentDraftId = (await saveDraft(4)) || draftIdRef.current || "";

      // Chuẩn bị tham số hợp đồng tuân thủ FamilyHub.sol
      const ruleType = ruleIdToEnum(form.ruleTemplate);
      const isShield = form.ruleTemplate === "SHIELD";
      const isSharedGoal = form.ruleTemplate === "SHARED_GOAL";
      const isRosca = form.ruleTemplate === "ROSCA";

      const contractConfig: ResolvedVaultConfig = {
        name: form.name.trim(),
        bufferRatioBps: form.bufferRatioBps,
        ruleTemplate: form.ruleTemplate,
        guardianWallets,
        beneficiaryWallets,
        requiredApprovals: form.requiredApprovals,
        fastWithdrawLimit: isShield ? form.fastWithdrawLimit : "0",
        targetGoalAmount: isSharedGoal ? form.targetGoalAmount : "0",
        targetDeadline: isSharedGoal ? normalizeToIsoString(form.targetDeadline) : "",
        roscaRoundDuration: isRosca ? form.roscaRoundDuration : "0",
        roscaRoundContribution: isRosca ? form.roscaRoundContribution : "0",
      };

      // Gọi qua family.createCustomVault tích hợp sẵn Core Wallet + API Sync
      setStatusMessage("Vui lòng mở Avalanche Core Wallet / Passkey để ký giao dịch...");
      setTxStatus("awaiting_wallet");

      const res = await family.createCustomVault({
        ...contractConfig,
        draftId: currentDraftId,
        onProgress: (phase: CreationPhase) => {
          if (!mountedRef.current) return;
          if (phase.hash) setTxHash(phase.hash);

          switch (phase.status) {
            case "PRECHECK":
              setTxStatus("validating");
              setStatusMessage("Đang kiểm tra quyền và mô phỏng giao dịch...");
              break;
            case "AWAITING_SIGNATURE":
              setTxStatus("awaiting_wallet");
              setStatusMessage("Vui lòng xác nhận chữ ký trong Avalanche Core...");
              break;
            case "BROADCAST":
              setTxStatus("broadcasting");
              setStatusMessage("Giao dịch đã phát sóng! Đang chờ xác nhận từ Family L1...");
              break;
            case "CONFIRMED":
            case "SYNC_PENDING":
              setTxStatus("confirming");
              setStatusMessage("Giao dịch đã được xác thực on-chain! Đang đối soát và ghi nhận Hũ...");
              break;
            case "COMPLETED":
              setTxStatus("success");
              setStatusMessage("Chúc mừng! Hũ tiền đã được khởi tạo thành công!");
              break;
            case "REVERTED":
              setTxStatus("error");
              setStatusMessage("Giao dịch bị hoàn tác trên blockchain.");
              break;
          }
        },
      });

      if (res.success && res.vault) {
        setTxStatus("success");
        setStatusMessage("Khởi tạo Hũ tiền thành công!");
        setCreatedVault(res.vault);
        if (res.txHash) setTxHash(res.txHash);
        await family.refreshBalances();
        onSuccess?.(res.vault);
        return { success: true, vault: res.vault, txHash: res.txHash };
      } else {
        const err = res.error || "Không thể khởi tạo Hũ tiền. Vui lòng thử lại.";
        setTxStatus("error");
        setErrorMessage(err);
        setStatusMessage(err);
        onError?.(err);
        return { success: false, error: err, txHash: res.txHash };
      }
    } catch (err: any) {
      const errMsg = err?.shortMessage || err?.message || "Đã xảy ra lỗi khi tạo Hũ.";
      if (mountedRef.current) {
        setTxStatus("error");
        setErrorMessage(errMsg);
        setStatusMessage(errMsg);
      }
      onError?.(errMsg);
      return { success: false, error: errMsg };
    }
  }, [validateAll, workspaceId, candidates, form, saveDraft, family, onSuccess, onError]);

  const isBusy = txStatus !== "idle" && txStatus !== "success" && txStatus !== "error";
  const isSuccess = txStatus === "success";
  const isError = txStatus === "error";

  return {
    step,
    setStep: setStepState,
    nextStep,
    prevStep,
    goToStep,
    canProceed,

    form,
    template,

    selectTemplate,
    setName,
    setDescription,
    setBufferRatioBps,
    setBufferPercent,
    setFastWithdrawLimit,
    setRequiredApprovals,
    toggleGuardian,
    toggleBeneficiary,
    setGuardians,
    setBeneficiaries,
    selectAllBeneficiaries,
    setTargetGoalAmount,
    setTargetDeadline,
    setRoscaRoundDuration,
    setRoscaRoundContribution,
    setPolicyAccepted,
    resetForm,

    bufferPercent,
    cchainPercent,
    effectiveApy,
    simulationPrincipal,
    setSimulationPrincipal,
    projectedYield,

    candidates,
    selectedGuardians,
    selectedBeneficiaries,
    isLoadingCandidates,

    errors,
    validateCurrentStep,
    validateAll,
    hasErrors,

    txStatus,
    statusMessage,
    txHash,
    createdVault,
    errorMessage,
    isBusy,
    isSuccess,
    isError,
    executeCreateVault,
    resetTransaction,

    draftId,
    isDraftSaving,
    lastSavedAt,
    saveDraft,
  };
}
