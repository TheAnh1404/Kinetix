export type GroupFundKind = "OPERATING" | "GOAL";
export type GroupFundStatus = "ACTIVE" | "PAUSED" | "CLOSED";
export type GroupExpenseStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "PAYMENT_PENDING"
  | "EXECUTED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";
export type GroupApprovalDecision = "APPROVE" | "REJECT";
export type GroupPaymentStatus =
  | "READY"
  | "BROADCAST"
  | "MINING"
  | "CONFIRMED"
  | "FAILED";

export interface GroupFundItem {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  fundType: GroupFundKind;
  custodyType: "ONCHAIN_HUB" | "SHARED_TREASURY";
  treasuryWalletAddress?: string;
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
  goalReached?: boolean;
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
  fundId: string;
  fundName: string;
  fundType: GroupFundKind;
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
  name: string;
  description?: string;
  fundType: GroupFundKind;
  custodyType: "ONCHAIN_HUB" | "SHARED_TREASURY";
  fastWithdrawLimitAvax?: string;
  requiredApprovals: number;
  guardianWallets: string[];
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
  deadlineHours?: number;
  idempotencyKey: string;
}
