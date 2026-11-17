"use client";
import React, { useState } from "react";
import { useFamily } from "@/context/FamilyContext";
import { FinanceDialog } from "@/components/group-finance/FinanceDialog";
export interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (workspace: any) => void;
}
export function CreateWorkspaceModal(props: CreateWorkspaceModalProps) {
  return props.isOpen ? <CreateWorkspaceForm {...props} /> : null;
}
function CreateWorkspaceForm({
  onClose,
  onCreated,
}: CreateWorkspaceModalProps) {
  const { createWorkspace } = useFamily();
  const [name, setName] = useState(""),
    [kind, setKind] = useState("COMMUNITY"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <FinanceDialog title="Tạo nhóm" onClose={onClose} busy={busy}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            const result = await createWorkspace(name, kind);
            if (result.success) {
              onCreated?.(result.workspace);
              onClose();
            } else setError(result.error || "Không tạo được nhóm.");
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
        <label>
          Tên nhóm
          <input
            required
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          Loại nhóm
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            <option value="COMMUNITY">CLB / cộng đồng</option>
            <option value="FRIENDS">Nhóm bạn</option>
            <option value="FAMILY">Gia đình</option>
            <option value="SIBLINGS">Anh chị em</option>
          </select>
        </label>
        <p>
          Loại nhóm gợi ý cách tổ chức, không cấp quyền ký tiền. Nhóm mới không
          có quỹ hoặc số dư; tạo quỹ riêng sau khi có đủ người duyệt.
        </p>
        <button className="finance-primary" disabled={busy}>
          {busy ? "Đang tạo…" : "Tạo nhóm"}
        </button>
      </form>
    </FinanceDialog>
  );
}
