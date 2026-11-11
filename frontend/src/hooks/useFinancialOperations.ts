"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth, authRequest } from "./useAuth";
import { useFamily } from "@/context/FamilyContext";
import { restoreOperations, reconcileTransactions } from "@/lib/web3/client";

export type FinancialOperation = {
  id: string;
  workspaceId: string;
  hash: string;
  chainId: number;
  functionName: string;
  amountWei: string | null;
  recipient: string | null;
  status: string;
  lastErrorCode: string | null;
  submittedAt: string;
};

export function useFinancialOperations() {
  const auth = useAuth();
  const family = useFamily();
  const workspaceId = family.currentWorkspace?.id;
  const userId = auth.user?.id;
  const key = `${userId}:${workspaceId}`;
  const scope = useRef(key);
  scope.current = key;
  const mounted = useRef(true);
  const locked = useRef(false);
  const revision = useRef(0);
  const [state, setState] = useState<{
    key: string;
    operations: FinancialOperation[];
    error: string;
    loading: boolean;
  }>({ key, operations: [], error: "", loading: true });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    if (!userId || !workspaceId) return;
    const requested = ++revision.current;
    try {
      const response = await authRequest(
        `/api/operations?workspaceId=${encodeURIComponent(workspaceId)}`,
        undefined,
        "GET",
      );
      if (
        mounted.current &&
        scope.current === key &&
        revision.current === requested
      )
        setState({
          key,
          operations: response.operations,
          error: "",
          loading: false,
        });
    } catch (cause) {
      if (
        mounted.current &&
        scope.current === key &&
        revision.current === requested
      )
        setState((old) => ({
          key,
          operations: old.key === key ? old.operations : [],
          loading: false,
          error: (cause as Error).message,
        }));
    }
  }, [key, workspaceId, userId]);
  useEffect(() => {
    mounted.current = true;
    setState({ key, operations: [], error: "", loading: true });
    setMessage("");
    void load();
    const timer = setInterval(() => {
      if (!document.hidden && !locked.current) void load();
    }, 15000);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [key, load]);
  const run = async (action: () => Promise<void>) => {
    if (locked.current || !workspaceId || !userId) return;
    locked.current = true;
    setBusy(true);
    setMessage("");
    const active = () => mounted.current && scope.current === key;
    try {
      await action();
      if (active()) {
        await load();
        setMessage(
          "Đã kiểm tra giao dịch. Trạng thái bên dưới được đọc lại từ máy chủ; không gửi thêm AVAX.",
        );
      }
    } catch (cause) {
      if (active())
        setState((old) => ({ ...old, error: (cause as Error).message }));
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const reconcile = async (operationId?: string) =>
    run(async () => {
      if (scope.current !== key)
        throw new Error("Gia đình đã thay đổi. Mở lại thao tác.");
      if (operationId)
        await authRequest(
          `/api/operations/${encodeURIComponent(operationId)}/reconcile`,
          {},
        );
      if (scope.current !== key) return;
      await restoreOperations(userId!, workspaceId!);
      if (scope.current !== key) return;
      await reconcileTransactions(userId!);
    });
  const record = async (hash: string) =>
    run(async () => {
      if (!/^0x[0-9a-f]{64}$/i.test(hash.trim()))
        throw new Error("Nhập tx hash gồm 0x và 64 ký tự thập lục phân.");
      if (scope.current !== key)
        throw new Error("Gia đình đã thay đổi. Mở lại thao tác.");
      await authRequest("/api/operations", {
        workspaceId,
        txHash: hash.trim(),
      });
      if (scope.current !== key) return;
      await restoreOperations(userId!, workspaceId!);
      if (scope.current !== key) return;
      await reconcileTransactions(userId!);
    });
  return {
    operations: state.key === key ? state.operations : [],
    error: state.key === key ? state.error : "",
    loading: state.key !== key || state.loading,
    busy,
    message,
    load,
    reconcile,
    record,
  };
}
