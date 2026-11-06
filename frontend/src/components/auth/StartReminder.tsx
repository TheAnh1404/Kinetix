"use client";
import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/hooks/useAuth";
export function StartReminder() {
  const { currentWorkspace } = useFamily();
  const auth = useAuth();
  if (!currentWorkspace) return null;
  const member = auth.workspaces.find(
    (item) => item.id === currentWorkspace.id,
  );
  return (
    <aside className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50/50 px-4 py-3 mb-4">
      <div>
        <p className="font-semibold text-sm text-slate-900">
          Thiết lập gia đình theo cách của bạn
        </p>
        <p className="text-xs text-slate-600 mt-1">
          Hướng dẫn và các bước còn chờ nằm ở màn Bắt đầu riêng.
        </p>
      </div>
      <Link
        className="flex min-h-12 items-center gap-2 text-sm font-bold text-red-700"
        href={`/start?workspace=${encodeURIComponent(currentWorkspace.id)}`}
      >
        {member?.startStatus === "DEFERRED"
          ? "Tiếp tục thiết lập"
          : "Xem hướng dẫn"}
        <ArrowRight size={16} aria-hidden />
      </Link>
    </aside>
  );
}
