import {
  createWalletClient,
  custom,
  keccak256,
  toHex,
  isHex,
  parseEventLogs,
  zeroAddress,
  formatEther,
} from "viem";
import {
  KINETIX_FUND_V2_ABI,
  KINETIX_FUND_FACTORY_V2_ABI,
} from "@/contracts/abis";
import { avalancheFuji } from "@/contracts/config";
import {
  getCoreProvider,
  publicClientFuji,
  switchNetwork,
  walletWriteScope,
} from "./client";
import {
  FundV2Policy,
  FundV2Member,
  GovernanceProposalItem,
  RefundEligibility,
} from "@/types/groupFinance";

export const DEFAULT_FACTORY_V2_ADDRESS =
  (process.env.NEXT_PUBLIC_FUND_FACTORY_V2_ADDRESS as `0x${string}`) ||
  "0xb09Ca6BF513333dA8E401E45E4Ed794A983C0Fa1";

export const V2_STATUS_MAP = [
  "NONE",
  "PENDING",
  "APPROVED",
  "EXECUTED",
  "CANCELLED",
  "REJECTED",
  "EXPIRED",
  "INVALIDATED",
] as const;

export const V2_ACTION_MAP = [
  "POLICY",
  "PAUSE",
  "RESUME",
  "CLOSE",
  "SURPLUS",
] as const;

export const V2_PERMISSIONS = {
  PROPOSE: 1,
  APPROVE: 2,
  SPEND: 4,
} as const;

export const PENDING_V2_TX_KEY = "kinetix_v2_pending_transactions";

export interface PendingV2Tx {
  hash: `0x${string}`;
  action: string;
  fundAddress?: string;
  workspaceId?: string;
  submittedAt: string;
  status: "BROADCAST" | "CONFIRMED" | "REVERTED";
  error?: string;
}

/**
 * Lưu vết giao dịch V2 vào sessionStorage ngay sau khi broadcast thành công từ ví.
 */
export function recordPendingV2Tx(tx: PendingV2Tx) {
  if (typeof window === "undefined") return;
  try {
    const stored = sessionStorage.getItem(PENDING_V2_TX_KEY);
    const list: PendingV2Tx[] = stored ? JSON.parse(stored) : [];
    list.unshift(tx);
    sessionStorage.setItem(PENDING_V2_TX_KEY, JSON.stringify(list.slice(0, 50)));
  } catch {
    // Không chặn luồng nếu sessionStorage bị hạn chế
  }
}

/**
 * Cập nhật trạng thái sau khi có receipt on-chain.
 */
export function updatePendingV2TxStatus(
  hash: string,
  status: "CONFIRMED" | "REVERTED",
  error?: string
) {
  if (typeof window === "undefined") return;
  try {
    const stored = sessionStorage.getItem(PENDING_V2_TX_KEY);
    if (!stored) return;
    const list: PendingV2Tx[] = JSON.parse(stored);
    const updated = list.map((item) =>
      item.hash.toLowerCase() === hash.toLowerCase()
        ? { ...item, status, error }
        : item
    );
    sessionStorage.setItem(PENDING_V2_TX_KEY, JSON.stringify(updated));
  } catch {
    // Bỏ qua lỗi storage
  }
}

/**
 * Lấy danh sách giao dịch V2 đang chờ đối soát từ sessionStorage.
 */
