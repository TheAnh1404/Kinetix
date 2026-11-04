"use client";
import { useEffect, useState } from "react";
import { authRequest } from "@/hooks/useAuth";

export interface MemberVaultPolicy {
  vaultId: string;
  name: string;
  isActive: boolean;
  isBeneficiary: boolean;
  fastWithdrawLimit: string;
  totalBalance: string;
  availableNow: string;
  requiredApprovals: number;
  remainingToday: string | null;
  checkedAt: string;
  asset: string;
}
export const fetchVaultPolicy = async (
  id: string,
): Promise<MemberVaultPolicy> =>
  (
    await authRequest(
      `/api/member/vaults/${encodeURIComponent(id)}/policy`,
      undefined,
      "GET",
    )
  ).data;
export function useVaultPolicy(id?: string) {
  const [policy, setPolicy] = useState<MemberVaultPolicy | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let stale = false;
    setPolicy(null);
    setError("");
    if (!id) return;
    const refresh = () => {
      void fetchVaultPolicy(id)
        .then((value) => {
          if (!stale) {
            setPolicy(value);
            setError("");
          }
        })
        .catch((err) => {
          if (!stale) {
            setPolicy(null);
            setError(err.message);
          }
        });
    };
    refresh();
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      stale = true;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [id, retry]);
  return {
    policy: policy?.vaultId === id ? policy : null,
    error,
    retry: () => setRetry((value) => value + 1),
  };
}
