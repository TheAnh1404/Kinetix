"use client";

import React, { useRef, useState } from "react";
import { useFamily } from "@/context/FamilyContext";
import { AccessibleDialog } from "@/components/member/MemberPrimitives";
import { amountLabel, parseAmount } from "@/lib/member";
import { hubChain } from "@/contracts/config";

export function CreateChoreModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const family = useFamily();
  if (!isOpen) return null;
  return (
    <CreateChoreForm key={family.currentWorkspace?.id} onClose={onClose} />
  );
}
function CreateChoreForm({ onClose }: { onClose: () => void }) {
  const { createChore, members, dynamicVaults } = useFamily();
  const children = members.filter(
    (member) => member.role === "CHILD" && member.walletAddress,
  );
  const vaults = dynamicVaults.filter(
    (vault) => vault.ruleTemplate === "MILESTONE" && vault.isActive,
  );
  const [title, setTitle] = useState("");
  const [reward, setReward] = useState("");
  const [childId, setChildId] = useState("");
  const [vaultId, setVaultId] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  return (
    <AccessibleDialog
      title="Giao việc cho con"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="member-preview kids-theme">
        {success ? (
          <div role="status">
            <h2 className="font-bold text-xl">
              Đã tạo việc và cập nhật danh sách
            </h2>
            <p>
              {title} · Thưởng dự kiến {amountLabel(reward)}{" "}
              {hubChain.nativeCurrency.symbol}
            </p>
            <button className="member-primary mt-4" onClick={onClose}>
              Hoàn tất
            </button>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (lock.current) return;
              try {
                parseAmount(reward);
                if (!title.trim() || !childId || !vaultId)
                  throw new Error(
                    "Chọn hũ, người nhận và điền đầy đủ thông tin.",
                  );
              } catch (err: any) {
                setError(err.message);
                return;
              }
              lock.current = true;
              setBusy(true);
              setError("");
              void createChore({
                title: title.trim(),
                rewardAmount: reward.replace(",", "."),
                childId,
                vaultId,
              })
                .then((ok) => {
                  if (ok) setSuccess(true);
                  else
                    setError(
                      "Chưa hoàn tất giao việc. Kiểm tra trạng thái giao dịch trước khi thử lại.",
                    );
                })
                .catch((err) => setError(err.message))
                .finally(() => {
                  lock.current = false;
                  setBusy(false);
                });
            }}
          >
            <label className="member-field">
              Hũ trả thưởng
              <select
                required
                value={vaultId}
                onChange={(event) => setVaultId(event.target.value)}
                disabled={busy}
              >
                <option value="">Chọn hũ nhiệm vụ</option>
                {vaults.map((vault) => (
                  <option value={vault.id} key={vault.id}>
                    {vault.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="member-field">
              Giao cho
              <select
                required
                value={childId}
                onChange={(event) => setChildId(event.target.value)}
                disabled={busy}
              >
                <option value="">Chọn trẻ đã liên kết ví</option>
                {children.map((child) => (
                  <option value={child.id} key={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="member-field">
              Tên việc
              <input
                required
                maxLength={150}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={busy}
              />
            </label>
            <label className="member-field">
              Thưởng dự kiến ({hubChain.nativeCurrency.symbol})
              <input
                required
                inputMode="decimal"
                value={reward}
                onChange={(event) => setReward(event.target.value)}
                disabled={busy}
                placeholder="0,01"
              />
            </label>
            <p className="member-notice">
              Tên việc, địa chỉ ví và phần thưởng được ghi công khai trên
              blockchain. Dùng mô tả ngắn, không chứa thông tin riêng tư của
              trẻ.
            </p>
            {error && (
              <p role="alert" className="member-error">
                {error}
              </p>
            )}
            {(!vaults.length || !children.length) && (
              <p className="member-error">
                Cần có hũ MILESTONE đang hoạt động và trẻ đã liên kết ví được
                cấp quyền trên hũ.
              </p>
            )}
            <button
              className="member-primary"
              disabled={busy || !vaults.length || !children.length}
              type="submit"
            >
              {busy ? "Đang chờ Core xác nhận…" : "Mở Core để giao việc"}
            </button>
          </form>
        )}
      </div>
    </AccessibleDialog>
  );
}
