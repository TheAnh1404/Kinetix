"use client";
import { useEffect, useRef, useState } from "react";
import { formatEther, parseEther } from "viem";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ShieldCheck,
  ListChecks,
  Users,
  Flag,
  X,
  Save,
} from "lucide-react";
import { useFamily } from "@/context/FamilyContext";
import { authRequest, useAuth } from "@/hooks/useAuth";
import {
  pendingTransactions,
  reconcileTransactions,
  restoreOperations,
} from "@/lib/web3/client";
import { SNOWTRACE_TESTNET_URL } from "@/contracts/config";
import {
  CreationPhase,
  emptyVaultForm,
  ResolvedVaultConfig,
  validateVaultForm,
  VaultForm,
} from "../../../../shared/vaultCreation";
import styles from "./VaultCreation.module.css";

interface Candidate {
  id: string;
  fullName: string;
  role: string;
  address: string | null;
  linked: boolean;
  permission: string;
  reason: string;
  canGuard: boolean;
}
interface Context {
  workspaceName: string;
  availability: string;
  reason: string;
  candidates: Candidate[];
}
interface Draft {
  id: string;
  config: VaultForm;
  revision: number;
  step: number;
  signaturePending: boolean;
  txHash: string | null;
  vaultId: string | null;
  preflight: null | {
    contractConfig: ResolvedVaultConfig;
    estimatedFeeWei: string;
    checkedAt: string;
    expiresAt: string;
    asOfBlock: string;
    hub: string;
    actor: string;
  };
}
const rules = [
  {
    id: "SHIELD",
    title: "Chi tiêu an toàn",
    icon: ShieldCheck,
    summary: "Khoản nhỏ dùng ngay, khoản lớn cùng duyệt.",
    policy:
      "Người thụ hưởng được rút nhanh trong hạn mức mỗi lần. Hạn mức ngày dùng chung cả hũ bằng 2 lần hạn mức nhanh, đặt lại lúc 00:00 UTC. Khoản lớn cần đủ chữ ký Guardian và số dư khả dụng.",
  },
  {
    id: "MILESTONE",
    title: "Thưởng việc nhà",
    icon: ListChecks,
    summary: "Hoàn thành nhiệm vụ, người bảo hộ duyệt thưởng.",
    policy:
      "Tiền thưởng được giữ riêng khi giao việc. Chỉ trả khi đủ chữ ký Guardian; hủy việc sẽ giải phóng khoản giữ. Người nhận thưởng phải khác Guardian. Cần nạp tiền trước khi giao việc.",
  },
  {
    id: "ROSCA",
    title: "Góp xoay vòng",
    icon: Users,
    summary: "Mỗi người góp đủ, lần lượt nhận theo thứ tự.",
    policy:
      "Mỗi người đóng đúng khoản góp một lần mỗi kỳ. Chỉ chi khi tất cả đã góp và đủ thời gian; kỳ tiếp theo tính từ lần chi trước. Mỗi người nhận một lượt theo thứ tự đã chốt. Hiện chưa có cơ chế hủy hoặc hoàn góp nếu có người bỏ kỳ.",
  },
  {
    id: "SHARED_GOAL",
    title: "Mục tiêu chung",
    icon: Flag,
    summary: "Cùng tích lũy cho một mục tiêu có thời hạn.",
    policy:
      "Chỉ được chi khi đạt mục tiêu hoặc hết hạn và đủ chữ ký Guardian. Điều kiện được kiểm tra lại lúc thực chi; rút một phần trước hạn có thể khiến lần chi tiếp theo phải chờ nạp thêm.",
  },
] as const;
const steps = ["Mục đích", "Thành viên", "Quy tắc", "Kiểm tra & ký"];
const phaseNames: Record<CreationPhase["status"], string> = {
  PRECHECK: "Đang kiểm tra ví và cấu hình",
  AWAITING_SIGNATURE: "Chờ bạn xác nhận trong Core",
  BROADCAST: "Đã gửi, đang chờ xác nhận",
  CONFIRMED: "Đã có receipt, đang đối soát",
  SYNC_PENDING: "Đang cập nhật hũ vào gia đình",
  COMPLETED: "Hũ đã sẵn sàng",
  REVERTED: "Giao dịch đã bị hoàn tác",
};
const localDate = (iso: string) => {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "";
  const value = new Date(iso);
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

export function CreateVaultModal({
  isOpen,
  onClose,
  onNext,
  onManage,
  initialDraftId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onNext?: (vault: any, action: "deposit" | "chore") => void;
  onManage?: (draftId: string) => void;
  initialDraftId?: string;
}) {
  const family = useFamily();
  const auth = useAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const lock = useRef(false);
  const mounted = useRef(true);
  const newDraftId = useRef<string | null>(null);
  const [context, setContext] = useState<Context | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [form, setForm] = useState<VaultForm>(emptyVaultForm);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<CreationPhase | null>(null);
  const [created, setCreated] = useState<any>(null);
  const [recoveryHash, setRecoveryHash] = useState("");
  const workspaceId = family.currentWorkspace?.id;
  const base = `/api/workspaces/${workspaceId}/vault-drafts`;
  const rule = rules.find((item) => item.id === form.ruleTemplate)!;
  const resultVault =
    family.dynamicVaults.find((item) => item.id === created?.id) || created;
  const immutable =
    !!draft?.signaturePending || !!draft?.txHash || !!created || !!phase?.hash;
  const signatureOpen = busy && !phase?.hash;
  const close = () => {
    if (signatureOpen) return;
    if (dirty && !immutable)
      void run(async () => {
        await save();
        onClose();
      });
    else onClose();
  };
  useEffect(() => {
    mounted.current = true;
    const opener = document.activeElement as HTMLElement;
    const node = dialog.current;
    if (isOpen) node?.showModal();
    return () => {
      mounted.current = false;
      node?.close();
      opener?.focus();
    };
  }, [isOpen]);
  useEffect(() => {
    if (!workspaceId || !isOpen) return;
    let active = true;
    void Promise.all([
      authRequest(
        `/api/workspaces/${workspaceId}/vault-creation`,
        undefined,
        "GET",
      ),
      authRequest(base, undefined, "GET"),
    ])
      .then(([data, list]) => {
        if (active) {
          setContext(data.data);
          setDrafts(list.drafts);
          if (initialDraftId) {
            const row = list.drafts.find(
              (item: Draft) => item.id === initialDraftId,
            );
            if (row) chooseDraft(row);
          }
        }
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [workspaceId, isOpen, base, initialDraftId]);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const chooseDraft = (row: Draft) => {
    const needsBufferReview = row.config.bufferRatioBps === undefined && !row.signaturePending && !row.txHash && !row.vaultId;
    setDraft(needsBufferReview ? { ...row, preflight: null } : row);
    setForm({ ...emptyVaultForm(), ...row.config });
    setStep(Math.min(4, row.step));
    setDirty(needsBufferReview);
    setCreated(
      row.vaultId
        ? family.dynamicVaults.find((item) => item.id === row.vaultId) || {
            id: row.vaultId,
            name: row.config.name,
          }
        : null,
    );
    setPhase(
      row.vaultId
        ? { status: "COMPLETED", hash: row.txHash || undefined }
        : row.txHash
          ? { status: "BROADCAST", hash: row.txHash }
          : null,
    );
    setError("");
    setFields({});
  };
  useEffect(() => {
    if (
      !draft?.id ||
      created ||
      busy ||
      (!draft.txHash && !phase?.hash && !draft.signaturePending)
    )
      return;
    let active = true;
    const update = async () => {
      try {
        const fresh = await authRequest(
          `${base}/${draft.id}`,
          undefined,
          "GET",
        );
        if (active && fresh.draft.vaultId) {
          chooseDraft(fresh.draft);
          await family.refreshBalances();
        }
      } catch {
        /* Manual recovery retains the original hash and error. */
      }
    };
    const timer = setInterval(() => void update(), 8000);
    window.addEventListener("kinetix-sync-complete", update);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("kinetix-sync-complete", update);
    };
  }, [
    draft?.id,
    draft?.txHash,
    draft?.signaturePending,
    phase?.hash,
    busy,
    created,
    base,
  ]);
  const change = <K extends keyof VaultForm>(key: K, value: VaultForm[K]) => {
    setForm((old) => ({
      ...old,
      [key]: value,
      ...(key === "guardianIds"
        ? {
            requiredApprovals: Math.min(
              old.requiredApprovals,
              Math.max(1, (value as string[]).length),
            ),
          }
        : {}),
      ...(key !== "policyAccepted" ? { policyAccepted: false } : {}),
    }));
    setDirty(true);
    setSaved("");
    setDraft((old) => (old ? { ...old, preflight: null } : null));
    setFields({});
  };
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err: any) {
      if (mounted.current) {
        setError(err.message || "Chưa hoàn tất thao tác.");
        setFields(err.fields || {});
      }
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const save = async (nextStep = step): Promise<Draft> => {
    if (draft && !dirty && draft.step === nextStep) return draft;
    if (!draft && !newDraftId.current) newDraftId.current = crypto.randomUUID();
    const result = await authRequest(
      draft ? `${base}/${draft.id}` : base,
      {
        id: draft?.id || newDraftId.current,
        config: form,
        step: nextStep,
        revision: draft?.revision,
      },
      draft ? "PATCH" : "POST",
    );
    if (mounted.current) {
      setDraft(result.draft);
      setDirty(false);
      setSaved("Đã lưu bản nháp");
    }
    return result.draft;
  };
  const advance = () =>
    void run(async () => {
      const all = validateVaultForm(
        form,
        BigInt(Math.floor(Date.now() / 1000)),
      );
      const keys =
        step === 1
          ? ["name"]
          : step === 2
            ? ["guardianIds", "beneficiaryIds"]
            : Object.keys(all).filter((key) => key !== "policyAccepted");
      const errors = Object.fromEntries(
        Object.entries(all).filter(([key]) => keys.includes(key)),
      );
      if (Object.keys(errors).length) {
        setFields(errors);
        setError("Kiểm tra các trường bên dưới.");
        return;
      }
      const next = Math.min(4, step + 1);
      await save(next);
      setStep(next);
    });
  const preflight = () =>
    void run(async () => {
      const all = validateVaultForm(
        form,
        BigInt(Math.floor(Date.now() / 1000)),
      );
      if (Object.keys(all).length) {
        setFields(all);
        setError("Hoàn tất cấu hình và xác nhận quy tắc trước khi kiểm tra.");
        return;
      }
      const row = await save(4);
      const result = await authRequest(`${base}/${row.id}/preflight`, {
        revision: row.revision,
      });
      setDraft(result.draft);
      setSaved("Đã kiểm tra cấu hình. Đọc lại tổng kết trước khi ký.");
    });
  const submit = () =>
    void run(async () => {
      if (!draft?.preflight || dirty || immutable) return;
      if (Date.parse(draft.preflight.expiresAt) <= Date.now())
        throw new Error(
          "Lần kiểm tra đã hết hạn. Bấm kiểm tra lại trước khi ký.",
        );
      const result = await family.createCustomVault({
        ...draft.preflight.contractConfig,
        draftId: draft.id,
        onProgress: (value) => {
          if (mounted.current) setPhase(value);
        },
      });
      if (!mounted.current) return;
      if (result.success) {
        setCreated(result.vault);
        setDraft((old) =>
          old
            ? {
                ...old,
                txHash: result.txHash || null,
                vaultId: result.vault.id,
              }
            : null,
        );
      } else {
        setError(result.error || "Chưa hoàn tất tạo hũ.");
        const fresh = await authRequest(
          `${base}/${draft.id}`,
          undefined,
          "GET",
        );
        setDraft(fresh.draft);
        if (
          !fresh.draft.signaturePending &&
          !fresh.draft.txHash &&
          !result.txHash
        )
          setPhase(null);
      }
    });
  const recover = () =>
    void run(async () => {
      if (!draft || !auth.user) return;
      const local = pendingTransactions(auth.user.id).find(
        (item) => (item.sync?.body as any)?.draftId === draft.id,
      );
      const hash = draft.txHash || local?.hash || recoveryHash.trim();
      if (hash) {
        if (!/^0x[0-9a-f]{64}$/i.test(hash))
          throw new Error("Nhập mã giao dịch đầy đủ từ Core.");
        await authRequest(`${base}/${draft.id}/transaction`, { txHash: hash });
        await restoreOperations(auth.user.id, workspaceId!);
        await reconcileTransactions(auth.user.id);
      }
      await family.refreshBalances();
      const fresh = await authRequest(`${base}/${draft.id}`, undefined, "GET");
      chooseDraft(fresh.draft);
      if (!fresh.draft.vaultId)
        setSaved(
          "Đã đối soát. Nếu giao dịch chưa finalized, hãy chờ rồi kiểm tra lại; không ký tạo lại.",
        );
    });
  const names = (ids: string[]) =>
    ids.map(
      (id) =>
        context?.candidates.find((item) => item.id === id)?.fullName ||
        "Thành viên không còn khả dụng",
    );
  const amountField = (
    key: "fastWithdrawLimit" | "targetGoalAmount" | "roscaRoundContribution",
    label: string,
  ) => (
    <label className={styles.field}>
      {label}
      <span className={styles.amount}>
        <input
          value={form[key]}
          onChange={(event) => change(key, event.target.value)}
          inputMode="decimal"
          aria-invalid={!!fields[key]}
        />
        <b>AVAX</b>
      </span>
      {fields[key] && <small role="alert">{fields[key]}</small>}
    </label>
  );
  if (!isOpen) return null;
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="vault-create-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className={styles.frame}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>KINETIX / HŨ TIỀN MỚI</span>
            <h1 id="vault-create-title">Một hũ tiền, một mục đích rõ ràng.</h1>
            <p>
              {context?.workspaceName || family.currentWorkspace?.name} · AVAX
              trên Avalanche Fuji
            </p>
          </div>
          <button
            className={styles.iconButton}
            aria-label="Đóng tạo hũ"
            disabled={signatureOpen}
            onClick={close}
          >
            <X />
          </button>
        </header>
        <nav aria-label="Các bước tạo hũ">
          <ol className={styles.steps}>
            {steps.map((label, index) => (
              <li
                key={label}
                aria-current={step === index + 1 ? "step" : undefined}
                className={step >= index + 1 ? styles.active : ""}
              >
                <span>
                  {step > index + 1 ? <Check size={16} /> : index + 1}
                </span>
                {label}
              </li>
            ))}
          </ol>
        </nav>
        <div className={styles.layout}>
          <main className={styles.main}>
            {error && (
              <div role="alert" className={styles.error}>
                {error}
                {!busy && (draft?.id || newDraftId.current) && (
                  <div className={styles.actions}>
                    <button
                      className={styles.secondary}
                      onClick={() =>
                        void run(async () => {
                          const fresh = await authRequest(
                            `${base}/${draft?.id || newDraftId.current}`,
                            undefined,
                            "GET",
                          );
                          chooseDraft(fresh.draft);
                        })
                      }
                    >
                      Tải lại bản nháp đã lưu
                    </button>
                    {dirty && !immutable && (
                      <button className={styles.secondary} onClick={onClose}>
                        Đóng, bỏ thay đổi chưa lưu
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            {saved && (
              <p role="status" className={styles.saved}>
                {saved}
              </p>
            )}
            {!context && !error && (
              <p role="status">Đang tải gia đình và bản nháp…</p>
            )}
            {context && context.availability !== "READY" && (
              <div className={styles.notice}>
                {context.reason}
                <p>Bản nháp chưa tạo hũ trên blockchain và chưa chuyển tiền.</p>
                <button
                  className={styles.secondary}
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const response = await authRequest(
                        `/api/workspaces/${workspaceId}/vault-creation`,
                        undefined,
                        "GET",
                      );
                      setContext(response.data);
                    })
                  }
                >
                  Kiểm tra khả dụng lại
                </button>
              </div>
            )}
            {!draft && drafts.length > 0 && (
              <details className={styles.drafts}>
                <summary>
                  Tiếp tục bản nháp / giao dịch trước ({drafts.length})
                </summary>
                {drafts.map((row) => (
                  <button
                    key={row.id}
                    disabled={busy}
                    onClick={() => chooseDraft(row)}
                  >
                    {row.config.name || "Hũ chưa đặt tên"}
                    <span>
                      {row.vaultId
                        ? "Đã tạo"
                        : row.txHash
                          ? "Chờ đối soát"
                          : row.signaturePending
                            ? "Đã mở ký"
                            : `Bước ${row.step}`}
                    </span>
                  </button>
                ))}
              </details>
            )}
            {created ? (
              <section className={styles.result} aria-live="polite">
                <span className={styles.successIcon}>
                  <Check size={36} />
                </span>
                <h2 ref={heading} tabIndex={-1}>
                  Đã tạo {created.name || form.name}
                </h2>
                <p>
                  Receipt đã xác minh và hũ đã được đăng ký vào gia đình. Số dư
                  ban đầu là 0 AVAX.
                </p>
                <p>{rule.policy}</p>
                <div className={styles.actions}>
                  {resultVault.onchainVaultId &&
                    form.ruleTemplate !== "ROSCA" && (
                      <button
                        className={styles.primary}
                        onClick={() => onNext?.(resultVault, "deposit")}
                      >
                        Nạp tiền vào hũ
                      </button>
                    )}
                  {resultVault.onchainVaultId &&
                    form.ruleTemplate === "MILESTONE" && (
                      <button
                        className={styles.secondary}
                        onClick={() => onNext?.(resultVault, "chore")}
                      >
                        Giao việc sau khi nạp
                      </button>
                    )}
                  <button
                    className={styles.secondary}
                    onClick={() => {
                      family.setSelectedVault(
                        family.dynamicVaults.find(
                          (item) => item.id === created.id,
                        ) || null,
                      );
                      window.dispatchEvent(
                        new CustomEvent("kinetix-vault-selected", {
                          detail: created.id,
                        }),
                      );
                      close();
                    }}
                  >
                    {form.ruleTemplate === "ROSCA"
                      ? "Xem hũ để góp kỳ đầu"
                      : "Xem hũ trong gia đình"}
                  </button>
                </div>
              </section>
            ) : immutable || phase ? (
              <section className={styles.result} aria-live="polite">
                <h2 ref={heading} tabIndex={-1}>
                  {phase
                    ? phaseNames[phase.status]
                    : "Đang đối soát lượt ký trước"}
                </h2>
                <p>
                  {draft?.signaturePending && !phase?.hash
                    ? "Core đã được mở cho bản nháp này. Kiểm tra lịch sử trong Core trước khi tiếp tục. Nếu chưa rõ giao dịch đã gửi hay chưa, không ký lại."
                    : "Theo dõi cùng một giao dịch đến khi receipt và dữ liệu gia đình được xác minh."}
                </p>
                <ol className={styles.timeline}>
                  {[
                    "Xác nhận trong Core",
                    "Gửi lên blockchain",
                    "Xác nhận receipt",
                    "Đăng ký hũ vào gia đình",
                  ].map((text) => (
                    <li key={text}>{text}</li>
                  ))}
                </ol>
                {(phase?.hash || draft?.txHash) && (
                  <details>
                    <summary>Chi tiết giao dịch</summary>
                    <a
                      className={styles.hash}
                      href={`${SNOWTRACE_TESTNET_URL}/tx/${phase?.hash || draft?.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {phase?.hash || draft?.txHash}
                    </a>
                  </details>
                )}
                {!busy && (
                  <>
                    <label className={styles.field}>
                      Mã giao dịch từ Core (nếu chưa ghi nhận)
                      <input
                        value={recoveryHash}
                        onChange={(event) =>
                          setRecoveryHash(event.target.value)
                        }
                        placeholder="0x…"
                      />
                    </label>
                    <button className={styles.primary} onClick={recover}>
                      Đối soát giao dịch đã gửi
                    </button>
                  </>
                )}
                {phase?.hash && (
                  <p>
                    Có thể đóng màn hình; giao dịch tiếp tục được theo dõi. Mở
                    lại trong danh sách bản nháp để đối soát.
                  </p>
                )}
              </section>
            ) : (
              <fieldset disabled={busy} className={styles.form}>
                <h2 ref={heading} tabIndex={-1}>
                  {steps[step - 1]}
                </h2>
                {step === 1 && (
                  <>
                    <p>Chọn cách gia đình sẽ sử dụng tiền trong hũ.</p>
                    <div className={styles.ruleGrid}>
                      {rules.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          className={`${styles.rule} ${form.ruleTemplate === item.id ? styles.selected : ""}`}
                          aria-pressed={form.ruleTemplate === item.id}
                          onClick={() => change("ruleTemplate", item.id)}
                        >
                          <item.icon size={25} />
                          <strong>{item.title}</strong>
                          <span>{item.summary}</span>
                          {form.ruleTemplate === item.id && <Check size={18} />}
                        </button>
                      ))}
                    </div>
                    <label className={styles.field}>
                      Tên hũ
                      <input
                        value={form.name}
                        maxLength={80}
                        placeholder="Ví dụ: Chuyến đi Đà Lạt của nhà mình"
                        onChange={(event) => change("name", event.target.value)}
                        aria-invalid={!!fields.name}
                      />
                      {fields.name && <small role="alert">{fields.name}</small>}
                    </label>
                    <label className={styles.field}>
                      Mô tả (không bắt buộc)
                      <textarea
                        value={form.description}
                        maxLength={1000}
                        rows={3}
                        onChange={(event) =>
                          change("description", event.target.value)
                        }
                      />
                      <small>
                        Mô tả lưu riêng trong ứng dụng, không công bố lên
                        blockchain.
                      </small>
                    </label>
                  </>
                )}
                {step === 2 && (
                  <>
                    <p>
                      Vai trò trong hũ áp dụng riêng cho hũ này. Người tạo chỉ
                      có quyền ký duyệt nếu được chọn làm Guardian.
                    </p>
                    {onManage &&
                      auth.workspaces?.some(
                        (item) =>
                          item.id === workspaceId &&
                          (item.role === "ADMIN" || item.canManageMembers),
                      ) && (
                        <button
                          className={styles.secondary}
                          onClick={() =>
                            void run(async () => {
                              const row = await save();
                              onManage(row.id);
                            })
                          }
                        >
                          Quản lý thành viên rồi quay lại bản nháp
                        </button>
                      )}
                    {(["guardianIds", "beneficiaryIds"] as const).map((key) => (
                      <section key={key} className={styles.memberSection}>
                        <h3>
                          {key === "guardianIds"
                            ? "Người ký duyệt (Guardian)"
                            : form.ruleTemplate === "ROSCA"
                              ? "Người góp & nhận theo lượt"
                              : "Người thụ hưởng"}{" "}
                          <span>
                            {form[key].length}/{key === "guardianIds" ? 32 : 64}
                          </span>
                        </h3>
                        {fields[key] && (
                          <p role="alert" className={styles.fieldError}>
                            {fields[key]}
                          </p>
                        )}
                        {context?.candidates.map((member) => {
                          const selected = form[key].includes(member.id);
                          const blocked =
                            !member.linked ||
                            (key === "guardianIds" && !member.canGuard) ||
                            member.permission === "DENIED" ||
                            (!selected &&
                              form[key].length >=
                                (key === "guardianIds" ? 32 : 64));
                          return (
                            <label
                              key={member.id}
                              className={`${styles.member} ${selected ? styles.memberSelected : ""}`}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                disabled={blocked && !selected}
                                onChange={() =>
                                  change(
                                    key,
                                    selected
                                      ? form[key].filter(
                                          (id) => id !== member.id,
                                        )
                                      : [...form[key], member.id],
                                  )
                                }
                              />
                              <span>
                                <strong>{member.fullName}</strong>
                                <small>
                                  {member.role} · {member.reason}
                                  {key === "guardianIds" && !member.canGuard
                                    ? " · Cần vai trò người bảo hộ"
                                    : ""}
                                </small>
                                {member.address && (
                                  <code>
                                    {member.address.slice(0, 8)}…
                                    {member.address.slice(-6)}
                                  </code>
                                )}
                              </span>
                            </label>
                          );
                        })}
                      </section>
                    ))}
                    <p className={styles.notice}>
                      Thêm hoặc liên kết Core cho thành viên ở mục Thành viên.
                      Ví chưa xác minh quyền vẫn có thể đưa vào bản nháp; trước
                      ký, hệ thống sẽ kiểm tra lại toàn bộ.
                    </p>
                    {form.ruleTemplate === "ROSCA" &&
                      form.beneficiaryIds.length > 0 && (
                        <section className={styles.order}>
                          <h3>Thứ tự nhận tiền (cố định sau khi tạo)</h3>
                          {form.beneficiaryIds.map((id, index) => (
                            <div key={id}>
                              <b>
                                {index + 1}. {names([id])[0]}
                              </b>
                              {[-1, 1].map((direction) => (
                                <button
                                  key={direction}
                                  aria-label={`Đưa ${names([id])[0]} ${direction < 0 ? "lên" : "xuống"}`}
                                  disabled={
                                    index + direction < 0 ||
                                    index + direction >=
                                      form.beneficiaryIds.length
                                  }
                                  onClick={() => {
                                    const ids = [...form.beneficiaryIds];
                                    [ids[index + direction], ids[index]] = [
                                      ids[index],
                                      ids[index + direction],
                                    ];
                                    change("beneficiaryIds", ids);
                                  }}
                                >
                                  {direction < 0 ? "↑" : "↓"}
                                </button>
                              ))}
                            </div>
                          ))}
                        </section>
                      )}
                  </>
                )}
                {step === 3 && (
                  <>
                    <label className={styles.field} htmlFor="vault-buffer-ratio">
                      Đệm thanh khoản tại Family L1
                      <output htmlFor="vault-buffer-ratio">
                        {form.bufferRatioBps / 100}% rút tức thì / {100 - form.bufferRatioBps / 100}% phân bổ Fuji C-Chain
                      </output>
                      <input
                        id="vault-buffer-ratio"
                        type="range"
                        min={0}
                        max={10000}
                        step={100}
                        value={form.bufferRatioBps}
                        onChange={(event) => change("bufferRatioBps", Number(event.target.value))}
                        aria-valuetext={`${form.bufferRatioBps / 100}% đệm Family L1; ${100 - form.bufferRatioBps / 100}% Fuji C-Chain`}
                        aria-describedby="vault-buffer-help"
                        aria-invalid={!!fields.bufferRatioBps}
                      />
                      <small id="vault-buffer-help">
                        Khuyến nghị 10% Đệm rút tức thì tại Family L1 / 90% Gửi sinh lời 8% APY trên Fuji C-Chain.
                        Lãi 8% là mô hình trả từ quỹ dự trữ. Tỷ lệ là chính sách phân bổ; vốn vẫn được giữ tại kho tiền cho tới khi có chuyển tài sản được xác minh.
                      </small>
                      {fields.bufferRatioBps && <small role="alert">{fields.bufferRatioBps}</small>}
                    </label>
                    <label className={styles.field}>
                      Số Guardian cần đồng ý
                      <select
                        value={form.requiredApprovals}
                        onChange={(event) =>
                          change(
                            "requiredApprovals",
                            Number(event.target.value),
                          )
                        }
                      >
                        {Array.from(
                          {
                            length: Math.max(
                              form.guardianIds.length,
                              form.requiredApprovals,
                              1,
                            ),
                          },
                          (_, index) => (
                            <option key={index} value={index + 1}>
                              {index + 1} trên {form.guardianIds.length} người
                            </option>
                          ),
                        )}
                      </select>
                      {fields.guardianIds && (
                        <small role="alert">{fields.guardianIds}</small>
                      )}
                    </label>
                    {form.ruleTemplate === "SHIELD" && (
                      <>
                        {amountField(
                          "fastWithdrawLimit",
                          "Hạn mức rút nhanh mỗi lần",
                        )}
                        <p>
                          Hạn mức ngày chung:{" "}
                          {(() => {
                            try {
                              return formatEther(
                                parseEther(form.fastWithdrawLimit) * 2n,
                              );
                            } catch {
                              return "—";
                            }
                          })()}{" "}
                          AVAX. Đặt 0 để mọi khoản rút đều cần duyệt.
                        </p>
                      </>
                    )}
                    {form.ruleTemplate === "SHARED_GOAL" && (
                      <>
                        {amountField("targetGoalAmount", "Số tiền mục tiêu")}
                        <label className={styles.field}>
                          Hạn đạt mục tiêu (giờ trên thiết bị)
                          <input
                            type="datetime-local"
                            value={localDate(form.targetDeadline)}
                            onChange={(event) =>
                              change(
                                "targetDeadline",
                                event.target.value &&
                                  Number.isFinite(
                                    new Date(event.target.value).getTime(),
                                  )
                                  ? new Date(event.target.value).toISOString()
                                  : "",
                              )
                            }
                          />
                          {fields.targetDeadline && (
                            <small role="alert">{fields.targetDeadline}</small>
                          )}
                          <small>
                            {Intl.DateTimeFormat().resolvedOptions().timeZone}
                            {form.targetDeadline
                              ? ` · ${new Date(form.targetDeadline).toLocaleString("vi-VN", { timeZoneName: "short" })}`
                              : ""}
                          </small>
                        </label>
                      </>
                    )}
                    {form.ruleTemplate === "ROSCA" && (
                      <>
                        {amountField(
                          "roscaRoundContribution",
                          "Mỗi người góp mỗi kỳ",
                        )}
                        <label className={styles.field}>
                          Khoảng cách tối thiểu giữa hai kỳ
                          <select
                            value={form.roscaRoundDuration}
                            onChange={(event) =>
                              change("roscaRoundDuration", event.target.value)
                            }
                          >
                            {[
                              ["86400", "1 ngày"],
                              ["604800", "7 ngày"],
                              ["2592000", "30 ngày"],
                            ].map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                            {!["86400", "604800", "2592000"].includes(
                              form.roscaRoundDuration,
                            ) && (
                              <option value={form.roscaRoundDuration}>
                                {form.roscaRoundDuration} giây (bản nháp)
                              </option>
                            )}
                          </select>
                          {fields.roscaRoundDuration && (
                            <small role="alert">
                              {fields.roscaRoundDuration}
                            </small>
                          )}
                        </label>
                      </>
                    )}
                    <div className={styles.policy}>
                      <h3>Quy tắc cần hiểu trước khi tạo</h3>
                      <p>{rule.policy}</p>
                      <p>
                        Danh sách người nhận, Guardian và quy tắc được chốt trên
                        blockchain. Thay đổi thông tin trong ứng dụng không tự
                        sửa cấu hình hũ.
                      </p>
                    </div>
                  </>
                )}
                {step === 4 && (
                  <>
                    <p>Kiểm tra đúng người, đúng mục đích trước khi mở Core.</p>
                    <dl className={styles.review}>
                      <div>
                        <dt>Gia đình</dt>
                        <dd>{context?.workspaceName}</dd>
                      </div>
                      <div>
                        <dt>Hũ</dt>
                        <dd>
                          {form.name} · {rule.title}
                        </dd>
                      </div>
                      {form.description && (
                        <div>
                          <dt>Mô tả</dt>
                          <dd>{form.description}</dd>
                        </div>
                      )}
                      <div>
                        <dt>Guardian</dt>
                        <dd>
                          {names(form.guardianIds).join(", ")} · cần{" "}
                          {form.requiredApprovals}/{form.guardianIds.length} chữ
                          ký
                        </dd>
                      </div>
                      <div>
                        <dt>
                          {form.ruleTemplate === "ROSCA"
                            ? "Thứ tự nhận"
                            : "Người nhận"}
                        </dt>
                        <dd>
                          {names(form.beneficiaryIds).map((name, index) => (
                            <span key={index}>
                              {form.ruleTemplate === "ROSCA"
                                ? `${index + 1}. `
                                : ""}
                              {name}
                              <br />
                            </span>
                          ))}
                        </dd>
                      </div>
                      <div>
                        <dt>Quy tắc</dt>
                        <dd>
                          {form.ruleTemplate === "SHIELD"
                            ? `${form.fastWithdrawLimit} AVAX/lần; hạn mức ngày chung gấp đôi.`
                            : form.ruleTemplate === "ROSCA"
                              ? `${form.roscaRoundContribution} AVAX/người/kỳ; mỗi kỳ tối thiểu ${Number(form.roscaRoundDuration) / 86400} ngày.`
                              : form.ruleTemplate === "SHARED_GOAL"
                                ? `${form.targetGoalAmount} AVAX trước ${form.targetDeadline ? new Date(form.targetDeadline).toLocaleString("vi-VN", { timeZoneName: "short" }) : "chưa chọn hạn"}.`
                                : "Giữ tiền khi giao việc, trả thưởng sau khi đủ chữ ký."}
                        </dd>
                      </div>
                      <div>
                        <dt>Phân bổ thanh khoản</dt>
                        <dd>{form.bufferRatioBps / 100}% Family L1 / {100 - form.bufferRatioBps / 100}% Fuji C-Chain · {form.bufferRatioBps} bps</dd>
                      </div>
                      <div>
                        <dt>Tài sản & mạng</dt>
                        <dd>
                          AVAX · Avalanche Fuji (43113)
                          <small>
                            Tài sản chỉ được ghi nhận ở C-Chain sau khi xác minh vốn nhận thực tế. Lãi 8% APY được chi từ reserve độc lập.
                          </small>
                        </dd>
                      </div>
                      <div>
                        <dt>Khi tạo</dt>
                        <dd>
                          0 AVAX vào hũ
                          <small>
                            Chỉ thanh toán phí mạng bằng AVAX. Nạp tiền là bước
                            riêng sau khi tạo.
                          </small>
                        </dd>
                      </div>
                      <div>
                        <dt>Phí mạng ước tính</dt>
                        <dd>
                          {draft?.preflight
                            ? `${formatEther(BigInt(draft.preflight.estimatedFeeWei))} AVAX`
                            : "Bấm kiểm tra cấu hình để ước tính"}
                          <small>Phí thực tế do Core hiển thị lúc ký.</small>
                        </dd>
                      </div>
                    </dl>
                    <div className={styles.policy}>
                      <p>{rule.policy}</p>
                    </div>
                    <label className={styles.consent}>
                      <input
                        type="checkbox"
                        checked={form.policyAccepted}
                        onChange={(event) =>
                          change("policyAccepted", event.target.checked)
                        }
                      />
                      Tôi đã kiểm tra thành viên và hiểu quy tắc, giới hạn của
                      hũ này.
                    </label>
                    {fields.policyAccepted && (
                      <p role="alert" className={styles.fieldError}>
                        {fields.policyAccepted}
                      </p>
                    )}
                    {(!auth.connectedAddress || !auth.walletMatches) && (
                      <div className={styles.notice}>
                        <p>
                          {!auth.connectedAddress
                            ? "Kết nối Core để ký bằng ví đã liên kết với tài khoản."
                            : "Core đang dùng ví khác. Chọn đúng ví đã liên kết trước khi ký."}
                        </p>
                        <button
                          className={styles.secondary}
                          onClick={() =>
                            void run(async () => {
                              await auth.connectWallet();
                            })
                          }
                        >
                          Kết nối Core
                        </button>
                      </div>
                    )}
                    {draft?.preflight && (
                      <details className={styles.technical}>
                        <summary>Thông tin đã xác minh</summary>
                        <p>
                          Block finalized {draft.preflight.asOfBlock} ·{" "}
                          {new Date(draft.preflight.checkedAt).toLocaleString(
                            "vi-VN",
                          )}
                        </p>
                        <p>
                          Kiểm tra có hiệu lực đến{" "}
                          {new Date(
                            draft.preflight.expiresAt,
                          ).toLocaleTimeString("vi-VN")}
                        </p>
                        <p className={styles.hash}>
                          Ví tạo: {draft.preflight.actor}
                          <br />
                          Hub: {draft.preflight.hub}
                        </p>
                      </details>
                    )}
                  </>
                )}
              </fieldset>
            )}
          </main>
          <aside className={styles.aside}>
            <span className={styles.eyebrow}>HŨ CỦA GIA ĐÌNH</span>
            <rule.icon size={40} />
            <h2>{form.name || "Hũ tiền mới"}</h2>
            <p>{rule.summary}</p>
            <dl>
              <div>
                <dt>Loại hũ</dt>
                <dd>{rule.title}</dd>
              </div>
              <div>
                <dt>Người nhận</dt>
                <dd>{form.beneficiaryIds.length} người</dd>
              </div>
              <div>
                <dt>Ký duyệt</dt>
                <dd>
                  {form.requiredApprovals}/{form.guardianIds.length} Guardian
                </dd>
              </div>
              <div>
                <dt>Số dư ban đầu</dt>
                <dd>0 AVAX</dd>
              </div>
            </dl>
            <p className={styles.asideNote}>
              Mọi lần chuyển tiền đều cần xác nhận riêng. Kinetix không giữ khóa
              riêng của bạn.
            </p>
          </aside>
        </div>
        <footer className={styles.footer}>
          <div>
            {!immutable && !phase && (
              <button
                disabled={busy}
                className={styles.secondary}
                onClick={() =>
                  void run(async () => {
                    await save();
                  })
                }
              >
                <Save size={18} />
                Lưu nháp
              </button>
            )}
            <span>
              {dirty
                ? "Có thay đổi chưa lưu"
                : draft
                  ? "Bản nháp đã lưu trên tài khoản"
                  : "Chưa gửi giao dịch"}
            </span>
          </div>
          <div className={styles.actions}>
            {!immutable && !phase && step > 1 && (
              <button
                className={styles.secondary}
                disabled={busy}
                onClick={() => {
                  setStep(step - 1);
                  setError("");
                  setFields({});
                }}
              >
                <ArrowLeft size={18} />
                Quay lại
              </button>
            )}
            {!immutable && !phase && step < 4 && (
              <button
                disabled={busy || !context}
                className={styles.primary}
                onClick={advance}
              >
                {busy ? "Đang lưu…" : "Tiếp tục"}
                <ArrowRight size={18} />
              </button>
            )}
            {!immutable && !phase && step === 4 && (
              <>
                {draft?.preflight && !dirty && (
                  <button
                    className={styles.secondary}
                    disabled={busy}
                    onClick={preflight}
                  >
                    Kiểm tra lại
                  </button>
                )}
                <button
                  className={styles.primary}
                  disabled={
                    busy ||
                    context?.availability !== "READY" ||
                    !form.policyAccepted ||
                    (!!draft?.preflight &&
                      (!auth.walletMatches || !auth.connectedAddress))
                  }
                  onClick={draft?.preflight && !dirty ? submit : preflight}
                >
                  {busy
                    ? "Đang kiểm tra…"
                    : draft?.preflight && !dirty
                      ? "Xác nhận & mở Core"
                      : "Kiểm tra cấu hình & phí"}
                </button>
              </>
            )}
            {(immutable || phase) && (
              <button
                className={styles.secondary}
                disabled={signatureOpen}
                onClick={close}
              >
                {created ? "Hoàn tất" : "Đóng & theo dõi sau"}
              </button>
            )}
          </div>
        </footer>
      </div>
    </dialog>
  );
}
