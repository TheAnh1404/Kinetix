"use client";
import { useCallback, useState } from "react";
export interface YieldVaultInfo {
  principal: bigint;
  accruedYield: bigint;
  totalYield: bigint;
  totalValueLocked: bigint;
  principalFormatted: string;
  totalYieldFormatted: string;
  tvlFormatted: string;
}
export function useYieldVault() {
  const [error, setError] = useState<string | null>(null);
  const disabled = useCallback(async (..._args: unknown[]): Promise<string> => {
    const message = "Lợi suất chưa bật trong T1 Fuji.";
    setError(message);
    throw new Error(message);
  }, []);
  const getYieldInfo = useCallback(
    async (_vaultId: number): Promise<YieldVaultInfo | null> => null,
    [],
  );
  return {
    isLoading: false,
    error,
    getYieldInfo,
    getYieldReservePool: disabled,
    compoundYield: disabled,
    depositYieldReserve: disabled,
  };
}
