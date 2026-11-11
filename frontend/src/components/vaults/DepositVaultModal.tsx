"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Wallet,
  X,
} from "lucide-react";
import { parseEther } from "viem";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/hooks/useAuth";
import {
  hubChain,
  SNOWTRACE_TESTNET_URL,
  DEPLOYMENT,
} from "@/contracts/config";
import { vaultMappingIssue } from "../../../../shared/vaultMapping";
import styles from "./DepositVaultModal.module.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultVaultId?: number;
  vaultIds?: number[];
  onNext?: () => void;
}

export function DepositVaultModal(props: Props) {
  const { currentWorkspace } = useFamily();
  const { user } = useAuth();
  return props.isOpen ? (
    <DepositDialog
      key={`${user?.id}:${currentWorkspace?.id}:${props.defaultVaultId}`}
      {...props}
    />
  ) : null;
}

function DepositDialog({ onClose, defaultVaultId, vaultIds, onNext }: Props) {
  const {
    dynamicVaults,
    depositToVault,
    currentWorkspace,
    isDataLoading,
    dataErrors,
  } = useFamily();
  const auth = useAuth();
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const locked = useRef(false);
  const mounted = useRef(true);
  const vaults = dynamicVaults.filter(
    (vault) =>
      vault.workspaceId === currentWorkspace?.id &&
      vault.ruleTemplate !== "ROSCA" &&
      (!vaultIds || vaultIds.includes(vault.onchainVaultId)),
  );
  const [selected, setSelected] = useState(
    defaultVaultId ?? vaults[0]?.onchainVaultId,
  );
  const [amount, setAmount] = useState("0.02");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const [receipt, setReceipt] = useState<{
    hash: string;
    amount: string;
    name: string;
    rule: string;
    vaultId: number;
  } | null>(null);
  // Never silently substitute another recipient if the selected vault disappears.
  const vault = vaults.find((item) => item.onchainVaultId === selected);
  const mappingIssue = vault
    ? vaultMappingIssue(vault, hubChain.id, currentWorkspace?.l1HubAddress)
    : null;
  const blockedReason = !DEPLOYMENT.enabled
    ? "Hũ smart contract chưa sẵn sàng nhận tiền. Chủ nhà cần hoàn tất cấu hình và xác minh hợp đồng trước khi nạp."
    : !currentWorkspace
      ? "Chọn gia đình trước khi nạp tiền."
      : isDataLoading
        ? "Đang cập nhật danh sách hũ…"
        : dataErrors.length > 0
          ? "Dữ liệu hũ chưa cập nhật đầy đủ. Đóng cửa sổ và tải lại dữ liệu trước khi nạp."
          : !vault
            ? "Chọn hũ nhận tiền còn khả dụng trong gia đình này."
            : mappingIssue?.message ||
              (!vault.isActive ? "Hũ này đang tạm ngừng nhận tiền." : null) ||
              (!auth.linkedWallet
                ? "Liên kết ví Core trong cài đặt để nạp tiền."
                : null);
  let valid = false;
  try {
    valid = /^\d+(\.\d{1,18})?$/.test(amount) && parseEther(amount) > 0n;
  } catch {
    /* Invalid input stays editable. */
  }
  const amountError =
    touched && !valid
      ? "Nhập số AVAX lớn hơn 0, tối đa 18 chữ số thập phân."
      : "";

  useEffect(() => {
    mounted.current = true;
    const previousFocus = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    input.current?.focus();
    return () => {
      mounted.current = false;
      element?.close();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!vault || !valid || blockedReason || locked.current) return;
    locked.current = true;
    setPending(true);
    setError("");
    const submitted = {
      amount,
      name: vault.name,
      rule: vault.ruleTemplate,
      vaultId: vault.onchainVaultId,
    };
    try {
      const result = await depositToVault(submitted.vaultId, submitted.amount);
      if (!mounted.current) return;
      if (result.success && result.txHash)
        setReceipt({ ...submitted, hash: result.txHash });
      else
        setError(
          result.error ||
            "Chưa thể hoàn tất khoản nạp. Kiểm tra trạng thái giao dịch trước khi thử lại.",
        );
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "Chưa thể nạp tiền. Hãy thử lại.",
        );
    } finally {
      locked.current = false;
      if (mounted.current) setPending(false);
    }
  };
  const updateAmount = (value: string) => {
    setAmount(value);
    setError("");
  };

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onCancel={(event) => {
        event.preventDefault();
        if (!locked.current) onClose();
      }}
    >
      <div className={styles.body}>
        <header className={styles.header}>
          <span className={styles.icon}>
            <ArrowDownToLine size={24} aria-hidden />
          </span>
          <div>
            <p className={styles.eyebrow}>HŨ SMART CONTRACT</p>
            <h2 id={`${id}-title`}>Nạp tiền vào hũ</h2>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            disabled={pending}
            aria-label="Đóng cửa sổ nạp tiền"
          >
            <X size={22} aria-hidden />
          </button>
        </header>
        <p id={`${id}-description`} className={styles.muted}>
          Từ ví cá nhân · {hubChain.name} · AVAX
        </p>
        {receipt ? (
          <section className={styles.success} role="status">
            <CheckCircle2 size={44} aria-hidden />
            <h3>Đã nạp tiền vào hũ</h3>
            <p>
              <strong>{receipt.amount} AVAX</strong> đã được nạp vào{" "}
              <strong>{receipt.name}</strong>.
            </p>
            <a
              href={`${SNOWTRACE_TESTNET_URL}/tx/${receipt.hash}`}
              target="_blank"
              rel="noreferrer"
            >
              Xem giao dịch <ExternalLink size={16} aria-hidden />
            </a>
            {onNext &&
              receipt.rule === "MILESTONE" &&
              receipt.vaultId === defaultVaultId && (
                <button
                  type="button"
                  className={styles.primary}
                  onClick={onNext}
                >
                  Tiếp tục giao việc cho con
                </button>
              )}
            <button
              type="button"
              className={styles.secondary}
              onClick={onClose}
            >
              Hoàn tất
            </button>
          </section>
        ) : (
          <form
            className={styles.form}
            onSubmit={(event) => void submit(event)}
            noValidate
            aria-busy={pending}
          >
            <label htmlFor={`${id}-vault`}>Hũ nhận tiền</label>
            <select
              id={`${id}-vault`}
              value={vault?.onchainVaultId ?? ""}
              disabled={pending || !vaults.length}
              onChange={(event) => {
                setSelected(Number(event.target.value));
                setError("");
              }}
            >
              {!vault && (
                <option value="" disabled>
                  {vaults.length
                    ? "Chọn lại hũ nhận tiền"
                    : "Chưa có hũ phù hợp"}
                </option>
              )}
              {vaults.map((item) => (
                <option key={item.id} value={item.onchainVaultId}>
                  {item.name}
                </option>
              ))}
            </select>
            {blockedReason && (
              <div
                className={styles.warning}
                id={`${id}-blocked`}
                role="status"
              >
                <p>{blockedReason}</p>
                {!auth.linkedWallet && (
                  <Link href="/settings?tab=wallet" onClick={onClose}>
                    Mở cài đặt ví
                  </Link>
                )}
              </div>
            )}
            <label htmlFor={`${id}-amount`}>Số tiền nạp (AVAX)</label>
            <div className={styles.amount}>
              <input
                ref={input}
                id={`${id}-amount`}
                name="amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={amount}
                disabled={pending}
                onChange={(event) => updateAmount(event.target.value)}
                onBlur={() => setTouched(true)}
                aria-invalid={!!amountError}
                aria-describedby={`${id}-hint${amountError ? ` ${id}-amount-error` : ""}`}
              />
              <span>AVAX</span>
            </div>
            <div
              className={styles.presets}
              role="group"
              aria-label="Chọn nhanh số AVAX"
            >
              {["0.01", "0.05", "0.1", "0.5", "1"].map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={pending}
                  aria-pressed={amount === value}
                  onClick={() => updateAmount(value)}
                >
                  {value}
                </button>
              ))}
            </div>
            {amountError && (
              <p
                id={`${id}-amount-error`}
                className={styles.error}
                role="alert"
              >
                {amountError}
              </p>
            )}
            <div className={styles.note} id={`${id}-hint`}>
              <Wallet size={20} aria-hidden />
              <p>
                Core sẽ yêu cầu bạn xác nhận khoản nạp. Giữ thêm AVAX trong ví
                cá nhân để trả phí mạng. Số dư hũ chỉ tăng sau khi giao dịch
                được xác nhận.
              </p>
            </div>
            {vault?.onchainVaultAddress && (
              <details className={styles.details}>
                <summary>Địa chỉ hũ nhận tiền</summary>
                <p>{vault.onchainVaultAddress}</p>
                <a
                  href={`${SNOWTRACE_TESTNET_URL}/address/${vault.onchainVaultAddress}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Xem trên trình khám phá <ExternalLink size={15} aria-hidden />
                </a>
                <p>
                  Hãy dùng nút nạp tại đây để giao dịch được ghi nhận đúng vào
                  hũ.
                </p>
              </details>
            )}
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            {pending && (
              <p className={styles.muted} role="status">
                Đang chờ Core và xác nhận mạng. Giữ cửa sổ này để theo dõi khoản
                nạp.
              </p>
            )}
            <footer className={styles.actions}>
              <button
                type="button"
                className={styles.secondary}
                onClick={onClose}
                disabled={pending}
              >
                Quay lại
              </button>
              <button
                type="submit"
                className={styles.primary}
                disabled={pending || !valid || !!blockedReason}
                aria-describedby={blockedReason ? `${id}-blocked` : undefined}
              >
                {pending ? (
                  <>
                    <Loader2 className={styles.spin} size={19} aria-hidden />
                    Đang xử lý…
                  </>
                ) : (
                  <>
                    <ArrowDownToLine size={19} aria-hidden />
                    Nạp {valid ? amount : ""} AVAX
                  </>
                )}
              </button>
            </footer>
          </form>
        )}
      </div>
    </dialog>
  );
}
