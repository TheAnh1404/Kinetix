"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bell, CheckCheck, ReceiptText, Target } from "lucide-react";
import { useWorkspaceAccess } from "@/hooks/useWorkspaceAccess";
import { useAuth } from "@/hooks/useAuth";
import { useFamily } from "@/context/FamilyContext";
import { VaultWorkflowPanel } from "@/components/vaults/VaultWorkflowPanel";
import { ContractVaultFunding } from "@/components/vaults/ContractVaultFunding";
import { TreasuryPanel } from "@/components/vaults/TreasuryPanel";
import { FinancialActivity } from "./FinancialActivity";
import { MemberNotifications } from "./MemberNotifications";

function useTools() {
  const { role } = useWorkspaceAccess();
  return [
    { id: "activity", title: "Giao dịch", Icon: ReceiptText },
    ...(["ADMIN", "GUARDIAN"].includes(role || "")
      ? [{ id: "approvals", title: "Ký duyệt", Icon: CheckCheck }]
      : []),
    { id: "goals", title: "Mục tiêu chung", Icon: Target },
    { id: "notifications", title: "Thông báo", Icon: Bell },
  ];
}

export function WorkspaceToolsLinks() {
  const tools = useTools();
  return (
    <nav className="vx-tool-links" aria-label="Công cụ của gia đình">
      {tools.map(({ id, title, Icon }) => (
        <Link key={id} href={`/dashboard/tools?section=${id}`}>
          <Icon size={18} aria-hidden />
          {title}
        </Link>
      ))}
    </nav>
  );
}

export function WorkspaceTools() {
  const tools = useTools();
  const query = useSearchParams();
  const auth = useAuth();
  const family = useFamily();
  const requested = query.get("section") || "activity";
  const selected = tools.find((tool) => tool.id === requested);
  const scope = `${auth.user?.id}:${family.currentWorkspace?.id}`;
  return (
    <div className="vault-experience vx-tools">
      <header className="vx-page-header">
        <div>
          <span className="vx-eyebrow">
            KINETIX / {family.currentWorkspace?.name}
          </span>
          <h1>Giao dịch & công cụ</h1>
          <p>
            Theo dõi tiền, xử lý các bước còn chờ và cùng gia đình hoàn thành
            mục tiêu.
          </p>
        </div>
      </header>
      <nav className="vx-source-tabs vx-tool-tabs" aria-label="Chọn công cụ">
        {tools.map(({ id, title, Icon }) => (
          <Link
            key={id}
            href={`/dashboard/tools?section=${id}`}
            aria-current={selected?.id === id ? "page" : undefined}
          >
            <Icon size={18} aria-hidden />
            {title}
          </Link>
        ))}
      </nav>
      {!selected ? (
        <div className="vx-alert" role="alert">
          Công cụ này không có sẵn với vai trò của bạn trong gia đình. Chọn mục
          khác ở phía trên.
        </div>
      ) : (
        <div key={`${scope}:${selected.id}`} className="vx-content">
          {selected.id === "activity" && (
            <>
              <TreasuryPanel />
              <FinancialActivity />
            </>
          )}
          {selected.id === "notifications" && <MemberNotifications />}
          {selected.id === "goals" && (
            <>
              <section className="vx-card">
                <h2>Mục tiêu chung của gia đình</h2>
                <p>
                  Hũ smart contract chỉ cho phép đề xuất chi khi đạt mục tiêu
                  hoặc đến hạn, và cần đủ người bảo hộ ký duyệt. Các hũ bạn được
                  phép truy cập sẽ xuất hiện bên dưới.
                </p>
              </section>
              <ContractVaultFunding kind="SHARED_GOAL" />
              <VaultWorkflowPanel ruleTemplates={["SHARED_GOAL"]} />
            </>
          )}
          {selected.id === "approvals" && (
            <>
              <section className="vx-card">
                <h2>Các yêu cầu gia đình đang chờ bạn</h2>
                <p>
                  Quyền ký smart contract được kiểm tra theo từng hũ. Với ví
                  chung Core, mở đúng mục để duyệt trong ứng dụng và chuẩn bị
                  thanh toán.
                </p>
                <div className="vx-actions">
                  <Link
                    className="vx-button-secondary"
                    href="/dashboard/member?source=core"
                  >
                    Duyệt an sinh · Core
                  </Link>
                  <Link
                    className="vx-button-secondary"
                    href="/dashboard/kids?source=core"
                  >
                    Duyệt việc nhà · Core
                  </Link>
                  <Link
                    className="vx-button-secondary"
                    href="/dashboard/rosca?source=core"
                  >
                    Duyệt góp vốn · Core
                  </Link>
                </div>
              </section>
              <VaultWorkflowPanel />
            </>
          )}
        </div>
      )}
    </div>
  );
}