export function getPendingV2Transactions(): PendingV2Tx[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = sessionStorage.getItem(PENDING_V2_TX_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Chuyển đổi thông báo lỗi on-chain sang tiếng Việt thân thiện với người dùng mobile.
 */
export function humanizeV2Error(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("reverted")) return msg; // Giữ nguyên thông điệp revert chi tiết kèm txHash
  if (msg.includes("Unauthorized")) return "Bạn không có quyền thực hiện thao tác này trên quỹ.";
  if (msg.includes("InsufficientAvailableBalance")) return "Số dư khả dụng của quỹ không đủ để thực hiện.";
  if (msg.includes("SpendingLimitExceeded")) return "Vượt quá hạn mức chi tiêu được cấp phép (giao dịch hoặc hạn mức ngày).";
  if (msg.includes("GoalLocked")) return "Mục tiêu chưa kết thúc hoặc chưa đạt điều kiện giải ngân/hoàn tiền.";
  if (msg.includes("TimelockNotElapsed")) return "Chưa hết thời gian chờ 24h timelock để thực thi chính sách mới.";
  if (msg.includes("FundUnavailable")) return "Quỹ đang tạm dừng hoặc đã bị đóng.";
  if (msg.includes("SelfApproval")) return "Người nhận tiền không được phép tự duyệt khoản chi của chính mình.";
  if (msg.includes("AlreadyVoted")) return "Bạn đã biểu quyết cho đề xuất này trước đó.";
  if (msg.includes("InvalidRecipient")) return "Địa chỉ người nhận không hợp lệ.";
  if (msg.includes("InvalidAmount")) return "Số tiền giao dịch không hợp lệ.";
  if (msg.includes("InvalidDeadline")) return "Thời hạn đề xuất không hợp lệ (đã quá hạn hoặc quá thời gian tối đa).";
  if (msg.includes("InvalidState")) return "Trạng thái hiện tại của đề xuất không cho phép thực hiện thao tác này.";
  if (msg.includes("DirectTransferDisabled")) return "Không thể chuyển tiền trực tiếp vào quỹ. Vui lòng dùng hàm góp tiền (deposit).";
  if (msg.includes("User rejected") || msg.includes("denied")) return "Giao dịch đã bị từ chối ký trong ví.";
  return msg;
}

/**
 * Chuẩn hóa memo/reference thành bytes32 keccak256
 */
export function formatBytes32Hash(input?: string): `0x${string}` {
  if (!input || input.trim() === "") {
    return keccak256(toHex("kinetix-v2-action"));
  }
  const clean = input.trim();
  if (isHex(clean) && clean.length === 66) {
    return clean as `0x${string}`;
  }
  return keccak256(toHex(clean));
}

export interface FundV2PreflightOptions {
  expectedWalletAddress?: string;
  expectedWorkspaceId?: string;
  onBroadcast?: (txHash: `0x${string}`) => void;
}

/**
 * Kiểm tra preflight nghiêm ngặt: Core Wallet, Chain ID 43113 (Fuji), khớp ví liên kết & workspace scope.
 */
export async function getFundV2Wallet(options?: FundV2PreflightOptions) {
  const provider = getCoreProvider();
  if (!provider) {
    throw new Error(
      "Vui lòng mở ứng dụng trong Avalanche Core Wallet hoặc trình duyệt Web3 để thực hiện giao dịch."
    );
  }

  // 1. Chuyển sang Avalanche Fuji Chain ID 43113
  const switched = await switchNetwork(avalancheFuji.id);
  const chainIdHex = await provider.request({ method: "eth_chainId" });
  const currentChainId = Number.parseInt(chainIdHex, 16);
  if (currentChainId !== avalancheFuji.id) {
    throw new Error(
      `Ví đang kết nối tới Chain ID ${currentChainId}. Yêu cầu chuyển sang Avalanche Fuji (Chain ID ${avalancheFuji.id}).`
    );
  }

  // 2. Lấy danh sách tài khoản
  let accounts: string[] = await provider.request({ method: "eth_accounts" });
  if (!accounts || accounts.length === 0) {
    accounts = await provider.request({ method: "eth_requestAccounts" });
  }
  if (!accounts || accounts.length === 0) {
    throw new Error("Không tìm thấy tài khoản ví nào được kết nối trong Core Wallet.");
  }

  const connectedAccount = accounts[0] as `0x${string}`;

  // 3. Đối chiếu ví phiên đăng nhập (Fail-closed on account mismatch - Fix R03)
  if (options?.expectedWalletAddress) {
    if (
      connectedAccount.toLowerCase() !==
      options.expectedWalletAddress.toLowerCase()
    ) {
      throw new Error(
        `Ví đang kích hoạt trong trình duyệt (${connectedAccount}) không khớp với ví đã liên kết (${options.expectedWalletAddress}). Vui lòng đổi đúng tài khoản trong Core Wallet.`
      );
    }
  }

  // 4. Đối chiếu workspace scope (Fix R03)
  if (options?.expectedWorkspaceId) {
    const currentScope = walletWriteScope();
    if (currentScope && currentScope !== options.expectedWorkspaceId) {
      throw new Error(
        "Không gian làm việc đã thay đổi. Vui lòng làm mới trang từ nhóm hiện tại."
      );
    }
  }

  const walletClient = createWalletClient({
    chain: avalancheFuji,
    transport: custom(provider),
  });

  return {
    account: connectedAccount,
    walletClient,
    publicClient: publicClientFuji,
  };
}

/**
 * Chờ receipt on-chain và kiểm tra nghiêm ngặt status === 'success' (Fix R01).
 * Nếu revert, ném lỗi kèm txHash thất bại và cập nhật sessionStorage.
 */
async function waitForSuccessfulReceipt(
  publicClient: typeof publicClientFuji,
  txHash: `0x${string}`,
  actionName: string
) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    updatePendingV2TxStatus(
      txHash,
      "REVERTED",
      `Giao dịch ${actionName} bị revert trên chuỗi.`
    );
    throw new Error(`Giao dịch ${actionName} thất bại trên chuỗi (reverted): ${txHash}`);
  }
  updatePendingV2TxStatus(txHash, "CONFIRMED");
  return receipt;
}

