"use client";

import React, { useState } from "react";
import { ArrowDownToLine, PiggyBank, ShieldCheck, Target } from "lucide-react";
import { useFamily } from "@/context/FamilyContext";
import { DEPLOYMENT, hubChain } from "@/contracts/config";
import { vaultMappingIssue } from "../../../../shared/vaultMapping";
import { DepositVaultModal } from "./DepositVaultModal";

export function ContractVaultFunding({
  kind,
}: {
  kind: "SHIELD" | "MILESTONE" | "SHARED_GOAL";
}) {
  const family = useFamily();
  // Remount on workspace change so a previously selected recipient cannot carry over.
  return <FundingPanel key={family.currentWorkspace?.id} kind={kind} />;
}

function FundingPanel({
  kind,
}: {
  kind: "SHIELD" | "MILESTONE" | "SHARED_GOAL";
}) {
  const { dynamicVaults, currentWorkspace, isDataLoading, dataErrors } =
    useFamily();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const vaults = dynamicVaults.filter(
    (vault) =>
      vault.workspaceId === currentWorkspace?.id && vault.ruleTemplate === kind,
  );
  const selected =
    selectedId === null
      ? vaults[0]
      : vaults.find((vault) => vault.id === selectedId);
  const issue = selected
    ? vaultMappingIssue(selected, hubChain.id, currentWorkspace?.l1HubAddress)
    : null;
  const reason = !DEPLOYMENT.enabled
    ? "Hũ smart contract chưa sẵn sàng nhận tiền. Chủ nhà cần hoàn tất cấu hình và xác minh hợp đồng."
    : issue?.message ||
      (selected && !selected.isActive
        ? "Hũ này đang tạm ngừng nhận tiền."
        : null);

  return (
    <section
      className="vx-card vx-funding"
      aria-label="Nạp tiền vào hũ smart contract"
    >
      <div className="vx-funding-heading">
        <span className="vx-card-icon">
          {kind === "SHARED_GOAL" ? (
            <Target size={24} aria-hidden />
          ) : kind === "MILESTONE" ? (
            <PiggyBank size={24} aria-hidden />
          ) : (
            <ShieldCheck size={24} aria-hidden />
          )}
        </span>
        <div>
          <h2>
            {kind === "SHARED_GOAL"
              ? "Góp tiền vào mục tiêu chung"
              : kind === "MILESTONE"
                ? "Thêm tiền vào hũ của con"
                : "Nạp tiền vào hũ an sinh"}
          </h2>
          <p className="vx-muted">
            Nạp AVAX từ ví cá nhân vào hũ smart contract trên Avalanche Fuji.
          </p>
        </div>
      </div>
      {isDataLoading ? (
        <p role="status" className="vx-muted">
          Đang tải danh sách hũ…
        </p>
      ) : !vaults.length ? (
        <p className="vx-muted">
          {dataErrors.length
            ? "Chưa tải được danh sách hũ. Hãy tải lại dữ liệu trước khi nạp."
            : "Chưa có hũ phù hợp trong gia đình này. Chủ nhà cần tạo hũ và thêm con hoặc người thụ hưởng trước."}
        </p>
      ) : (
        <>
          <div className="vx-funding-fields">
            <label>
              Hũ nhận tiền
              <select
                value={selected?.id || ""}
                onChange={(event) => {
                  setSelectedId(event.target.value);
                  setOpen(false);
                }}
              >
                {!selected && (
                  <option value="" disabled>
                    Chọn lại hũ nhận tiền
                  </option>
                )}
                {vaults.map((vault) => (
                  <option key={vault.id} value={vault.id}>
                    {vault.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="vx-button"
              disabled={!selected || !!reason || dataErrors.length > 0}
              aria-describedby={reason ? "contract-funding-reason" : undefined}
              onClick={() => {
                if (!selected) return;
                setSelectedId(selected.id);
                setOpen(true);
              }}
            >
              <ArrowDownToLine size={19} aria-hidden />
              Nạp tiền
            </button>
          </div>
          {reason && (
            <p
              id="contract-funding-reason"
              className="vx-funding-warning"
              role="status"
            >
              {reason}
            </p>
          )}
          {dataErrors.length > 0 && (
            <p className="vx-funding-warning">
              Dữ liệu hũ chưa cập nhật đầy đủ. Tải lại dữ liệu trước khi nạp
              tiền.
            </p>
          )}
        </>
      )}
      <p className="vx-muted">
        Khoản nạp này được giữ trong hũ smart contract, tách riêng số dư ở tab
        Ví chung Core.
      </p>
      {selected && (
        <DepositVaultModal
          isOpen={open}
          onClose={() => setOpen(false)}
          defaultVaultId={selected.onchainVaultId}
          vaultIds={vaults.map((vault) => vault.onchainVaultId)}
        />
      )}
    </section>
  );
}
