"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

/**
 * Catch-all route cho mọi sub-path dưới /dashboard/*
 * Ngăn chặn hoàn toàn lỗi 404 khi truy cập /dashboard/guardian, /dashboard/elderly, /dashboard/kids, ...
 */
export default function DashboardCatchAllPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace(`/login?from=/dashboard/${Array.isArray(params?.slug) ? params.slug.join("/") : ""}`);
      return;
    }

    const slug = Array.isArray(params?.slug) ? params.slug[0] : "";

    switch (slug) {
      case "elderly":
      case "shield":
        router.replace("/dashboard?tab=kinetix-shield");
        break;
      case "kids":
      case "chores":
      case "chore":
        router.replace("/dashboard?tab=kinetix-kids");
        break;
      case "rosca":
      case "hui":
        router.replace("/dashboard?tab=quy-rosca");
        break;
      case "vault":
      case "vaults":
      case "workspace":
      case "workspaces":
      case "goal":
      case "goals":
      case "shared-goal":
      case "guardian":
      case "admin":
      default:
        if (user?.role === "ELDERLY") {
          router.replace("/dashboard?tab=kinetix-shield");
        } else if (user?.role === "CHILD") {
          router.replace("/dashboard?tab=kinetix-kids");
        } else {
          router.replace("/dashboard?tab=quan-tri-cha-me");
        }
        break;
    }
  }, [user, isAuthenticated, isLoading, params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface text-on-surface">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-on-surface-variant font-medium">
          Đang tải dữ liệu gia đình...
        </p>
      </div>
    </div>
  );
}