// =================================================================
// 1. TẠO QUỸ ON-CHAIN (FACTORY CALL)
// =================================================================

export interface CreateOnchainFundParams {
  factoryAddress?: `0x${string}`;
  kind: "OPERATING" | "GOAL" | number; // 0: OPERATING, 1: GOAL
  goalTargetWei?: bigint | string;
  goalDeadlineSeconds?: number | bigint;
  terms?: string;
  policy: {
    quorum: number | bigint;
    transactionLimitWei: bigint | string;
    dailyLimitWei: bigint | string;
  };
  members: {
    account: `0x${string}`;
    permissions: number;
    dailyAllowanceWei: bigint | string;
  }[];
}

export async function createOnchainFund(
  params: CreateOnchainFundParams,
  options?: FundV2PreflightOptions
): Promise<{
  txHash: `0x${string}`;
  fundAddress: `0x${string}`;
  fundId: bigint;
  receipt: any;
}> {
  try {
    const { account, walletClient, publicClient } = await getFundV2Wallet(options);
    const factory = params.factoryAddress || DEFAULT_FACTORY_V2_ADDRESS;

    const kindNum =
      typeof params.kind === "number"
        ? params.kind
        : params.kind === "GOAL"
        ? 1
        : 0;

    const initParams = {
      kind: kindNum,
      goalTarget: BigInt(params.goalTargetWei || "0"),
      goalDeadline: BigInt(params.goalDeadlineSeconds || 0),
      termsHash: formatBytes32Hash(params.terms),
      policy: {
        quorum: BigInt(params.policy.quorum),
        transactionLimit: BigInt(params.policy.transactionLimitWei || "0"),
        dailyLimit: BigInt(params.policy.dailyLimitWei || "0"),
      },
      members: params.members.map((m) => ({
        account: m.account,
        permissions: m.permissions,
        dailyAllowance: BigInt(m.dailyAllowanceWei || "0"),
      })),
    };

    const { request } = await publicClient.simulateContract({
      account,
      address: factory,
      abi: KINETIX_FUND_FACTORY_V2_ABI,
      functionName: "createFund",
      args: [initParams],
    });

    const txHash = await walletClient.writeContract(request);

    // Ghi nhận ngay sau khi broadcast (Fix R08)
    recordPendingV2Tx({
      hash: txHash,
      action: "CREATE_FUND",
      workspaceId: options?.expectedWorkspaceId,
      submittedAt: new Date().toISOString(),
      status: "BROADCAST",
    });
    options?.onBroadcast?.(txHash);

    // Kiểm tra receipt status nghiêm ngặt (Fix R01)
    const receipt = await waitForSuccessfulReceipt(publicClient, txHash, "Tạo quỹ");

    const logs = parseEventLogs({
      abi: KINETIX_FUND_FACTORY_V2_ABI,
      logs: receipt.logs,
      eventName: "FundCreated",
    });

    if (!logs.length) {
      throw new Error("Giao dịch tạo quỹ thành công nhưng không tìm thấy sự kiện FundCreated.");
    }

    const createdEvent = logs[0].args as {
      fundId: bigint;
      fund: `0x${string}`;
      creator: `0x${string}`;
      kind: number;
      version: bigint;
      configurationHash: `0x${string}`;
    };

    return {
      txHash,
      fundAddress: createdEvent.fund,
      fundId: createdEvent.fundId,
      receipt,
    };
  } catch (error) {
    throw new Error(humanizeV2Error(error));
  }
}

// =================================================================
// 2. GÓP TIỀN VÀO QUỸ (DEPOSIT)
// =================================================================

export interface DepositOnchainFundParams {
  fundAddress: `0x${string}`;
  amountWei: bigint | string;
  referenceMemo?: string;
}

