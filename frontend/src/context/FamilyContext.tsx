'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { parseEther, formatEther } from 'viem';
import { DemoMember, DEMO_MEMBERS } from '@/types';
import {
  CONTRACT_ADDRESSES,
  VaultType,
} from '@/contracts/config';
import {
  FAMILY_HUB_ABI,
} from '@/contracts/abis';
import { getWalletClient, publicClientL1 } from '@/lib/web3/client';
import { apiClient } from '@/lib/api/apiClient';

export interface WithdrawalRequestItem {
  id: string;
  onchainRequestId?: number;
  requesterName: string;
  requesterAddress: string;
  amount: number;
  vault: 'Retirement Shield' | 'Kids Savings' | 'Family ROSCA';
  reason: string;
  approvalsCount: number;
  requiredApprovals: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
  createdAt: string;
  guardianSignatures: { guardianName: string; signed: boolean; signedAt?: string }[];
}

export interface ChoreItem {
  id: string | number;
  title: string;
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
  type: 'ALERT_SCAM' | 'TASK_COMPLETED' | 'YIELD_PAYOUT' | 'FAST_WITHDRAW';
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
    localBuffer: 0,
    remoteYield: 0,
    accruedYield: 0,
    total: 0,
  },
  kidsSavings: {
    localBuffer: 0,
    remoteYield: 0,
    accruedYield: 0,
    total: 0,
  },
  familyRosca: {
    localBuffer: 0,
    remoteYield: 0,
    accruedYield: 0,
    total: 0,
  },
};

interface FamilyContextType {
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

  // Vault Balances
  vaults: {
    retirementShield: VaultBalance;
    kidsSavings: VaultBalance;
    familyRosca: VaultBalance;
  };
  totalFamilyWealth: number;
  refreshBalances: () => Promise<void>;

  // Withdrawal Requests & Multisig
  withdrawalRequests: WithdrawalRequestItem[];
  quickWithdraw: (vault: VaultType, amount: number) => Promise<boolean>;
  requestLargeWithdraw: (
    vault: VaultType,
    amount: number,
    reason: string
  ) => Promise<{ success: boolean; requestId?: number }>;
  approveWithdrawal: (requestId: string | number) => Promise<boolean>;

  // Chores
  chores: ChoreItem[];
  kidsBalance: number;
  kidsXp: number;
  submitChoreProof: (choreId: string | number, proofUrl: string) => Promise<boolean>;
  verifyAndRewardChore: (choreId: string | number) => Promise<boolean>;
  createChore: (params: { title: string; rewardAmount: number; childName?: string; childId?: string }) => Promise<boolean>;

  // Notifications
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => void;

