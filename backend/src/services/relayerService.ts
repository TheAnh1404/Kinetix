import { privateKeyToAccount } from "viem/accounts";
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
  const key = process.env.RELAYER_PRIVATE_KEY;
  assert(
    key && /^(0x)?[0-9a-f]{64}$/i.test(key),
    503,
    "Cần khóa riêng của relayer.",
    "RELAYER_KEY_MISSING",
  );
  return privateKeyToAccount(
    (key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`,
  );
}

/** T1 dùng Core ký và tự trả phí. Chưa có budget/nonce journal bền vững nên không tài trợ. */
export async function relayForwardRequest(
  _forwarderAddress: string,
  _request: ForwardRequestPayload,
): Promise<{ txHash: string; status: string; blockNumber: number }> {
  assert(
    false,
    503,
    "Tài trợ giao dịch chưa bật ở T1. Dùng Core Wallet để ký giao dịch Fuji.",
    "RELAYER_DISABLED_T1",
  );
  throw new Error("unreachable");
}
