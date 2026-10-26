"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

/**
 * Trang /dashboard - Điều hướng thông minh về tab tương ứng theo vai trò
 * Ngăn chặn hoàn toàn lỗi 404 khi người dùng truy cập trực tiếp /dashboard
 */
export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/login?from=/dashboard");
      return;
    }

    if (user?.role === "ELDERLY") {
      router.replace("/?tab=kinetix-shield");
    } else if (user?.role === "CHILD") {
      router.replace("/?tab=kinetix-kids");
    } else {
      router.replace("/?tab=quan-tri-cha-me");
    }
  }, [user, isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface text-on-surface">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-on-surface-variant font-medium">
          Đang chuyển hướng tới Không gian Gia đình...
        </p>
      </div>
    </div>
  );
}
