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
  FAMILY_YIELD_VAULT_ABI,
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

  // Notifications
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => void;

  // System States
  isLiveWeb3: boolean;
  isLiveBackend: boolean;
  depositFunds: (vaultType: VaultType, amount: number) => Promise<boolean>;
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

  // Số dư 3 hũ ngân sách
  const [vaults, setVaults] = useState({
    retirementShield: {
      localBuffer: 1250, // 10% tại chỗ trên Family L1
      remoteYield: 11250, // 90% trên Fuji C-Chain
      accruedYield: 245.5,
      total: 12500,
    },
    kidsSavings: {
      localBuffer: 500,
      remoteYield: 4500,
      accruedYield: 98.2,
      total: 5000,
    },
    familyRosca: {
      localBuffer: 750,
      remoteYield: 6750,
      accruedYield: 147.3,
      total: 7500,
    },
  });

  // Danh sách yêu cầu rút tiền lớn (Anti-scam Multisig 2/3)
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequestItem[]>([
    {
      id: 'req-001',
      onchainRequestId: 1,
      requesterName: 'Ông Nội (Nguyễn Văn An)',
      requesterAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      amount: 1000,
      vault: 'Retirement Shield',
      reason: 'Khám bệnh đột xuất tại Bệnh viện Tim TW',
      approvalsCount: 1,
      requiredApprovals: 2,
      status: 'PENDING',
      createdAt: '15 phút trước',
      guardianSignatures: [
        { guardianName: 'Anh Cả (Nguyễn Văn Hùng)', signed: true, signedAt: '10 phút trước' },
        { guardianName: 'Bố Ba (Nguyễn Văn Bình - Bạn)', signed: false },
        { guardianName: 'Cô Út (Nguyễn Thị Mai)', signed: false },
      ],
    },
  ]);

  // Danh sách việc nhà (Chore-to-Earn)
  const [chores, setChores] = useState<ChoreItem[]>([
    {
      id: 1,
      title: 'Đạt điểm 10 kiểm tra Toán giữa kỳ',
      rewardAmount: 5.0,
      status: 'SUBMITTED',
      proofImageUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400',
    },
    {
      id: 2,
      title: 'Dọn dẹp phòng ngủ & gấp chăn gối',
      rewardAmount: 2.0,
      status: 'TODO',
      proofImageUrl: null,
    },
    {
      id: 3,
      title: 'Tưới cây ban công và nhặt lá vàng',
      rewardAmount: 1.5,
      status: 'REWARDED',
      proofImageUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400',
    },
  ]);

  const [kidsBalance, setKidsBalance] = useState<number>(125.5);
  const [kidsXp, setKidsXp] = useState<number>(850);

  // Hộp thư thông báo
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      title: 'Cảnh báo rút tiền lớn (>50 USDC)',
      message: 'Ông Nội vừa gửi yêu cầu rút 1,000 USDC. Đang chờ bạn ký duyệt!',
      type: 'ALERT_SCAM',
      createdAt: '15 phút trước',
      isRead: false,
    },
    {
      id: 'notif-2',
      title: 'Bé Na đã nộp bài tập việc nhà',
      message: 'Nhiệm vụ: Đạt điểm 10 kiểm tra Toán. Hãy kiểm tra và thưởng 5 USDC!',
      type: 'TASK_COMPLETED',
      createdAt: '30 phút trước',
      isRead: false,
    },
    {
      id: 'notif-3',
      title: 'Lợi suất DeFi C-Chain được phân phối',
      message: '+18.50 USDC tiền lãi vừa được tích lũy vào Quỹ Tương Trợ Họ Hàng.',
      type: 'YIELD_PAYOUT',
      createdAt: '2 giờ trước',
      isRead: true,
    },
  ]);

  // Đồng bộ phiên đăng nhập & nạp danh sách thành viên thực tế từ Neon PostgreSQL
  const refreshMembers = async () => {
    try {
      const meRes = await fetch('/api/auth/me', { cache: 'no-store' });
      const meData = await meRes.json();
      if (meData.success && meData.user && meData.family) {
        setFamilyInfo({
          id: meData.family.id,
          name: meData.family.name,
          familyCode: meData.family.familyCode,
        });

        // Nạp danh sách thành viên trong gia đình từ PostgreSQL
        const membersRes = await fetch(`/api/families/${meData.family.id}/members`, {
          cache: 'no-store',
        });
        const membersData = await membersRes.json();
        if (membersData.success && Array.isArray(membersData.members) && membersData.members.length > 0) {
          const mappedMembers: DemoMember[] = membersData.members.map((u: any) => ({
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

          // Gán currentMember khớp với người đang đăng nhập
          const currentLoggedIn = mappedMembers.find((m) => m.id === meData.user.id);
          if (currentLoggedIn) {
            setCurrentMember(currentLoggedIn);
            setConnectedWalletAddress(currentLoggedIn.walletAddress);
          }
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

      // 3. Nạp dữ liệu thành viên từ DB
      await refreshMembers();
    }
    checkConnectivity();
  }, []);

  // Tổng tài sản gia đình
  const totalFamilyWealth =
    vaults.retirementShield.total + vaults.kidsSavings.total + vaults.familyRosca.total;

  const refreshBalances = async () => {
    // Có thể đọc từ contract nếu Web3 Live
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

        setVaults((prev) => ({
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

    // Cập nhật state UI
    setVaults((prev) => {
      const targetKey =
        vaultType === VaultType.RetirementShield
          ? 'retirementShield'
          : vaultType === VaultType.KidsSavings
          ? 'kidsSavings'
          : 'familyRosca';

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

    setVaults((prev) => ({
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
        message: `Ông Nội đã rút ${amount} USDC từ bộ đệm L1 (Thời gian: <1s, Phí gas: 0đ).`,
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

    const newReq: WithdrawalRequestItem = {
      id: `req-${Date.now()}`,
      onchainRequestId: onchainReqId,
      requesterName: currentMember.name,
      requesterAddress: currentMember.walletAddress,
      amount,
      vault:
        vault === VaultType.RetirementShield
          ? 'Retirement Shield'
          : vault === VaultType.KidsSavings
          ? 'Kids Savings'
          : 'Family ROSCA',
      reason,
      approvalsCount: 0,
      requiredApprovals: 2,
      status: 'PENDING',
      createdAt: 'Vừa xong',
      guardianSignatures: [
        { guardianName: 'Anh Cả (Nguyễn Văn Hùng)', signed: false },
        { guardianName: 'Bố Ba (Nguyễn Văn Bình)', signed: false },
        { guardianName: 'Cô Út (Nguyễn Thị Mai)', signed: false },
      ],
    };

    setWithdrawalRequests((prev) => [newReq, ...prev]);

    // Gửi lên Backend nếu có kết nối
    apiClient.createWithdrawal({
      familyId: 'family-001',
      requesterId: currentMember.id,
      amount,
      vault: newReq.vault,
      reason,
      onchainRequestId: onchainReqId,
    });

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

    setWithdrawalRequests((prev) =>
      prev.map((req) => {
        if (req.id === requestId || req.onchainRequestId === requestId) {
          const newApprovals = req.approvalsCount + 1;
          const isExecuted = newApprovals >= req.requiredApprovals;

          return {
            ...req,
            approvalsCount: newApprovals,
            status: isExecuted ? 'EXECUTED' : 'PENDING',
            guardianSignatures: req.guardianSignatures.map((g) =>
              g.guardianName.includes('Bố Ba') || g.guardianName.includes(currentMember.name)
                ? { ...g, signed: true, signedAt: 'Vừa xong' }
                : g
            ),
          };
        }
        return req;
      })
    );

    // Báo Backend
    apiClient.approveWithdrawal({
      requestId: String(requestId),
      guardianWallet: currentMember.walletAddress,
    });

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: 'Đa chữ ký: Đã ký duyệt thành công',
        message: `${currentMember.name} đã ký duyệt yêu cầu giải ngân. Tiến trình đạt 2/3 chữ ký, tiền đã được chuyển an toàn.`,
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
    setChores((prev) =>
      prev.map((c) => (c.id === choreId ? { ...c, status: 'SUBMITTED', proofImageUrl: proofUrl } : c))
    );

    apiClient.submitChore({
      choreId: String(choreId),
      proofImageUrl: proofUrl,
    });

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
    if (!targetChore) return false;

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

    setChores((prev) =>
      prev.map((c) => (c.id === choreId ? { ...c, status: 'REWARDED' } : c))
    );
    setKidsBalance((prev) => prev + targetChore.rewardAmount);
    setKidsXp((prev) => prev + 150);

    // Trừ số dư hũ KidsSavings
    setVaults((prev) => ({
      ...prev,
      kidsSavings: {
        ...prev.kidsSavings,
        localBuffer: Math.max(0, prev.kidsSavings.localBuffer - targetChore.rewardAmount),
        total: Math.max(0, prev.kidsSavings.total - targetChore.rewardAmount),
      },
    }));

    apiClient.verifyChore({ choreId: String(choreId) });

    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: 'Phát thưởng việc nhà thành công!',
        message: `Bé nhận được +${targetChore.rewardAmount} USDC vào Heo Đất và +150 XP chăm chỉ.`,
        type: 'TASK_COMPLETED',
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
    // Fallback: kết nối ví theo role đang chọn
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
