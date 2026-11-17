import { parseEther, stringToHex } from "viem";
export const GROUP_CHAIN_ID = 43113;
export const groupTransferMemo = (id: string) =>
  stringToHex(`Kinetix:group:${id}`);
export function groupAmount(value: unknown): bigint {
  if (typeof value !== "string" || !/^\d{1,20}(\.\d{1,18})?$/.test(value))
    throw new Error("Nhập số AVAX hợp lệ, tối đa 18 chữ số thập phân.");
  const amount = parseEther(value);
  if (amount <= 0n) throw new Error("Số tiền phải lớn hơn 0.");
  return amount;
}
export interface GroupTransferInstruction {
  id: string;
  senderAddress: string;
  recipientAddress: string;
  amountWei: string;
  nonce: number;
}
export function matchesGroupTransfer(
  intent: GroupTransferInstruction,
  tx: {
    from: string;
    to: string | null;
    value: bigint;
    nonce: number;
    input: string;
  },
) {
  return (
    tx.from.toLowerCase() === intent.senderAddress.toLowerCase() &&
    tx.to?.toLowerCase() === intent.recipientAddress.toLowerCase() &&
    tx.value === BigInt(intent.amountWei) &&
    tx.nonce === intent.nonce &&
    tx.input.toLowerCase() === groupTransferMemo(intent.id).toLowerCase()
  );
}
