import {
  BaseError,
  ContractFunctionRevertedError,
  ContractFunctionZeroDataError,
} from "viem";
import { decimalAmount, hubClient, readHub } from "./chainService";

/** Đọc policy thật; lỗi RPC không được biến thành quyền hoặc thanh khoản khả dụng. */
export async function memberVaultPolicy(
  hub: string,
  id: bigint,
  address: string,
) {
  const [state, overview, beneficiary, paused]: any[] = await Promise.all([
    readHub(hub, "getVault", [id]),
    readHub(hub, "getVaultOverview", [id]),
    readHub(hub, "isVaultBeneficiary", [id, address]),
    readHub(hub, "paused"),
  ]);
  let remainingToday: bigint | null = null;
  const { client } = hubClient();
  const dailyAbi = [
    {
      type: "function",
      name: "vaultDailyLimit",
      stateMutability: "view",
      inputs: [{ name: "vaultId", type: "uint256" }],
      outputs: [{ type: "uint256" }],
    },
    {
      type: "function",
      name: "dailyFastWithdrawSpent",
      stateMutability: "view",
      inputs: [
        { name: "vaultId", type: "uint256" },
        { name: "dayIndex", type: "uint256" },
      ],
      outputs: [{ type: "uint256" }],
    },
  ] as const;
  const block = await client.getBlock();
  try {
    const [configured, spent] = await Promise.all([
      client.readContract({
        address: hub as `0x${string}`,
        abi: dailyAbi,
        functionName: "vaultDailyLimit",
        args: [id],
        blockNumber: block.number,
      }),
      client.readContract({
        address: hub as `0x${string}`,
        abi: dailyAbi,
        functionName: "dailyFastWithdrawSpent",
        args: [id, block.timestamp / 86400n],
        blockNumber: block.number,
      }),
    ]);
    const effective =
      configured > 0n ? configured : state.fastWithdrawLimit * 2n;
    remainingToday = effective > spent ? effective - spent : 0n;
  } catch (error) {
    const unsupported =
      error instanceof BaseError &&
      error.walk(
        (cause) =>
          cause instanceof ContractFunctionRevertedError ||
          cause instanceof ContractFunctionZeroDataError,
      );
    if (
      !(unsupported instanceof ContractFunctionRevertedError) &&
      !(unsupported instanceof ContractFunctionZeroDataError)
    )
      throw error;
    // Bản triển khai cũ chưa có getter hạn mức ngày; simulation vẫn kiểm lại giao dịch.
  }
  const active = state.isActive && !paused;
  const maximum: bigint =
    active && beneficiary && Number(state.ruleType) === 0
      ? [
          overview[0],
          overview[1],
          state.fastWithdrawLimit,
          ...(remainingToday !== null ? [remainingToday] : []),
        ].reduce((min: bigint, value: bigint) => (value < min ? value : min))
      : 0n;
  return {
    name: state.name,
    isActive: active,
    isBeneficiary: beneficiary === true,
    fastWithdrawLimit: decimalAmount(state.fastWithdrawLimit),
    totalBalance: decimalAmount(overview[0]),
    availableNow: decimalAmount(maximum),
    requiredApprovals: Number(state.requiredApprovals),
    remainingToday:
      remainingToday !== null ? decimalAmount(remainingToday) : null,
    checkedAt: new Date().toISOString(),
    asset: "AVAX",
  };
}