export async function depositOnchainFund(
  params: DepositOnchainFundParams,
  options?: FundV2PreflightOptions
): Promise<{
  txHash: `0x${string}`;
  receipt: any;
}> {
  try {
    const { account, walletClient, publicClient } = await getFundV2Wallet(options);
    const memoHash = formatBytes32Hash(params.referenceMemo);
    const value = BigInt(params.amountWei);

    const { request } = await publicClient.simulateContract({
      account,
      address: params.fundAddress,
      abi: KINETIX_FUND_V2_ABI,
      functionName: "deposit",
      args: [memoHash],
      value,
    });

    const txHash = await walletClient.writeContract(request);

    // Ghi nhận ngay sau broadcast (Fix R08)
    recordPendingV2Tx({
      hash: txHash,
      action: "DEPOSIT",
      fundAddress: params.fundAddress,
      workspaceId: options?.expectedWorkspaceId,
      submittedAt: new Date().toISOString(),
      status: "BROADCAST",
    });
    options?.onBroadcast?.(txHash);

    // Kiểm tra status nghiêm ngặt (Fix R01)
    const receipt = await waitForSuccessfulReceipt(publicClient, txHash, "Góp tiền");

    return { txHash, receipt };
  } catch (error) {
    throw new Error(humanizeV2Error(error));
  }
}

// =================================================================
// 3. ĐỀ NGHỊ CHI TIỀU (PROPOSE EXPENSE)
// =================================================================

export interface ProposeExpenseOnchainParams {
  fundAddress: `0x${string}`;
  recipient: `0x${string}`;
  amountWei: bigint | string;
  deadlineSeconds: number | bigint;
  memo?: string;
}

export async function proposeExpenseOnchain(
  params: ProposeExpenseOnchainParams,
  options?: FundV2PreflightOptions
): Promise<{
  txHash: `0x${string}`;
  expenseId: bigint;
  receipt: any;
}> {
  try {
    const { account, walletClient, publicClient } = await getFundV2Wallet(options);
    const memoHash = formatBytes32Hash(params.memo);

    const { request } = await publicClient.simulateContract({
      account,
      address: params.fundAddress,
      abi: KINETIX_FUND_V2_ABI,
      functionName: "proposeExpense",
      args: [
        params.recipient,
        BigInt(params.amountWei),
        BigInt(params.deadlineSeconds),
        memoHash,
      ],
    });

    const txHash = await walletClient.writeContract(request);

    recordPendingV2Tx({
      hash: txHash,
      action: "PROPOSE_EXPENSE",
      fundAddress: params.fundAddress,
      workspaceId: options?.expectedWorkspaceId,
      submittedAt: new Date().toISOString(),
      status: "BROADCAST",
    });
    options?.onBroadcast?.(txHash);

    const receipt = await waitForSuccessfulReceipt(publicClient, txHash, "Đề xuất chi tiêu");

    const logs = parseEventLogs({
      abi: KINETIX_FUND_V2_ABI,
      logs: receipt.logs,
      eventName: "ExpenseProposed",
    });

    if (!logs.length || !logs[0].args || (logs[0].args as any).id === undefined) {
      throw new Error(`Giao dịch ${txHash} đã thực thi nhưng không tìm thấy mã ID đề xuất từ sự kiện on-chain.`);
    }

    const expenseId = (logs[0].args as any).id as bigint;

    return { txHash, expenseId, receipt };
  } catch (error) {
    throw new Error(humanizeV2Error(error));
  }
}

// =================================================================
// 4. BIỂU QUYẾT DUYỆT CHI TIỀU (APPROVE EXPENSE)
// =================================================================

export interface ApproveExpenseOnchainParams {
  fundAddress: `0x${string}`;
  expenseId: number | bigint;
}

export async function approveExpenseOnchain(
  params: ApproveExpenseOnchainParams,
  options?: FundV2PreflightOptions
): Promise<{
  txHash: `0x${string}`;
  receipt: any;
}> {
  try {
    const expenseIdNum = BigInt(params.expenseId);
    if (expenseIdNum <= 0n) {
      throw new Error("Mã đề xuất chi tiêu không hợp lệ (phải > 0).");
    }

    const { account, walletClient, publicClient } = await getFundV2Wallet(options);

    const { request } = await publicClient.simulateContract({
      account,
      address: params.fundAddress,
      abi: KINETIX_FUND_V2_ABI,
      functionName: "approveExpense",
      args: [expenseIdNum],
    });

    const txHash = await walletClient.writeContract(request);

    recordPendingV2Tx({
      hash: txHash,
      action: "APPROVE_EXPENSE",
      fundAddress: params.fundAddress,
      workspaceId: options?.expectedWorkspaceId,
      submittedAt: new Date().toISOString(),
      status: "BROADCAST",
    });
    options?.onBroadcast?.(txHash);

    const receipt = await waitForSuccessfulReceipt(publicClient, txHash, "Duyệt chi tiêu");

    return { txHash, receipt };
  } catch (error) {
    throw new Error(humanizeV2Error(error));
  }
}

