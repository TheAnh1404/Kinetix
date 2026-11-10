"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useFamily } from "./FamilyContext";
import { useWorkspaceAccess } from "@/hooks/useWorkspaceAccess";
import { CreateVaultModal } from "@/components/vaults/CreateVaultModal";
import { DepositVaultModal } from "@/components/vaults/DepositVaultModal";
import { CreateChoreModal } from "@/components/dashboard/CreateChoreModal";
import { MemberManagementModal } from "@/components/dashboard/MemberManagementModal";

const Context = createContext<{ open: (onClose?: () => void) => void } | null>(
  null,
);
export function VaultCreationProvider({ children }: { children: ReactNode }) {
  const family = useFamily();
  const { isOwner } = useWorkspaceAccess();
  const [flow, setFlow] = useState<{
    workspaceId: string;
    after?: () => void;
    draftId?: string;
  } | null>(null);
  const [memberReturn, setMemberReturn] = useState<typeof flow>(null);
  const [followup, setFollowup] = useState<{
    workspaceId: string;
    vaultId: number;
    dbId: string;
    action: "deposit" | "chore";
  } | null>(null);
  useEffect(() => {
    setFlow(null);
    setFollowup(null);
    setMemberReturn(null);
  }, [family.currentWorkspace?.id]);
  const close = () => {
    setFlow(null);
    flow?.after?.();
  };
  return (
    <Context.Provider
      value={{
        open: (after) => {
          if (isOwner && family.currentWorkspace) {
            setFollowup(null);
            setFlow({ workspaceId: family.currentWorkspace.id, after });
          }
        },
      }}
    >
      {children}
      {flow && flow.workspaceId === family.currentWorkspace?.id && (
        <CreateVaultModal
          key={flow.workspaceId}
          isOpen
          initialDraftId={flow.draftId}
          onClose={close}
          onManage={(draftId) => {
            setMemberReturn({ ...flow, draftId });
            setFlow(null);
          }}
          onNext={(vault, action) => {
            close();
            setFollowup({
              workspaceId: flow.workspaceId,
              vaultId: vault.onchainVaultId,
              dbId: vault.id,
              action,
            });
          }}
        />
      )}
      {/* Chỉ hiển thị modal quản lý thành viên khi có luồng khởi tạo hũ yêu cầu quay lại và đúng workspace */}
      {Boolean(memberReturn && memberReturn.workspaceId === family.currentWorkspace?.id) && (
        <MemberManagementModal
          isOpen
          onClose={() => {
            setFlow(memberReturn);
            setMemberReturn(null);
          }}
        />
      )}
      {/* Chỉ hiển thị modal nạp tiền / việc nhà tiếp nối khi có thông tin followup và đúng workspace */}
      {Boolean(followup && followup.workspaceId === family.currentWorkspace?.id) && (
        <>
          <DepositVaultModal
            isOpen={followup?.action === "deposit"}
            defaultVaultId={followup?.vaultId}
            onNext={() =>
              setFollowup((current) =>
                current ? { ...current, action: "chore" } : null,
              )
            }
            onClose={() => setFollowup(null)}
          />
          <CreateChoreModal
            isOpen={followup?.action === "chore"}
            defaultVaultId={followup?.dbId}
            onClose={() => setFollowup(null)}
          />
        </>
      )}
    </Context.Provider>
  );
}
export function useVaultCreation() {
  const value = useContext(Context);
  if (!value) throw new Error("VaultCreationProvider is required");
  return value;
}
