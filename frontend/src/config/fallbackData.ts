/**
 * Dữ liệu Mẫu Khởi tạo Toàn diện (Robust Fallback & Demo Seeding) cho Kinetix
 * Đảm bảo hệ thống hoạt động mượt mà khi chạy Demo không có Backend/DB hoặc đang khởi động.
 */

import {
  WorkspaceItem,
  DynamicVaultItem,
  FamilyMember,
} from "@/types";
import {
  WithdrawalRequestItem,
  ChoreItem,
  NotificationItem,
} from "@/context/FamilyContext";
import { DEMO_PERSONAS } from "../../../shared/demoPersonas";

export const FALLBACK_L1_HUB = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
export const FALLBACK_CCHAIN_VAULT = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

/**
 * 4 Workspace Mẫu Chuẩn Hoá
 */
export const FALLBACK_WORKSPACES: WorkspaceItem[] = [
  {
    id: "ws-family",
    name: "Đại Gia Đình Bác Ba",
    type: "FAMILY",
    workspaceCode: "KNTX-8888",
    creatorWallet: DEMO_PERSONAS.admin.wallet,
    l1HubAddress: FALLBACK_L1_HUB,
    cchainVaultAddress: FALLBACK_CCHAIN_VAULT,
    userRole: "ADMIN",
    role: "ADMIN",
    isOwner: true,
    canAdminister: true,
    canManageMembers: true,
  },
  {
    id: "ws-siblings",
    name: "Anh Chị Em Nhà Họ Nguyễn",
    type: "SIBLINGS",
    workspaceCode: "KNTX-7777",
    creatorWallet: DEMO_PERSONAS.admin.wallet,
    l1HubAddress: FALLBACK_L1_HUB,
    cchainVaultAddress: FALLBACK_CCHAIN_VAULT,
    userRole: "ADMIN",
    role: "ADMIN",
    isOwner: true,
    canAdminister: true,
    canManageMembers: true,
  },
  {
    id: "ws-friends",
    name: "Nhóm Bạn Thân Đại Học Bách Khoa",
    type: "FRIENDS",
    workspaceCode: "KNTX-9999",
    creatorWallet: DEMO_PERSONAS.admin.wallet,
    l1HubAddress: FALLBACK_L1_HUB,
    cchainVaultAddress: FALLBACK_CCHAIN_VAULT,
    userRole: "ADMIN",
    role: "ADMIN",
    isOwner: true,
    canAdminister: true,
    canManageMembers: true,
  },
  {
    id: "ws-community",
    name: "CLB Avalanche Campus",
    type: "COMMUNITY",
    workspaceCode: "KNTX-6666",
    creatorWallet: DEMO_PERSONAS.admin.wallet,
    l1HubAddress: FALLBACK_L1_HUB,
    cchainVaultAddress: FALLBACK_CCHAIN_VAULT,
    userRole: "ADMIN",
    role: "ADMIN",
    isOwner: true,
    canAdminister: true,
    canManageMembers: true,
  },
];

/**
 * Thành viên theo từng Workspace
 */