// =================================================================
// 5. THỰC THI CHI TRẢ (EXECUTE EXPENSE)
// =================================================================

export interface ExecuteExpenseOnchainParams {
  fundAddress: `0x${string}`;
  expenseId: number | bigint;
}

export async function executeExpenseOnchain(
  params: ExecuteExpenseOnchainParams,
  options?: FundV2PreflightOptions
): Promise<{
  txHash: `0x${string}`;
  receipt: any;
}> {
  try {
    const expenseIdNum = BigInt(params.expenseId);
    if (expenseIdNum <= 0n) {
      throw new Error("Mã đề xuất chi tiêu không hợp lệ (phải > 0).");
    }

    const { account, walletClient, publicClient } = await getFundV2Wallet(options);

    const { request } = await publicClient.simulateContract({
      account,
      address: params.fundAddress,
      abi: KINETIX_FUND_V2_ABI,
      functionName: "executeExpense",
      args: [expenseIdNum],
    });

    const txHash = await walletClient.writeContract(request);

    recordPendingV2Tx({
      hash: txHash,
      action: "EXECUTE_EXPENSE",
      fundAddress: params.fundAddress,
      workspaceId: options?.expectedWorkspaceId,
      submittedAt: new Date().toISOString(),
      status: "BROADCAST",
    });
    options?.onBroadcast?.(txHash);

    const receipt = await waitForSuccessfulReceipt(publicClient, txHash, "Giải ngân chi tiêu");

    return { txHash, receipt };
  } catch (error) {
    throw new Error(humanizeV2Error(error));
  }
}

// =================================================================
// 6. RÚT HOÀN TIỀN MỤC TIÊU THẤT BẠI (REFUND FAILED GOAL)
// =================================================================

export interface RefundFailedGoalOnchainParams {
  fundAddress: `0x${string}`;
}

export async function refundFailedGoalOnchain(
  params: RefundFailedGoalOnchainParams,
  options?: FundV2PreflightOptions
): Promise<{
  txHash: `0x${string}`;
  amountRefunded?: bigint;
  receipt: any;
}> {
  try {
    const { account, walletClient, publicClient } = await getFundV2Wallet(options);

    const { request } = await publicClient.simulateContract({
      account,
      address: params.fundAddress,
      abi: KINETIX_FUND_V2_ABI,
      functionName: "refundFailedGoal",
    });

    const txHash = await walletClient.writeContract(request);

    recordPendingV2Tx({
      hash: txHash,
      action: "REFUND_GOAL",
      fundAddress: params.fundAddress,
      workspaceId: options?.expectedWorkspaceId,
      submittedAt: new Date().toISOString(),
      status: "BROADCAST",
    });
    options?.onBroadcast?.(txHash);

    const receipt = await waitForSuccessfulReceipt(publicClient, txHash, "Hoàn tiền mục tiêu");

    const logs = parseEventLogs({
      abi: KINETIX_FUND_V2_ABI,
      logs: receipt.logs,
      eventName: "GoalRefunded",
    });

    const amountRefunded = logs.length > 0 ? (logs[0].args as any).amount : undefined;

    return { txHash, amountRefunded, receipt };
  } catch (error) {
    throw new Error(humanizeV2Error(error));
  }
}

// =================================================================
// 7. ĐỀ XUẤT THAY ĐỔI CHÍNH SÁCH (PROPOSE POLICY)
// =================================================================

export interface ProposePolicyOnchainParams {
  fundAddress: `0x${string}`;
  policy: {
    quorum: number | bigint;
    transactionLimitWei: bigint | string;
    dailyLimitWei: bigint | string;
  };
  members: {
    account: `0x${string}`;
    permissions: number;
    dailyAllowanceWei: bigint | string;
  }[];
  terms?: string;
}

