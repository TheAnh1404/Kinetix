"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { parseEther } from "viem";
import { FamilyMember, WorkspaceItem, DynamicVaultItem } from "@/types";
import { hubChain, avalancheFuji } from "@/contracts/config";
import { FAMILY_HUB_ABI, FAMILY_YIELD_VAULT_ABI } from "@/contracts/abis";
import {
  getWalletClient,
  publicClientL1,
  publicClientFuji,
  setTransactionWorkspace,
  setWalletUseEnabled,
  queueTransactionSync,
} from "@/lib/web3/client";
import { useAuth, authRequest } from "@/hooks/useAuth";

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
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXECUTED";
  createdAt: string;
  guardianSignatures: {
    guardianName: string;
    signed: boolean;
    signedAt?: string;
  }[];
}

export interface ChoreItem {
  id: string | number;
  vaultId?: string;
  vaultName?: string;
  title: string;
  description?: string;
  rewardAmount: number;
  status: "TODO" | "SUBMITTED" | "VERIFIED" | "REWARDED";
  proofImageUrl?: string | null;
  onchainTaskId?: number;
  childId?: string;
  childName?: string;
  childAvatar?: string;
  deadline?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type:
    | "ALERT_SCAM"
    | "TASK_COMPLETED"
    | "YIELD_PAYOUT"
    | "FAST_WITHDRAW"
    | "APPROVAL_NEEDED";
  createdAt: string;
  isRead: boolean;
}

export interface DepositHistoryItem {
  id: string;
  vaultId: number;
  vaultName: string;
  amount: number;
  txHash: string;
  senderAddress: string;
  senderName: string;
  timestamp: string;
}

interface VaultBalance {
  localBuffer: number;
  remoteYield: number;
  accruedYield: number;
  total: number;
}

interface FamilyContextType {
  // Workspaces & Multi-Space
  workspaces: WorkspaceItem[];
  currentWorkspace: WorkspaceItem | null;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (
    name: string,
    type?: string,
  ) => Promise<{ success: boolean; workspace?: any; error?: string }>;

  // Dynamic Vaults
  dynamicVaults: DynamicVaultItem[];
  selectedVault: DynamicVaultItem | null;
  setSelectedVault: (vault: DynamicVaultItem | null) => void;
  createCustomVault: (params: {
    name: string;
    description?: string;
    ruleTemplate: "SHIELD" | "MILESTONE" | "ROSCA" | "SHARED_GOAL";
    bufferRatioBps: number;
    fastWithdrawLimit: number;
    requiredApprovals: number;
    guardianWallets?: string[];
    beneficiaryWallets?: string[];
    targetGoalAmount?: number;
    targetDeadline?: string;
    roscaRoundDuration?: number;
    roscaRoundContribution?: number;
  }) => Promise<{ success: boolean; vault?: any; error?: string }>;
  depositToVault: (
    vaultId: number,
    amount: number,
  ) => Promise<{ success: boolean; txHash?: string; error?: string }>;
  fastWithdrawFromVault: (vaultId: number, amount: number) => Promise<boolean>;
  requestVaultWithdrawal: (
    vaultId: number,
    amount: number,
    reason: string,
  ) => Promise<{ success: boolean; requestId?: number }>;
  payoutRoscaRound: (vaultId: number, dbVaultId?: string) => Promise<boolean>;

