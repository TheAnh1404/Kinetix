"use client";
import React from "react";
import { AccessibleDialog } from "@/components/member/MemberPrimitives";
import { ActivityList } from "@/components/member/MemberActivity";
import Link from "next/link";

export function TransactionLedgerModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;
  return (
    <AccessibleDialog title="Giao dịch đã ghi nhận" onClose={onClose}>
      <div className="member-preview elderly-theme">
        <ActivityList />
        <Link href="/dashboard/tools?section=activity" onClick={onClose} className="member-secondary">Giao dịch đang chờ & đối soát tx hash</Link>
      </div>
    </AccessibleDialog>
  );
}
