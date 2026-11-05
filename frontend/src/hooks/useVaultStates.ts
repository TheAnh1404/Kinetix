"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFamily } from "@/context/FamilyContext";
import { authRequest } from "@/hooks/useAuth";

export function useVaultStates() {
  const { currentWorkspace, dynamicVaults } = useFamily();
  const [states, setStates] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const generation = useRef(0);
  const ids = dynamicVaults.map((vault) => vault.id).join(",");
  const refresh = useCallback(async () => {
    const revision = ++generation.current;
    const next: Record<string, any> = {};
    const failures: Record<string, string> = {};
    await Promise.all(ids.split(",").filter(Boolean).map(async (id) => {
      try { next[id] = (await authRequest(`/api/vaults/${id}/state`, undefined, "GET")).data; }
      catch (error) { failures[id] = error instanceof Error ? error.message : "Chưa đối soát được trạng thái."; }
    }));
    if (revision === generation.current) { setStates(next); setErrors(failures); }
  }, [currentWorkspace?.id, ids]);
  useEffect(() => {
    setStates({}); setErrors({});
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    const sync = () => void refresh();
    window.addEventListener("kinetix-sync-complete", sync);
    return () => { ++generation.current; clearInterval(timer); window.removeEventListener("kinetix-sync-complete", sync); };
  }, [refresh]);
  return { states, errors, refresh };
}
