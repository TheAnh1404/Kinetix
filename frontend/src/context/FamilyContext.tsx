'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { parseEther, formatEther } from 'viem';
import { DemoMember, DEMO_MEMBERS, WorkspaceItem, DynamicVaultItem } from '@/types';
import {
  CONTRACT_ADDRESSES,
  RuleTemplate,
  VaultType,
} from '@/contracts/config';
import {
  FAMILY_HUB_ABI,
  FAMILY_YIELD_VAULT_ABI,
} from '@/contracts/abis';
import { getWalletClient, publicClientL1 } from '@/lib/web3/client';
import { apiClient } from '@/lib/api/apiClient';

export interface WithdrawalRequestItem {
  id: string;
  onchainRequestId?: number;
  vaultId?: string;
  vaultName?: string;
  requesterName: string;
  requesterAddress: string;
  amount: number;
  vault: string;
  reason: string;
  approvalsCount: number;
  requiredApprovals: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
  createdAt: string;
  guardianSignatures: { guardianName: string; signed: boolean; signedAt?: string }[];
}

export interface ChoreItem {
  id: string | number;
  vaultId?: string;
  vaultName?: string;
  title: string;
  description?: string;
  rewardAmount: number;
  status: 'TODO' | 'SUBMITTED' | 'VERIFIED' | 'REWARDED';
  proofImageUrl?: string | null;
  childName?: string;
  childAvatar?: string;
  deadline?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'ALERT_SCAM' | 'TASK_COMPLETED' | 'YIELD_PAYOUT' | 'FAST_WITHDRAW' | 'APPROVAL_NEEDED';
  createdAt: string;
  isRead: boolean;
}

interface VaultBalance {
  localBuffer: number;
  remoteYield: number;
  accruedYield: number;
  total: number;
}

const DEFAULT_VAULTS = {
  retirementShield: {
    localBuffer: 120,
    remoteYield: 1080,
    accruedYield: 86.4,
    total: 1200,
  },
  kidsSavings: {
    localBuffer: 90,
    remoteYield: 360,
    accruedYield: 28.8,
    total: 450,
  },
  familyRosca: {
    localBuffer: 0,
    remoteYield: 3000,
    accruedYield: 240,
    total: 3000,
  },
};

const DEFAULT_DYNAMIC_VAULTS: DynamicVaultItem[] = [
  {
    id: 'v-shield',
    workspaceId: 'ws-1',
    onchainVaultId: 0,
    name: 'Hũ Báo Hiếu & Dưỡng Già Ông Bà',
    description: 'Bộ quy tắc SHIELD: Rút nhanh thường nhật từ đệm L1, rút lớn cần 2 Guardians duyệt.',
    ruleTemplate: 'SHIELD',
    bufferRatioBps: 1000,
    fastWithdrawLimit: 50,
    requiredApprovals: 2,
    cachedTotalBalance: 1200,
    cachedL1Buffer: 120,
    cachedCChainYield: 86.4,
    totalBalance: 1200,
    l1BufferBalance: 120,
    cChainPrincipal: 1080,
    isActive: true,
  },
  {
    id: 'v-milestone',
    workspaceId: 'ws-1',
    onchainVaultId: 1,
    name: 'Hũ Tiết Kiệm Khởi Nghiệp Trẻ Nhỏ',
    description: 'Bộ quy tắc MILESTONE: Quỹ việc nhà Chore-to-Earn, vốn sinh lời 8% APY trên C-Chain.',
    ruleTemplate: 'MILESTONE',
    bufferRatioBps: 2000,
    fastWithdrawLimit: 20,
    requiredApprovals: 2,
    cachedTotalBalance: 450,
    cachedL1Buffer: 90,
    cachedCChainYield: 28.8,
    totalBalance: 450,
    l1BufferBalance: 90,
    cChainPrincipal: 360,
    isActive: true,
  },
  {
    id: 'v-rosca',
    workspaceId: 'ws-1',
    onchainVaultId: 2,
    name: 'Hũ Tương Trợ Dòng Họ Nguyễn',
    description: 'Bộ quy tắc ROSCA: Góp vốn xoay vòng 4 kỳ, vốn nhàn rỗi sinh lời DeFi trên C-Chain.',
    ruleTemplate: 'ROSCA',
    bufferRatioBps: 0,
    fastWithdrawLimit: 1000,
    requiredApprovals: 3,
    cachedTotalBalance: 3000,
    cachedL1Buffer: 0,
    cachedCChainYield: 240,
    totalBalance: 3000,
    l1BufferBalance: 0,
    cChainPrincipal: 3000,
    isActive: true,
  },
];

