"use client";

import { useEffect, useRef, useState } from "react";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/hooks/useAuth";
import { FAMILY_HUB_ABI } from "@/contracts/abis";
import { hubChain } from "@/contracts/config";
import {
  getWalletClient,
  pendingTransactions,
  queueTransactionSync,
} from "@/lib/web3/client";

type State = "idle" | "signing" | "success" | "tracking" | "error";
export function useMemberTransaction() {
  const auth = useAuth();
  const family = useFamily();
  const [state, setState] = useState<State>("idle");
  const stateRef = useRef<State>("idle");
  const updateState = (next: State) => {
    stateRef.current = next;
    setState(next);
  };
  const [message, setMessage] = useState("");
  const [hash, setHash] = useState("");
  const locked = useRef(false);
  const scope = `${auth.user?.id}:${family.currentWorkspace?.id}`;
  const activeScope = useRef(scope);
  activeScope.current = scope;
  useEffect(() => {
    activeScope.current = scope;
    locked.current = false;
    stateRef.current = "idle";
    setState("idle");
    setHash("");
    setMessage("");
    return () => {
      activeScope.current = "";
    };
  }, [scope]);
  const execute = async (params: {
    functionName: string;
    args: unknown[];
    path: string;
    body: object;
    method?: string;
    preflight?: () => Promise<void>;
  }) => {
    if (locked.current) return false;
    locked.current = true;
    const startedScope = activeScope.current;
    const userId = auth.user?.id;
    const existing = userId
      ? pendingTransactions(userId).map((item) => item.hash)
      : [];
    updateState("signing");
    setMessage(
      "Ở Core, kiểm tra nội dung rồi xác nhận. Quay lại đây để theo dõi kết quả.",
    );
    try {
      if (!userId || !family.currentWorkspace?.l1HubAddress)
        throw new Error(
          "Không gian chưa có hợp đồng. Hãy liên hệ người bảo hộ.",
        );
      // Khóa thao tác có cùng tài nguyên khi đã broadcast, kể cả sau tải lại trang.
      const unresolved = pendingTransactions(userId).find(
        (item) =>
          item.status !== "REVERTED" &&
          (item.status === "PENDING" ||
            (item.sync && item.sync.status !== "DONE")) &&
          item.sync?.path === params.path &&
          Object.entries(params.body)
            .filter(([key]) => key !== "attachmentId")
            .every(
              ([key, value]) =>
                (item.sync?.body as Record<string, unknown>)?.[key] === value,
            ),
      );
      if (unresolved) {
        setHash(unresolved.hash);
        updateState("tracking");
        setMessage(
          "Giao dịch đã gửi, đang theo dõi hoặc cập nhật. Không cần gửi lại.",
        );
        return false;
      }
      await auth.connectWallet();
      if (activeScope.current !== startedScope)
        throw new Error("Không gian đã thay đổi. Hãy mở lại thao tác.");
      await params.preflight?.();
      if (activeScope.current !== startedScope)
        throw new Error("Không gian đã thay đổi. Hãy mở lại thao tác.");
      const wallet = getWalletClient(hubChain);
      if (!wallet) throw new Error("Chưa kết nối đúng ví Core.");
      const txHash: string = await (wallet as any).writeContract({
        address: family.currentWorkspace.l1HubAddress,
        abi: FAMILY_HUB_ABI,
        functionName: params.functionName,
        args: params.args,
        __kinetixSync: {
          path: params.path,
          body: params.body,
          method: params.method || "POST",
        },
      });
      if (activeScope.current !== startedScope) return false;
      setHash(txHash);
      await queueTransactionSync(
        userId,
        txHash,
        params.path,
        { ...params.body, txHash },
        params.method || "POST",
      );
      if (activeScope.current !== startedScope) return false;
      updateState("success");
      setMessage("Giao dịch đã xác nhận và dữ liệu đã được cập nhật.");
      void family.refreshBalances();
      return true;
    } catch (error: any) {
      if (activeScope.current !== startedScope) return false;
      const broadcast =
        userId &&
        pendingTransactions(userId).find(
          (item) => !existing.includes(item.hash) && item.status !== "REVERTED",
        );
      if (broadcast) {
        setHash(broadcast.hash);
        updateState("tracking");
        setMessage(
          "Giao dịch đã gửi. Hệ thống đang theo dõi và đồng bộ, hãy kiểm tra trạng thái trước khi tiếp tục.",
        );
      } else {
        updateState("error");
        setMessage(
          error.shortMessage ||
            error.message ||
            "Chưa hoàn tất. Hãy kiểm tra kết nối rồi thử lại.",
        );
      }
      return false;
    } finally {
      if (activeScope.current === startedScope) locked.current = false;
    }
  };
  const reset = () => {
    if (stateRef.current === "success" || stateRef.current === "error") {
      updateState("idle");
      setHash("");
      setMessage("");
    }
  };
  return {
    state,
    message,
    hash,
    execute,
    reset,
    busy: state === "signing",
    blocked: state === "tracking" || state === "success",
  };
}
