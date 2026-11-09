export type ActiveTab =
  | "trang-chu"
  | "kinetix-shield"
  | "quan-tri-cha-me"
  | "kinetix-kids"
  | "quy-rosca";

export type NavTab = ActiveTab;

export type RoleType = "ADMIN" | "GUARDIAN" | "ELDERLY" | "CHILD";

export interface FamilyMember {
  id: string;
  name: string;
  role: RoleType;
  title: string;
  walletAddress: string;
  address: string;
  avatar: string;
  defaultTab: ActiveTab;
  phoneNumber?: string | null;
  canManageMembers?: boolean;
}

export type Member = FamilyMember;

export interface WorkspaceItem {
  id: string;
  name: string;
  type: "FAMILY" | "SIBLINGS" | "FRIENDS" | "COMMUNITY";
  workspaceCode?: string;
  creatorWallet: string;
  l1HubAddress?: string;
  cchainVaultAddress?: string;
  userRole?: RoleType;
  role?: RoleType;
}

export interface DynamicVaultItem {
  exactFastWithdrawLimit?: string;
  exactTotalBalance?: string;
  exactL1Buffer?: string;
  id: string;
  workspaceId: string;
  onchainVaultId: number;
  onchainHub?: string | null;
  onchainVaultAddress?: string | null;
  onchainChainId?: number | null;
  onchainCreationTx?: string | null;
  onchainCreationLogIndex?: number | null;
  name: string;
  description?: string;
  icon?: string;
  beneficiaryName?: string;
  guardianCount?: number;
  ruleTemplate: "SHIELD" | "MILESTONE" | "ROSCA" | "SHARED_GOAL";
  bufferRatioBps: number;
  fastWithdrawLimit: number;
  requiredApprovals: number;
  cachedTotalBalance: number;
  cachedL1Buffer: number;
  cachedCChainYield: number;
  totalBalance: number;
  l1BufferBalance: number;
  cChainPrincipal: number;
  isActive: boolean;
  // Các trường đa tầng số dư on-chain (Total - Reserved - Available)
  reservedBalance?: number;
  availableBalance?: number;
  exactReservedBalance?: string;
  exactAvailableBalance?: string;
  // Các trường mở rộng theo 4 bộ quy tắc
  targetGoalAmount?: number;
  targetDeadline?: string | null;
  roscaRoundDuration?: number;
  roscaRoundContribution?: number;
  roscaCurrentRound?: number;
  roscaLastRoundTimestamp?: string | null;
}
