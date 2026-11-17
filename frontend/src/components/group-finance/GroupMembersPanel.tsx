"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { authRequest, useAuth } from "@/hooks/useAuth";
import { useFamily } from "@/context/FamilyContext";
import { GuardianAccessPanel } from "@/components/auth/GuardianAccessPanel";
import { InvitationAcceptancePanel } from "@/components/auth/InvitationAcceptancePanel";
import { AdminConsole } from "@/components/admin/AdminConsole";
import { usePathname } from "next/navigation";

export function GroupMembersPanel() {
  const auth = useAuth(),
    family = useFamily(),
    pathname = usePathname();
  const [members, setMembers] = useState<
    { id: string; fullName: string; walletAddress: string | null }[]
  >([]);
  const [owner, setOwner] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [retry, setRetry] = useState(0),
    [newName, setNewName] = useState(""),
    [newType, setNewType] = useState("COMMUNITY");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setMembers([]);
    setError("");
    setOwner(false);
    void authRequest(
      `/api/groups/${family.currentWorkspace?.id}`,
      undefined,
      "GET",
    )
      .then((response) => {
        if (live) {
          setMembers(response.data.members);
          setOwner(response.data.caller.canManageMembers);
        }
      })
      .catch((err) => {
        if (live) setError(err.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [family.currentWorkspace?.id, auth.user?.id, retry]);
  return (
    <main className="group-finance max-w-3xl w-full mx-auto p-4 space-y-5">
      <Link
        className="inline-flex items-center underline"
        href="/dashboard/finance"
      >
        ← Quỹ chung
      </Link>
      <h1 className="text-2xl font-semibold">Thành viên và quản lý nhóm</h1>
      <p>{family.currentWorkspace?.name}</p>
      {loading && <p role="status">Đang tải thành viên…</p>}
      {error && (
        <div role="alert" className="finance-error">
          <p>{error}</p>
          <button onClick={() => setRetry((value) => value + 1)}>
            Thử lại
          </button>
        </div>
      )}
      {!loading && !error && (
        <>
          <p className="finance-notice">
            Quyền quản lý nhóm và quyền duyệt quỹ được cấp riêng. Lời mời dùng
            enum thành viên cũ để tương thích; không tự cấp quyền ký tiền.
          </p>
          <section className="space-y-3" aria-label="Thành viên nhóm">
            {members.map((member) => (
              <article
                key={member.id}
                className="p-3 bg-white border border-slate-200 rounded-xl"
              >
                <h2 className="font-semibold">{member.fullName}</h2>
                <p className="break-all">
                  {member.walletAddress || "Chưa liên kết ví"}
                </p>
              </article>
            ))}
          </section>
          {owner && (
            <section>
              <h2 className="text-xl font-semibold">Mời thành viên</h2>
              <GuardianAccessPanel />
            </section>
          )}
          <InvitationAcceptancePanel />
          {owner &&
            (pathname.endsWith("/manage") ? (
              <AdminConsole />
            ) : (
              <Link
                className="inline-flex items-center underline"
                href="/dashboard/finance/manage"
              >
                Mở quản trị nhóm
              </Link>
            ))}
          <details className="border border-slate-300 rounded-xl p-3">
            <summary className="min-h-[44px] cursor-pointer">
              Tạo nhóm mới
            </summary>
            <form
              className="grid gap-3 pt-3"
              onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                setError("");
                try {
                  const result = await family.createWorkspace(newName, newType);
                  if (!result.success)
                    setError(result.error || "Không tạo được nhóm.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Tên nhóm
                <input
                  className="block w-full border border-slate-400 rounded-lg p-3"
                  required
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  maxLength={100}
                />
              </label>
              <label>
                Loại nhóm
                <select
                  className="block w-full border border-slate-400 rounded-lg p-3"
                  value={newType}
                  onChange={(event) => setNewType(event.target.value)}
                >
                  <option value="COMMUNITY">CLB / cộng đồng</option>
                  <option value="FRIENDS">Nhóm bạn</option>
                  <option value="FAMILY">Gia đình</option>
                  <option value="SIBLINGS">Anh chị em</option>
                </select>
              </label>
              <p>
                Loại nhóm không thay đổi quyền tài chính. Nhóm mới chưa có quỹ
                hoặc tiền.
              </p>
              <button
                disabled={busy}
                className="min-h-[48px] rounded-lg bg-red-700 text-white p-3"
              >
                {busy ? "Đang tạo…" : "Tạo nhóm"}
              </button>
            </form>
          </details>
        </>
      )}
    </main>
  );
}
