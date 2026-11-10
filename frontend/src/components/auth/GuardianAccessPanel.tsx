"use client";
import React, { useEffect, useState } from "react";
import { useAuth, authRequest } from "@/hooks/useAuth";
import { useFamily } from "@/context/FamilyContext";
export function GuardianAccessPanel({ onBusyChange }: { onBusyChange?: (busy: boolean) => void } = {}) {
  const auth = useAuth();
  const { currentWorkspace } = useFamily();
  const [address, setAddress] = useState("");
  const [invitation, setInvitation] = useState<{
    id: string;
    token: string;
    expectedWallet: string;
    expiresAt: string;
  } | null>(null);
  const [guardians, setGuardians] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { onBusyChange?.(busy); return () => onBusyChange?.(false); }, [busy, onBusyChange]);
  const base = `/api/workspaces/${currentWorkspace?.id}`;
  const load = async () => {
    const data = await authRequest(base, undefined, "GET");
    setGuardians(
      data.members.filter((member: any) => member.role === "GUARDIAN"),
    );
  };
  useEffect(() => {
    void load().catch((err) => setError(err.message));
  }, [currentWorkspace?.id]);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await auth.reauthenticate();
      await action();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-form mt-5">
      <p className="auth-help">
        Lời mời riêng gắn với một địa chỉ Core, dùng một lần trong 48 giờ.
        Người được mời sử dụng quyền thành viên. Quyền quản trị gia đình luôn
        thuộc người tạo gia đình.
      </p>
      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            const data = await authRequest(`${base}/invitations`, { address });
            setInvitation(data.invitation);
            setAddress("");
          });
        }}
      >
        <label className="auth-label">
          Địa chỉ Core của người bảo hộ
          <input
            required
            pattern="0x[a-fA-F0-9]{40}"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="0x…"
          />
        </label>
        <button disabled={busy} className="auth-secondary">
          Xác thực Core & tạo lời mời
        </button>
      </form>
      {invitation && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs">
          <strong>Mã mời chỉ hiển thị một lần</strong>
          <code className="block break-all mt-3">{invitation.token}</code>
          <p className="break-all mt-2">Dành cho {invitation.expectedWallet}</p>
          <p className="mt-2">
            Hết hạn: {new Date(invitation.expiresAt).toLocaleString("vi-VN")}
          </p>
          <p className="mt-2">
            Người được mời mở trang đăng nhập, chọn “Tôi nhận được lời mời làm
            người bảo hộ”, nhập mã này và dùng đúng ví Core phía trên. Không cần
            tạo gia đình mới.
          </p>
          <button
            className="underline mt-3 font-bold"
            onClick={() => setInvitation(null)}
          >
            Đã bàn giao · Ẩn
          </button>
        </div>
      )}
      {guardians.map((guardian) => (
        <div
          key={guardian.id}
          className="p-4 border border-slate-200 rounded-xl flex items-center justify-between gap-4"
        >
          <div>
            <strong className="text-sm">{guardian.fullName}</strong>
            <p className="text-xs text-slate-500 mt-1">
              Thành viên · Không có quyền quản trị gia đình
            </p>
          </div>

        </div>
      ))}
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
