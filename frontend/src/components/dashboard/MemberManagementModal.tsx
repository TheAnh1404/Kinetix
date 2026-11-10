"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Users,
  UserPlus,
  ShieldCheck,
  Copy,
  LockKeyhole,
  Wallet,
  LoaderCircle,
  ArrowLeft,
} from "lucide-react";
import { useFamily } from "@/context/FamilyContext";
import { useAuth, authRequest } from "@/hooks/useAuth";
import { ProvisioningConfirm } from "@/components/auth/ProvisioningConfirm";
import { GuardianAccessPanel } from "@/components/auth/GuardianAccessPanel";

type Credential = {
  username: string;
  temporaryPassword: string;
  expiresAt: string;
};
type ManagedMember = {
  id: string;
  fullName: string;
  role: "ELDERLY" | "CHILD";
  username?: string;
  phoneNumber?: string;
  onboarding: string;
  linkedWallet: string | null;
  legacyWallet?: string | null;
  accessDisabled: boolean;
  guardians: string[];
  onchainPermissions: {
    id: string;
    chainId: number;
    status: string;
    txHash: string | null;
  }[];
};
export function MemberManagementModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { currentWorkspace, refreshMembers, members } = useFamily();
  const auth = useAuth();
  const [list, setList] = useState<ManagedMember[]>([]);
  const [tab, setTab] = useState<"list" | "create">("list");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"ELDERLY" | "CHILD">("CHILD");
  const [phone, setPhone] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [credential, setCredential] = useState<Credential | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activity, setActivity] = useState<
    { action: string; createdAt: string }[] | null
  >(null);
  const key = useRef("");
  const base = `/api/workspaces/${currentWorkspace?.id}/managed-members`;
  const load = async () => {
    if (currentWorkspace) {
      const data = await authRequest(base, undefined, "GET");
      setList(data.members);
      window.dispatchEvent(new Event("kinetix-first-use-refresh"));
    }
  };
  useEffect(() => {
    if (!isOpen) {
      setCredential(null);
      setError("");
      setNotice("");
      setActivity(null);
      return;
    }
    setList([]);
    setBusy(true);
    load()
      .catch((err) => setError(err.message))
      .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentWorkspace?.id]);
  if (!isOpen) return null;
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const create = async () => {
    key.current ||= crypto.randomUUID();
    const response = await fetch(base, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": key.current,
      },
      body: JSON.stringify({
        fullName,
        username,
        role,
        phoneNumber: phone || undefined,
        temporaryPassword: temporaryPassword || undefined,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Không thể tạo tài khoản.");
    setCredential(data.credential || null);
    setNotice(
      data.replayed
        ? "Yêu cầu trước đã tạo tài khoản. Bí mật chỉ được hiển thị một lần; cấp lại mật khẩu nếu chưa bàn giao."
        : "Tài khoản đã được tạo. Bàn giao trực tiếp credential bên dưới.",
    );
    key.current = "";
    setFullName("");
    setUsername("");
    setPhone("");
    setTemporaryPassword("");
    setTab("list");
    await load();
    await refreshMembers();
  };
  const access = async (member: ManagedMember) => {
    await authRequest(
      `${base}/${member.id}/access`,
      { disabled: !member.accessDisabled },
      "PATCH",
    );
    await load();
    await refreshMembers();
    setNotice(
      "Đã cập nhật quyền truy cập ứng dụng của không gian này. Quyền blockchain được quản lý riêng.",
    );
  };
  const reset = async (member: ManagedMember) => {
    const legacy = member.onboarding === "CREDENTIAL_REQUIRED";
    const username = legacy
      ? window.prompt("Tên đăng nhập mới cho tài khoản cũ (3–50 ký tự)")
      : null;
    if (legacy && !username) return;
    await auth.reauthenticate();
    if (legacy && !member.guardians.includes(auth.user!.id))
      await authRequest(
        `${base}/${member.id}/manager`,
        { guardianId: auth.user!.id },
        "PATCH",
      );
    const data = await authRequest(
      `${base}/${member.id}/${legacy ? "enroll" : "reset-password"}`,
      legacy ? { username } : {},
    );
    setCredential(data.credential);
    await load();
    setNotice(
      "Đã thu hồi phiên cũ và cấp mật khẩu tạm mới. Địa chỉ ví cũ được giữ nguyên và phải được xác minh riêng.",
    );
  };
  const profile = async (member: ManagedMember) => {
    const name = window.prompt("Họ tên hiển thị", member.fullName);
    if (name === null) return;
    const phoneNumber = window.prompt(
      "Số điện thoại (tùy chọn)",
      member.phoneNumber || "",
    );
    if (phoneNumber === null) return;
    await authRequest(
      `${base}/${member.id}/profile`,
      { fullName: name, phoneNumber },
      "PATCH",
    );
    await load();
    await refreshMembers();
  };
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="managed-title"
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <span className="text-[10px] tracking-[.2em] text-red-500 font-bold">
              GIA ĐÌNH · TÀI KHOẢN CÁ NHÂN
            </span>
            <h2
              id="managed-title"
              className="mt-2 text-2xl font-bold text-slate-900"
            >
              Thành viên được quản lý
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {currentWorkspace?.name}
            </p>
          </div>
          <button
            aria-label="Đóng"
            onClick={onClose}
            disabled={busy}
            className="p-2 rounded-full hover:bg-slate-100"
          >
            <X size={21} />
          </button>
        </div>
        <div className="p-6">
          <div className="flex gap-3 mb-6">
            <button
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${tab === "list" ? "bg-slate-900 text-white" : "bg-slate-100"}`}
              onClick={() => {
                setTab("list");
                setActivity(null);
              }}
            >
              <Users size={17} /> Thành viên
            </button>
            <button
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${tab === "create" ? "bg-slate-900 text-white" : "bg-slate-100"}`}
              onClick={() => {
                setTab("create");
                setActivity(null);
              }}
            >
              <UserPlus size={17} /> Tạo tài khoản
            </button>
          </div>
          {credential && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center gap-2 text-amber-900 font-bold">
                <LockKeyhole size={18} /> Chỉ hiển thị một lần
              </div>
              <p className="mt-2 text-xs text-amber-800">
                Bàn giao trực tiếp cho thành viên. Họ phải đổi mật khẩu ở lần
                đăng nhập đầu tiên.
              </p>
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm">
                <dt>Tên đăng nhập</dt>
                <dd className="font-mono font-semibold break-all">
                  {credential.username}
                </dd>
                <dt>Mật khẩu tạm</dt>
                <dd className="font-mono font-semibold break-all">
                  {credential.temporaryPassword}
                </dd>
                <dt>Hết hạn</dt>
                <dd>
                  {new Date(credential.expiresAt).toLocaleString("vi-VN")}
                </dd>
              </dl>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className="flex items-center gap-2 text-xs font-bold"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(
                        `Tên đăng nhập: ${credential.username}\nMật khẩu tạm: ${credential.temporaryPassword}`,
                      )
                      .then(() =>
                        setNotice(
                          "Đã sao chép. Hãy bàn giao riêng tư và xóa clipboard sau khi sử dụng.",
                        ),
                      )
                      .catch(() =>
                        setError("Không thể sao chép. Hãy bàn giao trực tiếp."),
                      )
                  }
                >
                  <Copy size={15} /> Sao chép credential
                </button>
                <button
                  className="text-xs font-bold text-amber-900 underline"
                  onClick={() => setCredential(null)}
                >
                  Đã bàn giao · Ẩn thông tin
                </button>
              </div>
            </div>
          )}
          {error && (
            <p className="auth-error mb-4" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p
              className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm"
              role="status"
            >
              {notice}
            </p>
          )}
          {tab === "create" ? (
            <form
              className="auth-form"
              onSubmit={(event) => {
                event.preventDefault();
                void run(create);
              }}
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="auth-label">
                  Họ tên thành viên
                  <input
                    required
                    maxLength={100}
                    autoComplete="off"
                    value={fullName}
                    onChange={(event) => {
                      setFullName(event.target.value);
                      key.current = "";
                    }}
                  />
                </label>
                <label className="auth-label">
                  Tên đăng nhập
                  <input
                    required
                    minLength={3}
                    maxLength={50}
                    autoComplete="off"
                    autoCapitalize="none"
                    value={username}
                    onChange={(event) => {
                      setUsername(event.target.value);
                      key.current = "";
                    }}
                  />
                </label>
                <label className="auth-label">
                  Thế hệ
                  <select
                    value={role}
                    onChange={(event) =>
                      setRole(event.target.value as "ELDERLY" | "CHILD")
                    }
                  >
                    <option value="CHILD">Trẻ nhỏ</option>
                    <option value="ELDERLY">Người cao tuổi</option>
                  </select>
                </label>
                <label className="auth-label">
                  Số điện thoại · tùy chọn
                  <input
                    type="tel"
                    maxLength={30}
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </label>
              </div>
              <label className="auth-label">
                Mật khẩu tạm · để trống để tạo tự động
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  value={temporaryPassword}
                  onChange={(event) => setTemporaryPassword(event.target.value)}
                />
              </label>
              <div className="auth-info !my-0">
                <ShieldCheck size={23} />
                <p>
                  Tài khoản chưa có ví. Thành viên sẽ đổi mật khẩu, kết nối Core
                  cá nhân và ký xác minh khi kích hoạt. Credential tạm có hạn 48
                  giờ.
                </p>
              </div>
              <button className="auth-primary" disabled={busy}>
                {busy ? (
                  <LoaderCircle className="animate-spin" size={20} />
                ) : (
                  "Tạo tài khoản & nhận credential"
                )}
              </button>
            </form>
          ) : activity ? (
            <div>
              <button
                className="flex gap-2 items-center text-sm font-bold mb-4"
                onClick={() => setActivity(null)}
              >
                <ArrowLeft size={16} /> Về danh sách
              </button>
              <ul className="space-y-3">
                {activity.map((event, index) => (
                  <li
                    key={index}
                    className="border-b border-slate-100 py-3 text-sm"
                  >
                    <strong>{event.action}</strong>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(event.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </li>
                ))}
              </ul>
              {!activity.length && (
                <p className="text-sm text-slate-500">
                  Chưa có hoạt động trong không gian này.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {busy && !list.length && (
                <p className="text-sm text-slate-500">Đang tải…</p>
              )}
              {!busy && !list.length && (
                <div className="text-center rounded-2xl border border-dashed border-slate-200 py-12">
                  <Users className="mx-auto text-slate-300" size={36} />
                  <h3 className="mt-3 font-bold">
                    Bắt đầu bằng một tài khoản riêng
                  </h3>
                  <p className="text-sm text-slate-500 mt-2">
                    Tạo tài khoản cho ông bà hoặc trẻ nhỏ để cùng tham gia.
                  </p>
                </div>
              )}
              {list.map((member) => (
                <article
                  key={member.id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-slate-900">
                        {member.fullName}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {member.role === "CHILD" ? "Trẻ nhỏ" : "Người cao tuổi"}{" "}
                        · @{member.username || "cần chuyển đổi"}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold rounded-full h-fit px-3 py-1 ${member.accessDisabled ? "bg-red-50 text-red-700" : member.onboarding === "READY" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}
                    >
                      {member.accessDisabled
                        ? "Đã khóa truy cập"
                        : member.onboarding === "READY"
                          ? "Đã kích hoạt"
                          : member.onboarding === "LINK_WALLET"
                            ? "Chờ liên kết Core"
                            : "Chờ đổi mật khẩu"}
                    </span>
                  </div>
                  <div className="flex gap-2 items-start my-4 text-xs text-slate-500">
                    <Wallet size={15} className="flex-shrink-0" />
                    <span className="break-all">
                      {member.linkedWallet || "Chưa có ví đã xác minh"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Quyền blockchain:{" "}
                    {member.onchainPermissions.length
                      ? member.onchainPermissions
                          .map(
                            (item) =>
                              `Allowlist mạng ${item.chainId}: ${item.status === "CONFIRMED" ? "đã xác nhận" : "đang chờ"}`,
                          )
                          .join(" · ")
                      : "chưa có xác nhận cấp quyền"}
                    . Quyền hũ được kiểm riêng.
                  </p>
                  <ProvisioningConfirm
                    workspaceId={currentWorkspace!.id}
                    requests={member.onchainPermissions}
                    onConfirmed={load}
                  />
                  <div className="flex flex-wrap gap-4 mt-4 border-t border-slate-100 pt-4 text-xs font-semibold">
                    <button
                      disabled={busy}
                      onClick={() => void run(() => profile(member))}
                    >
                      Sửa hồ sơ
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => void run(() => reset(member))}
                    >
                      Cấp lại mật khẩu · Core
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => void run(() => access(member))}
                      className={
                        member.accessDisabled
                          ? "text-emerald-700"
                          : "text-red-600"
                      }
                    >
                      {member.accessDisabled ? "Mở truy cập" : "Khóa truy cập"}
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const data = await authRequest(
                            `${base}/${member.id}/activity`,
                            undefined,
                            "GET",
                          );
                          setActivity(data.activity);
                        })
                      }
                    >
                      Lịch sử
                    </button>
                    {auth.workspaces.find(
                      (workspace) => workspace.id === currentWorkspace?.id,
                    )?.role === "ADMIN" && (
                      <select
                        aria-label={`Chuyển người quản lý cho ${member.fullName}`}
                        disabled={busy}
                        className="bg-transparent max-w-[180px]"
                        value=""
                        onChange={(event) => {
                          const guardianId = event.target.value;
                          if (guardianId)
                            void run(async () => {
                              await auth.reauthenticate();
                              await authRequest(
                                `${base}/${member.id}/manager`,
                                { guardianId },
                                "PATCH",
                              );
                              await load();
                              setNotice("Đã chuyển người quản lý.");
                            });
                        }}
                      >
                        <option value="">Chuyển người quản lý…</option>
                        {members
                          .filter(
                            (item) =>
                              item.role === "ADMIN",
                          )
                          .map((guardian) => (
                            <option key={guardian.id} value={guardian.id}>
                              {guardian.name}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
          {auth.workspaces.find(
            (workspace) => workspace.id === currentWorkspace?.id,
          )?.role === "ADMIN" && (
            <details className="mt-6 border-t border-slate-200 pt-5">
              <summary className="text-sm font-bold cursor-pointer">
                Người bảo hộ · lời mời & phân quyền
              </summary>
              <GuardianAccessPanel />
            </details>
          )}
        </div>
      </section>
    </div>
  );
}
