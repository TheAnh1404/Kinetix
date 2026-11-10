export type WorkspaceIdentity = {
  creatorUserId?: string | null;
  role?: string;
  userRole?: string;
  accessDisabledAt?: unknown;
  accessDisabled?: boolean;
};
/** Ownership is local to one workspace. Missing evidence always fails closed. */
export function isWorkspaceOwner(userId: string | undefined, workspace: WorkspaceIdentity | null | undefined) {
  return !!userId && !!workspace && workspace.creatorUserId === userId
    && (workspace.role || workspace.userRole) === "ADMIN"
    && !workspace.accessDisabledAt && !workspace.accessDisabled;
}
export function scopedMembership(userId: string, workspace: { creatorUserId?: string | null }, member: { role: string; canManageMembers?: boolean; accessDisabledAt?: unknown }) {
  const isOwner = isWorkspaceOwner(userId, { ...workspace, ...member });
  return { role: member.role === "ADMIN" && !isOwner ? "GUARDIAN" : member.role, canManageMembers: isOwner, isOwner, canAdminister: isOwner };
}