export const FALLBACK_MEMBERS_BY_WORKSPACE: Record<string, FamilyMember[]> = {
  "ws-family": [
    {
      id: "user-admin",
      name: "Bố Ba (Chủ Hộ)",
      role: "ADMIN",
      title: "Chủ Hộ (Bố / Mẹ)",
      walletAddress: DEMO_PERSONAS.admin.wallet,
      address: DEMO_PERSONAS.admin.wallet,
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
      defaultTab: "quan-tri-cha-me",
      phoneNumber: "+84901234567",
      canManageMembers: true,
    },
    {
      id: "user-guardian1",
      name: "Cô Út (Giám Hộ)",
      role: "GUARDIAN",
      title: "Người Giám Hộ",
      walletAddress: DEMO_PERSONAS.guardian1.wallet,
      address: DEMO_PERSONAS.guardian1.wallet,
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      defaultTab: "quan-tri-cha-me",
      phoneNumber: "+84902345678",
      canManageMembers: true,
    },
    {
      id: "user-guardian2",
      name: "Anh Cả (Giám Hộ)",
      role: "GUARDIAN",
      title: "Người Giám Hộ",
      walletAddress: DEMO_PERSONAS.guardian2.wallet,
      address: DEMO_PERSONAS.guardian2.wallet,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      defaultTab: "quan-tri-cha-me",
      phoneNumber: "+84903456789",
      canManageMembers: true,
    },
    {
      id: "user-elderly",
      name: "Cụ Ba (Ông Nội)",
      role: "ELDERLY",
      title: "Ông / Bà (Cao Tuổi)",
      walletAddress: DEMO_PERSONAS.elderly.wallet,
      address: DEMO_PERSONAS.elderly.wallet,
      avatar: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150",
      defaultTab: "kinetix-shield",
      phoneNumber: "+84904567890",
      canManageMembers: false,
    },
    {
      id: "user-child",
      name: "Bé Na (Con Gái)",
      role: "CHILD",
      title: "Con Nhỏ (Heo Đất)",
      walletAddress: DEMO_PERSONAS.child.wallet,
      address: DEMO_PERSONAS.child.wallet,
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
      defaultTab: "kinetix-kids",
      phoneNumber: "+84905678901",
      canManageMembers: false,
    },
  ],

  "ws-siblings": [
    {
      id: "user-admin",
      name: "Bố Ba (Trưởng Quỹ)",
      role: "ADMIN",
      title: "Trưởng Ban Quản Quỹ",
      walletAddress: DEMO_PERSONAS.admin.wallet,
      address: DEMO_PERSONAS.admin.wallet,
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
      defaultTab: "quy-rosca",
      phoneNumber: "+84901234567",
      canManageMembers: true,
    },
    {
      id: "user-guardian1",
      name: "Cô Út (Thành Viên)",
      role: "GUARDIAN",
      title: "Anh Chị Em Đồng Quản Lý",
      walletAddress: DEMO_PERSONAS.guardian1.wallet,
      address: DEMO_PERSONAS.guardian1.wallet,
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      defaultTab: "quy-rosca",
      phoneNumber: "+84902345678",
      canManageMembers: true,
    },
    {
      id: "user-guardian2",
      name: "Anh Cả (Thành Viên)",
      role: "GUARDIAN",
      title: "Anh Chị Em Đồng Quản Lý",
      walletAddress: DEMO_PERSONAS.guardian2.wallet,
      address: DEMO_PERSONAS.guardian2.wallet,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      defaultTab: "quy-rosca",
      phoneNumber: "+84903456789",
      canManageMembers: true,
    },
  ],

  "ws-friends": [
    {
      id: "user-admin",
      name: "Bố Ba (Trưởng Nhóm ĐH)",
      role: "ADMIN",
      title: "Trưởng Nhóm (Admin)",
      walletAddress: DEMO_PERSONAS.admin.wallet,
      address: DEMO_PERSONAS.admin.wallet,
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
      defaultTab: "trang-chu",
      phoneNumber: "+84901234567",
      canManageMembers: true,
    },
    {
      id: "user-guardian1",
      name: "Tuấn Dũng (Thủ Quỹ)",
      role: "GUARDIAN",
      title: "Thủ Quỹ Nhóm",
      walletAddress: DEMO_PERSONAS.guardian1.wallet,
      address: DEMO_PERSONAS.guardian1.wallet,
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
      defaultTab: "trang-chu",
      phoneNumber: "+84902345678",
      canManageMembers: true,
    },
    {
      id: "user-guardian2",
      name: "Hoàng Nam (Đồng Ký)",
      role: "GUARDIAN",
      title: "Thành Viên Giữ Quỹ",
      walletAddress: DEMO_PERSONAS.guardian2.wallet,
      address: DEMO_PERSONAS.guardian2.wallet,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      defaultTab: "trang-chu",
      phoneNumber: "+84903456789",
      canManageMembers: false,
    },
    {
      id: "user-child",
      name: "Khánh Linh",
      role: "CHILD",
      title: "Thành Viên Nhóm",
      walletAddress: DEMO_PERSONAS.child.wallet,
      address: DEMO_PERSONAS.child.wallet,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      defaultTab: "trang-chu",
      phoneNumber: "+84905678901",
      canManageMembers: false,
    },
  ],

  "ws-community": [
    {
      id: "user-admin",
      name: "Bố Ba (Chủ Nhiệm CLB)",
      role: "ADMIN",
      title: "Chủ Nhiệm CLB",
      walletAddress: DEMO_PERSONAS.admin.wallet,
      address: DEMO_PERSONAS.admin.wallet,
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
      defaultTab: "quan-tri-cha-me",
      phoneNumber: "+84901234567",
      canManageMembers: true,
    },
    {
      id: "user-guardian1",
      name: "Minh Phương (Phó CN)",
      role: "GUARDIAN",
      title: "Phó Chủ Nhiệm",
      walletAddress: DEMO_PERSONAS.guardian1.wallet,
      address: DEMO_PERSONAS.guardian1.wallet,
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      defaultTab: "quan-tri-cha-me",
      phoneNumber: "+84902345678",
      canManageMembers: true,
    },
    {
      id: "user-guardian2",
      name: "Đức Huy (Trưởng Ban TC)",
      role: "GUARDIAN",
      title: "Trưởng Ban Tài Chính",
      walletAddress: DEMO_PERSONAS.guardian2.wallet,
      address: DEMO_PERSONAS.guardian2.wallet,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      defaultTab: "quan-tri-cha-me",
      phoneNumber: "+84903456789",
      canManageMembers: false,
    },
    {
      id: "user-child",
      name: "Lan Anh (Cộng Tác Viên)",
      role: "CHILD",
      title: "Cộng Tác Viên (Bounty)",
      walletAddress: DEMO_PERSONAS.child.wallet,
      address: DEMO_PERSONAS.child.wallet,
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
      defaultTab: "kinetix-kids",
      phoneNumber: "+84905678901",
      canManageMembers: false,
    },
  ],
};

