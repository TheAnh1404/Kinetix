"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { WorkspaceSwitcher } from "@/components/workspaces/WorkspaceSwitcher";
import {
  SettingsView,
  SettingsSection,
} from "@/components/settings/SettingsView";
import { MobileNavBar } from "@/components/navigation/MobileNavBar";
import { DepositVaultModal } from "@/components/vaults/DepositVaultModal";
import { KinetixLogo } from "@/components/ui/KinetixLogo";

function SettingsContent() {
  const auth = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [isDepositOpen, setIsDepositOpen] = useState(false);

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

      {/* Header thanh điều hướng phía trên của trang Cài Đặt */}
      <header className="account-topbar">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 transition-transform hover:scale-[1.02]"
          aria-label="Kinetix, về gia đình"
        >
          <KinetixLogo size="md" subtitle="Cài Đặt Hệ Thống" />
        </Link>
        <div className="account-topbar-actions">
          <WorkspaceSwitcher />
          <Link href="/dashboard" className="account-text-link">
            <ArrowLeft size={17} />
            <span>Về gia đình</span>
          </Link>
        </div>
      </header>

      {/* Nội dung chính với khoảng cách đệm pb-28 trên di động để dock đáy không che khuất */}
      <main className="account-main pb-28 lg:pb-12" id="account-main" tabIndex={-1}>
        <SettingsView
          initialTab={(params.get("tab") || "profile") as SettingsSection}
          onTabChange={(tab) =>
            router.push(`/settings?tab=${tab}`, { scroll: false })
          }
          isStandalonePage
        />
      </main>

      {/* Thanh điều hướng đáy di động (Mobile Floating Glass Dock) trên điện thoại */}
      <MobileNavBar
        activeTab="settings"
        onOpenDeposit={() => setIsDepositOpen(true)}
      />

      {/* Modal Nạp Quỹ nhanh cho phép nạp tiền trực tiếp từ trang Cài Đặt trên di động */}
      <DepositVaultModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
      />
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
