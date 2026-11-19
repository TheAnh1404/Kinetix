export type GroupFundKind = "OPERATING" | "GOAL";
export type GroupCustodyType = "ONCHAIN_HUB" | "SHARED_TREASURY" | "ONCHAIN_V2";
export type GroupFundStatus = "ACTIVE" | "PAUSED" | "CLOSED";
export type GroupExpenseStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "PAYMENT_PENDING"
  | "EXECUTED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED"
  | "INVALIDATED";
export type GroupApprovalDecision = "APPROVE" | "REJECT";
export type GroupPaymentStatus =
  | "READY"
  | "BROADCAST"
  | "MINING"
  | "CONFIRMED"
  | "FAILED";

export interface FundV2Policy {
  quorum: number;
  transactionLimitWei: string;
  dailyLimitWei: string;
  transactionLimitAvax?: number;
  dailyLimitAvax?: number;
}

export interface FundV2Member {
  account: string;
  permissions: number;
  dailyAllowanceWei: string;
  dailyAllowanceAvax?: number;
  roleName?: string;
}

export type GovernanceActionType = "POLICY" | "PAUSE" | "RESUME" | "CLOSE" | "SURPLUS";

export interface GovernanceProposalItem {
  id: number | string;
  fundId?: string;
  action: GovernanceActionType | number;
  actionName?: string;
  proposer: string;
  recipient?: string;
  amountWei?: string;
  amountAvax?: number;
  deadline: string | number;
  epoch: number;
  approvals: number;
  requiredApprovals?: number;
  readyAt?: number | string;
  commitment?: string;
  status:
    | "PENDING"
    | "APPROVED"
    | "EXECUTED"
    | "CANCELLED"
    | "REJECTED"
    | "EXPIRED"
    | "INVALIDATED";
  canApprove?: boolean;
  canExecute?: boolean;
  proposedPolicy?: FundV2Policy;
  proposedMembers?: FundV2Member[];
  memo?: string;
  createdAt?: string;
}

export interface RefundEligibility {
  fundId: string;
  userAddress: string;
  contributedWei: string;
  contributedAvax: number;
  isEligible: boolean;
  reason?: string;
  goalTargetWei?: string;
  currentBalanceWei?: string;
  deadlinePassed?: boolean;
  goalFailed?: boolean;
}

export interface GroupFundItem {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  fundType: GroupFundKind;
  custodyType: "ONCHAIN_HUB" | "SHARED_TREASURY" | "ONCHAIN_V2";
  treasuryWalletAddress?: string;
  contractAddress?: string;
  factoryAddress?: string;
  policyEpoch?: number;
  goalReached?: boolean;
  isPaused?: boolean;
  termsHash?: string;
  canPay?: boolean;
  onchainVaultAddress?: string;
  onchainVaultId?: number;
  balanceWei: string;
  reservedWei: string;
  availableWei: string;
  balanceAvax: number;
  reservedAvax: number;
  availableAvax: number;
  fastWithdrawLimitWei: string;
  fastWithdrawLimitAvax: number;
  requiredApprovals: number;
  totalSigners: number;
  signers: string[];
  targetAmountWei?: string;
  targetAmountAvax?: number;
  targetDeadline?: string | null;
  targetDeadlineFormatted?: string;
  status: GroupFundStatus;
  createdAt: string;
}

export interface GroupExpenseApproval {
  id: string;
  approverUserId: string;
  approverName: string;
  approverAddress: string;
  decision: GroupApprovalDecision;
  comment?: string;
  createdAt: string;
}

export interface GroupExpensePayment {
  id: string;
  txHash?: string;
  status: GroupPaymentStatus;
  amountAvax: number;
  senderAddress: string;
  recipientAddress: string;
  executedBy?: string;
  confirmedAt?: string;
}

export interface GroupExpenseRequest {
  canApprove?: boolean;
  canPay?: boolean;
  id: string;
  onchainExpenseId?: number;
  fundId: string;
  fundName: string;
  fundType: GroupFundKind;
  custodyType?: GroupCustodyType;
  proposerId: string;
  proposerName: string;
  proposerAddress: string;
  recipientAddress: string;
  recipientName: string;
  amountWei: string;
  amountAvax: number;
  title: string;
  purpose: string;
  category: string;
  receiptAttachmentUrl?: string | null;
  receiptAttachmentHash?: string | null;
  requiredApprovals: number;
  approvedCount: number;
  status: GroupExpenseStatus;
  deadline: string;
  deadlineFormatted?: string;
  createdAt: string;
  approvals: GroupExpenseApproval[];
  payment?: GroupExpensePayment;
}

export interface GroupObligation {
  id: string;
  fundId: string;
  fundName: string;
  memberUserId: string;
  memberName: string;
  memberAddress: string;
  amountWei: string;
  amountAvax: number;
  cycle: "ONCE" | "WEEKLY" | "MONTHLY";
  dueDate: string;
  dueDateFormatted?: string;
  status: "PENDING" | "PAID" | "EXEMPT";
}

export interface GroupAuditEvent {
  id: string;
  workspaceId: string;
  fundId?: string;
  fundName?: string;
  actorName: string;
  actorWallet: string;
  action:
    | "FUND_CREATED"
    | "CONTRIBUTION_MADE"
    | "EXPENSE_PROPOSED"
    | "EXPENSE_APPROVED"
    | "EXPENSE_REJECTED"
    | "PAYMENT_EXECUTED"
    | "EXPENSE_CANCELLED"
    | "POLICY_UPDATED";
  description: string;
  amountAvax?: number;
  txHash?: string;
  createdAt: string;
}

export interface CreateFundParams {
  idempotencyKey?: string;
  treasuryWalletAddress?: string;
  contractAddress?: string;
  factoryAddress?: string;
  name: string;
  description?: string;
  fundType: GroupFundKind;
  custodyType: "ONCHAIN_HUB" | "SHARED_TREASURY" | "ONCHAIN_V2";
  fastWithdrawLimitAvax?: string;
  dailyLimitAvax?: string;
  requiredApprovals: number;
  guardianWallets: string[];
  members?: FundV2Member[];
  targetAmountAvax?: string;
  targetDeadline?: string;
}

export interface ProposeExpenseParams {
  fundId: string;
  title: string;
  purpose: string;
  category: string;
  amountAvax: string;
  recipientAddress: string;
  recipientName: string;
  receiptAttachmentUrl?: string;
  receiptImageBase64?: string;
  deadlineHours?: number;
  idempotencyKey: string;
}
