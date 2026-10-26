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

export type DemoMember = FamilyMember;
export type Member = FamilyMember;

export const DEMO_MEMBERS: DemoMember[] = [
  {
    id: "user-admin",
    name: "Bố Ba (Admin)",
    role: "ADMIN",
    title: "Người quản trị gia đình • Ví Core",
    walletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
    defaultTab: "quan-tri-cha-me",
  },
  {
    id: "user-guardian-1",
    name: "Anh Cả (Guardian 1)",
    role: "GUARDIAN",
    title: "Bảo hộ cấp cao • Đã ký duyệt 1/2",
    walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    defaultTab: "quan-tri-cha-me",
  },
  {
    id: "user-guardian-2",
    name: "Cô Út (Guardian 2)",
    role: "GUARDIAN",
    title: "Bảo hộ tài chính • Quỹ Họ Hụi",
    walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    defaultTab: "quy-rosca",
  },
  {
    id: "user-elderly",
    name: "Ông Nội (Nguyễn Văn An)",
    role: "ELDERLY",
    title: "Thế hệ 1 • Thụ hưởng Kinetix Shield",
    walletAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuB9RXFgUn83eP41jg2weE3YA8vd83fsVimUf5y0OcZS7SOQ3XPOzG_gbODV_xJIXeRQye9NHAh2TXP_28Oz-bPHhWTfscJFCZWXYRXq2gQAAtwAVTc1yseRsDx3GBa94HVhTHAal40UzoVwN7YY1IXQ5EmMOe0WhhEvzu4V7ZNBtixA0ZiaR61Ad1UJUADoRuNzug0ggIZW8eO5XEiktIZD-zCJ4THMAqG0i7Z1ivkCGPnUrjsBJg",
    defaultTab: "kinetix-shield",
  },
  {
    id: "user-child",
    name: "Bé Na (Lớp 6A)",
    role: "CHILD",
    title: "Thế hệ 3 • Kinetix Kids Heo Đất",
    walletAddress: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAc1UhNj0E3eKWwrEAv9WJ4KTtp_4pnR4-fyhwEHSKncOxXMGgdr5EdEkF7AMpuaguOYSWTwC-3Ovp1jhOZtflnABlKorh-7E9pPfvKLow6TvFQHGxmf0EgQh_J7eX2WyhgY_obtzgCtT892o3CCd1-TKpF3WABb42fGzxm4wVTK6S7fWG0bKJKRZGbEsWybndKRK3uK6Aix2ehMS1hOr8zRyDG3ZRA0ODbqcIHWiDv1p2ayRMtyQ",
    defaultTab: "kinetix-kids",
  },
];

export const INITIAL_MEMBERS = DEMO_MEMBERS;

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
}
