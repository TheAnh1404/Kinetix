"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createWalletClient, custom } from "viem";
import { avalancheFuji } from "viem/chains";
import { authRequest, useAuth } from "./useAuth";
import { useFamily } from "@/context/FamilyContext";
import { getCoreProvider } from "@/lib/web3/client";
import { TreasuryPolicy } from "../../../shared/vaultExperience";
import { treasuryMemo, treasuryCancelMemo } from "../../../shared/treasury";

export type ExperiencePayment = {
  id: string;
  sender: string;
  recipient: string;
  nonce: string;
  amountWei: string;
  txHash: string | null;
  status: string;
};
export type ExperienceJob = {
  id: string;
  jarId: string;
  kind: string;
  title: string;
  description: string;
  subjectId: string;
  recipient: string;
  amountWei: string;
  status: string;
  approvals: string[];
  round: number | null;
  createdAt: string;
  proof: string | null;
  hasProof?: boolean;
  payment: ExperiencePayment | null;
};
export type ExperienceJar = {
  isArchived?: boolean;
  id: string;
  name: string;
  balanceWei: string;
  reservedWei: string;
  availableWei: string;
  remainingTodayWei: string;
  policy: TreasuryPolicy;
  beneficiary: boolean;
  reviewer: boolean;
  jobs: ExperienceJob[];
  activity: ExperiencePayment[];
};
export type ExperienceData = {
  userId: string;
  canManage: boolean;
  people: {
    id: string;
    name: string;
    role: string;
    wallet: string | null;
    avatar: string | null;
  }[];
  jars: ExperienceJar[];
  audit: {
    id: string;
    entityId: string;
    actorId: string | null;
    action: string;
    createdAt: string;
  }[];
  checkedAt: string;
};

export function useVaultExperience() {
  const auth = useAuth();
  const { currentWorkspace } = useFamily();
  const workspaceId = currentWorkspace?.id;
  const scopeKey = `${auth.user?.id}:${workspaceId}`;
  const scope = useRef(scopeKey);
  scope.current = scopeKey;
  const [state, setState] = useState<{
    scope: string;
    data: ExperienceData | null;
    error: string;
    loading: boolean;
  }>({ scope: scopeKey, data: null, error: "", loading: true });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const locked = useRef(false);
  const load = useCallback(async () => {
    if (!workspaceId || !auth.user) return;
    const started = scopeKey;
    try {
      const response = await authRequest(
        `/api/workspaces/${workspaceId}/vault-experience`,
        undefined,
        "GET",
      );
      if (scope.current === started)
        setState({
          scope: started,
          data: response.data,
          error: "",
          loading: false,
        });
    } catch (error) {
      if (scope.current === started)
        setState((old) => ({
          scope: started,
          data: old.scope === started ? old.data : null,
          error: (error as Error).message,
          loading: false,
        }));
    }
  }, [scopeKey, workspaceId, auth.user?.id]);
  useEffect(() => {
    setState({ scope: scopeKey, data: null, error: "", loading: true });
    setMessage("");
    void load();
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, 15000);
    return () => clearInterval(timer);
  }, [load, scopeKey]);
  const run = async (action: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setMessage("");
    const started = scopeKey;
    try {
      await action();
      if (scope.current === started) {
        setMessage(
          "Đã cập nhật. Khoản thanh toán chỉ hoàn tất sau khi mạng xác nhận và sổ được đồng bộ.",
        );
        await load();
      }
    } catch (error) {
      if (scope.current === started)
        setState((old) => ({ ...old, error: (error as Error).message }));
      throw error;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  const post = async (path: string, body: Record<string, unknown>) => {
    if (scope.current !== scopeKey)
      throw new Error("Không gian đã thay đổi. Mở lại thao tác.");
    const storageKey = `kinetix-business:${scopeKey}:${path}:${JSON.stringify(body)}`;
    let requestId: string;
    try {
      requestId = sessionStorage.getItem(storageKey) || crypto.randomUUID();
      sessionStorage.setItem(storageKey, requestId);
    } catch {
      requestId = crypto.randomUUID();
    }
    const result = await authRequest(path, { ...body, requestId });
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* Server still enforces request identity. */
    }
    if (scope.current !== scopeKey)
      throw new Error("Gia đình hoặc tài khoản đã thay đổi. Mở lại thao tác.");
    return result.data ?? result.transfer;
  };
  const sign = async (
    payment: ExperiencePayment,
    cancel = false,
    manualHash?: string,
  ) => {
    if (scope.current !== scopeKey)
      throw new Error("Gia đình hoặc tài khoản đã thay đổi. Mở lại thao tác.");
    if (!payment?.id || !payment.sender || !payment.recipient)
      throw new Error("Chưa nhận được yêu cầu thanh toán hợp lệ. Tải lại dữ liệu trước khi ký.");
    const key = `kinetix-treasury:${payment.id}${cancel ? ":cancel" : ""}`;
    let hash = manualHash;
    try {
      hash ||= localStorage.getItem(key) || undefined;
    } catch {
      /* Manual hash recovery remains available. */
    }
    if (!hash) {
      if (!cancel) await authRequest(`/api/treasury/transfers/${payment.id}/preflight`, {});
      const provider = getCoreProvider();
      if (!provider) throw new Error("Mở Core Wallet để ký giao dịch.");
      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });
      if (accounts[0]?.toLowerCase() !== payment.sender.toLowerCase())
        throw new Error(`Cần chọn ví ký ${payment.sender} trong Core.`);
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xa869" }],
      });
      if (
        Number(await provider.request({ method: "eth_chainId" })) !== 43113 ||
        scope.current !== scopeKey
      )
        throw new Error("Sai mạng hoặc không gian đã thay đổi.");
      if (!cancel) await authRequest(`/api/treasury/transfers/${payment.id}/preflight`, {});
      hash = await createWalletClient({
        chain: avalancheFuji,
        transport: custom(provider),
      }).sendTransaction({
        account: accounts[0],
        to: (cancel ? payment.sender : payment.recipient) as `0x${string}`,
        value: cancel ? 0n : BigInt(payment.amountWei),
        nonce: Number(payment.nonce),
        data: cancel
          ? treasuryCancelMemo(payment.id)
          : treasuryMemo(payment.id),
      });
      if (scope.current === scopeKey)
        setMessage(`Đã gửi: ${hash}. Giữ tx hash để đối soát nếu mất kết nối.`);
      try {
        localStorage.setItem(key, hash!);
      } catch {
        /* Hash also remains in the status message. */
      }
    }
    await authRequest(`/api/treasury/transfers/${payment.id}/transaction`, {
      txHash: hash,
    });
  };
  return {
    data: state.scope === scopeKey ? state.data : null,
    error: state.scope === scopeKey ? state.error : "",
    loading: state.scope !== scopeKey || state.loading,
    busy,
    message,
    load,
    run,
    post,
    sign,
    workspaceId,
  };
}