export async function proposePolicyOnchain(
  params: ProposePolicyOnchainParams,
  options?: FundV2PreflightOptions
): Promise<{
  txHash: `0x${string}`;
  proposalId: bigint;
  receipt: any;
}> {
  try {
    const { account, walletClient, publicClient } = await getFundV2Wallet(options);
    const termsHash = formatBytes32Hash(params.terms);

    const formattedPolicy = {
      quorum: BigInt(params.policy.quorum),
      transactionLimit: BigInt(params.policy.transactionLimitWei || "0"),
      dailyLimit: BigInt(params.policy.dailyLimitWei || "0"),
    };

    const formattedMembers = params.members.map((m) => ({
      account: m.account,
      permissions: m.permissions,
      dailyAllowance: BigInt(m.dailyAllowanceWei || "0"),
    }));

    const { request } = await publicClient.simulateContract({
      account,
      address: params.fundAddress,
      abi: KINETIX_FUND_V2_ABI,
      functionName: "proposePolicy",
      args: [formattedPolicy, formattedMembers, termsHash],
    });

    const txHash = await walletClient.writeContract(request);

    recordPendingV2Tx({
      hash: txHash,
      action: "PROPOSE_POLICY",
      fundAddress: params.fundAddress,
      workspaceId: options?.expectedWorkspaceId,
      submittedAt: new Date().toISOString(),
      status: "BROADCAST",
    });
    options?.onBroadcast?.(txHash);

    const receipt = await waitForSuccessfulReceipt(publicClient, txHash, "Đề xuất chính sách");

    const logs = parseEventLogs({
      abi: KINETIX_FUND_V2_ABI,
      logs: receipt.logs,
      eventName: "GovernanceProposed",
    });

    if (!logs.length || !logs[0].args || (logs[0].args as any).id === undefined) {
      throw new Error(`Giao dịch ${txHash} đã thực thi nhưng không tìm thấy mã ID đề xuất chính sách.`);
    }

    const proposalId = (logs[0].args as any).id as bigint;

    return { txHash, proposalId, receipt };
  } catch (error) {
    throw new Error(humanizeV2Error(error));
  }
}

// =================================================================
// 8. ĐỀ XUẤT HÀNH ĐỘNG GOVERNANCE (PAUSE / RESUME / CLOSE / SURPLUS)
// =================================================================

export interface ProposeActionOnchainParams {
  fundAddress: `0x${string}`;
  action: "POLICY" | "PAUSE" | "RESUME" | "CLOSE" | "SURPLUS" | number;
  recipient?: `0x${string}`;
  amountWei?: bigint | string;
  memo?: string;
}

export async function proposeActionOnchain(
  params: ProposeActionOnchainParams,
  options?: FundV2PreflightOptions
): Promise<{
  txHash: `0x${string}`;
  proposalId: bigint;
  receipt: any;
}> {
  try {
    const { account, walletClient, publicClient } = await getFundV2Wallet(options);
    const memoHash = formatBytes32Hash(params.memo);

    const actionNum =
      typeof params.action === "number"
        ? params.action
        : params.action === "PAUSE"
        ? 1
        : params.action === "RESUME"
        ? 2
        : params.action === "CLOSE"
        ? 3
        : params.action === "SURPLUS"
        ? 4
        : 0;

    const recipient = params.recipient || zeroAddress;
    const amount = BigInt(params.amountWei || "0");

    const { request } = await publicClient.simulateContract({
      account,
      address: params.fundAddress,
      abi: KINETIX_FUND_V2_ABI,
      functionName: "proposeAction",
      args: [actionNum, recipient, amount, memoHash],
    });

    const txHash = await walletClient.writeContract(request);

    recordPendingV2Tx({
      hash: txHash,
      action: `PROPOSE_ACTION_${actionNum}`,
      fundAddress: params.fundAddress,
      workspaceId: options?.expectedWorkspaceId,
      submittedAt: new Date().toISOString(),
      status: "BROADCAST",
    });
    options?.onBroadcast?.(txHash);

    const receipt = await waitForSuccessfulReceipt(publicClient, txHash, "Đề xuất biểu quyết");

    const logs = parseEventLogs({
      abi: KINETIX_FUND_V2_ABI,
      logs: receipt.logs,
      eventName: "GovernanceProposed",
    });

    if (!logs.length || !logs[0].args || (logs[0].args as any).id === undefined) {
      throw new Error(`Giao dịch ${txHash} đã thực thi nhưng không tìm thấy mã ID đề xuất hành động.`);
    }

    const proposalId = (logs[0].args as any).id as bigint;

    return { txHash, proposalId, receipt };
  } catch (error) {
    throw new Error(humanizeV2Error(error));
  }
}

// =================================================================
// 9. DUYỆT ĐỀ XUẤT GOVERNANCE (APPROVE GOVERNANCE)
// =================================================================

export interface ApproveGovernanceOnchainParams {
  fundAddress: `0x${string}`;
  proposalId: number | bigint;
}

