"use client";
import React from "react";
import { AccessibleDialog } from "@/components/member/MemberPrimitives";
import { ActivityList } from "@/components/member/MemberActivity";

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
      </div>
    </AccessibleDialog>
  );
}