  // System States
  isLiveWeb3: boolean;
  isLiveBackend: boolean;
  depositFunds: (vaultType: VaultType, amount: number) => Promise<boolean>;
  compoundYield: (vaultType: VaultType) => Promise<boolean>;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export const FamilyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentMember, setCurrentMember] = useState<DemoMember>(DEMO_MEMBERS[0]);
  const [members, setMembers] = useState<DemoMember[]>(DEMO_MEMBERS);
  const [familyInfo, setFamilyInfo] = useState<{ id: string; name: string; familyCode: string } | null>(null);
  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(true);
  const [connectedWalletAddress, setConnectedWalletAddress] = useState<string | null>(
    DEMO_MEMBERS[0].walletAddress
  );

  const [isLiveWeb3, setIsLiveWeb3] = useState<boolean>(false);
  const [isLiveBackend, setIsLiveBackend] = useState<boolean>(false);

  // Số dư 3 hũ ngân sách (Khởi tạo mặc định 0, đồng bộ theo familyId)
  const [vaults, setVaults] = useState(DEFAULT_VAULTS);

  // Danh sách yêu cầu rút tiền lớn (Khởi tạo rỗng, nạp từ Neon PostgreSQL)
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequestItem[]>([]);

  // Danh sách việc nhà (Khởi tạo rỗng, nạp từ Neon PostgreSQL)
  const [chores, setChores] = useState<ChoreItem[]>([]);
  const [kidsBalance, setKidsBalance] = useState<number>(0);
  const [kidsXp, setKidsXp] = useState<number>(0);

  // Hộp thư thông báo (Khởi tạo rỗng, nạp từ Neon PostgreSQL)
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Helper cập nhật vaults và lưu trữ theo familyId vào localStorage
  const updateAndPersistVaults = (
    updater: (prev: typeof DEFAULT_VAULTS) => typeof DEFAULT_VAULTS,
    famId?: string
  ) => {
    setVaults((prev) => {
      const next = updater(prev);
      const targetFamilyId = famId || familyInfo?.id;
      if (targetFamilyId && typeof window !== 'undefined') {
        try {
          localStorage.setItem(`kinetix_vaults_${targetFamilyId}`, JSON.stringify(next));
        } catch (e) {
          console.warn('Lỗi lưu vaults vào localStorage:', e);
        }
      }
      return next;
    });
  };

  // Đồng bộ phiên đăng nhập & nạp dữ liệu thực tế 100% từ Neon PostgreSQL
  const refreshMembers = async () => {
    try {
      const meRes = await fetch('/api/auth/me', { cache: 'no-store' });
      const meData = await meRes.json();
      if (meData.success && meData.user && meData.family) {
        const fam = {
          id: meData.family.id,
          name: meData.family.name,
          familyCode: meData.family.familyCode,
        };
        setFamilyInfo(fam);

        // Nạp số dư vaults đã lưu của gia đình
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem(`kinetix_vaults_${meData.family.id}`);
          if (cached) {
            try {
              setVaults(JSON.parse(cached));
            } catch {
              setVaults(DEFAULT_VAULTS);
            }
          } else {
            setVaults(DEFAULT_VAULTS);
          }
        }

        // 1. Nạp danh sách thành viên trong gia đình từ PostgreSQL
        const membersRes = await fetch(`/api/families/${meData.family.id}/members`, {
          cache: 'no-store',
        });
        const membersData = await membersRes.json();
        let mappedMembers: DemoMember[] = [];
        if (membersData.success && Array.isArray(membersData.members) && membersData.members.length > 0) {
          mappedMembers = membersData.members.map((u: any) => ({
            id: u.id,
            name: u.fullName,
            role: u.role,
            title:
              u.role === 'ADMIN'
                ? 'Người quản trị gia đình • Ví Core'
                : u.role === 'GUARDIAN'
                ? 'Người bảo hộ • Ký duyệt 2/3'
                : u.role === 'ELDERLY'
                ? 'Thế hệ 1 • Thụ hưởng Kinetix Shield'
                : 'Thế hệ 3 • Kinetix Kids Heo Đất',
            walletAddress: u.walletAddress,
            address: u.walletAddress,
            avatar:
              u.avatarUrl ||
              (u.role === 'ELDERLY'
                ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuB9RXFgUn83eP41jg2weE3YA8vd83fsVimUf5y0OcZS7SOQ3XPOzG_gbODV_xJIXeRQye9NHAh2TXP_28Oz-bPHhWTfscJFCZWXYRXq2gQAAtwAVTc1yseRsDx3GBa94HVhTHAal40UzoVwN7YY1IXQ5EmMOe0WhhEvzu4V7ZNBtixA0ZiaR61Ad1UJUADoRuNzug0ggIZW8eO5XEiktIZD-zCJ4THMAqG0i7Z1ivkCGPnUrjsBJg'
                : u.role === 'CHILD'
                ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuAc1UhNj0E3eKWwrEAv9WJ4KTtp_4pnR4-fyhwEHSKncOxXMGgdr5EdEkF7AMpuaguOYSWTwC-3Ovp1jhOZtflnABlKorh-7E9pPfvKLow6TvFQHGxmf0EgQh_J7eX2WyhgY_obtzgCtT892o3CCd1-TKpF3WABb42fGzxm4wVTK6S7fWG0bKJKRZGbEsWybndKRK3uK6Aix2ehMS1hOr8zRyDG3ZRA0ODbqcIHWiDv1p2ayRMtyQ'
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

          const currentLoggedIn = mappedMembers.find((m) => m.id === meData.user.id);
          if (currentLoggedIn) {
            setCurrentMember(currentLoggedIn);
            setConnectedWalletAddress(currentLoggedIn.walletAddress);
          }
        }

        // 2. Nạp danh sách yêu cầu rút tiền từ PostgreSQL
        try {
          const withdrawalsRes = await fetch(`/api/withdrawals/${meData.family.id}`, {
            cache: 'no-store',
          });
          const withdrawalsData = await withdrawalsRes.json();
          if (withdrawalsData.success && Array.isArray(withdrawalsData.data)) {
            const guardianList = mappedMembers.filter(
              (m) => m.role === 'GUARDIAN' || m.role === 'ADMIN'
            );
            const mappedWithdrawals: WithdrawalRequestItem[] = withdrawalsData.data.map((w: any) => {
              const sigs = guardianList.map((g, idx) => ({
                guardianName: g.name,
                signed: idx < (w.approvalsCount ?? 0),
                signedAt: idx < (w.approvalsCount ?? 0) ? 'Đã ký duyệt' : undefined,
              }));
              return {
                id: String(w.id),
                onchainRequestId: w.onchainRequestId ?? 1,
                requesterName: w.requesterName || 'Thành viên gia đình',
                requesterAddress: w.requesterAddress || '0x...',
                amount: Number(w.amount),
                vault:
                  w.vault === 'KidsSavings'
                    ? 'Kids Savings'
                    : w.vault === 'FamilyROSCA'
                    ? 'Family ROSCA'
                    : 'Retirement Shield',
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
                guardianSignatures: sigs,
              };
            });
            setWithdrawalRequests(mappedWithdrawals);
          }
        } catch (wErr) {
          console.warn('Lỗi nạp withdrawals:', wErr);
        }

        // 3. Nạp danh sách việc nhà từ PostgreSQL
        try {
          const choresRes = await fetch(`/api/chores/${meData.family.id}`, {
            cache: 'no-store',
          });
          const choresData = await choresRes.json();
          if (choresData.success && Array.isArray(choresData.data)) {
            const mappedChores: ChoreItem[] = choresData.data.map((c: any) => ({
              id: c.id,
              title: c.title,
              rewardAmount: Number(c.rewardAmount),
              status: c.status,
              proofImageUrl: c.proofImageUrl,
              childName: c.childName || 'Bé',
              childAvatar: c.childAvatar,
              deadline: 'Hôm nay',
            }));
            setChores(mappedChores);
            const totalRewarded = mappedChores
              .filter((c) => c.status === 'REWARDED')
              .reduce((sum, c) => sum + c.rewardAmount, 0);
            setKidsBalance(totalRewarded);
            setKidsXp(mappedChores.filter((c) => c.status === 'REWARDED').length * 150);
          }
        } catch (cErr) {
          console.warn('Lỗi nạp chores:', cErr);
        }

        // 4. Nạp danh sách thông báo từ PostgreSQL
        try {
          const notifsRes = await fetch(`/api/notifications/${meData.user.id}`, {
            cache: 'no-store',
          });
          const notifsData = await notifsRes.json();
          if (notifsData.success && Array.isArray(notifsData.data)) {
            const mappedNotifs: NotificationItem[] = notifsData.data.map((n: any) => ({
              id: String(n.id),
              title: n.title,
              message: n.message,
              type: n.type,
              createdAt: new Date(n.createdAt).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              }),
              isRead: n.isRead,
            }));
            setNotifications(mappedNotifs);
          }
        } catch (nErr) {
          console.warn('Lỗi nạp notifications:', nErr);
        }
      }
    } catch (err) {
      console.warn('Lỗi nạp danh sách thành viên thực tế:', err);
    }
  };

  // Thêm thành viên mới vào gia đình lưu trực tiếp vào PostgreSQL
  const addMemberToFamily = async (memberData: {
    fullName: string;
    role: 'ADMIN' | 'GUARDIAN' | 'ELDERLY' | 'CHILD';
    phoneNumber?: string;
    pinCode?: string;
    walletAddress?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!familyInfo?.id) {
      return { success: false, error: 'Không tìm thấy ID gia đình' };
    }

    try {
      const res = await fetch(`/api/families/${familyInfo.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberData),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Thêm thành viên thất bại' };
      }

      await refreshMembers();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi thêm thành viên' };
    }
  };

  // Kiểm tra kết nối Web3 & Backend & nạp dữ liệu gia đình khi load
  useEffect(() => {
    async function checkConnectivity() {
      // 1. Kiểm tra Web3 L1 RPC
      try {
        const blockNumber = await publicClientL1.getBlockNumber();
        if (blockNumber >= BigInt(0)) {
          setIsLiveWeb3(true);
        }
      } catch (e) {
        setIsLiveWeb3(false);
      }

      // 2. Kiểm tra Backend & API
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          setIsLiveBackend(true);
        }
      } catch (e) {
        setIsLiveBackend(false);
      }

      // 3. Nạp dữ liệu thành viên và các bản ghi từ DB
      await refreshMembers();
    }
    checkConnectivity();
  }, []);

  // Tổng tài sản gia đình
  const totalFamilyWealth =
    vaults.retirementShield.total + vaults.kidsSavings.total + vaults.familyRosca.total;

  const refreshBalances = async () => {
    if (isLiveWeb3) {
      try {
        const res = (await publicClientL1.readContract({
          address: CONTRACT_ADDRESSES.familyHub,
          abi: FAMILY_HUB_ABI,
          functionName: 'getVaultOverview',
          args: [0], // RetirementShield
        })) as [bigint, bigint, bigint];

        const local = parseFloat(formatEther(res[0]));
        const remote = parseFloat(formatEther(res[1]));
        const total = parseFloat(formatEther(res[2]));

        updateAndPersistVaults((prev) => ({
          ...prev,
          retirementShield: {
            ...prev.retirementShield,
            localBuffer: local,
            remoteYield: remote,
            total: total,
          },
        }));
      } catch (err) {
        console.warn('Lỗi đọc số dư contract:', err);
      }
    }
  };

  // 1. Nạp tiền vào quỹ (10/90 Liquidity Buffer)
  const depositFunds = async (vaultType: VaultType, amount: number): Promise<boolean> => {
    const toBuffer = amount * 0.1;
    const toBridge = amount * 0.9;

    const walletClient = getWalletClient();
    if (walletClient && connectedWalletAddress) {
      try {
        const txHash = await (walletClient as any).writeContract({
          address: CONTRACT_ADDRESSES.familyHub,
          abi: FAMILY_HUB_ABI,
          functionName: 'depositToVault',
          args: [vaultType],
          value: parseEther(amount.toString()),
          account: connectedWalletAddress as `0x${string}`,
        });
        console.log('Deposit tx hash:', txHash);
      } catch (err) {
        console.warn('Không thể gửi tx on-chain (fallback local):', err);
      }
    }

    // Cập nhật state UI & lưu trữ persistent
    const targetKey =
      vaultType === VaultType.RetirementShield
        ? 'retirementShield'
        : vaultType === VaultType.KidsSavings
        ? 'kidsSavings'
        : 'familyRosca';

    updateAndPersistVaults((prev) => {
      const currentVault = prev[targetKey];
      return {
        ...prev,
        [targetKey]: {
          ...currentVault,
          localBuffer: currentVault.localBuffer + toBuffer,
          remoteYield: currentVault.remoteYield + toBridge,
          total: currentVault.total + amount,
        },
      };
    });

    // Thêm thông báo
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: 'Nạp quỹ gia đình thành công',
        message: `Đã nạp ${amount} USDC: 10% (${toBuffer} USDC) vào đệm L1 và 90% (${toBridge} USDC) sinh lời C-Chain.`,
        type: 'YIELD_PAYOUT',
        createdAt: 'Vừa xong',
        isRead: false,
      },
      ...prev,
    ]);

    return true;
  };

  // 2. Rút tiền nhanh dành cho Ông Bà (<= 50 USDC, 1-tap, 0 gas)
  const quickWithdraw = async (vault: VaultType, amount: number): Promise<boolean> => {
    if (amount > 50) return false;

    const walletClient = getWalletClient();
    if (walletClient && connectedWalletAddress) {
      try {
        await (walletClient as any).writeContract({
          address: CONTRACT_ADDRESSES.familyHub,
          abi: FAMILY_HUB_ABI,
          functionName: 'fastWithdraw',
          args: [vault, parseEther(amount.toString()), connectedWalletAddress as `0x${string}`],
          account: connectedWalletAddress as `0x${string}`,
        });
      } catch (err) {
        console.warn('Fast withdraw fallback local:', err);
      }
    }

    updateAndPersistVaults((prev) => ({
      ...prev,
      retirementShield: {
        ...prev.retirementShield,
        localBuffer: Math.max(0, prev.retirementShield.localBuffer - amount),
        total: Math.max(0, prev.retirementShield.total - amount),
      },
    }));

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: 'Rút tiền nhanh thành công',
        message: `${currentMember.name} đã rút ${amount} USDC từ bộ đệm L1 (Thời gian: <1s, Phí gas: 0đ).`,
        type: 'FAST_WITHDRAW',
        createdAt: 'Vừa xong',
        isRead: false,
      },
      ...prev,
    ]);

    return true;
  };

  // 3. Khởi tạo yêu cầu rút tiền lớn (> 50 USDC)
  const requestLargeWithdraw = async (
    vault: VaultType,
    amount: number,
    reason: string
  ): Promise<{ success: boolean; requestId?: number }> => {
    let onchainReqId = Math.floor(Math.random() * 1000) + 10;

    const walletClient = getWalletClient();
    if (walletClient && connectedWalletAddress) {
      try {
        const txHash = await (walletClient as any).writeContract({
          address: CONTRACT_ADDRESSES.familyHub,
          abi: FAMILY_HUB_ABI,
          functionName: 'requestLargeWithdrawal',
          args: [vault, parseEther(amount.toString()), connectedWalletAddress as `0x${string}`, reason],
          account: connectedWalletAddress as `0x${string}`,
        });
        console.log('RequestLargeWithdrawal tx:', txHash);
      } catch (err) {
        console.warn('Request large withdraw fallback:', err);
      }
    }

    const vaultName =
      vault === VaultType.RetirementShield
        ? 'Retirement Shield'
        : vault === VaultType.KidsSavings
        ? 'Kids Savings'
        : 'Family ROSCA';

    // Gửi lên Backend Next.js API để lưu vào Neon PostgreSQL
    if (familyInfo?.id) {
      try {
        await apiClient.createWithdrawal({
          familyId: familyInfo.id,
          requesterId: currentMember.id,
          amount,
          vault: vaultName,
          reason,
          onchainRequestId: onchainReqId,
        });
        await refreshMembers();
      } catch (e) {
        console.warn('Lỗi gọi API createWithdrawal:', e);
      }
    }

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: 'CẢNH BÁO: Rút tiền lớn chờ xác nhận',
        message: `${currentMember.name} vừa yêu cầu rút ${amount} USDC (${reason}). Cần tối thiểu 2/3 Guardians phê duyệt.`,
        type: 'ALERT_SCAM',
        createdAt: 'Vừa xong',
        isRead: false,
      },
      ...prev,
    ]);

    return { success: true, requestId: onchainReqId };
  };

  // 4. Guardian phê duyệt yêu cầu rút tiền lớn (Multisig 2/3)
  const approveWithdrawal = async (requestId: string | number): Promise<boolean> => {
    const walletClient = getWalletClient();
    if (walletClient && connectedWalletAddress) {
      try {
        const numId = typeof requestId === 'number' ? BigInt(requestId) : BigInt(1);
        await (walletClient as any).writeContract({
          address: CONTRACT_ADDRESSES.familyHub,
          abi: FAMILY_HUB_ABI,
          functionName: 'approveWithdrawal',
          args: [numId],
          account: connectedWalletAddress as `0x${string}`,
        });
      } catch (err) {
        console.warn('Approve on-chain fallback:', err);
      }
    }

    // Gửi lên Backend ghi nhận vào database
    try {
      await apiClient.approveWithdrawal({
        requestId: String(requestId),
        guardianWallet: currentMember.walletAddress,
      });
      await refreshMembers();
    } catch (e) {
      console.warn('Lỗi approveWithdrawal API:', e);
    }

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: 'Đa chữ ký: Đã ký duyệt thành công',
        message: `${currentMember.name} đã ký duyệt yêu cầu giải ngân. Tiến trình đạt chuẩn đa chữ ký bảo vệ an toàn.`,
        type: 'ALERT_SCAM',
        createdAt: 'Vừa xong',
        isRead: false,
      },
      ...prev,
    ]);

    return true;
  };

  // 5. Nộp bài việc nhà
  const submitChoreProof = async (choreId: string | number, proofUrl: string): Promise<boolean> => {
    try {
      await apiClient.submitChore({
        choreId: String(choreId),
        proofImageUrl: proofUrl,
      });
      await refreshMembers();
    } catch (e) {
      console.warn('Lỗi submitChore API:', e);
    }

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: 'Nhiệm vụ việc nhà đã nộp',
        message: 'Bé đã gửi ảnh báo cáo việc nhà. Đang chờ phụ huynh kiểm tra & trao thưởng.',
        type: 'TASK_COMPLETED',
        createdAt: 'Vừa xong',
        isRead: false,
      },
      ...prev,
    ]);

    return true;
  };

  // 6. Cha mẹ duyệt và thưởng việc nhà
  const verifyAndRewardChore = async (choreId: string | number): Promise<boolean> => {
    const targetChore = chores.find((c) => c.id === choreId);
    const rewardAmt = targetChore?.rewardAmount || 5;

    const walletClient = getWalletClient();
    if (walletClient && connectedWalletAddress) {
      try {
        const numTaskId = typeof choreId === 'number' ? BigInt(choreId) : BigInt(1);
        await (walletClient as any).writeContract({
          address: CONTRACT_ADDRESSES.familyHub,
          abi: FAMILY_HUB_ABI,
          functionName: 'verifyAndRewardChore',
          args: [numTaskId],
          account: connectedWalletAddress as `0x${string}`,
        });
      } catch (err) {
        console.warn('Verify chore on-chain fallback:', err);
      }
    }

    // Trừ số dư hũ KidsSavings
    updateAndPersistVaults((prev) => ({
      ...prev,
      kidsSavings: {
        ...prev.kidsSavings,
        localBuffer: Math.max(0, prev.kidsSavings.localBuffer - rewardAmt),
        total: Math.max(0, prev.kidsSavings.total - rewardAmt),
      },
    }));

    try {
      await apiClient.verifyChore({ choreId: String(choreId) });
      await refreshMembers();
    } catch (e) {
      console.warn('Lỗi verifyChore API:', e);
    }

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: 'Phát thưởng việc nhà thành công!',
        message: `Bé nhận được +${rewardAmt} USDC vào Heo Đất và +150 XP chăm chỉ.`,
        type: 'TASK_COMPLETED',
        createdAt: 'Vừa xong',
        isRead: false,
      },
      ...prev,
    ]);

    return true;
  };

  // 6b. Tạo việc nhà mới cho con
  const createChore = async (params: {
    title: string;
    rewardAmount: number;
    childName?: string;
    childId?: string;
  }): Promise<boolean> => {
    if (!familyInfo?.id) return false;

    try {
      await apiClient.createChore({
        familyId: familyInfo.id,
        title: params.title,
        rewardAmount: params.rewardAmount,
        childId: params.childId,
      });
      await refreshMembers();
    } catch (e) {
      console.warn('Lỗi createChore API:', e);
    }

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: 'Nhiệm vụ mới đã giao cho bé!',
        message: `Đã giao: "${params.title}" với phần thưởng ${params.rewardAmount} USDC.`,
        type: 'TASK_COMPLETED',
        createdAt: 'Vừa xong',
        isRead: false,
      },
      ...prev,
    ]);
    return true;
  };

  // 6c. Tái đầu tư lợi nhuận (Compound Yield)
  const compoundYield = async (vaultType: VaultType): Promise<boolean> => {
    const walletClient = getWalletClient();
    if (walletClient && connectedWalletAddress) {
      try {
        await (walletClient as any).writeContract({
          address: CONTRACT_ADDRESSES.familyYieldVault,
          abi: [
            {
              type: 'function',
              name: 'compoundYield',
              inputs: [{ name: 'vaultType', type: 'uint8' }],
              outputs: [],
              stateMutability: 'nonpayable',
            },
          ],
          functionName: 'compoundYield',
          args: [vaultType],
          account: connectedWalletAddress as `0x${string}`,
        });
      } catch (err) {
        console.warn('Compound yield on-chain fallback:', err);
      }
    }

    const vKey =
      vaultType === VaultType.RetirementShield
        ? 'retirementShield'
        : vaultType === VaultType.KidsSavings
        ? 'kidsSavings'
        : 'familyRosca';

    updateAndPersistVaults((prev) => {
      const current = prev[vKey];
      const added = current.accruedYield > 0 ? current.accruedYield : 12.5;
      return {
        ...prev,
        [vKey]: {
          ...current,
          remoteYield: current.remoteYield + added,
          accruedYield: 0,
          total: current.total + added,
        },
      };
    });

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: 'Tái đầu tư lợi nhuận thành công!',
        message: 'Lợi nhuận DeFi đã được nhập gốc để tiếp tục sinh lãi kép ~8.0% APY.',
        type: 'YIELD_PAYOUT',
        createdAt: 'Vừa xong',
        isRead: false,
      },
      ...prev,
    ]);

    return true;
  };

  // 7. Kết nối / Ngắt kết nối ví
  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window.avalanche || window.ethereum)) {
      try {
        const provider = window.avalanche || window.ethereum;
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
          setConnectedWalletAddress(accounts[0]);
          setIsWalletConnected(true);
          return;
        }
      } catch (e) {
        console.warn('Lỗi kết nối ví Core Wallet:', e);
      }
    }
    setConnectedWalletAddress(currentMember.walletAddress);
    setIsWalletConnected(true);
  };

  const disconnectWallet = () => {
    setIsWalletConnected(false);
    setConnectedWalletAddress(null);
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    apiClient.markNotificationRead(id);
  };

  const unreadNotificationCount = notifications.filter((n) => !n.isRead).length;

  return (
    <FamilyContext.Provider
      value={{
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
        compoundYield,
        notifications,
        unreadNotificationCount,
        markNotificationRead,
        isLiveWeb3,
        isLiveBackend,
        depositFunds,
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
