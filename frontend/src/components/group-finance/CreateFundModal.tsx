"use client";
import React, { useEffect, useState, useRef } from "react";
import { authRequest, useAuth } from "@/hooks/useAuth";
import { useFamily } from "@/context/FamilyContext";
import { CreateFundParams, GroupFundKind } from "@/types/groupFinance";
import { groupAmount } from "../../../../shared/groupFinance";
import { FinanceDialog } from "./FinanceDialog";
import {
  readGroupDraft,
  saveGroupDraft,
  clearGroupDraft,
  groupDraftFingerprint,
} from "@/lib/groupDrafts";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreateFund: (
    params: CreateFundParams,
  ) => Promise<{ success: boolean; error?: string }>;
}
export function CreateFundModal(props: Props) {
  return props.isOpen ? <CreateForm {...props} /> : null;
}
function CreateForm({ onClose, onCreateFund }: Props) {
  const { linkedWallet, user } = useAuth();
  const { currentWorkspace } = useFamily();
  const draftKey = `kinetix-fund-draft:${user?.id}:${currentWorkspace?.id}`;
  const [saved] = useState(() =>
    readGroupDraft(draftKey, {
      name: "",
      description: "",
      kind: "OPERATING" as GroupFundKind,
      target: "",
      deadline: "",
      selected: [] as string[],
      quorum: 1,
      requestKey: "",
      fingerprint: "",
    }),
  );
  const requestKey = useRef(saved.requestKey);
  const fingerprint = useRef(saved.fingerprint);
  const [step, setStep] = useState(1);
  const [name, setName] = useState(saved.name);
  const [description, setDescription] = useState(saved.description);
  const [kind, setKind] = useState<GroupFundKind>(saved.kind);
  const [target, setTarget] = useState(saved.target);
  const [deadline, setDeadline] = useState(saved.deadline);
  const [roster, setRoster] = useState<
    { id: string; fullName: string; walletAddress: string | null }[]
  >([]);
  const [selected, setSelected] = useState<string[]>(saved.selected);
  const [quorum, setQuorum] = useState(saved.quorum);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const currentDraft = {
    name,
    description,
    kind,
    target,
    deadline,
    selected,
    quorum,
    requestKey: requestKey.current,
    fingerprint: fingerprint.current,
  };
  useEffect(() => {
    saveGroupDraft(draftKey, currentDraft);
  }, [draftKey, name, description, kind, target, deadline, selected, quorum]);
  useEffect(() => {
    let live = true;
    void authRequest(`/api/groups/${currentWorkspace?.id}`, undefined, "GET")
      .then((response) => {
        if (live) setRoster(response.data.members);
      })
      .catch((err) => {
        if (live) setError(err.message);
      });
    return () => {
      live = false;
    };
  }, [currentWorkspace?.id]);
  const next = () => {
    setError("");
    try {
      if (step === 1 && !name.trim()) throw new Error("Nhập tên quỹ.");
      if (step === 1 && kind === "GOAL") {
        groupAmount(target);
        if (!deadline || new Date(deadline).getTime() <= Date.now())
          throw new Error("Chọn hạn góp trong tương lai.");
      }
      if (step === 2 && (selected.length < 2 || quorum >= selected.length))
        throw new Error(
          "Cần ít nhất 2 người duyệt và ngưỡng nhỏ hơn số người duyệt.",
        );
      setStep(step + 1);
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <FinanceDialog title="Tạo quỹ chung" onClose={onClose} busy={busy}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (step < 3) {
            next();
            return;
          }
          if (!accepted || !linkedWallet?.address) {
            setError("Xác nhận điều khoản và liên kết ví trước khi tạo.");
            return;
          }
          setBusy(true);
          setError("");
          try {
            const content = await groupDraftFingerprint({
              name,
              description,
              kind,
              target,
              deadline,
              selected,
              quorum,
            });
            if (content !== fingerprint.current || !requestKey.current) {
              requestKey.current = crypto.randomUUID();
              fingerprint.current = content;
            }
            saveGroupDraft(draftKey, {
              ...currentDraft,
              requestKey: requestKey.current,
              fingerprint: content,
            });
            const result = await onCreateFund({
              name,
              description,
              fundType: kind,
              custodyType: "SHARED_TREASURY",
              treasuryWalletAddress: linkedWallet.address,
              idempotencyKey: requestKey.current,
              guardianWallets: selected,
              requiredApprovals: quorum,
              targetAmountAvax: kind === "GOAL" ? target : undefined,
              targetDeadline:
                kind === "GOAL" ? new Date(deadline).toISOString() : undefined,
            });
            if (result.success) {
              clearGroupDraft(draftKey);
              onClose();
            } else setError(result.error || "Không tạo được quỹ.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <p>
          Bước {step}/3 · {currentWorkspace?.name}
        </p>
        {error && (
          <p className="finance-error" role="alert">
            {error}
          </p>
        )}
        {step === 1 && (
          <>
            <label>
              Mẫu quỹ
              <select
                value={kind}
                onChange={(event) =>
                  setKind(event.target.value as GroupFundKind)
                }
              >
                <option value="OPERATING">Quỹ hoạt động</option>
                <option value="GOAL">Quỹ mục tiêu</option>
              </select>
            </label>
            <label>
              Tên quỹ
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                required
              />
            </label>
            <label>
              Mục đích
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
              />
            </label>
            {kind === "GOAL" && (
              <>
                <label>
                  Mục tiêu (AVAX)
                  <input
                    inputMode="decimal"
                    value={target}
                    onChange={(event) => setTarget(event.target.value)}
                    required
                  />
                </label>
                <label>
                  Hạn nhận góp
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(event) => setDeadline(event.target.value)}
                    required
                  />
                </label>
              </>
            )}
          </>
        )}
        {step === 2 && (
          <>
            <fieldset>
              <legend>Người duyệt có ví đã liên kết</legend>
              {roster
                .filter((person) => person.walletAddress)
                .map((person) => (
                  <label key={person.id} className="finance-choice">
                    <input
                      type="checkbox"
                      checked={selected.includes(
                        person.walletAddress!.toLowerCase(),
                      )}
                      onChange={(event) => {
                        const wallet = person.walletAddress!.toLowerCase();
                        setSelected((previous) =>
                          event.target.checked
                            ? [...previous, wallet]
                            : previous.filter((item) => item !== wallet),
                        );
                      }}
                    />
                    <span>
                      {person.fullName}
                      <br />
                      <small style={{ overflowWrap: "anywhere" }}>
                        {person.walletAddress}
                      </small>
                    </span>
                  </label>
                ))}
            </fieldset>
            <label>
              Số người cần duyệt
              <input
                type="number"
                min={1}
                max={31}
                value={quorum}
                onChange={(event) => setQuorum(Number(event.target.value))}
              />
            </label>
            <p>
              Người nhận không được tính phiếu. Quyền quản trị nhóm không tự cấp
              quyền duyệt quỹ.
            </p>
          </>
        )}
        {step === 3 && (
          <>
            <dl>
              <dt>Quỹ</dt>
              <dd>{name}</dd>
              <dt>Tài sản và mạng</dt>
              <dd>AVAX · Avalanche Fuji · Phí mạng do ví gửi trả</dd>
              <dt>Ví giữ tiền</dt>
              <dd>{linkedWallet?.address || "Chưa liên kết ví"}</dd>
              <dt>Duyệt chi trong ứng dụng</dt>
              <dd>
                {quorum}/{selected.length} người duyệt
              </dd>
              {kind === "GOAL" && (
                <>
                  <dt>Mục tiêu / hạn góp</dt>
                  <dd>
                    {target} AVAX · {new Date(deadline).toLocaleString("vi-VN")}
                  </dd>
                </>
              )}
            </dl>
            <p className="finance-notice">
              Tiền nằm trong ví cá nhân đã công bố. Chủ ví vẫn kiểm soát tiền;
              phiếu duyệt trong ứng dụng không tạo multisig on-chain. Số dư quỹ
              là sổ khoản góp đã đối soát, có thể khác số dư ví.
            </p>
            <p>
              {kind === "GOAL"
                ? "Ứng dụng chỉ cho đề nghị chi khi đạt mục tiêu. Hết hạn chưa đạt không tự hoàn tiền; cần người giữ tiền xử lý và đối soát. "
                : "Quỹ hoạt động không có quyền rút lại khoản góp tự động. "}
              Tiền góp không tạo quyền sở hữu theo tỷ lệ. Bàn giao, đổi chính
              sách và đóng quỹ chưa được hỗ trợ ở adapter này.
            </p>
            <label className="finance-choice">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
              />
              <span>
                Tôi hiểu và chấp nhận các điều khoản lưu ký, chi và hoàn tiền
                trên.
              </span>
            </label>
          </>
        )}
        <button
          className="finance-primary"
          disabled={busy || (step === 3 && !accepted)}
        >
          {busy ? "Đang lưu quỹ…" : step < 3 ? "Tiếp tục" : "Tạo quỹ"}
        </button>
        {step > 1 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setStep(step - 1)}
          >
            Quay lại
          </button>
        )}
      </form>
    </FinanceDialog>
  );
}