/**
 * Dynamic Vaults theo từng Workspace
 */
export const FALLBACK_VAULTS_BY_WORKSPACE: Record<string, DynamicVaultItem[]> = {
  "ws-family": [
    {
      id: "vault-family-1",
      workspaceId: "ws-family",
      onchainVaultId: 1,
      name: "Hũ Báo Hiếu Ông Bà",
      description:
        "Bảo vệ tài sản hưu trí, rút nhanh tức thì 0 gas <= 50 USDC từ L1; rút lớn cần 2/3 chữ ký bảo hộ gia đình.",
      icon: "🛡️",
      beneficiaryName: "Cụ Ba (Ông Nội)",
      guardianCount: 3,
      ruleTemplate: "SHIELD",
      bufferRatioBps: 1000, // 10% L1 / 90% C-Chain
      fastWithdrawLimit: 50,
      requiredApprovals: 2,
      cachedTotalBalance: 1200,
      cachedL1Buffer: 120,
      cachedCChainYield: 86.4,
      totalBalance: 1200,
      l1BufferBalance: 120,
      cChainPrincipal: 1080,
      exactTotalBalance: "1200",
      exactL1Buffer: "120",
      exactFastWithdrawLimit: "50",
      isActive: true,
    },
    {
      id: "vault-family-2",
      workspaceId: "ws-family",
      onchainVaultId: 2,
      name: "Hũ Lì Xì Bé Na",
      description:
        "Quỹ nhiệm vụ Chore-to-Earn, vốn gửi C-Chain sinh lời, mở khóa thưởng khi hoàn thành việc nhà được cha mẹ duyệt.",
      icon: "🎁",
      beneficiaryName: "Bé Na",
      guardianCount: 2,
      ruleTemplate: "MILESTONE",
      bufferRatioBps: 1000,
      fastWithdrawLimit: 20,
      requiredApprovals: 2,
      cachedTotalBalance: 450,
      cachedL1Buffer: 45,
      cachedCChainYield: 32.4,
      totalBalance: 450,
      l1BufferBalance: 45,
      cChainPrincipal: 405,
      exactTotalBalance: "450",
      exactL1Buffer: "45",
      exactFastWithdrawLimit: "20",
      isActive: true,
    },
  ],

  "ws-siblings": [
    {
      id: "vault-siblings-1",
      workspaceId: "ws-siblings",
      onchainVaultId: 3,
      name: "Vòng Quay Tương Trợ Mua Xe",
      description:
        "Góp vốn xoay vòng tương trợ anh chị em mua sắm, tiền nhàn rỗi sinh lời C-Chain 8% APY, đến kỳ giải ngân gốc + lãi.",
      icon: "🔄",
      beneficiaryName: "Anh Chị Em",
      guardianCount: 3,
      ruleTemplate: "ROSCA",
      bufferRatioBps: 0, // 0% L1 / 100% C-Chain
      fastWithdrawLimit: 0,
      requiredApprovals: 2,
      cachedTotalBalance: 3000,
      cachedL1Buffer: 0,
      cachedCChainYield: 240.0,
      totalBalance: 3000,
      l1BufferBalance: 0,
      cChainPrincipal: 3000,
      exactTotalBalance: "3000",
      exactL1Buffer: "0",
      exactFastWithdrawLimit: "0",
      roscaRoundDuration: 2592000, // 30 ngày
      roscaRoundContribution: 250,
      roscaCurrentRound: 3,
      isActive: true,
    },
    {
      id: "vault-siblings-2",
      workspaceId: "ws-siblings",
      onchainVaultId: 4,
      name: "Quỹ Chung Phụng Dưỡng Bố Mẹ",
      description:
        "Anh chị em cùng đóng góp phụng dưỡng cha mẹ hàng tháng, rút chi tiêu minh bạch on-chain.",
      icon: "❤️",
      beneficiaryName: "Bố Mẹ",
      guardianCount: 3,
      ruleTemplate: "SHIELD",
      bufferRatioBps: 1000,
      fastWithdrawLimit: 100,
      requiredApprovals: 2,
      cachedTotalBalance: 800,
      cachedL1Buffer: 80,
      cachedCChainYield: 57.6,
      totalBalance: 800,
      l1BufferBalance: 80,
      cChainPrincipal: 720,
      exactTotalBalance: "800",
      exactL1Buffer: "80",
      exactFastWithdrawLimit: "100",
      isActive: true,
    },
  ],

  "ws-friends": [
    {
      id: "vault-friends-1",
      workspaceId: "ws-friends",
      onchainVaultId: 5,
      name: "Quỹ Đi Phượt Đà Lạt Cuối Năm",
      description:
        "Cả nhóm cùng tích lũy cho chuyến đi phượt Đà Lạt cuối năm, vốn sinh lãi DeFi 8% APY trên C-Chain cho đến khi đạt mục tiêu.",
      icon: "🎒",
      beneficiaryName: "Cả Nhóm",
      guardianCount: 3,
      ruleTemplate: "SHARED_GOAL",
      bufferRatioBps: 1000,
      fastWithdrawLimit: 50,
      requiredApprovals: 2,
      targetGoalAmount: 1000,
      cachedTotalBalance: 750,
      cachedL1Buffer: 75,
      cachedCChainYield: 54.0,
      totalBalance: 750,
      l1BufferBalance: 75,
      cChainPrincipal: 675,
      exactTotalBalance: "750",
      exactL1Buffer: "75",
      exactFastWithdrawLimit: "50",
      isActive: true,
    },
    {
      id: "vault-friends-2",
      workspaceId: "ws-friends",
      onchainVaultId: 6,
      name: "Hũ Ăn Uống Hàng Tuần",
      description:
        "Quỹ sinh hoạt ăn uống hàng tuần, 30% giữ L1 rút nhanh 1 giây 0đ phí quét VietQR, 70% sinh lời.",
      icon: "🍕",
      beneficiaryName: "Hội Bạn",
      guardianCount: 2,
      ruleTemplate: "SHIELD",
      bufferRatioBps: 3000, // 30% L1 / 70% C-Chain
      fastWithdrawLimit: 30,
      requiredApprovals: 2,
      cachedTotalBalance: 200,
      cachedL1Buffer: 60,
      cachedCChainYield: 11.2,
      totalBalance: 200,
      l1BufferBalance: 60,
      cChainPrincipal: 140,
      exactTotalBalance: "200",
      exactL1Buffer: "60",
      exactFastWithdrawLimit: "30",
      isActive: true,
    },
  ],

  "ws-community": [
    {
      id: "vault-community-1",
      workspaceId: "ws-community",
      onchainVaultId: 7,
      name: "Quỹ Hoạt Động & Sự Kiện CLB",
      description:
        "Ngân sách sự kiện workshop, chi tiêu minh bạch on-chain cần tối thiểu 2/3 chữ ký BCN duyệt.",
      icon: "🏛️",
      beneficiaryName: "CLB Blockchain",
      guardianCount: 3,
      ruleTemplate: "SHIELD",
      bufferRatioBps: 2000, // 20% L1 / 80% C-Chain
      fastWithdrawLimit: 100,
      requiredApprovals: 2,
      cachedTotalBalance: 2500,
      cachedL1Buffer: 500,
      cachedCChainYield: 160.0,
      totalBalance: 2500,
      l1BufferBalance: 500,
      cChainPrincipal: 2000,
      exactTotalBalance: "2500",
      exactL1Buffer: "500",
      exactFastWithdrawLimit: "100",
      isActive: true,
    },
    {
      id: "vault-community-2",
      workspaceId: "ws-community",
      onchainVaultId: 8,
      name: "Quỹ Thưởng Bounty Thành Viên",
      description:
        "Quỹ khen thưởng nhiệm vụ & bounty cho thành viên tích cực, sinh lời tự động trên Fuji C-Chain.",
      icon: "🏆",
      beneficiaryName: "Cộng Tác Viên CLB",
      guardianCount: 2,
      ruleTemplate: "MILESTONE",
      bufferRatioBps: 1000,
      fastWithdrawLimit: 25,
      requiredApprovals: 2,
      cachedTotalBalance: 600,
      cachedL1Buffer: 60,
      cachedCChainYield: 43.2,
      totalBalance: 600,
      l1BufferBalance: 60,
      cChainPrincipal: 540,
      exactTotalBalance: "600",
      exactL1Buffer: "60",
      exactFastWithdrawLimit: "25",
      isActive: true,
    },
  ],
};

