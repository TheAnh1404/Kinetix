import { createWalletClient, custom } from "viem";
import { authRequest } from "@/hooks/useAuth";
import {
  getCoreProvider,
  publicClientFuji,
  switchNetwork,
  walletWriteScope,
} from "./client";
import { avalancheFuji } from "@/contracts/config";
import {
  GroupTransferInstruction,
  GROUP_CHAIN_ID,
  groupTransferMemo,
} from "../../../../shared/groupFinance";

export interface GroupTransfer extends GroupTransferInstruction {
  fundId: string;
  userId: string;
  requestId: string | null;
  kind: "CONTRIBUTION" | "PAYMENT";
  chainId: number;
  data: `0x${string}`;
  txHash?: string | null;
  status: string;
}
const key = (userId: string, intentId: string) =>
  `kinetix-group-transfer:${userId}:${intentId}`;
export function savedGroupHash(
  userId: string,
  intentId: string,
): string | null {
  try {
    const value = localStorage.getItem(key(userId, intentId));
    return /^0x[\da-f]{64}$/i.test(value || "") ? value : null;
  } catch {
    return null;
  }
}

/** Pins exact amount, sender, nonce and memo. Never sends again after a hash or ambiguous signing. */
export async function sendGroupTransfer(
  userId: string,
  workspaceId: string,
  intent: GroupTransfer,
): Promise<string> {
  if (intent.txHash) return intent.txHash;
  const saved = savedGroupHash(userId, intent.id);
  if (saved) return saved;
  if (
    intent.chainId !== GROUP_CHAIN_ID ||
    intent.data !== groupTransferMemo(intent.id) ||
    intent.userId !== userId
  )
    throw new Error("Lệnh chuyển không khớp tài khoản hoặc mạng Fuji.");
  if (walletWriteScope() !== workspaceId)
    throw new Error("Nhóm hoặc trạng thái kết nối ví đã thay đổi.");
  const identity = await authRequest("/api/auth/me", undefined, "GET");
  if (
    identity.user?.id !== userId ||
    identity.onboarding !== "READY" ||
    identity.linkedWallet?.address?.toLowerCase() !==
      intent.senderAddress.toLowerCase()
  )
    throw new Error(
      "Tài khoản hoặc ví đã thay đổi. Đăng nhập lại trước khi ký.",
    );
  const provider = getCoreProvider();
  if (!provider)
    throw new Error(
      "Mở ứng dụng trong trình duyệt ví Core để ký trên điện thoại. Kết nối ví ngoài trình duyệt chưa được hỗ trợ.",
    );
  await switchNetwork(GROUP_CHAIN_ID);
  await provider.request({ method: "eth_requestAccounts" });
  const assertProvider = async () => {
    const current = await provider.request({ method: "eth_accounts" });
    const chain = Number.parseInt(
      await provider.request({ method: "eth_chainId" }),
      16,
    );
    if (
      current[0]?.toLowerCase() !== intent.senderAddress ||
      chain !== GROUP_CHAIN_ID ||
      walletWriteScope() !== workspaceId
    )
      throw new Error("Chọn đúng ví đã liên kết và mạng Avalanche Fuji.");
  };
  await assertProvider();
  const instruction = {
    account: intent.senderAddress as `0x${string}`,
    to: intent.recipientAddress as `0x${string}`,
    value: BigInt(intent.amountWei),
    data: intent.data,
    nonce: intent.nonce,
    chain: avalancheFuji,
  };
  const gas = await publicClientFuji.estimateGas(instruction);
  const pendingNonce = await publicClientFuji.getTransactionCount({
    address: instruction.account,
    blockTag: "pending",
  });
  if (pendingNonce !== intent.nonce)
    throw new Error(
      "Nonce ví đã thay đổi. Kiểm tra lịch sử ví và nhập mã giao dịch để đối soát; không gửi lại tiền.",
    );
  const current = await authRequest(
    `/api/groups/${workspaceId}/transfers`,
    undefined,
    "GET",
  );
  const fresh = (current.data as GroupTransfer[]).find(
    (item) => item.id === intent.id,
  );
  if (
    !fresh ||
    fresh.senderAddress !== intent.senderAddress ||
    fresh.amountWei !== intent.amountWei ||
    fresh.recipientAddress !== intent.recipientAddress ||
    fresh.nonce !== intent.nonce ||
    fresh.data !== intent.data ||
    fresh.fundId !== intent.fundId
  )
    throw new Error("Lệnh chuyển không còn hợp lệ trong nhóm này.");
  if (fresh.txHash) return fresh.txHash;
  await assertProvider();
  const finalIdentity = await authRequest("/api/auth/me", undefined, "GET");
  if (
    finalIdentity.user?.id !== userId ||
    finalIdentity.onboarding !== "READY" ||
    finalIdentity.linkedWallet?.address?.toLowerCase() !== intent.senderAddress
  )
    throw new Error("Tài khoản hoặc ví đã thay đổi trước khi ký.");
  // Persist uncertainty before opening the wallet. Missing hash requires recovery, not an automatic retry.
  if (localStorage.getItem(key(userId, intent.id)) === "SIGNING")
    throw new Error(
      "Lần ký trước chưa có mã trả về. Kiểm tra ví và nhập mã giao dịch để đối soát.",
    );
  localStorage.setItem(key(userId, intent.id), "SIGNING");
  const wallet = createWalletClient({
    chain: avalancheFuji,
    transport: custom(provider),
  });
  try {
    const hash = await wallet.sendTransaction({ ...instruction, gas });
    try {
      localStorage.setItem(key(userId, intent.id), hash);
    } catch {
      /* Return the real hash so the caller can persist it on the server. */
    }
    return hash;
  } catch (error: any) {
    for (
      let cause = error, depth = 0;
      cause && depth < 8;
      cause = cause.cause, depth++
    ) {
      if (cause.code === 4001) {
        localStorage.removeItem(key(userId, intent.id));
        break;
      }
    }
    throw error;
  }
}