export async function approveGovernanceOnchain(
  params: ApproveGovernanceOnchainParams,
  options?: FundV2PreflightOptions
): Promise<{
  txHash: `0x${string}`;
  receipt: any;
}> {
  try {
    const proposalIdNum = BigInt(params.proposalId);
    if (proposalIdNum <= 0n) {
      throw new Error("Mã đề xuất biểu quyết không hợp lệ (phải > 0).");
    }

    const { account, walletClient, publicClient } = await getFundV2Wallet(options);

    const { request } = await publicClient.simulateContract({
      account,
      address: params.fundAddress,
      abi: KINETIX_FUND_V2_ABI,
      functionName: "approveGovernance",
      args: [proposalIdNum],
    });

    const txHash = await walletClient.writeContract(request);

    recordPendingV2Tx({
      hash: txHash,
      action: "APPROVE_GOVERNANCE",
      fundAddress: params.fundAddress,
      workspaceId: options?.expectedWorkspaceId,
      submittedAt: new Date().toISOString(),
      status: "BROADCAST",
    });
    options?.onBroadcast?.(txHash);

    const receipt = await waitForSuccessfulReceipt(publicClient, txHash, "Duyệt đề xuất");

    return { txHash, receipt };
  } catch (error) {
    throw new Error(humanizeV2Error(error));
  }
}

// =================================================================
// 10. THỰC THI GOVERNANCE ĐÃ ĐỦ PHIẾU VÀ TIMELOCK (EXECUTE GOVERNANCE)
// =================================================================

export interface ExecuteGovernanceOnchainParams {
  fundAddress: `0x${string}`;
  proposalId: number | bigint;
}

export async function executeGovernanceOnchain(
  params: ExecuteGovernanceOnchainParams,
  options?: FundV2PreflightOptions
): Promise<{
  txHash: `0x${string}`;
  receipt: any;
}> {
  try {
    const proposalIdNum = BigInt(params.proposalId);
    if (proposalIdNum <= 0n) {
      throw new Error("Mã đề xuất biểu quyết không hợp lệ (phải > 0).");
    }

    const { account, walletClient, publicClient } = await getFundV2Wallet(options);

    const { request } = await publicClient.simulateContract({
      account,
      address: params.fundAddress,
      abi: KINETIX_FUND_V2_ABI,
      functionName: "executeGovernance",
      args: [proposalIdNum],
    });

    const txHash = await walletClient.writeContract(request);

    recordPendingV2Tx({
      hash: txHash,
      action: "EXECUTE_GOVERNANCE",
      fundAddress: params.fundAddress,
      workspaceId: options?.expectedWorkspaceId,
      submittedAt: new Date().toISOString(),
      status: "BROADCAST",
    });
    options?.onBroadcast?.(txHash);

    const receipt = await waitForSuccessfulReceipt(publicClient, txHash, "Thực thi đề xuất");

    return { txHash, receipt };
  } catch (error) {
    throw new Error(humanizeV2Error(error));
  }
}

// =================================================================
// 11. CÁC HÀM ĐỌC DỮ LIỆU ON-CHAIN (READ HELPERS)
// =================================================================

