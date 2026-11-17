"use client";
import React, { useEffect, useRef, useState } from "react";
import { formatEther } from "viem";
import { GroupFundItem, ProposeExpenseParams } from "@/types/groupFinance";
import { FinanceDialog } from "./FinanceDialog";
import { prepareImage } from "@/components/member/ProofUploader";
import { groupAmount } from "../../../../shared/groupFinance";
import { useAuth } from "@/hooks/useAuth";
import { useFamily } from "@/context/FamilyContext";
import {
  readGroupDraft,
  saveGroupDraft,
  clearGroupDraft,
  groupDraftFingerprint,
} from "@/lib/groupDrafts";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  funds: GroupFundItem[];
  initialFundId?: string;
  onProposeExpense: (
    params: ProposeExpenseParams,
  ) => Promise<{ success: boolean; error?: string }>;
}
export function ExpenseRequestModal(props: Props) {
  return props.isOpen ? <ExpenseForm {...props} /> : null;
}
function ExpenseForm({
  funds,
  initialFundId,
  onClose,
  onProposeExpense,
}: Props) {
  const { user } = useAuth();
  const { currentWorkspace } = useFamily();
  const draftKey = `kinetix-expense-draft:${user?.id}:${currentWorkspace?.id}:${initialFundId || "all"}`;
  const [saved] = useState(() =>
    readGroupDraft(draftKey, {
      fundId: initialFundId || funds[0]?.id || "",
      title: "",
      purpose: "",
      amount: "",
      recipientName: "",
      recipient: "",
      receipt: "",
      requestKey: "",
      fingerprint: "",
    }),
  );
  const [fundId, setFundId] = useState(saved.fundId);
  const [title, setTitle] = useState(saved.title);
  const [purpose, setPurpose] = useState(saved.purpose);
  const [amount, setAmount] = useState(saved.amount);
  const [recipientName, setRecipientName] = useState(saved.recipientName);
  const [recipient, setRecipient] = useState(saved.recipient);
  const [receipt, setReceipt] = useState(saved.receipt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState(false);
  const requestKey = useRef(saved.requestKey);
  const fingerprint = useRef(saved.fingerprint);
  const draft = {
    fundId,
    title,
    purpose,
    amount,
    recipientName,
    recipient,
    receipt,
    requestKey: requestKey.current,
    fingerprint: fingerprint.current,
  };
  useEffect(() => {
    saveGroupDraft(draftKey, draft);
  }, [
    draftKey,
    fundId,
    title,
    purpose,
    amount,
    recipientName,
    recipient,
    receipt,
  ]);
  const fund = funds.find((item) => item.id === fundId);
  return (
    <FinanceDialog
      title={review ? "Xem lại đề nghị chi" : "Đề nghị chi"}
      onClose={onClose}
      busy={busy}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          try {
            const wei = groupAmount(amount);
            if (!fund || wei > BigInt(fund.availableWei))
              throw new Error("Số dư khả dụng không đủ.");
            if (!/^0x[\da-f]{40}$/i.test(recipient))
              throw new Error("Nhập đầy đủ địa chỉ ví người nhận.");
            if (!review) {
              setReview(true);
              return;
            }
            const content = await groupDraftFingerprint({
              fundId,
              title,
              purpose,
              amount,
              recipient,
              recipientName,
              receipt,
            });
            if (content !== fingerprint.current) {
              requestKey.current = crypto.randomUUID();
              fingerprint.current = content;
            }
            saveGroupDraft(draftKey, {
              ...draft,
              requestKey: requestKey.current,
              fingerprint: content,
            });
            setBusy(true);
            const result = await onProposeExpense({
              fundId,
              title,
              purpose,
              category: "OPERATING",
              amountAvax: amount,
              recipientAddress: recipient,
              recipientName,
              receiptAttachmentUrl: receipt || undefined,
              idempotencyKey: requestKey.current,
            });
            if (result.success) {
              clearGroupDraft(draftKey);
              onClose();
            } else setError(result.error || "Chưa lưu được đề nghị.");
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {error && (
          <p className="finance-error" role="alert">
            {error}
          </p>
        )}
        {review ? (
          <>
            <dl>
              <dt>Quỹ</dt>
              <dd>{fund?.name}</dd>
              <dt>Khoản chi</dt>
              <dd>{title}</dd>
              <dt>Mục đích</dt>
              <dd>{purpose}</dd>
              <dt>Số tiền</dt>
              <dd>{amount} AVAX</dd>
              <dt>Người nhận</dt>
              <dd>
                {recipientName}
                <br />
                {recipient}
              </dd>
              <dt>Mạng</dt>
              <dd>Avalanche Fuji</dd>
              <dt>Xét duyệt</dt>
              <dd>
                {fund?.requiredApprovals}/{fund?.totalSigners} người · 48 giờ
              </dd>
            </dl>
            <p className="finance-notice">
              Gửi đề nghị sẽ giữ chỗ số tiền này. Đủ duyệt chưa phải đã trả.
              Người giữ tiền phải ký giao dịch và chờ đối soát.
            </p>
            {receipt && <img src={receipt} alt="Chứng từ đã chọn" />}
          </>
        ) : (
          <>
            <label>
              Quỹ
              <select
                value={fundId}
                onChange={(event) => setFundId(event.target.value)}
              >
                {funds.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <p>
              Khả dụng: {formatEther(BigInt(fund?.availableWei || "0"))} AVAX
            </p>
            <label>
              Tên khoản chi
              <input
                value={title}
                maxLength={120}
                required
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label>
              Số AVAX
              <input
                inputMode="decimal"
                value={amount}
                required
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>
            <label>
              Mục đích
              <textarea
                value={purpose}
                maxLength={500}
                required
                onChange={(event) => setPurpose(event.target.value)}
              />
            </label>
            <label>
              Tên người nhận
              <input
                value={recipientName}
                maxLength={100}
                required
                onChange={(event) => setRecipientName(event.target.value)}
              />
            </label>
            <label>
              Địa chỉ ví người nhận
              <input
                value={recipient}
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                required
                onChange={(event) => setRecipient(event.target.value.trim())}
              />
            </label>
            <label>
              Ảnh chứng từ (JPG, PNG, WebP ≤ 10 MB)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setBusy(true);
                  setError("");
                  try {
                    setReceipt(
                      `data:image/png;base64,${await prepareImage(file)}`,
                    );
                  } catch (err) {
                    setError((err as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
            <p>
              Chứng từ được lưu riêng trong nhóm. Xóa metadata ảnh trước khi
              gửi; chỉ đính kèm thông tin cần cho khoản chi.
            </p>
            {receipt && (
              <>
                <img src={receipt} alt="Xem trước chứng từ" />
                <button type="button" onClick={() => setReceipt("")}>
                  Xóa chứng từ
                </button>
              </>
            )}
          </>
        )}
        <button className="finance-primary" disabled={busy || !fund}>
          {busy ? "Đang xử lý…" : review ? "Gửi đề nghị" : "Xem lại"}
        </button>
        {review && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setReview(false)}
          >
            Sửa thông tin
          </button>
        )}
      </form>
    </FinanceDialog>
  );
}