  // Members & Auth
  currentMember: FamilyMember;
  members: FamilyMember[];
  familyInfo: { id: string; name: string; familyCode: string } | null;
  setCurrentMember: (member: FamilyMember) => void;
  refreshMembers: () => Promise<void>;
  addMemberToFamily: (memberData: {
    fullName: string;
    role: "ELDERLY" | "CHILD";
    phoneNumber?: string;
    username?: string;
    temporaryPassword?: string;
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
    reason: string,
  ) => Promise<{ success: boolean; requestId?: number }>;
  approveWithdrawal: (
    requestId: string | number,
    onchainRequestId?: number,
  ) => Promise<boolean>;

  // Chores
  chores: ChoreItem[];
  kidsBalance: number;
  kidsXp: number;
  submitChoreProof: (
    choreId: string | number,
    proofUrl: string,
  ) => Promise<boolean>;
  verifyAndRewardChore: (choreId: string | number) => Promise<boolean>;
  createChore: (params: {
    title: string;
    rewardAmount: number;
    childName?: string;
    childId?: string;
    vaultId?: string;
  }) => Promise<boolean>;

  // Notifications
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  markNotificationRead: (id: string) => void;

  // System States
  isLiveWeb3: boolean;
  isLiveBackend: boolean;
  depositFunds: (vaultType: any, amount: number) => Promise<boolean>;
  compoundYield: (vaultType: any) => Promise<boolean>;
  depositHistory: DepositHistoryItem[];
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);
const emptyMember: FamilyMember = {
  id: "",
  name: "",
  role: "CHILD",
  title: "",
  walletAddress: "",
  address: "",
  avatar: "",
  defaultTab: "kinetix-kids",
};
export function FamilyProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [currentMember, setCurrentMember] = useState<FamilyMember>(emptyMember);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [currentWorkspace, setCurrentWorkspace] =
    useState<WorkspaceItem | null>(null);
  const [dynamicVaults, setDynamicVaults] = useState<DynamicVaultItem[]>([]);
  const [selectedVault, setSelectedVault] = useState<DynamicVaultItem | null>(
    null,
  );
  const [withdrawalRequests, setWithdrawalRequests] = useState<
    WithdrawalRequestItem[]
  >([]);
  const [chores, setChores] = useState<ChoreItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [depositHistory, setDepositHistory] = useState<DepositHistoryItem[]>(
    [],
  );
  const [isLiveBackend, setIsLiveBackend] = useState(false);
  const generation = useRef(0);
  const familyInfo = currentWorkspace
    ? {
        id: currentWorkspace.id,
        name: currentWorkspace.name,
        familyCode: currentWorkspace.workspaceCode || "",
      }
    : null;
  const connectedWalletAddress = auth.connectedAddress;
  const isWalletConnected = !!auth.connectedAddress;
  const isLiveWeb3 = isWalletConnected && auth.walletMatches;
  const kidsBalance = chores
    .filter((chore) => chore.status === "REWARDED")
    .reduce((sum, chore) => sum + chore.rewardAmount, 0);
  const kidsXp =
    chores.filter((chore) => chore.status === "REWARDED").length * 150;
  const clearWorkspace = () => {
    setCurrentMember(emptyMember);
    setMembers([]);
    setDynamicVaults([]);
    setSelectedVault(null);
    setWithdrawalRequests([]);
    setChores([]);
    setNotifications([]);
    setDepositHistory([]);
    setIsLiveBackend(false);
  };
  const loadWorkspaceData = async (workspaceId: string) => {
    const requestGeneration = ++generation.current;
    const [roster, vaultData, withdrawalsData, choresData, notices] =
      await Promise.all([
        authRequest(`/api/families/${workspaceId}/members`, undefined, "GET"),
        authRequest(`/api/vaults?workspaceId=${workspaceId}`, undefined, "GET"),
        authRequest(`/api/withdrawals/${workspaceId}`, undefined, "GET"),
        authRequest(`/api/chores/${workspaceId}`, undefined, "GET"),
        authRequest(`/api/notifications/${auth.user!.id}`, undefined, "GET"),
      ]);
    if (requestGeneration !== generation.current) return;
    const mappedMembers: FamilyMember[] = roster.members.map((user: any) => ({
      id: user.id,
      name: user.fullName,
      role: user.role,
      title: user.role,
      walletAddress: user.walletAddress || "",
      address: user.walletAddress || "",
      avatar: user.avatarUrl || "",
      defaultTab:
        user.role === "ELDERLY"
          ? "kinetix-shield"
          : user.role === "CHILD"
            ? "kinetix-kids"
            : "quan-tri-cha-me",
    }));
    setMembers(mappedMembers);
    setCurrentMember(
      mappedMembers.find((member) => member.id === auth.user!.id) ||
        emptyMember,
    );
    const mappedVaults: DynamicVaultItem[] = vaultData.vaults.map(
      (vault: any) => ({
        ...vault,
        onchainVaultId: Number(vault.onchainVaultId),
        bufferRatioBps: Number(vault.bufferRatioBps),
        fastWithdrawLimit: Number(vault.fastWithdrawLimit),
        requiredApprovals: Number(vault.requiredApprovals),
        cachedTotalBalance: Number(vault.cachedTotalBalance),
        cachedL1Buffer: Number(vault.cachedL1Buffer),
        cachedCChainYield: Number(vault.cachedCChainYield),
        totalBalance: Number(vault.cachedTotalBalance),
        l1BufferBalance: Number(vault.cachedL1Buffer),
        cChainPrincipal: Math.max(
          0,
          Number(vault.cachedTotalBalance) - Number(vault.cachedL1Buffer),
        ),
      }),
    );
    setDynamicVaults(mappedVaults);
    setSelectedVault(
      (previous) =>
        mappedVaults.find((vault) => vault.id === previous?.id) ||
        mappedVaults[0] ||
        null,
    );
    setWithdrawalRequests(
      withdrawalsData.data.map((request: any) => ({
        ...request,
        amount: Number(request.amount),
        requesterName: request.requesterName || "Thành viên",
        requesterAddress: request.requesterAddress || "",
        guardianSignatures: [],
        createdAt: new Date(request.createdAt).toLocaleString("vi-VN"),
      })),
    );
    setChores(
      choresData.data.map((chore: any) => ({
        ...chore,
        rewardAmount: Number(chore.rewardAmount),
      })),
    );
    setNotifications(
      notices.data.filter((notice: any) => notice.familyId === workspaceId),
    );
    setIsLiveBackend(true);
  };
  useEffect(() => {
    if (!auth.user || auth.onboarding !== "READY") return;
    setWorkspaces(auth.workspaces);
    const first =
      auth.workspaces.find((workspace) => workspace.id === auth.family?.id) ||
      auth.workspaces[0];
    if (!first) return;
    setCurrentWorkspace(first);
    setTransactionWorkspace(first.id);
    void loadWorkspaceData(first.id).catch(() => {
      clearWorkspace();
    });
    return () => {
      generation.current++;
      setTransactionWorkspace(null);
    };
    // Memberships are refreshed by the shared auth provider; preserve the selected workspace where possible.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user?.id, auth.onboarding]);
  useEffect(() => {
    if (!currentWorkspace || !auth.user || auth.onboarding !== "READY") return;
    setWorkspaces(auth.workspaces);
    const stillAllowed = auth.workspaces.some(
      (workspace) => workspace.id === currentWorkspace.id,
    );
    if (!stillAllowed) {
      generation.current++;
      clearWorkspace();
      setCurrentWorkspace(null);
      setTransactionWorkspace(null);
    }
  }, [auth.workspaces, auth.user, auth.onboarding, currentWorkspace]);
  const switchWorkspace = async (workspaceId: string) => {
    const target = workspaces.find((workspace) => workspace.id === workspaceId);
    if (!target) return;
    generation.current++;
    clearWorkspace();
    setCurrentWorkspace(target);
    setTransactionWorkspace(target.id);
    try {
      await loadWorkspaceData(target.id);
    } catch {
      clearWorkspace();
    }
  };
  const refreshBalances = async () => {
    if (currentWorkspace) await loadWorkspaceData(currentWorkspace.id);
  };
  const createWorkspace = async (name: string, type = "FAMILY") => {
    try {
      const data = await authRequest("/api/workspaces", { name, type });
      await auth.checkSession();
      setWorkspaces((previous) => [...previous, data.workspace]);
      setCurrentWorkspace(data.workspace);
      setTransactionWorkspace(data.workspace.id);
      clearWorkspace();
      await loadWorkspaceData(data.workspace.id);
      return { success: true, workspace: data.workspace };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };
  const contractAddress = (yieldContract = false) => {
    const address = (currentWorkspace as any)?.[
      yieldContract ? "cchainVaultAddress" : "l1HubAddress"
    ];
    if (!address) throw new Error("Không gian chưa được cấu hình hợp đồng.");
    return address as `0x${string}`;
  };
  const write = async (
    functionName: string,
    args: unknown[],
    value?: bigint,
    yieldContract = false,
    reconciliation?: { path: string; body: object; method?: string },
  ) => {
    const wallet = getWalletClient(yieldContract ? avalancheFuji : hubChain);
    if (!wallet) throw new Error("Hãy kết nối đúng Core Wallet đã liên kết.");
    return (wallet as any).writeContract({
      address: contractAddress(yieldContract),
      abi: yieldContract ? FAMILY_YIELD_VAULT_ABI : FAMILY_HUB_ABI,
      functionName,
      args,
      __kinetixSync: reconciliation,
      ...(value !== undefined ? { value } : {}),
    }) as Promise<`0x${string}`>;
  };
  const vaultByChainId = (id: number) => {
    const vault = dynamicVaults.find((item) => item.onchainVaultId === id);
    if (!vault) throw new Error("Không tìm thấy hũ được phép truy cập.");
    return vault;
  };
  const sync = async (path: string, body: object, method = "POST") => {
    // Receipt confirmation is already complete in the wallet adapter. API verifies the event independently.
    const data = await queueTransactionSync(
      auth.user!.id,
      (body as { txHash: string }).txHash,
      path,
      body,
      method,
    );
    await refreshBalances();
    return data;
  };
  const createCustomVault: FamilyContextType["createCustomVault"] = async (
    params,
  ) => {
    try {
      if (!currentWorkspace) throw new Error("Hãy chọn không gian.");
      const guardians = params.guardianWallets || [];
      const beneficiaries = params.beneficiaryWallets || [];
      const type = ["SHIELD", "MILESTONE", "ROSCA", "SHARED_GOAL"].indexOf(
        params.ruleTemplate,
      );
      const args: unknown[] = [
        params.name,
        type,
        BigInt(params.bufferRatioBps),
        parseEther(params.fastWithdrawLimit.toString()),
        BigInt(params.requiredApprovals),
        guardians,
        beneficiaries,
      ];
      const advanced = type >= 2;
      if (advanced)
        args.push(
          parseEther((params.targetGoalAmount || 0).toString()),
          BigInt(
            params.targetDeadline
              ? Math.floor(new Date(params.targetDeadline).getTime() / 1000)
              : 0,
          ),
          BigInt(params.roscaRoundDuration || 0),
          parseEther((params.roscaRoundContribution || 0).toString()),
        );
      const txHash = await write(
        advanced ? "createAdvancedVault" : "createCustomVault",
        args,
        undefined,
        false,
        { path: "/api/vaults", body: { workspaceId: currentWorkspace.id } },
      );
      const data = await sync("/api/vaults", {
        workspaceId: currentWorkspace.id,
        txHash,
      });
      await refreshBalances();
      return { success: true, vault: data.vault };
    } catch (error: any) {
      return { success: false, error: error.shortMessage || error.message };
    }
  };
  const depositToVault = async (vaultId: number, amount: number) => {
    try {
      if (!Number.isFinite(amount) || amount <= 0)
        throw new Error("Số tiền phải lớn hơn 0.");
      const vault = vaultByChainId(vaultId);
      const txHash = await write(
        "depositToVault",
        [BigInt(vaultId)],
        parseEther(amount.toString()),
        false,
        {
          path: "/api/vaults",
          body: { vaultId: vault.id, action: "DEPOSIT" },
          method: "PATCH",
        },
      );
      await sync(
        "/api/vaults",
        { vaultId: vault.id, action: "DEPOSIT", txHash },
        "PATCH",
      );
      setDepositHistory((previous) => [
        {
          id: txHash,
          vaultId,
          vaultName: vault.name,
          amount,
          txHash,
          senderAddress: auth.linkedWallet!.address,
          senderName: auth.user!.fullName,
          timestamp: new Date().toLocaleString("vi-VN"),
        },
        ...previous,
      ]);
      return { success: true, txHash };
    } catch (error: any) {
      return { success: false, error: error.shortMessage || error.message };
    }
  };
  const fastWithdrawFromVault = async (vaultId: number, amount: number) => {
    try {
      const vault = vaultByChainId(vaultId);
      if (!Number.isFinite(amount) || amount <= 0) return false;
      const txHash = await write(
        "fastWithdraw",
        [BigInt(vaultId), parseEther(amount.toString())],
        undefined,
        false,
        {
          path: "/api/vaults",
          body: { vaultId: vault.id, action: "WITHDRAW" },
          method: "PATCH",
        },
      );
      await sync(
        "/api/vaults",
        { vaultId: vault.id, action: "WITHDRAW", txHash },
        "PATCH",
      );
      return true;
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent("kinetix-operation-error", {
          detail:
            error instanceof Error
              ? error.message
              : "Không thể hoàn tất giao dịch.",
        }),
      );
      return false;
    }
  };
  const requestVaultWithdrawal = async (
    vaultId: number,
    amount: number,
    reason: string,
  ) => {
    try {
      const vault = vaultByChainId(vaultId);
      if (!Number.isFinite(amount) || amount <= 0 || !reason.trim())
        return { success: false };
      const txHash = await write(
        "requestLargeWithdrawal",
        [BigInt(vaultId), parseEther(amount.toString()), reason],
        undefined,
        false,
        { path: "/api/withdrawals/create", body: { vaultId: vault.id } },
      );
      const data = await sync("/api/withdrawals/create", {
        vaultId: vault.id,
        txHash,
      });
      await refreshBalances();
      return { success: true, requestId: data.data.request.onchainRequestId };
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent("kinetix-operation-error", {
          detail:
            error instanceof Error
              ? error.message
              : "Không thể hoàn tất giao dịch.",
        }),
      );
      return { success: false };
    }
  };
  const approveWithdrawal = async (
    requestId: string | number,
    onchainRequestId?: number,
  ) => {
    try {
      const request = withdrawalRequests.find(
        (item) => item.id === String(requestId),
      );
      const chainId = onchainRequestId ?? request?.onchainRequestId;
      if (chainId === undefined) return false;
      const txHash = await write(
        "approveWithdrawal",
        [BigInt(chainId)],
        undefined,
        false,
        {
          path: "/api/withdrawals/approve",
          body: { requestId: String(requestId) },
        },
      );
      await sync("/api/withdrawals/approve", {
        requestId: String(requestId),
        txHash,
      });
      return true;
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent("kinetix-operation-error", {
          detail:
            error instanceof Error
              ? error.message
              : "Không thể hoàn tất giao dịch.",
        }),
      );
      return false;
    }
  };
  const payoutRoscaRound = async (vaultId: number, dbVaultId?: string) => {
    try {
      const vault = vaultByChainId(vaultId);
      const txHash = await write(
        "payoutRoscaRound",
        [BigInt(vaultId)],
        undefined,
        false,
        {
          path: "/api/vaults/rosca-payout",
          body: { vaultId: dbVaultId || vault.id },
        },
      );
      await sync("/api/vaults/rosca-payout", {
        vaultId: dbVaultId || vault.id,
        txHash,
      });
      return true;
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent("kinetix-operation-error", {
          detail:
            error instanceof Error
              ? error.message
              : "Không thể hoàn tất giao dịch.",
        }),
      );
      return false;
    }
  };
  const createChore: FamilyContextType["createChore"] = async (params) => {
    try {
      const vault = dynamicVaults.find((item) => item.id === params.vaultId);
      const child = members.find((item) => item.id === params.childId);
      if (
        !vault ||
        !child?.walletAddress ||
        !Number.isFinite(params.rewardAmount) ||
        params.rewardAmount <= 0
      )
        return false;
      const txHash = await write(
        "createChore",
        [
          BigInt(vault.onchainVaultId),
          params.title,
          parseEther(params.rewardAmount.toString()),
          child.walletAddress,
        ],
        undefined,
        false,
        { path: "/api/chores/create", body: { vaultId: vault.id } },
      );
      await sync("/api/chores/create", { vaultId: vault.id, txHash });
      return true;
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent("kinetix-operation-error", {
          detail:
            error instanceof Error
              ? error.message
              : "Không thể hoàn tất giao dịch.",
        }),
      );
      return false;
    }
  };
  const submitChoreProof = async (
    choreId: string | number,
    proofUrl: string,
  ) => {
    try {
      const chore = chores.find((item) => item.id === choreId);
      if (chore?.onchainTaskId === undefined) return false;
      const txHash = await write(
        "claimChoreCompleted",
        [BigInt(chore.onchainTaskId)],
        undefined,
        false,
        {
          path: "/api/chores/submit",
          body: { choreId, proofImageUrl: proofUrl },
        },
      );
      await sync("/api/chores/submit", {
        choreId,
        txHash,
        proofImageUrl: proofUrl,
      });
      return true;
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent("kinetix-operation-error", {
          detail:
            error instanceof Error
              ? error.message
              : "Không thể hoàn tất giao dịch.",
        }),
      );
      return false;
    }
  };
  const verifyAndRewardChore = async (choreId: string | number) => {
    try {
      const chore = chores.find((item) => item.id === choreId);
      if (chore?.onchainTaskId === undefined) return false;
      const txHash = await write(
        "verifyAndRewardChore",
        [BigInt(chore.onchainTaskId)],
        undefined,
        false,
        { path: "/api/chores/verify", body: { choreId } },
      );
      await sync("/api/chores/verify", { choreId, txHash });
      return true;
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent("kinetix-operation-error", {
          detail:
            error instanceof Error
              ? error.message
              : "Không thể hoàn tất giao dịch.",
        }),
      );
      return false;
    }
  };
  const markNotificationRead = (id: string) => {
    void authRequest(`/api/notifications/${id}/read`, {}, "PATCH")
      .then(() =>
        setNotifications((previous) =>
          previous.map((item) =>
            item.id === id ? { ...item, isRead: true } : item,
          ),
        ),
      )
      .catch(() => {});
  };
  const compoundYield = async (vaultType: any) => {
    try {
      const vault = dynamicVaults.find(
        (item) =>
          item.ruleTemplate ===
          (vaultType === 1
            ? "MILESTONE"
            : vaultType === 2
              ? "ROSCA"
              : "SHIELD"),
      );
      if (!vault) return false;
      await write(
        "compoundYield",
        [BigInt(vault.onchainVaultId)],
        undefined,
        true,
      );
      await refreshBalances();
      return true;
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent("kinetix-operation-error", {
          detail:
            error instanceof Error
              ? error.message
              : "Không thể hoàn tất giao dịch.",
        }),
      );
      return false;
    }
  };
  const addMemberToFamily: FamilyContextType["addMemberToFamily"] = async (
    input,
  ) => {
    try {
      if (!currentWorkspace) throw new Error("Chưa chọn không gian.");
      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/managed-members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
          },
          body: JSON.stringify(input),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await refreshBalances();
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };
  const quickWithdraw = async (vaultType: any, amount: number) => {
    const vault = dynamicVaults.find((item) => item.ruleTemplate === "SHIELD");
    return vault ? fastWithdrawFromVault(vault.onchainVaultId, amount) : false;
  };
  const requestLargeWithdraw = async (
    vaultType: any,
    amount: number,
    reason: string,
  ) => {
    const vault = dynamicVaults.find((item) => item.ruleTemplate === "SHIELD");
    return vault
      ? requestVaultWithdrawal(vault.onchainVaultId, amount, reason)
      : { success: false };
  };
  const depositFunds = async (vaultType: any, amount: number) => {
    const vault = dynamicVaults.find(
      (item) =>
        item.ruleTemplate ===
        (vaultType === 1 ? "MILESTONE" : vaultType === 2 ? "ROSCA" : "SHIELD"),
    );
    return vault
      ? (await depositToVault(vault.onchainVaultId, amount)).success
      : false;
  };
  const balance = (type: string): VaultBalance => {
    const items = dynamicVaults.filter((vault) => vault.ruleTemplate === type);
    return {
      localBuffer: items.reduce((sum, item) => sum + item.cachedL1Buffer, 0),
      remoteYield: items.reduce(
        (sum, item) =>
          sum + Math.max(0, item.cachedTotalBalance - item.cachedL1Buffer),
        0,
      ),
      accruedYield: items.reduce(
        (sum, item) => sum + item.cachedCChainYield,
        0,
      ),
      total: items.reduce((sum, item) => sum + item.cachedTotalBalance, 0),
    };
  };
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
        payoutRoscaRound,
        currentMember,
        members,
        familyInfo,
        setCurrentMember,
        refreshMembers: refreshBalances,
        addMemberToFamily,
        isWalletConnected,
        connectedWalletAddress,
        connectWallet: async () => {
          setWalletUseEnabled(true);
          await auth.connectWallet();
        },
        disconnectWallet: () => {
          setWalletUseEnabled(false);
          auth.disconnectWallet();
        },
        vaults: {
          retirementShield: balance("SHIELD"),
          kidsSavings: balance("MILESTONE"),
          familyRosca: balance("ROSCA"),
        },
        totalFamilyWealth: dynamicVaults.reduce(
          (sum, vault) => sum + vault.cachedTotalBalance,
          0,
        ),
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
        unreadNotificationCount: notifications.filter(
          (notice) => !notice.isRead,
        ).length,
        markNotificationRead,
        isLiveWeb3,
        isLiveBackend,
        depositFunds,
        compoundYield,
        depositHistory,
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
}
export function useFamily() {
  const value = useContext(FamilyContext);
  if (!value) throw new Error("useFamily requires FamilyProvider");
  return value;
}