/**
 * Yêu cầu Rút tiền Đa chữ ký theo từng Workspace
 */
export const FALLBACK_WITHDRAWALS_BY_WORKSPACE: Record<
  string,
  WithdrawalRequestItem[]
> = {
  "ws-family": [
    {
      id: "req-f1",
      onchainRequestId: 1,
      vaultId: "vault-family-1",
      vaultName: "Hũ Báo Hiếu Ông Bà",
      requesterName: "Cụ Ba (Ông Nội)",
      requesterAddress: DEMO_PERSONAS.elderly.wallet,
      amount: 1000,
      exactAmount: "1000.000000",
      vault: "SHIELD",
      reason: "Viện phí kiểm tra tim mạch đột xuất",
      approvalsCount: 1,
      requiredApprovals: 2,
      status: "PENDING",
      createdAt: "2026-11-14T08:30:00Z",
      guardianSignatures: [
        {
          guardianName: "Bố Ba (Chủ Hộ)",
          signed: true,
          signedAt: "2026-11-14T09:00:00Z",
        },
        {
          guardianName: "Mẹ Ba (Người Bảo Vệ)",
          signed: false,
        },
      ],
    },
    {
      id: "req-f2",
      onchainRequestId: 2,
      vaultId: "vault-family-1",
      vaultName: "Hũ Báo Hiếu Ông Bà",
      requesterName: "Cụ Ba (Ông Nội)",
      requesterAddress: DEMO_PERSONAS.elderly.wallet,
      amount: 30,
      exactAmount: "30.000000",
      vault: "SHIELD",
      reason: "Rút tiền mua nhu yếu phẩm hàng ngày",
      approvalsCount: 2,
      requiredApprovals: 2,
      status: "EXECUTED",
      createdAt: "2026-11-12T10:00:00Z",
      guardianSignatures: [
        {
          guardianName: "Cô Út",
          signed: true,
          signedAt: "2026-11-12T10:05:00Z",
        },
        {
          guardianName: "Anh Cả",
          signed: true,
          signedAt: "2026-11-12T10:10:00Z",
        },
      ],
    },
  ],

  "ws-siblings": [
    {
      id: "req-s1",
      onchainRequestId: 3,
      vaultId: "vault-siblings-2",
      vaultName: "Quỹ Chung Phụng Dưỡng Bố Mẹ",
      requesterName: "Cô Út",
      requesterAddress: DEMO_PERSONAS.guardian1.wallet,
      amount: 200,
      exactAmount: "200.000000",
      vault: "SHIELD",
      reason: "Chi phí mua thuốc bổ & thực phẩm dinh dưỡng biếu Bố Mẹ",
      approvalsCount: 1,
      requiredApprovals: 2,
      status: "PENDING",
      createdAt: "2026-11-13T14:20:00Z",
      guardianSignatures: [
        {
          guardianName: "Cô Út",
          signed: true,
          signedAt: "2026-11-13T14:25:00Z",
        },
        {
          guardianName: "Anh Cả",
          signed: false,
        },
      ],
    },
  ],

  "ws-friends": [
    {
      id: "req-fr1",
      onchainRequestId: 4,
      vaultId: "vault-friends-1",
      vaultName: "Quỹ Đi Phượt Đà Lạt Cuối Năm",
      requesterName: "Hoàng Nam",
      requesterAddress: DEMO_PERSONAS.guardian2.wallet,
      amount: 120,
      exactAmount: "120.000000",
      vault: "SHARED_GOAL",
      reason: "Đặt cọc homestay Đà Lạt cho cả nhóm",
      approvalsCount: 1,
      requiredApprovals: 2,
      status: "PENDING",
      createdAt: "2026-11-14T07:15:00Z",
      guardianSignatures: [
        {
          guardianName: "Tuấn Dũng",
          signed: true,
          signedAt: "2026-11-14T07:30:00Z",
        },
        {
          guardianName: "Bố Ba",
          signed: false,
        },
      ],
    },
  ],

  "ws-community": [
    {
      id: "req-c1",
      onchainRequestId: 5,
      vaultId: "vault-community-1",
      vaultName: "Quỹ Hoạt Động & Sự Kiện CLB",
      requesterName: "Minh Phương (Phó CN)",
      requesterAddress: DEMO_PERSONAS.guardian1.wallet,
      amount: 350,
      exactAmount: "350.000000",
      vault: "SHIELD",
      reason:
        "Duyệt Chi Sự Kiện: Thuê hội trường Workshop Avalanche UniHack (Chờ 2/3 BCN ký)",
      approvalsCount: 1,
      requiredApprovals: 2,
      status: "PENDING",
      createdAt: "2026-11-14T11:00:00Z",
      guardianSignatures: [
        {
          guardianName: "Minh Phương",
          signed: true,
          signedAt: "2026-11-14T11:05:00Z",
        },
        {
          guardianName: "Đức Huy",
          signed: false,
        },
      ],
    },
  ],
};

