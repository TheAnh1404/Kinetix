"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth, authRequest } from "./useAuth";
import type { FirstUseInput, FirstUseStep } from "../../../shared/firstUse";
export interface FirstUseData {
  workspaceId: string;
  role: string;
  canManageMembers: boolean;
  facts: FirstUseInput;
  steps: FirstUseStep[];
  checkedAt: string;
  asOfBlock: string | null;
}
export function useFirstUseStatus(workspaceId?: string) {
  const auth = useAuth();
  const scope = `${auth.user?.id}:${workspaceId}`;
  const [result, setResult] = useState<{
    scope: string;
    data?: FirstUseData;
    error?: string;
  } | null>(null);
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    if (!workspaceId || !auth.user || auth.onboarding !== "READY") return;
    const request = ++revision.current;
    try {
      const response = await authRequest(
        `/api/workspaces/${workspaceId}/first-use`,
        undefined,
        "GET",
      );
      if (request === revision.current)
        setResult({ scope, data: response.data });
    } catch (error) {
      if (request === revision.current)
        setResult({
          scope,
          error:
            error instanceof Error
              ? error.message
              : "Chưa kiểm tra được trạng thái.",
        });
    }
  }, [scope, workspaceId, auth.user?.id, auth.onboarding]);
  useEffect(() => {
    void refresh();
    const update = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = setInterval(update, 30000);
    window.addEventListener("focus", update);
    window.addEventListener("kinetix-sync-complete", update);
    window.addEventListener("kinetix-first-use-refresh", update);
    return () => {
      ++revision.current;
      clearInterval(timer);
      window.removeEventListener("focus", update);
      window.removeEventListener("kinetix-sync-complete", update);
      window.removeEventListener("kinetix-first-use-refresh", update);
    };
  }, [refresh]);
  return {
    data: result?.scope === scope ? result.data : undefined,
    error: result?.scope === scope ? result.error : undefined,
    refresh,
  };
}
