import {
  createPublicClient,
  http,
  isAddress,
  parseEventLogs,
  formatEther,
} from "viem";
import {
  TRANSACTION_ALLOWLIST_ADDRESS,
  TRANSACTION_ALLOWLIST_ABI,
} from "../../../shared/networkPermissions";
import { FAMILY_HUB_ABI } from "../../../shared/abis";
import { assert } from "../auth/security";
import { AuthContext } from "../auth/service";

export function hubClient() {
  const chainId = Number(
    process.env.HUB_CHAIN_ID || process.env.FAMILY_L1_CHAIN_ID || 99999,
  );
  const url = process.env.HUB_RPC_URL || process.env.FAMILY_L1_RPC_URL;
  assert(
    url && Number.isSafeInteger(chainId) && chainId > 0,
    503,
    "Chưa cấu hình mạng FamilyHub.",
  );
  return { client: createPublicClient({ transport: http(url) }), chainId };
}
export async function readHub<T = unknown>(
  hub: string,
  functionName: string,
  args: unknown[] = [],
): Promise<T> {
  assert(isAddress(hub), 503, "Địa chỉ FamilyHub chưa hợp lệ.");
  const { client, chainId } = hubClient();
  assert(
    (await client.getChainId()) === chainId,
    503,
    "RPC không đúng mạng FamilyHub.",
  );
  return client.readContract({
    address: hub as `0x${string}`,
    abi: FAMILY_HUB_ABI,
    functionName,
    args,
  } as any) as Promise<T>;
}
export async function verifiedEvent(
  auth: AuthContext,
  hub: string,
  txHash: unknown,
  eventName: string,
  matches: (args: any) => boolean,
  requireOwnSender = true,
) {
  assert(auth.wallet, 403, "Chưa liên kết ví.");
  assert(
    typeof txHash === "string" && /^0x[0-9a-f]{64}$/i.test(txHash),
    400,
    "Cần mã giao dịch hợp lệ.",
  );
  assert(isAddress(hub), 503, "Chưa cấu hình hợp đồng của không gian.");
  const { client, chainId } = hubClient();
  assert((await client.getChainId()) === chainId, 503, "RPC không đúng mạng.");
  const receipt = await client.getTransactionReceipt({
    hash: txHash as `0x${string}`,
  });
  assert(
    receipt.status === "success" &&
      receipt.to?.toLowerCase() === hub.toLowerCase() &&
      (!requireOwnSender || receipt.from.toLowerCase() === auth.wallet.address),
    403,
    "Giao dịch không thành công hoặc không thuộc ví và hợp đồng này.",
  );
  const events = parseEventLogs({
    abi: FAMILY_HUB_ABI,
    logs: receipt.logs.filter(
      (log) => log.address.toLowerCase() === hub.toLowerCase(),
    ),
    eventName: eventName as any,
    strict: true,
  }) as unknown as { args: any }[];
  const event = events.find((log) => matches(log.args));
  assert(event, 400, "Giao dịch không có sự kiện phù hợp với thao tác này.");
  return { event: event.args, receipt, chainId };
}
export const decimalAmount = (value: bigint) => formatEther(value);
export async function networkAllowed(address: string): Promise<boolean> {
  if (process.env.TX_ALLOWLIST_ENABLED !== "true") return true;
  const { client, chainId } = hubClient();
  assert((await client.getChainId()) === chainId, 503, "RPC không đúng mạng.");
  const role = await client.readContract({
    address: TRANSACTION_ALLOWLIST_ADDRESS,
    abi: TRANSACTION_ALLOWLIST_ABI,
    functionName: "readAllowList",
    args: [address as `0x${string}`],
  });
  return role > 0n;
}