/**
 * Nhiệm vụ Chore-to-Earn & CLB Bounties theo từng Workspace
 */
export const FALLBACK_CHORES_BY_WORKSPACE: Record<string, ChoreItem[]> = {
  "ws-family": [
    {
      id: "chore-f1",
      vaultId: "vault-family-2",
      vaultName: "Hũ Lì Xì Bé Na",
      title: "Dọn dẹp phòng ngủ & góc học tập ngăn nắp",
      description: "Dọn dẹp bàn học, sắp xếp sách vở và chụp ảnh gửi bố mẹ",
      rewardAmount: 5,
      exactRewardAmount: "5.000000",
      status: "TODO",
      childName: "Bé Na",
      onchainTaskId: 1,
    },
    {
      id: "chore-f2",
      vaultId: "vault-family-2",
      vaultName: "Hũ Lì Xì Bé Na",
      title: "Tưới cây cảnh ban công và lau bàn phòng khách",
      description: "Hoàn thành buổi sáng trước 9h để nhận thưởng",
      rewardAmount: 8,
      exactRewardAmount: "8.000000",
      status: "SUBMITTED",
      childName: "Bé Na",
      proofImageUrl:
        "https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=500",
      onchainTaskId: 2,
    },
    {
      id: "chore-f3",
      vaultId: "vault-family-2",
      vaultName: "Hũ Lì Xì Bé Na",
      title: "Đạt điểm 10 kiểm tra môn Toán",
      description: "Khen thưởng thành tích học tập xuất sắc của Bé Na",
      rewardAmount: 15,
      exactRewardAmount: "15.000000",
      status: "REWARDED",
      childName: "Bé Na",
      onchainTaskId: 3,
    },
  ],

  "ws-siblings": [],
  "ws-friends": [],

  "ws-community": [
    {
      id: "bounty-1",
      vaultId: "vault-community-2",
      vaultName: "Quỹ Thưởng Bounty Thành Viên",
      title: "Thiết kế Banner Workshop Avalanche Team1",
      description:
        "Thiết kế poster tỷ lệ 16:9 và avatar đại diện theo chuẩn nhận diện Kinetix",
      rewardAmount: 15,
      exactRewardAmount: "15.000000",
      status: "SUBMITTED",
      childName: "Lan Anh",
      proofImageUrl:
        "https://images.unsplash.com/photo-1542744094-24638eff58bb?w=500",
      onchainTaskId: 4,
    },
    {
      id: "bounty-2",
      vaultId: "vault-community-2",
      vaultName: "Quỹ Thưởng Bounty Thành Viên",
      title: "Viết bài Recap Workshop lên Fanpage",
      description:
        "Tóm tắt 3 điểm cốt lõi về Avalanche Teleporter ICM và Family L1 0đ gas",
      rewardAmount: 10,
      exactRewardAmount: "10.000000",
      status: "TODO",
      childName: "Lan Anh",
      onchainTaskId: 5,
    },
    {
      id: "bounty-3",
      vaultId: "vault-community-2",
      vaultName: "Quỹ Thưởng Bounty Thành Viên",
      title: "Quay dựng video Highlight sự kiện",
      description: "Video ngắn 60s phỏng vấn người tham dự",
      rewardAmount: 25,
      exactRewardAmount: "25.000000",
      status: "REWARDED",
      childName: "Lan Anh",
      onchainTaskId: 6,
    },
  ],
};

