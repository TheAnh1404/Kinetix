import { parseEventLogs, TransactionReceipt } from "viem";
import { FAMILY_HUB_ABI } from "../../../shared/abis";

/** Action principal is separate from proof of payment, which always comes from receipt events. */
export async function operationMetadata(client: any, hub: string, name: string, args: readonly unknown[], value: bigint, sender: string, receipt?: TransactionReceipt) {
  let amount = value;
  let recipient: string | null = null;
  let resourceType: string | null = "VAULT";
  let resourceId = typeof args[0] === "bigint" ? String(args[0]) : null;
  const read = (functionName: string, values: unknown[]) => client.readContract({ address: hub, abi: FAMILY_HUB_ABI, functionName, args: values, ...(receipt ? { blockNumber: receipt.blockNumber } : {}) });
  if (["fastWithdraw", "requestLargeWithdrawal"].includes(name)) { amount = args[1] as bigint; recipient = sender; }
  else if (name === "createChore") { amount = args[2] as bigint; recipient = String(args[3]); }
  else if (["approveWithdrawal", "executeWithdrawalWithSignatures"].includes(name)) {
    resourceType = "WITHDRAWAL";
    const request = await read("withdrawalRequests", [args[0]]); amount = request[3]; recipient = request[4];
  } else if (["claimChoreCompleted", "verifyAndRewardChore", "cancelChore"].includes(name)) {
    resourceType = "TASK";
    const task = await read("tasks", [args[0]]); amount = task[3]; recipient = task[4];
  } else if (name === "recoverMemberWallet") recipient = String(args[2]);
  else if (["createCustomVault", "createAdvancedVault"].includes(name)) resourceId = null;
  else if (name === "setAllowlistStatus") { resourceType = "OPERATOR"; resourceId = String(args[0]).toLowerCase(); recipient = String(args[0]); }
  const events: any[] = receipt ? parseEventLogs({ abi: FAMILY_HUB_ABI, strict: true, logs: receipt.logs.filter((log) => log.address.toLowerCase() === hub.toLowerCase()) }) as any : [];
  for (const event of events) {
    if (event.eventName === "VaultCreated" && ["createCustomVault", "createAdvancedVault"].includes(name)) resourceId = String(event.args.vaultId);
    if (event.eventName === "RoscaRoundPaid" && name === "payoutRoscaRound") { amount = event.args.payoutAmount; recipient = event.args.recipient; }
  }
  return { amountWei: String(amount), asset: "AVAX", recipient: recipient?.toLowerCase() || null, resourceType, resourceId };
}
