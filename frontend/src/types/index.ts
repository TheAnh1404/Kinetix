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
}

export type Member = FamilyMember;

export const INITIAL_MEMBERS: FamilyMember[] = [
  {
    id: "user-admin",
    name: "Bố Ba (Chủ Hộ)",
    role: "ADMIN",
    title: "Người quản trị gia đình • Ví Core",
    walletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
    defaultTab: "quan-tri-cha-me",
  },
  {
    id: "user-guardian-1",
    name: "Anh Cả (Người Bảo Hộ 1)",
    role: "GUARDIAN",
    title: "Bảo hộ cấp cao • Đã ký duyệt 1/2",
    walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    defaultTab: "quan-tri-cha-me",
  },
  {
    id: "user-guardian-2",
    name: "Cô Út (Người Bảo Hộ 2)",
    role: "GUARDIAN",
    title: "Bảo hộ tài chính • Quỹ Họ Hụi",
    walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    defaultTab: "quy-rosca",
  },
  {
    id: "user-elderly",
    name: "Ông Nội (Cụ Ba)",
    role: "ELDERLY",
    title: "Thế hệ 1 • Thụ hưởng Kinetix Shield",
    walletAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    avatar: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150",
    defaultTab: "kinetix-shield",
  },
  {
    id: "user-child",
    name: "Bé Na (Con Gái)",
    role: "CHILD",
    title: "Thế hệ 3 • Kinetix Kids Heo Đất",
    walletAddress: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
    defaultTab: "kinetix-kids",
  },
];

export interface WorkspaceItem {
  id: string;
  name: string;
  type: "FAMILY" | "SIBLINGS" | "FRIENDS" | "COMMUNITY";
  workspaceCode?: string;
  creatorWallet: string;
  l1HubAddress?: string;
  cchainVaultAddress?: string;
  userRole?: RoleType;
}

export interface DynamicVaultItem {
  id: string;
  workspaceId: string;
  onchainVaultId: number;
  name: string;
  description?: string;
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
  // Các trường mở rộng theo 4 bộ quy tắc
  targetGoalAmount?: number;
  targetDeadline?: string | null;
  roscaRoundDuration?: number;
  roscaRoundContribution?: number;
  roscaCurrentRound?: number;
  roscaLastRoundTimestamp?: string | null;
}
