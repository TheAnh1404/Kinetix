"use client";

import React from "react";
import Link from "next/link";
import type { DynamicVaultItem } from "@/types";
import { AccessibleDialog } from "@/components/member/MemberPrimitives";

interface InterVaultTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceVault?: DynamicVaultItem | null;
  allVaults: DynamicVaultItem[];
}

export function InterVaultTransferModal({
  isOpen,
  onClose,
  sourceVault,
}: InterVaultTransferModalProps) {
  if (!isOpen) return null;
  return (
    <AccessibleDialog title="Chuyển tiền giữa các hũ" onClose={onClose}>
      <div className="space-y-4 text-slate-700 dark:text-slate-200">
        {sourceVault && (
          <p>
            Hũ nguồn: <strong>{sourceVault.name}</strong>
          </p>
        )}
        <p
          role="status"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
        >
          Chuyển trực tiếp giữa hũ smart contract V1 chưa được API hiện tại hỗ
          trợ đối soát. Chức năng này chưa sẵn sàng để ký giao dịch.
        </p>
        <p className="text-sm">
          Với các hũ trong ví chung Core, chủ nhà có thể dùng mục “Chuyển giữa
          các hũ” trong sổ ví chung. Hũ có chính sách vẫn phải đi qua yêu cầu đã
          duyệt; thưởng vào heo đất được thực hiện tại việc nhà tương ứng.
        </p>
        <Link
          className="member-secondary"
          href="/dashboard/admin#core-treasury"
          onClick={onClose}
        >
          Mở sổ ví chung Core
        </Link>
      </div>
    </AccessibleDialog>
  );
}