/**
 * Thông báo mẫu theo từng Workspace
 */
export const FALLBACK_NOTIFICATIONS_BY_WORKSPACE: Record<
  string,
  NotificationItem[]
> = {
  "ws-family": [
    {
      id: "notif-f1",
      title: "Yêu cầu ký duyệt viện phí Cụ Ba",
      message:
        "Cụ Ba vừa tạo yêu cầu rút 150 USDC cho viện phí định kỳ. Cần thêm 1 chữ ký bảo hộ.",
      type: "APPROVAL_NEEDED",
      isRead: false,
      createdAt: "2026-11-14T08:35:00Z",
    },
    {
      id: "notif-f2",
      title: "Bé Na đã nộp báo cáo việc nhà",
      message:
        "Bé Na đã gửi ảnh tưới cây ban công và chờ bạn nghiệm thu trao thưởng 8 USDC.",
      type: "TASK_COMPLETED",
      isRead: false,
      createdAt: "2026-11-14T09:15:00Z",
    },
  ],

  "ws-siblings": [
    {
      id: "notif-s1",
      title: "Mở kỳ đóng quỹ Vòng Quay Tương Trợ",
      message:
        "Kỳ 3 đang diễn ra: đóng góp 250 USDC (0đ gas trên Family L1) để tiếp tục quay vòng.",
      type: "APPROVAL_NEEDED",
      isRead: false,
      createdAt: "2026-11-14T07:00:00Z",
    },
  ],

  "ws-friends": [
    {
      id: "notif-fr1",
      title: "Quỹ Đi Phượt Đà Lạt đạt 75% mục tiêu",
      message:
        "Cả nhóm đã tích lũy 750 / 1,000 USDC. Tiền lãi C-Chain tích lũy đạt +12.40 USDC.",
      type: "YIELD_PAYOUT",
      isRead: true,
      createdAt: "2026-11-13T16:00:00Z",
    },
  ],

  "ws-community": [
    {
      id: "notif-c1",
      title: "Ban Chấp Hành: Duyệt Chi Sự Kiện",
      message:
        "Phó CN vừa ký 1/3 cho phiếu chi 350 USDC thuê hội trường. Cần bạn ký tiếp để giải ngân.",
      type: "APPROVAL_NEEDED",
      isRead: false,
      createdAt: "2026-11-14T11:05:00Z",
    },
  ],
};

