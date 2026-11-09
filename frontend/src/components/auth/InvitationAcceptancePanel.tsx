"use client";

import { useState } from "react";
import { useAuth, authRequest } from "@/hooks/useAuth";

type InvitationPreview = {
  workspaceName: string;
  expectedWallet: string;
  expiresAt: string;
};

export function InvitationAcceptancePanel() {
  const auth = useAuth();
  const [token, setToken] = useState("");
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const inspect = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    setPreview(null);
    try {
      const data = await authRequest("/api/auth/invitations/preview", { token: token.trim() });
      setPreview(data.invitation);
    } catch (failure: any) {
      setError(failure.message || "Không kiểm tra được mã mời.");
    } finally {
      setBusy(false);
    }
  };

  const accept = async () => {
    if (!preview) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await auth.reauthenticate();
      await authRequest("/api/auth/accept-invitation", { token: token.trim() });
      await auth.checkSession();
      setNotice(`Đã tham gia workspace “${preview.workspaceName}”. Quyền dùng từng Hũ sẽ được xác nhận riêng.`);
      setPreview(null);
      setToken("");
    } catch (failure: any) {
      setError(failure.message || "Không thể nhận lời mời.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 space-y-4 dark:border-blue-900 dark:bg-blue-950/30" aria-labelledby="invitation-accept-title">
      <div>
        <h4 id="invitation-accept-title" className="text-sm font-bold text-slate-900 dark:text-white">Nhận lời mời bằng mã</h4>
        <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">Nếu bạn đã có tài khoản Kinetix, nhập mã Guardian gửi, kiểm tra workspace rồi ký xác thực bằng Core.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="workspace-invitation-token">Mã lời mời</label>
        <input
          id="workspace-invitation-token"
          value={token}
          onChange={(event) => { setToken(event.target.value); setPreview(null); }}
          autoComplete="off"
          spellCheck={false}
          maxLength={43}
          placeholder="Dán mã lời mời 43 ký tự"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 font-mono text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
        <button type="button" disabled={busy || token.trim().length !== 43} onClick={() => void inspect()} className="min-h-11 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">Kiểm tra mã</button>
      </div>
      {preview && (
        <div className="space-y-3 rounded-xl border border-blue-200 bg-white p-4 text-sm dark:border-blue-900 dark:bg-slate-900">
          {auth.linkedWallet?.address.toLowerCase() !== preview.expectedWallet.toLowerCase() && <p role="alert" className="text-xs font-semibold text-amber-800">Lời mời yêu cầu ví khác với ví đã liên kết tài khoản này. Đăng nhập bằng đúng tài khoản Kinetix trước khi nhận.</p>}
          <p>Bạn được mời vào <strong>{preview.workspaceName}</strong> với tư cách Guardian.</p>
          <p className="break-all text-xs text-slate-600 dark:text-slate-300">Ví yêu cầu: <span className="font-mono">{preview.expectedWallet}</span></p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Hết hạn: {new Date(preview.expiresAt).toLocaleString("vi-VN")}</p>
          <button type="button" disabled={busy || auth.linkedWallet?.address.toLowerCase() !== preview.expectedWallet.toLowerCase()} onClick={() => void accept()} className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-black disabled:opacity-50">Xác thực và tham gia</button>
          <p className="text-xs text-slate-500">Core cần đang chọn đúng ví được ghi trong lời mời. Việc tham gia workspace chưa tự cấp quyền trên từng Hũ.</p>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
      {busy && <p role="status" className="text-xs text-slate-500">Đang xử lý lời mời…</p>}
    </section>
  );
}
