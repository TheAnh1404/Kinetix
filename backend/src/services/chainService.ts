import {
  createPublicClient,
  http,
  isAddress,
  parseEventLogs,
  formatEther,
  decodeFunctionData,
} from "viem";
import {
  TRANSACTION_ALLOWLIST_ADDRESS,
  TRANSACTION_ALLOWLIST_ABI,
} from "../../../shared/networkPermissions";
import { FAMILY_HUB_ABI, KINETIX_FORWARDER_ABI } from "../../../shared/abis";
import { assert } from "../auth/security";
import { AuthContext } from "../auth/service";
import { deploymentManifest } from "./deploymentService";

export function hubClient() {
  const chainId = Number(
    process.env.HUB_CHAIN_ID || deploymentManifest().chainId,
  );
  const url = process.env.HUB_RPC_URL || deploymentManifest().rpcUrl;
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
  blockNumber?: bigint,
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
    ...(blockNumber === undefined ? {} : { blockNumber }),
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
  let forwardedActor = false;
  let trustedForwarder: string | undefined;
  if (receipt.to?.toLowerCase() !== hub.toLowerCase()) {
    const code = await client.getBytecode({ address: hub as `0x${string}` });
    assert(
      code && code !== "0x",
      403,
      "Địa chỉ không phải Hub hợp lệ.",
      "RECEIPT_HUB_INVALID",
    );
    trustedForwarder = String(await readHub(hub, "trustedForwarder"));
    if (receipt.to?.toLowerCase() === trustedForwarder.toLowerCase()) {
      const transaction = await client.getTransaction({
        hash: txHash as `0x${string}`,
      });
      const decoded = decodeFunctionData({
        abi: KINETIX_FORWARDER_ABI,
        data: transaction.input,
      });
      const request: any = decoded.args?.[0];
      const executions: any[] = parseEventLogs({
        abi: KINETIX_FORWARDER_ABI,
        eventName: "ExecutedForwardRequest",
        logs: receipt.logs.filter(
          (log) =>
            log.address.toLowerCase() === trustedForwarder!.toLowerCase(),
        ),
      });
      forwardedActor =
        decoded.functionName === "execute" &&
        request?.to?.toLowerCase() === hub.toLowerCase() &&
        request?.from?.toLowerCase() === auth.wallet.address.toLowerCase() &&
        executions.length === 1 &&
        executions[0].args.success === true &&
        executions[0].args.signer.toLowerCase() ===
          auth.wallet.address.toLowerCase();
    }
  }
  assert(
    receipt.status === "success" &&
      ((receipt.to?.toLowerCase() === hub.toLowerCase() &&
        (!requireOwnSender ||
          receipt.from.toLowerCase() === auth.wallet.address.toLowerCase())) ||
        forwardedActor),
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
  }) as unknown as { args: any; logIndex: number }[];
  const event = events.find((log) => matches(log.args));
  assert(event, 400, "Giao dịch không có sự kiện phù hợp với thao tác này.");
  const finalized = await client.getBlock({ blockTag: "finalized" });
  assert(
    finalized.number !== null && receipt.blockNumber <= finalized.number,
    409,
    "Giao dịch đã gửi, đang chờ finality để đồng bộ. Không gửi lại.",
    "RECEIPT_NOT_FINALIZED",
  );
  return { event: event.args, logIndex: event.logIndex, receipt, chainId };
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