/**
 * Tìm kiếm dữ liệu fallback thông minh dựa trên workspaceId hoặc workspaceType
 */
export function getFallbackDataForWorkspace(workspaceIdOrType?: string) {
  const normalized = (workspaceIdOrType || "").toLowerCase();

  let matchedKey = "ws-family";
  if (normalized.includes("sibling") || normalized === "ws-siblings") {
    matchedKey = "ws-siblings";
  } else if (normalized.includes("friend") || normalized === "ws-friends") {
    matchedKey = "ws-friends";
  } else if (
    normalized.includes("community") ||
    normalized.includes("clb") ||
    normalized === "ws-community"
  ) {
    matchedKey = "ws-community";
  }

  const workspace =
    FALLBACK_WORKSPACES.find(
      (w) => w.id === workspaceIdOrType || w.id === matchedKey,
    ) || FALLBACK_WORKSPACES[0];

  const members =
    FALLBACK_MEMBERS_BY_WORKSPACE[workspace.id] ||
    FALLBACK_MEMBERS_BY_WORKSPACE[matchedKey] ||
    FALLBACK_MEMBERS_BY_WORKSPACE["ws-family"];

  const vaults =
    FALLBACK_VAULTS_BY_WORKSPACE[workspace.id] ||
    FALLBACK_VAULTS_BY_WORKSPACE[matchedKey] ||
    FALLBACK_VAULTS_BY_WORKSPACE["ws-family"];

  const withdrawals =
    FALLBACK_WITHDRAWALS_BY_WORKSPACE[workspace.id] ||
    FALLBACK_WITHDRAWALS_BY_WORKSPACE[matchedKey] ||
    [];

  const chores =
    FALLBACK_CHORES_BY_WORKSPACE[workspace.id] ||
    FALLBACK_CHORES_BY_WORKSPACE[matchedKey] ||
    [];

  const notifications =
    FALLBACK_NOTIFICATIONS_BY_WORKSPACE[workspace.id] ||
    FALLBACK_NOTIFICATIONS_BY_WORKSPACE[matchedKey] ||
    [];

  return {
    workspace,
    members,
    vaults,
    withdrawals,
    chores,
    notifications,
  };
}
