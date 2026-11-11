"use client";
import React, { useState } from "react";
import { authRequest, useAuth } from "@/hooks/useAuth";
export function ProvisioningConfirm({
  workspaceId,
  requests,
  onConfirmed,
}: {
  workspaceId: string;
  requests: { id: string; chainId: number; status: string }[];
  onConfirmed?: () => Promise<void>;
}) {
  const auth = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [hashes, setHashes] = useState<Record<string, string>>({});
  const canManage = auth.workspaces.some(
    (workspace) =>
      workspace.id === workspaceId &&
      (workspace.role === "ADMIN" || workspace.canManageMembers),
  );
  if (!canManage) return null;
  return (
    <div className="space-y-3 mt-4">
      {requests
        .filter((request) => request.status !== "CONFIRMED")
        .map((request) => (
          <details key={request.id} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 transition-colors">
            <summary className="text-xs font-semibold cursor-pointer text-slate-900 dark:text-white">
              Xác nhận receipt cấp quyền · mạng {request.chainId}
            </summary>
            <p className="auth-help mt-2 text-slate-600 dark:text-slate-300">
              Operator có thẩm quyền cần gọi setAllowlistStatus trên đúng
              FamilyHub trước. Nhập mã giao dịch đã xác nhận; server sẽ kiểm
              receipt, sự kiện và trạng thái hiện tại.
            </p>
            <form
              className="flex flex-wrap gap-2 mt-3"
              onSubmit={(event) => {
                event.preventDefault();
                setBusy(true);
                setError("");
                void authRequest(
                  `/api/workspaces/${workspaceId}/provisioning/${request.id}/confirm`,
                  { txHash: hashes[request.id] },
                )
                  .then(async () => {
                    await auth.checkSession();
                    await onConfirmed?.();
                  })
                  .catch((err) => setError(err.message))
                  .finally(() => setBusy(false));
              }}
            >
              <input
                aria-label="Mã giao dịch cấp quyền"
                required
                pattern="0x[a-fA-F0-9]{64}"
                value={hashes[request.id] || ""}
                onChange={(event) =>
                  setHashes((values) => ({
                    ...values,
                    [request.id]: event.target.value,
                  }))
                }
                placeholder="0x…"
                className="min-w-0 flex-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg p-2 text-xs font-mono text-slate-900 dark:text-white"
              />
              <button
                disabled={busy}
                className="text-xs font-bold text-red-600 dark:text-red-400 cursor-pointer"
              >
                Kiểm tra receipt
              </button>
            </form>
          </details>
        ))}
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