export async function getFundV2Details(fundAddress: `0x${string}`) {
  const [
    accountedBalance,
    availableBalance,
    reservedBalance,
    policyEpoch,
    paused,
    closed,
    goalReached,
    goalDeadline,
    goalTarget,
    config,
  ] = await Promise.all([
    publicClientFuji.readContract({
      address: fundAddress,
      abi: KINETIX_FUND_V2_ABI,
      functionName: "accountedBalance",
    }),
    publicClientFuji.readContract({
      address: fundAddress,
      abi: KINETIX_FUND_V2_ABI,
      functionName: "availableBalance",
    }),
    publicClientFuji.readContract({
      address: fundAddress,
      abi: KINETIX_FUND_V2_ABI,
      functionName: "reservedBalance",
    }),
    publicClientFuji.readContract({
      address: fundAddress,
      abi: KINETIX_FUND_V2_ABI,
      functionName: "policyEpoch",
    }),
    publicClientFuji.readContract({
      address: fundAddress,
      abi: KINETIX_FUND_V2_ABI,
      functionName: "paused",
    }),
    publicClientFuji.readContract({
      address: fundAddress,
      abi: KINETIX_FUND_V2_ABI,
      functionName: "closed",
    }),
    publicClientFuji.readContract({
      address: fundAddress,
      abi: KINETIX_FUND_V2_ABI,
      functionName: "goalReached",
    }),
    publicClientFuji.readContract({
      address: fundAddress,
      abi: KINETIX_FUND_V2_ABI,
      functionName: "goalDeadline",
    }),
    publicClientFuji.readContract({
      address: fundAddress,
      abi: KINETIX_FUND_V2_ABI,
      functionName: "goalTarget",
    }),
    publicClientFuji.readContract({
      address: fundAddress,
      abi: KINETIX_FUND_V2_ABI,
      functionName: "getConfiguration",
    }),
  ]);

  const [policyRaw, membersRaw] = config as [
    { quorum: bigint; transactionLimit: bigint; dailyLimit: bigint },
    readonly { account: `0x${string}`; permissions: number; dailyAllowance: bigint }[]
  ];

  const policy: FundV2Policy = {
    quorum: Number(policyRaw.quorum),
    transactionLimitWei: policyRaw.transactionLimit.toString(),
    dailyLimitWei: policyRaw.dailyLimit.toString(),
    transactionLimitAvax: Number(formatEther(policyRaw.transactionLimit)),
    dailyLimitAvax: Number(formatEther(policyRaw.dailyLimit)),
  };

  const members: FundV2Member[] = membersRaw.map((m) => ({
    account: m.account,
    permissions: m.permissions,
    dailyAllowanceWei: m.dailyAllowance.toString(),
    dailyAllowanceAvax: Number(formatEther(m.dailyAllowance)),
  }));

  return {
    accountedBalanceWei: accountedBalance.toString(),
    availableBalanceWei: availableBalance.toString(),
    reservedBalanceWei: reservedBalance.toString(),
    accountedBalanceAvax: Number(formatEther(accountedBalance)),
    availableBalanceAvax: Number(formatEther(availableBalance)),
    reservedBalanceAvax: Number(formatEther(reservedBalance)),
    policyEpoch: Number(policyEpoch),
    paused: Boolean(paused),
    closed: Boolean(closed),
    goalReached: Boolean(goalReached),
    goalDeadlineSeconds: Number(goalDeadline),
    goalTargetWei: goalTarget.toString(),
    goalTargetAvax: Number(formatEther(goalTarget)),
    policy,
    members,
  };
}

export async function getUserContributionOnchain(
  fundAddress: `0x${string}`,
  userAddress: `0x${string}`
): Promise<bigint> {
  return (await publicClientFuji.readContract({
    address: fundAddress,
    abi: KINETIX_FUND_V2_ABI,
    functionName: "contributions",
    args: [userAddress],
  })) as bigint;
}

export async function getExpenseOnchain(
  fundAddress: `0x${string}`,
  expenseId: number | bigint
) {
  const exp = (await publicClientFuji.readContract({
    address: fundAddress,
    abi: KINETIX_FUND_V2_ABI,
    functionName: "getExpense",
    args: [BigInt(expenseId)],
  })) as {
    proposer: `0x${string}`;
    recipient: `0x${string}`;
    amount: bigint;
    deadline: bigint;
    epoch: bigint;
    approvals: bigint;
    memoHash: `0x${string}`;
    status: number;
  };

  return {
    ...exp,
    amountWei: exp.amount.toString(),
    amountAvax: Number(formatEther(exp.amount)),
    deadlineSeconds: Number(exp.deadline),
    epoch: Number(exp.epoch),
    approvals: Number(exp.approvals),
    statusName: V2_STATUS_MAP[exp.status] || "UNKNOWN",
  };
}

export async function getGovernanceOnchain(
  fundAddress: `0x${string}`,
  proposalId: number | bigint
): Promise<GovernanceProposalItem> {
  const gov = (await publicClientFuji.readContract({
    address: fundAddress,
    abi: KINETIX_FUND_V2_ABI,
    functionName: "getGovernance",
    args: [BigInt(proposalId)],
  })) as {
    action: number;
    proposer: `0x${string}`;
    recipient: `0x${string}`;
    amount: bigint;
    deadline: bigint;
    epoch: bigint;
    approvals: bigint;
    readyAt: bigint;
    commitment: `0x${string}`;
    status: number;
  };

  const actionName = (V2_ACTION_MAP[gov.action] || "POLICY") as GovernanceProposalItem["action"];
  const statusName = (V2_STATUS_MAP[gov.status] || "PENDING") as GovernanceProposalItem["status"];

  return {
    id: Number(proposalId),
    action: actionName,
    actionName: String(actionName),
    proposer: gov.proposer,
    recipient: gov.recipient === zeroAddress ? undefined : gov.recipient,
    amountWei: gov.amount.toString(),
    amountAvax: Number(formatEther(gov.amount)),
    deadline: Number(gov.deadline),
    epoch: Number(gov.epoch),
    approvals: Number(gov.approvals),
    readyAt: Number(gov.readyAt),
    commitment: gov.commitment,
    status: statusName,
  };
}
