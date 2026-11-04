"use client";

import React, { Suspense, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ActiveTab, RoleType } from "@/types";
import { AppShell } from "@/components/layout/AppShell";
import { GuardianView } from "@/components/views/GuardianView";
import { RoscaView } from "@/components/views/RoscaView";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/hooks/useAuth";
import { AccountStatus } from "@/components/auth/AccountStatus";
import { MemberResponsiveShell } from "@/components/layout/MemberResponsiveShell";
import { ElderlyPortal } from "@/components/member/ElderlyPortal";
import { KidsPortal } from "@/components/member/KidsPortal";
import { memberHome } from "@/lib/member";

const tabRoutes: Record<string, string> = {
  "quan-tri-cha-me": "/dashboard/guardian",
  "kinetix-shield": "/dashboard/elderly",
  "kinetix-kids": "/dashboard/kids",
  "quy-rosca": "/dashboard/rosca",
};
function DashboardContent() {
  const auth = useAuth();
  const family = useFamily();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const membership = auth.workspaces.find(
    (item) => item.id === family.currentWorkspace?.id,
  );
  const role = membership?.role as RoleType | undefined;
  const admin = role === "ADMIN" || role === "GUARDIAN";
  const group = pathname.split("/")[2];
  const previousWorkspace = useRef(family.currentWorkspace?.id);
  useEffect(() => {
    if (auth.isLoading) return;
    if (!auth.isAuthenticated) {
      if (!auth.sessionError)
        router.replace(
          `/login?from=${encodeURIComponent(pathname + (search.toString() ? `?${search}` : ""))}`,
        );
      return;
    }
    if (auth.onboarding !== "READY") {
      router.replace("/activate");
      return;
    }
    if (!role) return;
    const switched =
      previousWorkspace.current &&
      previousWorkspace.current !== family.currentWorkspace?.id;
    previousWorkspace.current = family.currentWorkspace?.id;
    if (
      switched ||
      (!admin && group !== (role === "ELDERLY" ? "elderly" : "kids"))
    ) {
      router.replace(memberHome(role));
      return;
    }
    if (!group) {
      router.replace(
        (admin && tabRoutes[search.get("tab") || ""]) || memberHome(role),
      );
      return;
    }
    const aliases: Record<string, string> = {
      shield: "elderly",
      chores: "kids/chores",
      chore: "kids/chores",
      hui: "rosca",
      admin: "guardian",
    };
    if (aliases[group]) router.replace(`/dashboard/${aliases[group]}`);
    else if (!["elderly", "kids", "guardian", "rosca"].includes(group))
      router.replace(memberHome(role));
  }, [
    auth.isLoading,
    auth.isAuthenticated,
    auth.onboarding,
    auth.sessionError,
    role,
    admin,
    group,
    pathname,
    search,
    family.currentWorkspace?.id,
    router,
  ]);
  if (auth.sessionError && !auth.user)
    return (
      <div className="member-startup">
        <h1>Chưa kiểm tra được phiên đăng nhập</h1>
        <p role="alert">{auth.sessionError}</p>
        <button
          className="member-primary"
          onClick={() => void auth.checkSession()}
        >
          Kiểm tra lại
        </button>
      </div>
    );
  if (auth.isLoading || !auth.isAuthenticated || auth.onboarding !== "READY")
    return <Loading />;
  if (!family.currentWorkspace || !role)
    return (
      <div className="member-startup">
        <h1>Chưa có không gian đang hoạt động</h1>
        <p>Liên hệ quản trị gia đình để kiểm tra quyền thành viên.</p>
        <button
          className="member-secondary"
          onClick={() => void auth.checkSession()}
        >
          Kiểm tra lại
        </button>
        <button className="member-secondary" onClick={() => void auth.logout()}>
          Đăng xuất
        </button>
      </div>
    );
  // Membership của workspace quyết định quyền, không dùng vai trò toàn cục hoặc nút preview.
  if (!group || (!admin && group !== (role === "ELDERLY" ? "elderly" : "kids")))
    return <Loading />;
  const notices = (
    <>
      <AccountStatus />
      {family.dataErrors.length > 0 && (
        <div className="member-error" role="alert">
          <p>Một số dữ liệu chưa cập nhật. Kiểm tra lại trước khi giao dịch.</p>
          <ul>
            {family.dataErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
          <button
            className="member-secondary"
            disabled={family.isDataLoading}
            onClick={() => void family.refreshBalances()}
          >
            Tải lại dữ liệu
          </button>
        </div>
      )}
    </>
  );
  const memberView =
    group === "elderly" ? (
      <ElderlyPortal preview={admin} />
    ) : (
      <KidsPortal preview={admin} />
    );
  if (!admin)
    return (
      <MemberResponsiveShell elderly={role === "ELDERLY"}>
        <div key={`${auth.user?.id}:${family.currentWorkspace.id}`}>
          {notices}
          {memberView}
        </div>
      </MemberResponsiveShell>
    );
  const activeTab: ActiveTab =
    group === "elderly"
      ? "kinetix-shield"
      : group === "kids"
        ? "kinetix-kids"
        : group === "rosca"
          ? "quy-rosca"
          : "quan-tri-cha-me";
  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={(tab) =>
        router.push(tabRoutes[tab] || "/dashboard/guardian")
      }
    >
      {notices}
      {activeTab === "quan-tri-cha-me" ? (
        <GuardianView />
      ) : activeTab === "quy-rosca" ? (
        <RoscaView currentMember={family.currentMember} />
      ) : (
        <div
          className={`member-preview ${group === "elderly" ? "elderly-theme" : "kids-theme"}`}
        >
          {memberView}
        </div>
      )}
    </AppShell>
  );
}
function Loading() {
  return (
    <div className="member-startup" role="status">
      <span className="member-loader" />
      <p>Đang mở không gian gia đình…</p>
    </div>
  );
}
export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DashboardContent />
    </Suspense>
  );
}
