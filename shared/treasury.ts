import { parseEther, stringToHex } from "viem";

export const TREASURY_ADDRESS =
  "0xd1e826de79445c0f7bdb112a98e4114e0f603edd" as const;
export const TREASURY_CHAIN_ID = 43113;
export const treasuryMemo = (id: string) => stringToHex(`Kinetix:${id}`);
export const treasuryCancelMemo = (id: string) =>
  stringToHex(`Kinetix:cancel:${id}`);
export function matchesTreasuryCancellation(
  intent: { id: string; sender: string; nonce: string },
  transaction: {
    from: string;
    to: string | null;
    value: bigint;
    input: string;
    nonce: number;
  },
) {
  return (
    transaction.from.toLowerCase() === intent.sender.toLowerCase() &&
    transaction.to?.toLowerCase() === intent.sender.toLowerCase() &&
    transaction.value === 0n &&
    String(transaction.nonce) === intent.nonce &&
    transaction.input.toLowerCase() ===
      treasuryCancelMemo(intent.id).toLowerCase()
  );
}
export function treasuryAmount(value: unknown): bigint {
  if (typeof value !== "string" || !/^\d{1,20}(\.\d{1,18})?$/.test(value))
    throw new Error("Số AVAX không hợp lệ (tối đa 18 chữ số thập phân).");
  const amount = parseEther(value);
  if (amount <= 0n) throw new Error("Số tiền phải lớn hơn 0.");
  return amount;
}

/** Bind a native transfer to one immutable intent; never trust a client amount or receipt alone. */
export function matchesTreasuryTransfer(
  intent: {
    id: string;
    sender: string;
    recipient: string;
    amountWei: string;
    nonce: string;
  },
  transaction: {
    from: string;
    to: string | null;
    value: bigint;
    input: string;
    nonce: number;
  },
) {
  return (
    transaction.from.toLowerCase() === intent.sender.toLowerCase() &&
    transaction.to?.toLowerCase() === intent.recipient.toLowerCase() &&
    transaction.value === BigInt(intent.amountWei) &&
    String(transaction.nonce) === intent.nonce &&
    transaction.input.toLowerCase() === treasuryMemo(intent.id).toLowerCase()
  );
}
