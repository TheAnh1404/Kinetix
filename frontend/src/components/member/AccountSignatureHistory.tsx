"use client";

import React, { useEffect, useState } from "react";
import { useAuth, authRequest } from "@/hooks/useAuth";

type Entry = {
  id: string;
  purpose: string;
  address: string;
  signatureHash: string;
  verifiedAt: string;
};
export function AccountSignatureHistory() {
  const auth = useAuth();
  return <SignatureHistory key={auth.user?.id} />;
}
function SignatureHistory() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError("");
    void authRequest("/api/signatures", undefined, "GET")
      .then((response) => {
        if (active) setEntries(response.signatures);
      })
      .catch((cause) => {
        if (active) setError(cause.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, retry]);
  return (
    <details
      className="vx-card"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Nhật ký chữ ký xác thực tài khoản</summary>
      <p className="vx-muted">
        Toàn tài khoản · 100 lần xác thực gần nhất. Đây là dấu vết xác thực,
        tách biệt chữ ký duyệt khoản chi và giao dịch chuyển tiền.
      </p>
      {loading ? (
        <p role="status">Đang tải nhật ký…</p>
      ) : error ? (
        <div role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="vx-text-link"
            onClick={() => setRetry((value) => value + 1)}
          >
            Thử lại
          </button>
        </div>
      ) : !entries.length ? (
        <p className="vx-muted">Chưa có chữ ký xác thực được ghi nhận.</p>
      ) : (
        entries.map((entry) => (
          <article className="vx-transaction" key={entry.id}>
            <strong>{entry.purpose}</strong>
            <p className="vx-muted">
              {new Date(entry.verifiedAt).toLocaleString("vi-VN")}
            </p>
            <p className="vx-address">Ví {entry.address}</p>
            <details>
              <summary>Mã đối soát chữ ký</summary>
              <p className="vx-address">{entry.signatureHash}</p>
            </details>
          </article>
        ))
      )}
    </details>
  );
}
