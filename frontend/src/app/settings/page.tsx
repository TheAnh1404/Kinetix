"use client";
import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { WorkspaceSwitcher } from "@/components/workspaces/WorkspaceSwitcher";
import {
  SettingsView,
  SettingsSection,
} from "@/components/settings/SettingsView";

function SettingsContent() {
  const auth = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    if (auth.isLoading) return;
    if (!auth.isAuthenticated && !auth.sessionError)
      router.replace("/login?from=/settings");
    else if (auth.isAuthenticated && auth.onboarding !== "READY")
      router.replace("/activate");
  }, [
    auth.isLoading,
    auth.isAuthenticated,
    auth.onboarding,
    auth.sessionError,
    router,
  ]);
  if (auth.sessionError && !auth.user)
    return (
      <div className="account-empty">
        <p role="alert">{auth.sessionError}</p>
        <button
          className="account-button"
          onClick={() => void auth.checkSession()}
        >
          Kiểm tra lại phiên
        </button>
      </div>
    );
  if (auth.isLoading || !auth.isAuthenticated || auth.onboarding !== "READY")
    return (
      <div className="account-empty" role="status">
        Đang mở cài đặt tài khoản…
      </div>
    );
  return (
    <div className="account-page">
      <a className="skip-link" href="#account-main">
        Đến nội dung cài đặt
      </a>
      <header className="account-topbar">
        <Link
          href="/dashboard"
          className="account-brand"
          aria-label="Kinetix, về gia đình"
        >
          <span>K</span>kinetix.
        </Link>
        <div className="account-topbar-actions">
          <WorkspaceSwitcher />
          <Link href="/dashboard" className="account-text-link">
            <ArrowLeft size={17} />
            <span>Về gia đình</span>
          </Link>
        </div>
      </header>
      <main className="account-main" id="account-main" tabIndex={-1}>
        <SettingsView
          initialTab={(params.get("tab") || "profile") as SettingsSection}
          onTabChange={(tab) =>
            router.push(`/settings?tab=${tab}`, { scroll: false })
          }
          isStandalonePage
        />
      </main>
    </div>
  );
}
export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="account-empty" role="status">
          Đang mở cài đặt…
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
