"use client";

import React from "react";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Save,
  Check,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import {
  UseCreateVaultStateReturn,
  StepNumber,
} from "@/hooks/useCreateVaultState";
import { StepIndicator } from "./StepIndicator";
import { TemplateSelector } from "./TemplateSelector";
import { GuardianSelector } from "./GuardianSelector";
import { LiquidityBufferSlider } from "./LiquidityBufferSlider";
import { VaultSummaryCard } from "./VaultSummaryCard";
import { CreationStatusModal } from "./CreationStatusModal";
import { VAULT_MICROCOPY } from "./designTokens";

interface CreateVaultWizardProps {
  state: UseCreateVaultStateReturn;
  workspaceName?: string;
  onClose: () => void;
  onManageMembers?: () => void;
  onDepositNow?: (vault: any) => void;
}

export function CreateVaultWizard({
  state,
  workspaceName,
  onClose,
  onManageMembers,
  onDepositNow,
}: CreateVaultWizardProps) {
  const {
    step,
    nextStep,
    prevStep,
    goToStep,
    canProceed,
    form,
    template,
    selectTemplate,
    setName,
    setDescription,
    setBufferPercent,
    setFastWithdrawLimit,
    setRequiredApprovals,
    toggleGuardian,
    toggleBeneficiary,
    selectAllBeneficiaries,
    setTargetGoalAmount,
    setTargetDeadline,
    setRoscaRoundContribution,
    setRoscaRoundDuration,
    setPolicyAccepted,
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
    txStatus,
    statusMessage,
    txHash,
    createdVault,
    errorMessage,
    isBusy,
    executeCreateVault,
    resetTransaction,
    isDraftSaving,
    lastSavedAt,
    saveDraft,
  } = state;

  const handleNext = () => {
    if (step < 4) {
      nextStep();
    } else {
      executeCreateVault();
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[90vh]">
      {/* Modal Top Bar */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
              {VAULT_MICROCOPY.wizard.headerTag}
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {VAULT_MICROCOPY.wizard.headerTitle}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Draft Save Status */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
            {isDraftSaving ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                <span>Đang lưu nháp...</span>
              </>
            ) : (
              <>
                <Save className="w-3 h-3 text-slate-400" />
                <span>{lastSavedAt ? "Đã lưu nháp" : "Tự động lưu"}</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors disabled:opacity-50"
            aria-label="Đóng cửa sổ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Step Indicator Progress */}
      <div className="pb-4 shrink-0">
        <StepIndicator
          currentStep={step}
          onStepClick={(s) => goToStep(s)}
          canNavigateToStep={(s) => s < step}
        />
      </div>

      {/* Step Content Area (Scrollable) */}
      <div className="flex-1 overflow-y-auto pr-1 -mr-1 py-2">
        {step === 1 && (
          <TemplateSelector
            selectedTemplateId={form.ruleTemplate}
            onSelectTemplate={selectTemplate}
            vaultName={form.name}
            onNameChange={setName}
            vaultDescription={form.description}
            onDescriptionChange={setDescription}
            nameError={errors.name}
          />
        )}

        {step === 2 && (
          <GuardianSelector
            ruleTemplate={form.ruleTemplate}
            candidates={candidates}
            selectedGuardianIds={form.guardianIds}
            selectedBeneficiaryIds={form.beneficiaryIds}
            requiredApprovals={form.requiredApprovals}
            onToggleGuardian={toggleGuardian}
            onToggleBeneficiary={toggleBeneficiary}
            onSetRequiredApprovals={setRequiredApprovals}
            onSelectAllBeneficiaries={selectAllBeneficiaries}
            onManageMembers={onManageMembers}
            errors={errors}
            isLoading={isLoadingCandidates}
          />
        )}

        {step === 3 && (
          <LiquidityBufferSlider
            ruleTemplate={form.ruleTemplate}
            bufferRatioBps={form.bufferRatioBps}
            bufferPercent={bufferPercent}
            cchainPercent={cchainPercent}
            effectiveApy={effectiveApy}
            simulationPrincipal={simulationPrincipal}
            projectedYield={projectedYield}
            onBufferPercentChange={setBufferPercent}
            onSimulationPrincipalChange={setSimulationPrincipal}
            fastWithdrawLimit={form.fastWithdrawLimit}
            onFastWithdrawLimitChange={setFastWithdrawLimit}
            targetGoalAmount={form.targetGoalAmount}
            onTargetGoalAmountChange={setTargetGoalAmount}
            targetDeadline={form.targetDeadline}
            onTargetDeadlineChange={setTargetDeadline}
            roscaRoundContribution={form.roscaRoundContribution}
            onRoscaRoundContributionChange={setRoscaRoundContribution}
            roscaRoundDuration={form.roscaRoundDuration}
            onRoscaRoundDurationChange={setRoscaRoundDuration}
            errors={errors}
          />
        )}

        {step === 4 && (
          <VaultSummaryCard
            form={form}
            template={template}
            workspaceName={workspaceName}
            selectedGuardians={selectedGuardians}
            selectedBeneficiaries={selectedBeneficiaries}
            effectiveApy={effectiveApy}
            projectedYield={projectedYield}
            onPolicyAcceptedChange={setPolicyAccepted}
            policyError={errors.policyAccepted}
          />
        )}
      </div>

      {/* Wizard Bottom Navigation Bar */}
      <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between gap-3 shrink-0">
        <div>
          {step > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              disabled={isBusy}
              className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{VAULT_MICROCOPY.wizard.btnBack}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs sm:text-sm transition-colors"
            >
              Hủy
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed || isBusy}
              className="py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20 active:scale-[0.99] disabled:cursor-not-allowed"
            >
              <span>{VAULT_MICROCOPY.wizard.btnContinue}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed || isBusy}
              className="py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/25 active:scale-[0.99] disabled:cursor-not-allowed"
            >
              {isBusy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{VAULT_MICROCOPY.wizard.btnChecking}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{VAULT_MICROCOPY.wizard.btnSignNow}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Creation Status Lifecycle Modal */}
      <CreationStatusModal
        isOpen={txStatus !== "idle"}
        txStatus={txStatus}
        statusMessage={statusMessage}
        txHash={txHash}
        createdVault={createdVault}
        errorMessage={errorMessage}
        onRetry={executeCreateVault}
        onClose={() => {
          resetTransaction();
          if (txStatus === "success") {
            onClose();
          }
        }}
        onDepositNow={(vault) => {
          resetTransaction();
          if (onDepositNow) {
            onDepositNow(vault);
          } else {
            onClose();
          }
        }}
      />
    </div>
  );
}
