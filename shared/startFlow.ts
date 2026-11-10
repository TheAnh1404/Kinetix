export const START_FLOW_VERSION = 1;
export const WORKSPACE_PREFERENCE_COOKIE = "kinetix_workspace";
export type StartStep = "WELCOME" | "FAMILY" | "READINESS" | "FINISH";
export type StartStatus = "IN_PROGRESS" | "COMPLETED" | "DEFERRED" | "LEGACY";
export interface StartProgress {
  flowVersion: number;
  status: StartStatus;
  step: StartStep;
  revision: number;
  completedAt: string | null;
  deferredAt: string | null;
}
export function startSteps(role: string): StartStep[] {
  return role === "ELDERLY" || role === "CHILD"
    ? ["WELCOME", "READINESS", "FINISH"]
    : ["WELCOME", "FAMILY", "READINESS", "FINISH"];
}
export function needsStart(status?: string | null) {
  return !status || status === "IN_PROGRESS";
}
export function dashboardRoute(role: string, workspaceId?: string) {
  const group =
    role === "ELDERLY"
      ? "elderly"
      : role === "CHILD"
        ? "kids"
        : role === "ADMIN"
          ? "admin"
          : "member";
  return `/dashboard/${group}${workspaceId ? `?workspace=${encodeURIComponent(workspaceId)}` : ""}`;
}
export function startRoute(workspaceId: string) {
  return `/start?workspace=${encodeURIComponent(workspaceId)}`;
}
export function entryRoute(
  securityState: string,
  workspaceId: string | undefined,
  role: string,
  status?: string | null,
  enabled = true,
) {
  if (securityState !== "READY") return "/activate";
  if (!workspaceId) return "/dashboard";
  return enabled && needsStart(status)
    ? startRoute(workspaceId)
    : dashboardRoute(role, workspaceId);
}
export function startRedirect(
  path: string,
  identity: {
    onboarding: string;
    startRequired?: boolean;
    redirectUrl?: string;
  },
) {
  if (identity.onboarding !== "READY")
    return path === "/activate" ? null : "/activate";
  if (path === "/start") return null;
  if (
    identity.startRequired ||
    ["/login", "/register", "/activate"].includes(path)
  )
    return identity.redirectUrl || "/dashboard";
  return null;
}
