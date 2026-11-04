import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  PublicClient,
  WalletClient,
} from "viem";
import { avalancheFamilyL1, avalancheFuji, hubChain } from "@/contracts/config";
import {
  TRANSACTION_ALLOWLIST_ADDRESS,
  TRANSACTION_ALLOWLIST_ABI,
} from "../../../../shared/networkPermissions";
import { FAMILY_HUB_ABI } from "@/contracts/abis";

declare global {
  interface Window {
    ethereum?: any;
    avalanche?: any;
  }
}
export function getCoreProvider(): any | null {
  if (typeof window === "undefined") return null;
  return (
    window.avalanche ||
    (window.ethereum?.isAvalanche
      ? window.ethereum
      : window.ethereum?.providers?.find(
          (provider: any) => provider.isAvalanche,
        )) ||
    null
  );
}
export const publicClientL1: PublicClient = createPublicClient({
  chain: hubChain,
  transport: http(),
});
export const publicClientFuji: PublicClient = createPublicClient({
  chain: avalancheFuji,
  transport: http(),
});
let transactionWorkspace: string | null = null;
let walletUseEnabled = true;
export const setTransactionWorkspace = (id: string | null) => {
  transactionWorkspace = id;
};
export const setWalletUseEnabled = (enabled: boolean) => {
  walletUseEnabled = enabled;
};
export interface PendingTransaction {
  hash: `0x${string}`;
  chainId: number;
  submittedAt: string;
  status: "PENDING" | "CONFIRMED" | "REVERTED";
  sync?: {
    path: string;
    body: object;
    method: string;
    status: "PENDING" | "DONE" | "BLOCKED";
  };
}
function saveTransaction(userId: string, transaction: PendingTransaction) {
  try {
    const key = `kinetix-pending:${userId}`;
    const records: PendingTransaction[] = JSON.parse(
      localStorage.getItem(key) || "[]",
    );
    localStorage.setItem(
      key,
      JSON.stringify(
        [
          transaction,
          ...records.filter((record) => record.hash !== transaction.hash),
        ].slice(0, 30),
      ),
    );
    window.dispatchEvent(new Event("kinetix-transactions-changed"));
  } catch {
    /* receipt tracking continues even when local storage is unavailable */
  }
}
export function pendingTransactions(userId: string): PendingTransaction[] {
  try {
    return JSON.parse(
      localStorage.getItem(`kinetix-pending:${userId}`) || "[]",
    );
  } catch {
    return [];
  }
}
const syncPaths = new Set([
  "/api/vaults",
  "/api/withdrawals/create",
  "/api/withdrawals/approve",
  "/api/chores/create",
  "/api/chores/submit",
  "/api/chores/verify",
  "/api/vaults/rosca-payout",
]);
async function syncRecord(userId: string, transaction: PendingTransaction) {
  const sync = transaction.sync;
  if (
    !sync ||
    sync.status !== "PENDING" ||
    transaction.status !== "CONFIRMED" ||
    !syncPaths.has(sync.path) ||
    !["POST", "PATCH"].includes(sync.method)
  )
    return;
  const response = await fetch(sync.path, {
    method: sync.method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sync.body),
    cache: "no-store",
  });
  const data = await response.json();
  saveTransaction(userId, {
    ...transaction,
    sync: {
      ...sync,
      status: response.ok
        ? "DONE"
        : response.status >= 500 || response.status === 429
          ? "PENDING"
          : "BLOCKED",
    },
  });
  if (!response.ok)
    throw new Error(
      "Giao dịch đã xác nhận, cần đồng bộ dữ liệu. Không gửi lại giao dịch.",
    );
  return data;
}
export async function queueTransactionSync(
  userId: string,
  hash: string,
  path: string,
  body: object,
  method: string,
) {
  const record = pendingTransactions(userId).find((item) => item.hash === hash);
  if (!record || record.status !== "CONFIRMED" || !syncPaths.has(path))
    throw new Error("Cần giao dịch đã xác nhận để đồng bộ dữ liệu.");
  const queued = {
    ...record,
    sync: { path, body, method, status: "PENDING" as const },
  };
  saveTransaction(userId, queued);
  try {
    return await syncRecord(userId, queued);
  } catch {
    throw new Error(
      `Giao dịch ${hash} đã xác nhận và đang chờ đồng bộ dữ liệu. Không gửi lại giao dịch.`,
    );
  }
}
export async function reconcileTransactions(userId: string) {
  await Promise.all(
    pendingTransactions(userId)
      .filter((item) => item.status === "PENDING")
      .map(async (transaction) => {
        const client =
          transaction.chainId === hubChain.id
            ? publicClientL1
            : transaction.chainId === avalancheFuji.id
              ? publicClientFuji
              : null;
        if (!client) return;
        try {
          const receipt = await client.getTransactionReceipt({
            hash: transaction.hash,
          });
          saveTransaction(userId, {
            ...transaction,
            status: receipt.status === "success" ? "CONFIRMED" : "REVERTED",
          });
        } catch {
          /* still pending; polling is independent of the connected account */
        }
      }),
  );
  const queued = pendingTransactions(userId).filter(
    (item) => item.status === "CONFIRMED" && item.sync?.status === "PENDING",
  );
  if (!queued.length) return;
  try {
    const identity = await apiGet("/api/auth/me");
    if (identity.user?.id !== userId || identity.onboarding !== "READY") return;
    for (const transaction of queued) {
      try {
        await syncRecord(userId, transaction);
      } catch {
        /* keep retryable sync queued */
      }
    }
  } catch {
    /* retry after the same user signs in again */
  }
}
async function apiGet(path: string) {
  const result = await fetch(path, { cache: "no-store" });
  const data = await result.json();
  if (!result.ok)
    throw new Error(data.error || "Không thể kiểm tra quyền giao dịch.");
  return data;
}
/** Every write rechecks app identity, workspace, actual provider account, chain and simulation. */
export function getWalletClient(
  targetChain: any = hubChain,
): WalletClient | null {
  const provider = getCoreProvider();
  if (!provider || !walletUseEnabled) return null;
  const wallet = createWalletClient({
    chain: targetChain,
    transport: custom(provider),
  });
  const safe = {
    ...wallet,
    writeContract: async (args: any) => {
      if (!walletUseEnabled)
        throw new Error("Hãy kết nối lại Core để giao dịch.");
      const { __kinetixSync: reconciliation, ...contractArgs } = args;
      const workspaceId = transactionWorkspace;
      if (!workspaceId)
        throw new Error("Hãy chọn không gian trước khi giao dịch.");
      const identity = await apiGet("/api/auth/me");
      if (identity.onboarding !== "READY" || !identity.linkedWallet?.address)
        throw new Error("Hãy hoàn tất kích hoạt tài khoản.");
      const workspace = await apiGet(
        `/api/workspaces/${encodeURIComponent(workspaceId)}`,
      );
      const contextUrl = `/api/workspaces/${encodeURIComponent(workspaceId)}/transaction-context?functionName=${encodeURIComponent(args.functionName)}&resourceId=${encodeURIComponent(String(args.args?.[0] ?? ""))}`;
      await apiGet(contextUrl);
      if (Number(workspace.hubChainId) !== hubChain.id)
        throw new Error(
          "Cấu hình mạng chưa đồng nhất. Hãy liên hệ quản trị viên.",
        );
      const hub = workspace.workspace.l1HubAddress;
      const yieldVault = workspace.workspace.cchainVaultAddress;
      const requested = String(args.address).toLowerCase();
      const isHub = requested === hub?.toLowerCase();
      if (!isHub && requested !== yieldVault?.toLowerCase())
        throw new Error("Hợp đồng không thuộc không gian hiện tại.");
      if ((isHub ? hubChain.id : avalancheFuji.id) !== targetChain.id)
        throw new Error("Mạng giao dịch không khớp hợp đồng.");
      if (
        ["createCustomVault", "createAdvancedVault"].includes(args.functionName)
      ) {
        const permission = identity.workspaces.find(
          (item: any) => item.id === workspaceId,
        );
        if (!["ADMIN", "GUARDIAN"].includes(permission?.role))
          throw new Error("Bạn không có quyền tạo hũ.");
      } else if (args.functionName !== "setAllowlistStatus") {
        // Request/task IDs are checked by the contract simulation; vault-ID operations also require a scoped API mapping.
        const vaultFunctions = [
          "depositToVault",
          "fastWithdraw",
          "requestLargeWithdrawal",
          "payoutRoscaRound",
          "createChore",
          "compoundYield",
        ];
        if (
          vaultFunctions.includes(args.functionName) &&
          !workspace.vaults.some(
            (vault: any) =>
              vault.onchainVaultId === Number(args.args?.[0]) &&
              vault.onchainHub === hub?.toLowerCase() &&
              vault.onchainChainId === hubChain.id,
          )
        )
          throw new Error("Bạn chưa có quyền trên hũ đã được đối soát này.");
      }
      let accounts: string[] = await provider.request({
        method: "eth_accounts",
      });
      if (!accounts.length)
        accounts = await provider.request({ method: "eth_requestAccounts" });
      const address = accounts[0];
      if (
        address?.toLowerCase() !== identity.linkedWallet.address.toLowerCase()
      )
        throw new Error(
          "Ví đang kết nối không khớp ví đã liên kết. Hãy đổi đúng tài khoản trong Core.",
        );
      if (!(await switchNetwork(targetChain.id)))
        throw new Error("Chưa chuyển được sang đúng mạng giao dịch.");
      const publicClient = createPublicClient({
        chain: targetChain,
        transport: http(),
      });
      if ((await publicClient.getChainId()) !== targetChain.id)
        throw new Error("RPC đang trỏ tới mạng khác.");
      if (isHub && args.functionName !== "setAllowlistStatus") {
        const allowed = await publicClient.readContract({
          address: args.address,
          abi: FAMILY_HUB_ABI,
          functionName: "isAllowlisted",
          args: [address],
        } as any);
        if (allowed !== true)
          throw new Error(
            "Ví chưa được cấp quyền trên FamilyHub. Hãy liên hệ người quản trị mạng hoặc người bảo hộ.",
          );
      }
      if (isHub && workspace.networkAllowlistRequired) {
        const networkRole = await publicClient.readContract({
          address: TRANSACTION_ALLOWLIST_ADDRESS,
          abi: TRANSACTION_ALLOWLIST_ABI,
          functionName: "readAllowList",
          args: [address as `0x${string}`],
        });
        if (networkRole === 0n)
          throw new Error(
            "Ví chưa có quyền gửi giao dịch trên mạng Transaction AllowList. Hãy liên hệ người quản trị mạng.",
          );
      }
      const { request } = await publicClient.simulateContract({
        ...contractArgs,
        account: address,
        chain: targetChain,
      });
      // Check again after asynchronous prompts and simulation to prevent stale account/workspace use.
      const current = await provider.request({ method: "eth_accounts" });
      const actualChain = Number.parseInt(
        await provider.request({ method: "eth_chainId" }),
        16,
      );
      if (
        current[0]?.toLowerCase() !== address.toLowerCase() ||
        actualChain !== targetChain.id ||
        transactionWorkspace !== workspaceId ||
        !walletUseEnabled
      )
        throw new Error(
          "Ví, mạng hoặc không gian đã thay đổi. Vui lòng thử lại.",
        );
      const freshIdentity = await apiGet("/api/auth/me");
      if (
        freshIdentity.user.id !== identity.user.id ||
        freshIdentity.onboarding !== "READY"
      )
        throw new Error("Phiên tài khoản đã thay đổi.");
      // Recheck workspace access after wallet prompts, including application-level suspension.
      await apiGet(`/api/workspaces/${encodeURIComponent(workspaceId)}`);
      await apiGet(contextUrl);
      const hash = await wallet.writeContract({
        ...request,
        account: address as `0x${string}`,
        chain: targetChain,
      } as any);
      const transaction: PendingTransaction = {
        hash,
        chainId: targetChain.id,
        submittedAt: new Date().toISOString(),
        status: "PENDING",
        ...(reconciliation && syncPaths.has(reconciliation.path)
          ? {
              sync: {
                path: reconciliation.path,
                body: { ...reconciliation.body, txHash: hash },
                method: reconciliation.method || "POST",
                status: "PENDING" as const,
              },
            }
          : {}),
      };
      saveTransaction(identity.user.id, transaction);
      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: 1,
          timeout: 120000,
        });
        saveTransaction(identity.user.id, {
          ...transaction,
          status: receipt.status === "success" ? "CONFIRMED" : "REVERTED",
        });
        if (receipt.status !== "success")
          throw new Error(`Giao dịch đã bị revert: ${hash}`);
        return hash;
      } catch (error: any) {
        if (
          pendingTransactions(identity.user.id).find(
            (item) => item.hash === hash,
          )?.status === "PENDING"
        )
          throw new Error(
            `Giao dịch đang chờ xác nhận: ${hash}. Bạn có thể theo dõi trong trạng thái giao dịch.`,
          );
        throw error;
      }
    },
  };
  return safe as unknown as WalletClient;
}
export async function switchNetwork(chainId: number): Promise<boolean> {
  const provider = getCoreProvider();
  if (!provider) return false;
  const chain = [avalancheFuji, avalancheFamilyL1].find(
    (item) => item.id === chainId,
  );
  if (!chain) return false;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
    return (
      Number.parseInt(await provider.request({ method: "eth_chainId" }), 16) ===
      chainId
    );
  } catch (error: any) {
    if (error.code !== 4902) return false;
    try {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${chainId.toString(16)}`,
            chainName: chain.name,
            nativeCurrency: chain.nativeCurrency,
            rpcUrls: chain.rpcUrls.default.http,
          },
        ],
      });
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      return (
        Number.parseInt(
          await provider.request({ method: "eth_chainId" }),
          16,
        ) === chainId
      );
    } catch {
      return false;
    }
  }
}