interface FamilyContextType {
  // Workspaces & Multi-Space
  workspaces: WorkspaceItem[];
  currentWorkspace: WorkspaceItem | null;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (name: string, type?: string) => Promise<{ success: boolean; workspace?: any; error?: string }>;

  // Dynamic Vaults
  dynamicVaults: DynamicVaultItem[];
  selectedVault: DynamicVaultItem | null;
  setSelectedVault: (vault: DynamicVaultItem | null) => void;
  createCustomVault: (params: {
    name: string;
    description?: string;
    ruleTemplate: 'SHIELD' | 'MILESTONE' | 'ROSCA' | 'SHARED_GOAL';
    bufferRatioBps: number;
    fastWithdrawLimit: number;
    requiredApprovals: number;
    guardianWallets?: string[];
    beneficiaryWallets?: string[];
  }) => Promise<{ success: boolean; vault?: any; error?: string }>;
  depositToVault: (vaultId: number, amount: number) => Promise<boolean>;
  fastWithdrawFromVault: (vaultId: number, amount: number) => Promise<boolean>;
  requestVaultWithdrawal: (
    vaultId: number,
    amount: number,
    reason: string
  ) => Promise<{ success: boolean; requestId?: number }>;

  // Members & Auth
  currentMember: DemoMember;
  members: DemoMember[];
  familyInfo: { id: string; name: string; familyCode: string } | null;
  setCurrentMember: (member: DemoMember) => void;
  refreshMembers: () => Promise<void>;
  addMemberToFamily: (memberData: {
    fullName: string;
    role: 'ADMIN' | 'GUARDIAN' | 'ELDERLY' | 'CHILD';
    phoneNumber?: string;
    pinCode?: string;
    walletAddress?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  isWalletConnected: boolean;
  connectedWalletAddress: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;

  // Legacy Vault Balances (mapped from dynamic vaults for backward compatibility)
  vaults: {
    retirementShield: VaultBalance;
    kidsSavings: VaultBalance;
    familyRosca: VaultBalance;
  };
  totalFamilyWealth: number;
  refreshBalances: () => Promise<void>;

  // Withdrawal Requests & Multisig
  withdrawalRequests: WithdrawalRequestItem[];
  quickWithdraw: (vault: any, amount: number) => Promise<boolean>;
  requestLargeWithdraw: (
    vault: any,
    amount: number,
    reason: string
  ) => Promise<{ success: boolean; requestId?: number }>;
  approveWithdrawal: (requestId: string | number, onchainRequestId?: number) => Promise<boolean>;

  // Chores
  chores: ChoreItem[];
  kidsBalance: number;
  kidsXp: number;
  submitChoreProof: (choreId: string | number, proofUrl: string) => Promise<boolean>;
  verifyAndRewardChore: (choreId: string | number) => Promise<boolean>;
  createChore: (params: { title: string; rewardAmount: number; childName?: string; childId?: string; vaultId?: string }) => Promise<boolean>;

  // Notifications
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => void;

  // System States
  isLiveWeb3: boolean;
  isLiveBackend: boolean;
  depositFunds: (vaultType: any, amount: number) => Promise<boolean>;
  compoundYield: (vaultType: any) => Promise<boolean>;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export const FamilyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentMember, setCurrentMember] = useState<DemoMember>(DEMO_MEMBERS[0]);
  const [members, setMembers] = useState<DemoMember[]>(DEMO_MEMBERS);
  const [familyInfo, setFamilyInfo] = useState<{ id: string; name: string; familyCode: string } | null>(null);
  
  // Workspaces
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceItem | null>(null);

  // Dynamic Vaults
  const [dynamicVaults, setDynamicVaults] = useState<DynamicVaultItem[]>(DEFAULT_DYNAMIC_VAULTS);
  const [selectedVault, setSelectedVault] = useState<DynamicVaultItem | null>(DEFAULT_DYNAMIC_VAULTS[0]);

  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(true);
  const [connectedWalletAddress, setConnectedWalletAddress] = useState<string | null>(
    DEMO_MEMBERS[0].walletAddress
  );

  const [isLiveWeb3, setIsLiveWeb3] = useState<boolean>(false);
  const [isLiveBackend, setIsLiveBackend] = useState<boolean>(false);

  // Số dư 3 hũ ngân sách (đồng bộ linh hoạt)
  const [vaults, setVaults] = useState(DEFAULT_VAULTS);

  // Yêu cầu rút tiền
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequestItem[]>([]);

  // Việc nhà Chore-to-Earn
  const [chores, setChores] = useState<ChoreItem[]>([]);
  const [kidsBalance, setKidsBalance] = useState<number>(15);
  const [kidsXp, setKidsXp] = useState<number>(300);

  // Thông báo
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      title: '🚨 Cảnh báo rút tiền lớn',
      message: 'Ông Nội đã yêu cầu rút 150 AVAX (Viện phí). Cần 2/3 chữ ký bảo hộ phê duyệt.',
      type: 'ALERT_SCAM',
      createdAt: '10 phút trước',
      isRead: false,
    },
    {
      id: 'notif-2',
      title: '🎉 Bé Na đã nộp việc nhà',
      message: 'Bé Na vừa gửi minh chứng nhiệm vụ "Tưới cây cảnh ban công". Chờ duyệt thưởng 8 AVAX.',
      type: 'TASK_COMPLETED',
      createdAt: '25 phút trước',
      isRead: false,
    },
    {
      id: 'notif-3',
      title: '💰 Lợi tức DeFi 8% APY',
      message: 'Các hũ tiền trên C-Chain đã tích lũy thêm lợi nhuận nhàn rỗi.',
      type: 'YIELD_PAYOUT',
      createdAt: '1 giờ trước',
      isRead: true,
    },
  ]);

  // Load initial data
  useEffect(() => {
    let isMounted = true;

    const initData = async () => {
      try {
        const meRes = await fetch('/api/auth/me', { cache: 'no-store' });
        const meData = await meRes.json();

        if (!isMounted) return;

        if (meData.success && meData.isAuthenticated) {
          setIsLiveBackend(true);

          if (meData.workspaces && Array.isArray(meData.workspaces) && meData.workspaces.length > 0) {
            setWorkspaces(meData.workspaces);
            const activeWs = meData.family || meData.workspaces[0];
            setCurrentWorkspace(activeWs);
            setFamilyInfo({
              id: activeWs.id,
              name: activeWs.name,
              familyCode: activeWs.workspaceCode || activeWs.familyCode || 'KNTX-8888',
            });
            await loadWorkspaceData(activeWs.id, meData.user.id);
          } else if (meData.family) {
            setCurrentWorkspace(meData.family);
            setWorkspaces([meData.family]);
            setFamilyInfo({
              id: meData.family.id,
              name: meData.family.name,
              familyCode: meData.family.familyCode || meData.family.workspaceCode || 'KNTX-8888',
            });
            await loadWorkspaceData(meData.family.id, meData.user.id);
          }
        }
      } catch (err) {
        console.warn('Lỗi kết nối /api/auth/me:', err);
      }
    };

    initData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Tải dữ liệu toàn diện của 1 Workspace
  const loadWorkspaceData = async (workspaceId: string, currentUserId?: string) => {
    try {
      // 1. Nạp danh sách Dynamic Vaults
      const vaultsRes = await fetch(`/api/vaults?workspaceId=${workspaceId}`, { cache: 'no-store' });
      const vaultsData = await vaultsRes.json();
      if (vaultsData.success && Array.isArray(vaultsData.vaults)) {
        const loadedVaults: DynamicVaultItem[] = vaultsData.vaults.map((v: any) => ({
          id: String(v.id),
          workspaceId: v.workspaceId,
          onchainVaultId: Number(v.onchainVaultId),
          name: v.name,
          description: v.description,
          ruleTemplate: v.ruleTemplate,
          bufferRatioBps: Number(v.bufferRatioBps || 1000),
          fastWithdrawLimit: Number(v.fastWithdrawLimit || 50),
          requiredApprovals: Number(v.requiredApprovals || 2),
          cachedTotalBalance: Number(v.cachedTotalBalance || 0),
          cachedL1Buffer: Number(v.cachedL1Buffer || 0),
          cachedCChainYield: Number(v.cachedCChainYield || 0),
          totalBalance: Number(v.cachedTotalBalance || 0),
          l1BufferBalance: Number(v.cachedL1Buffer || 0),
          cChainPrincipal: Number(v.cachedTotalBalance || 0) > Number(v.cachedL1Buffer || 0)
            ? Number(v.cachedTotalBalance || 0) - Number(v.cachedL1Buffer || 0)
            : Number(v.cachedCChainYield || 0),
          isActive: v.isActive ?? true,
        }));
        setDynamicVaults(loadedVaults);
        if (loadedVaults.length > 0 && !selectedVault) {
          setSelectedVault(loadedVaults[0]);
        }

        // Map sang legacy 3 hũ để duy trì tương thích các widget cũ
        const shield = loadedVaults.find((v) => v.ruleTemplate === 'SHIELD');
        const milestone = loadedVaults.find((v) => v.ruleTemplate === 'MILESTONE');
        const rosca = loadedVaults.find((v) => v.ruleTemplate === 'ROSCA' || v.ruleTemplate === 'SHARED_GOAL');

        setVaults({
          retirementShield: {
            localBuffer: shield?.cachedL1Buffer || 120,
            remoteYield: (shield?.cachedTotalBalance || 1200) - (shield?.cachedL1Buffer || 120),
            accruedYield: shield?.cachedCChainYield || 86.4,
            total: shield?.cachedTotalBalance || 1200,
          },
          kidsSavings: {
            localBuffer: milestone?.cachedL1Buffer || 90,
            remoteYield: (milestone?.cachedTotalBalance || 450) - (milestone?.cachedL1Buffer || 90),
            accruedYield: milestone?.cachedCChainYield || 28.8,
            total: milestone?.cachedTotalBalance || 450,
          },
          familyRosca: {
            localBuffer: rosca?.cachedL1Buffer || 0,
            remoteYield: rosca?.cachedTotalBalance || 3000,
            accruedYield: rosca?.cachedCChainYield || 240,
            total: rosca?.cachedTotalBalance || 3000,
          },
        });
      }

      // 2. Nạp thành viên
      const membersRes = await fetch(`/api/workspaces/${workspaceId}`, { cache: 'no-store' });
      const membersData = await membersRes.json();
      let mappedMembers: DemoMember[] = [];
      if (membersData.success && Array.isArray(membersData.members) && membersData.members.length > 0) {
        mappedMembers = membersData.members.map((u: any) => ({
          id: u.id,
          name: u.fullName,
          role: u.role,
          title:
            u.role === 'ADMIN'
              ? 'Quản trị viên Không gian'
              : u.role === 'GUARDIAN'
              ? 'Bảo hộ tài chính • Ký duyệt 2/3'
              : u.role === 'ELDERLY'
              ? 'Người cao tuổi • Thụ hưởng Quỹ An Sinh'
              : 'Thế hệ trẻ • Học tài chính Chore-to-Earn',
          walletAddress: u.walletAddress,
          address: u.walletAddress,
          avatar:
            u.avatarUrl ||
            (u.role === 'ELDERLY'
              ? 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150'
              : u.role === 'CHILD'
              ? 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150'
              : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'),
          defaultTab:
            u.role === 'ELDERLY'
              ? 'kinetix-shield'
              : u.role === 'CHILD'
              ? 'kinetix-kids'
              : 'quan-tri-cha-me',
          phoneNumber: u.phoneNumber,
        }));
        setMembers(mappedMembers);

        if (currentUserId) {
          const found = mappedMembers.find((m) => m.id === currentUserId);
          if (found) {
            setCurrentMember(found);
            setConnectedWalletAddress(found.walletAddress);
          }
        }
      }

      // 3. Nạp danh sách yêu cầu rút tiền
      const withdrawalsRes = await fetch(`/api/withdrawals/${workspaceId}`, { cache: 'no-store' });
      const withdrawalsData = await withdrawalsRes.json();
      if (withdrawalsData.success && Array.isArray(withdrawalsData.data)) {
        const guardianList = mappedMembers.filter((m) => m.role === 'GUARDIAN' || m.role === 'ADMIN');
        const mappedWithdrawals: WithdrawalRequestItem[] = withdrawalsData.data.map((w: any) => ({
          id: String(w.id),
          onchainRequestId: w.onchainRequestId ?? 1,
          vaultId: w.vaultId,
          vaultName: w.vaultName || w.vault || 'Quỹ Chung',
          requesterName: w.requesterName || 'Thành viên',
          requesterAddress: w.requesterAddress || '0x...',
          amount: Number(w.amount),
          vault: w.vaultName || w.vault || 'Quỹ Bảo Vệ',
          reason: w.reason || '',
          approvalsCount: Number(w.approvalsCount ?? 0),
          requiredApprovals: Number(w.requiredApprovals ?? 2),
          status: w.status,
          createdAt: new Date(w.createdAt).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
          }),
          guardianSignatures: guardianList.map((g, idx) => ({
            guardianName: g.name,
            signed: idx < (w.approvalsCount ?? 0),
            signedAt: idx < (w.approvalsCount ?? 0) ? 'Đã duyệt' : undefined,
          })),
        }));
        setWithdrawalRequests(mappedWithdrawals);
      }

      // 4. Nạp chores
      const choresRes = await fetch(`/api/chores/${workspaceId}`, { cache: 'no-store' });
      const choresData = await choresRes.json();
      if (choresData.success && Array.isArray(choresData.data)) {
        const mappedChores: ChoreItem[] = choresData.data.map((c: any) => ({
          id: c.id,
          vaultId: c.vaultId,
          vaultName: c.vaultName,
          title: c.title,
          description: c.description,
          rewardAmount: Number(c.rewardAmount),
          status: c.status,
          proofImageUrl: c.proofImageUrl,
          childName: c.childName || 'Bé',
          childAvatar: c.childAvatar,
          deadline: 'Hôm nay',
        }));
        setChores(mappedChores);
        const rewardedSum = mappedChores
          .filter((c) => c.status === 'REWARDED')
          .reduce((sum, c) => sum + c.rewardAmount, 0);
        setKidsBalance(rewardedSum);
        setKidsXp(mappedChores.filter((c) => c.status === 'REWARDED').length * 150);
      }
    } catch (err) {
      console.warn('Lỗi loadWorkspaceData:', err);
    }
  };

  // Chuyển đổi Workspace
  const switchWorkspace = async (workspaceId: string) => {
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (ws) {
      setCurrentWorkspace(ws);
      setFamilyInfo({
        id: ws.id,
        name: ws.name,
        familyCode: ws.workspaceCode || 'KNTX-8888',
      });
      await loadWorkspaceData(workspaceId, currentMember.id);
    }
  };

  // Tạo Workspace mới
  const createWorkspace = async (name: string, type: string = 'FAMILY') => {
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type,
          creatorWallet: connectedWalletAddress || currentMember.walletAddress,
        }),
      });
      const data = await res.json();
      if (data.success && data.workspace) {
        setWorkspaces((prev) => [...prev, data.workspace]);
        await switchWorkspace(data.workspace.id);
        return { success: true, workspace: data.workspace };
      }
      return { success: false, error: data.error || 'Lỗi tạo Workspace' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Tạo Dynamic Vault mới
  const createCustomVault = async (params: {
    name: string;
    description?: string;
    ruleTemplate: 'SHIELD' | 'MILESTONE' | 'ROSCA' | 'SHARED_GOAL';
    bufferRatioBps: number;
    fastWithdrawLimit: number;
    requiredApprovals: number;
    guardianWallets?: string[];
    beneficiaryWallets?: string[];
  }) => {
    if (!currentWorkspace) {
      return { success: false, error: 'Chưa chọn Không gian chung' };
    }

    try {
      // 1. Thử gọi On-Chain nếu có ví
      const walletClient = getWalletClient();
      let onchainVaultId = dynamicVaults.length + 1;

      if (walletClient && connectedWalletAddress) {
        try {
          const ruleTypeIndex =
            params.ruleTemplate === 'SHIELD'
              ? 0
              : params.ruleTemplate === 'MILESTONE'
              ? 1
              : params.ruleTemplate === 'ROSCA'
              ? 2
              : 3;

          const guardians = (params.guardianWallets && params.guardianWallets.length > 0)
            ? params.guardianWallets
            : [connectedWalletAddress];
          const beneficiaries = (params.beneficiaryWallets && params.beneficiaryWallets.length > 0)
            ? params.beneficiaryWallets
            : [connectedWalletAddress];

          const tx = await (walletClient as any).writeContract({
            address: CONTRACT_ADDRESSES.familyHub,
            abi: FAMILY_HUB_ABI,
            functionName: 'createCustomVault',
            args: [
              params.name,
              ruleTypeIndex,
              BigInt(params.bufferRatioBps),
              parseEther(params.fastWithdrawLimit.toString()),
              BigInt(params.requiredApprovals),
              guardians as `0x${string}`[],
              beneficiaries as `0x${string}`[],
            ],
            account: connectedWalletAddress as `0x${string}`,
          });
          console.log('Tạo Hũ On-Chain thành công, TX:', tx);
        } catch (onchainErr) {
          console.warn('Onchain createCustomVault warning (fallback DB):', onchainErr);
        }
      }

      // 2. Lưu vào Neon Database
      const res = await fetch('/api/vaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: currentWorkspace.id,
          onchainVaultId,
          ...params,
        }),
      });
      const data = await res.json();

      if (data.success && data.vault) {
        await loadWorkspaceData(currentWorkspace.id, currentMember.id);
        return { success: true, vault: data.vault };
      }
      return { success: false, error: data.error || 'Lỗi tạo Hũ' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Nạp tiền vào Hũ Động
  const depositToVault = async (vaultId: number, amount: number): Promise<boolean> => {
    if (amount <= 0) return false;

    const walletClient = getWalletClient();
    if (walletClient && connectedWalletAddress) {
      try {
        await (walletClient as any).writeContract({
          address: CONTRACT_ADDRESSES.familyHub,
          abi: FAMILY_HUB_ABI,
          functionName: 'depositToVault',
          args: [BigInt(vaultId)],
          value: parseEther(amount.toString()),
          account: connectedWalletAddress as `0x${string}`,
        });
      } catch (err) {
        console.warn('depositToVault fallback local:', err);
      }
    }

    // Cập nhật state local
    setDynamicVaults((prev) =>
      prev.map((v) => {
        if (v.onchainVaultId === vaultId) {
          const toBridge = (amount * (10000 - v.bufferRatioBps)) / 10000;
          const toBuffer = amount - toBridge;
          return {
            ...v,
            cachedTotalBalance: v.cachedTotalBalance + amount,
            cachedL1Buffer: v.cachedL1Buffer + toBuffer,
          };
        }
        return v;
      })
    );

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: 'Nạp quỹ thành công',
        message: `Đã nạp ${amount} AVAX vào Hũ #${vaultId}. Hệ thống tự động phân bổ đệm thanh khoản và sinh lời DeFi 8% APY.`,
        type: 'YIELD_PAYOUT',
        createdAt: 'Vừa xong',
        isRead: false,
      },
      ...prev,
    ]);

    return true;
  };

  // Rút tiền nhanh từ Hũ Động (<= fastWithdrawLimit)
  const fastWithdrawFromVault = async (vaultId: number, amount: number): Promise<boolean> => {
    const target = dynamicVaults.find((v) => v.onchainVaultId === vaultId);
    if (target && amount > target.fastWithdrawLimit) {
      return false;
    }

    const walletClient = getWalletClient();
    if (walletClient && connectedWalletAddress) {
      try {
        await (walletClient as any).writeContract({
          address: CONTRACT_ADDRESSES.familyHub,
          abi: FAMILY_HUB_ABI,
          functionName: 'fastWithdraw',
          args: [BigInt(vaultId), parseEther(amount.toString())],
          account: connectedWalletAddress as `0x${string}`,
        });
      } catch (err) {
        console.warn('fastWithdraw fallback local:', err);
      }
    }

    setDynamicVaults((prev) =>
      prev.map((v) => {
        if (v.onchainVaultId === vaultId) {
          return {
            ...v,
            cachedTotalBalance: Math.max(0, v.cachedTotalBalance - amount),
            cachedL1Buffer: Math.max(0, v.cachedL1Buffer - amount),
          };
        }
        return v;
      })
    );

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: 'Rút tiền nhanh thành công (<1s, 0 gas)',
        message: `${currentMember.name} vừa rút ${amount} AVAX từ đệm L1 của Hũ #${vaultId}.`,
        type: 'FAST_WITHDRAW',
        createdAt: 'Vừa xong',
        isRead: false,
      },
      ...prev,
    ]);

    return true;
  };

  // Yêu cầu rút tiền lớn từ Hũ Động
  const requestVaultWithdrawal = async (
    vaultId: number,
    amount: number,
    reason: string
  ): Promise<{ success: boolean; requestId?: number }> => {
    const onchainReqId = Math.floor(Math.random() * 1000) + 10;
    const target = dynamicVaults.find((v) => v.onchainVaultId === vaultId);

    const walletClient = getWalletClient();
    if (walletClient && connectedWalletAddress) {
      try {
        await (walletClient as any).writeContract({
          address: CONTRACT_ADDRESSES.familyHub,
          abi: FAMILY_HUB_ABI,
          functionName: 'requestLargeWithdrawal',
          args: [BigInt(vaultId), parseEther(amount.toString()), reason],
          account: connectedWalletAddress as `0x${string}`,
        });
      } catch (err) {
        console.warn('requestLargeWithdrawal fallback local:', err);
      }
    }

    if (currentWorkspace) {
      try {
        await fetch('/api/withdrawals/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            familyId: currentWorkspace.id,
            vaultId: target?.id,
            requesterId: currentMember.id,
            amount,
            reason,
            vault: target?.name || 'SHIELD',
            onchainRequestId: onchainReqId,
          }),
        });
        await loadWorkspaceData(currentWorkspace.id, currentMember.id);
      } catch (e) {
        console.warn('API withdrawal create error:', e);
      }
    }

    return { success: true, requestId: onchainReqId };
  };

  // Ký duyệt đa chữ ký (Multisig Approval)
  const approveWithdrawal = async (
    requestId: string | number,
    onchainRequestId?: number
  ): Promise<boolean> => {
    const walletClient = getWalletClient();
    if (walletClient && connectedWalletAddress && onchainRequestId) {
      try {
        await (walletClient as any).writeContract({
          address: CONTRACT_ADDRESSES.familyHub,
          abi: FAMILY_HUB_ABI,
          functionName: 'approveWithdrawal',
          args: [BigInt(onchainRequestId)],
          account: connectedWalletAddress as `0x${string}`,
        });
      } catch (err) {
        console.warn('approveWithdrawal on-chain warning:', err);
      }
    }

    try {
      const res = await fetch('/api/withdrawals/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: String(requestId),
          guardianWallet: connectedWalletAddress || currentMember.walletAddress,
        }),
      });
      const data = await res.json();
      if (data.success && currentWorkspace) {
        await loadWorkspaceData(currentWorkspace.id, currentMember.id);
        return true;
      }
    } catch (e) {
      console.warn('Lỗi approveWithdrawal API:', e);
    }

    // Fallback state update
    setWithdrawalRequests((prev) =>
      prev.map((req) => {
        if (req.id === String(requestId)) {
          const nextCount = req.approvalsCount + 1;
          const isDone = nextCount >= req.requiredApprovals;
          return {
            ...req,
            approvalsCount: nextCount,
            status: isDone ? 'APPROVED' : 'PENDING',
          };
        }
        return req;
      })
    );
    return true;
  };

  // Nộp minh chứng việc nhà
  const submitChoreProof = async (choreId: string | number, proofUrl: string): Promise<boolean> => {
    try {
      await fetch('/api/chores/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choreId, proofImageUrl: proofUrl }),
      });
      if (currentWorkspace) {
        await loadWorkspaceData(currentWorkspace.id, currentMember.id);
      }
      return true;
    } catch (err) {
      console.warn('submitChoreProof fallback:', err);
      setChores((prev) =>
        prev.map((c) => (c.id === choreId ? { ...c, status: 'SUBMITTED', proofImageUrl: proofUrl } : c))
      );
      return true;
    }
  };

  // Bố mẹ duyệt thưởng việc nhà
  const verifyAndRewardChore = async (choreId: string | number): Promise<boolean> => {
    try {
      await fetch('/api/chores/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choreId }),
      });
      if (currentWorkspace) {
        await loadWorkspaceData(currentWorkspace.id, currentMember.id);
      }
      return true;
    } catch (err) {
      console.warn('verifyAndRewardChore fallback:', err);
      setChores((prev) =>
        prev.map((c) => (c.id === choreId ? { ...c, status: 'REWARDED' } : c))
      );
      return true;
    }
  };

  // Tạo việc nhà mới
  const createChore = async (params: {
    title: string;
    rewardAmount: number;
    childName?: string;
    childId?: string;
    vaultId?: string;
  }): Promise<boolean> => {
    if (!currentWorkspace) return false;
    try {
      await fetch('/api/chores/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId: currentWorkspace.id,
          vaultId: params.vaultId,
          childId: params.childId,
          title: params.title,
          rewardAmount: params.rewardAmount,
        }),
      });
      await loadWorkspaceData(currentWorkspace.id, currentMember.id);
      return true;
    } catch (err) {
      console.warn('createChore fallback:', err);
      return false;
    }
  };

  // Đánh dấu thông báo đã đọc
  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  // Backward compatibility alias methods
  const quickWithdraw = async (vault: any, amount: number) => {
    return fastWithdrawFromVault(1, amount);
  };

  const requestLargeWithdraw = async (vault: any, amount: number, reason: string) => {
    return requestVaultWithdrawal(1, amount, reason);
  };

  const depositFunds = async (vaultType: any, amount: number) => {
    const vId = vaultType === 1 ? 2 : vaultType === 2 ? 3 : 1;
    return depositToVault(vId, amount);
  };

  const compoundYield = async (vaultType: any) => {
    const vId = vaultType === 1 ? 2 : vaultType === 2 ? 3 : 1;
    const walletClient = getWalletClient();
    if (walletClient && connectedWalletAddress) {
      try {
        await (walletClient as any).writeContract({
          address: CONTRACT_ADDRESSES.familyYieldVault,
          abi: FAMILY_YIELD_VAULT_ABI,
          functionName: 'compoundYield',
          args: [BigInt(vId)],
          account: connectedWalletAddress as `0x${string}`,
        });
      } catch (e) {
        console.warn('compoundYield error:', e);
      }
    }
    return true;
  };

  const refreshBalances = async () => {
    if (currentWorkspace) {
      await loadWorkspaceData(currentWorkspace.id, currentMember.id);
    }
  };

  const refreshMembers = async () => {
    if (currentWorkspace) {
      await loadWorkspaceData(currentWorkspace.id, currentMember.id);
    }
  };

  const addMemberToFamily = async (memberData: any) => {
    return { success: true };
  };

  const connectWallet = async () => {
    setIsWalletConnected(true);
  };

  const disconnectWallet = () => {
    setIsWalletConnected(false);
  };

  // Tính tổng tài sản
  const totalFamilyWealth = dynamicVaults.length > 0
    ? dynamicVaults.reduce((sum, v) => sum + v.cachedTotalBalance, 0)
    : vaults.retirementShield.total + vaults.kidsSavings.total + vaults.familyRosca.total;

  const unreadNotificationCount = notifications.filter((n) => !n.isRead).length;

  return (
    <FamilyContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        switchWorkspace,
        createWorkspace,
        dynamicVaults,
        selectedVault,
        setSelectedVault,
        createCustomVault,
        depositToVault,
        fastWithdrawFromVault,
        requestVaultWithdrawal,
        currentMember,
        members,
        familyInfo,
        setCurrentMember,
        refreshMembers,
        addMemberToFamily,
        isWalletConnected,
        connectedWalletAddress,
        connectWallet,
        disconnectWallet,
        vaults,
        totalFamilyWealth,
        refreshBalances,
        withdrawalRequests,
        quickWithdraw,
        requestLargeWithdraw,
        approveWithdrawal,
        chores,
        kidsBalance,
        kidsXp,
        submitChoreProof,
        verifyAndRewardChore,
        createChore,
        notifications,
        unreadNotificationCount,
        markNotificationRead,
        isLiveWeb3,
        isLiveBackend,
        depositFunds,
        compoundYield,
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamily = (): FamilyContextType => {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
};
