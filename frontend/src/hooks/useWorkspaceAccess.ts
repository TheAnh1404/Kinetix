"use client";
import { useAuth } from "./useAuth";
import { useFamily } from "@/context/FamilyContext";
import { isWorkspaceOwner } from "../../../shared/workspacePermissions";

export function useWorkspaceAccess() {
  const auth = useAuth();
  const family = useFamily();
  const workspace = auth.workspaces.find((item) => item.id === family.currentWorkspace?.id);
  return { workspace, isOwner: isWorkspaceOwner(auth.user?.id, workspace), role: workspace?.role };
}
