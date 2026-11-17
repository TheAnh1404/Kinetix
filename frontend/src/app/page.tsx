"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LandingPageNew } from "@/components/landing/LandingPageNew";

/** Public content can render immediately while the account session is checked. */
export default function RootPage() {
  const { isAuthenticated, isLoading, redirectUrl } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(redirectUrl || "/dashboard");
    }
  }, [isAuthenticated, isLoading, redirectUrl, router]);

  if (isAuthenticated) {
    return (
      <div
        className="min-h-[100dvh] grid place-content-center bg-[#090d16] text-[#f4f6fb] p-6"
        role="status"
      >
        <p className="text-xl font-semibold">Đang mở nhóm của bạn…</p>
      </div>
    );
  }
  return <LandingPageNew />;
}
