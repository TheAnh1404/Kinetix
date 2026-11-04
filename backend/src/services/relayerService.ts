import {
  createWalletClient,
  createPublicClient,
  http,
  isAddress,
  Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { KINETIX_FORWARDER_ABI } from "../../../shared/abis";
import { hubClient } from "./chainService";
import { assert } from "../auth/security";

export interface ForwardRequestPayload {
  from: string;
  to: string;
  value: string;
  gas: string;
  nonce: string;
  deadline: string;
  data: string;
  signature: string;
}

export function relayerAccount() {
  const pk =
    process.env.RELAYER_PRIVATE_KEY ||
    process.env.CORE_WALLET_PRIVATE_KEY ||
    process.env.DEPLOYER_PRIVATE_KEY;
  assert(pk && pk.length >= 64, 503, "Chưa cấu hình khóa bí mật của Relayer.");
  const formatted = pk.startsWith("0x") ? (pk as `0x${string}`) : (`0x${pk}` as `0x${string}`);
  return privateKeyToAccount(formatted);
}

export async function relayForwardRequest(
  forwarderAddress: string,
  request: ForwardRequestPayload
) {
  assert(isAddress(forwarderAddress), 400, "Địa chỉ Forwarder không hợp lệ.");
  assert(isAddress(request.from), 400, "Địa chỉ người gửi from không hợp lệ.");
  assert(isAddress(request.to), 400, "Địa chỉ đích to không hợp lệ.");
  assert(
    typeof request.signature === "string" && request.signature.startsWith("0x"),
    400,
    "Chữ ký không hợp lệ."
  );

  const { chainId } = hubClient();
  const url = process.env.HUB_RPC_URL || process.env.FAMILY_L1_RPC_URL;
  assert(url, 503, "Chưa cấu hình RPC URL cho Relayer.");

  const account = relayerAccount();
  const walletClient = createWalletClient({
    account,
    transport: http(url),
  });
  const publicClient = createPublicClient({
    transport: http(url),
  });

  const forwardReq = {
    from: request.from as Address,
    to: request.to as Address,
    value: BigInt(request.value || "0"),
    gas: BigInt(request.gas || "500000"),
    nonce: BigInt(request.nonce),
    deadline: BigInt(request.deadline),
    data: request.data as `0x${string}`,
  };

  // Xác minh sơ bộ trên chuỗi qua verify view call
  const isValid = await publicClient.readContract({
    address: forwarderAddress as Address,
    abi: KINETIX_FORWARDER_ABI,
    functionName: "verify",
    args: [forwardReq, request.signature as `0x${string}`],
  });

  assert(isValid, 400, "Chữ ký Meta-Transaction không hợp lệ hoặc đã hết hạn.");

  // Phát giao dịch thông qua Relayer (0 gas trên Family L1)
  const txHash = await (walletClient as any).writeContract({
    address: forwarderAddress as Address,
    abi: KINETIX_FORWARDER_ABI,
    functionName: "execute",
    args: [forwardReq, request.signature as `0x${string}`],
    value: forwardReq.value,
  });

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  assert(receipt.status === "success", 500, "Meta-Transaction thực thi thất bại.");

  return {
    txHash,
    status: receipt.status,
    blockNumber: Number(receipt.blockNumber),
  };
}
