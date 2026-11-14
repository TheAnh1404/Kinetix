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
import { buildVaultCall, CreateVaultParams, CreationPhase } from "../../../shared/vaultCreation";
import { parseAmount } from "@/lib/member";
import { FamilyMember, WorkspaceItem, DynamicVaultItem } from "@/types";
import {
  FALLBACK_WORKSPACES,
  getFallbackDataForWorkspace,
} from "@/config/workspacePresets";
import {
  hubChain,
  avalancheFuji,
  CONTRACT_ADDRESSES,
} from "@/contracts/config";
import {
  FAMILY_HUB_ABI,
  FAMILY_YIELD_VAULT_ABI,
  KINETIX_VAULT_V1_ABI,
  KINETIX_VAULT_FACTORY_V1_ABI,
} from "@/contracts/abis";
import {
  getWalletClient,
  publicClientL1,
  publicClientFuji,
  setTransactionWorkspace,
  setWalletUseEnabled,
  queueTransactionSync,
  restoreOperations,
} from "@/lib/web3/client";
import { useAuth, authRequest } from "@/hooks/useAuth";
import { vaultMappingIssue } from "../../../shared/vaultMapping";
import { DEMO_PERSONAS } from "../../../shared/demoPersonas";

export interface WithdrawalRequestItem {
  id: string;
  onchainRequestId?: number;
  vaultId?: string;
  vaultName?: string;
  requesterName: string;
  requesterAddress: string;
  amount: number;
  exactAmount?: string;
  deadline?: string | null;
  txHash?: string;
  requesterId?: string;
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
  exactRewardAmount?: string;
  createdAt?: string;
  status: "TODO" | "SUBMITTED" | "VERIFIED" | "REWARDED" | "CANCELLED";
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
    | "TASK_ASSIGNED"
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
  dataErrors: string[];
  isDataLoading: boolean;
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
  createCustomVault: (params: CreateVaultParams) => Promise<{ success: boolean; vault?: any; error?: string; txHash?: string }>;
  depositToVault: (
    vaultId: number,
    amount: string | number,
  ) => Promise<{ success: boolean; txHash?: string; error?: string }>;
  transferBetweenVaults: (
    sourceVaultId: number,
    destinationVaultAddress: string,
    amount: string | number,
  ) => Promise<{ success: boolean; txHash?: string; error?: string }>;
  fastWithdrawFromVault: (vaultId: number, amount: number) => Promise<boolean>;
  requestVaultWithdrawal: (
    vaultId: number,
    amount: number | string,
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
  cancelChore: (choreId: string | number) => Promise<boolean>;
  createChore: (params: {
    title: string;
    rewardAmount: number | string;
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
  const initialFallback = getFallbackDataForWorkspace("ws-family");
  const [currentMember, setCurrentMember] = useState<FamilyMember>(
    initialFallback.members[0] || emptyMember,
  );
  const [members, setMembers] = useState<FamilyMember[]>(
    initialFallback.members,
  );
  const [workspaces, setWorkspaces] =
    useState<WorkspaceItem[]>(FALLBACK_WORKSPACES);
  const [currentWorkspace, setCurrentWorkspace] =
    useState<WorkspaceItem | null>(FALLBACK_WORKSPACES[0]);
  const [dynamicVaults, setDynamicVaults] = useState<DynamicVaultItem[]>(
    initialFallback.vaults,
  );
  const [selectedVault, setSelectedVault] = useState<DynamicVaultItem | null>(
    initialFallback.vaults[0] || null,
  );
  const [withdrawalRequests, setWithdrawalRequests] = useState<
    WithdrawalRequestItem[]
  >(initialFallback.withdrawals);
  const [chores, setChores] = useState<ChoreItem[]>(initialFallback.chores);
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    initialFallback.notifications,
  );
  const [depositHistory, setDepositHistory] = useState<DepositHistoryItem[]>(
    [],
  );
  const [isLiveBackend, setIsLiveBackend] = useState(false);
  const generation = useRef(0);
  const activeWorkspaceRef = useRef<string | null>(FALLBACK_WORKSPACES[0].id);
  const [dataErrors, setDataErrors] = useState<string[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
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
    setIsDataLoading(true);
    const requestGeneration = ++generation.current;
    if (auth.user) void restoreOperations(auth.user.id, workspaceId);

    const fallback = getFallbackDataForWorkspace(workspaceId);

    try {
      const results = await Promise.allSettled([
        authRequest(`/api/families/${workspaceId}/members`, undefined, "GET"),
        authRequest(`/api/vaults?workspaceId=${workspaceId}`, undefined, "GET"),
        authRequest(`/api/withdrawals/${workspaceId}`, undefined, "GET"),
        authRequest(`/api/chores/${workspaceId}`, undefined, "GET"),
        auth.user
          ? authRequest(`/api/notifications/${auth.user.id}`, undefined, "GET")
          : Promise.reject({ status: 404 }),
      ]);
      if (requestGeneration !== generation.current) return;
      setIsDataLoading(false);
      const labels = [
        "Thành viên",
        "Hũ tiền",
        "Yêu cầu",
        "Việc nhà",
        "Thông báo",
      ];
      // Bỏ qua lỗi 404 cho các danh sách rỗng chưa khởi tạo và thông báo thân thiện khi gặp 503
      setDataErrors(
        results.flatMap((result, index) => {
          if (result.status === "rejected") {
            const status = (result.reason as any)?.status;
            // 404 cho danh sách rút tiền, việc nhà, thông báo nghĩa là chưa có dữ liệu, không phải lỗi hệ thống
            if (status === 404 && index >= 2) return [];
            if (status === 503) {
              return [
                `${labels[index]}: Hệ thống đang đồng bộ blockchain, vui lòng chờ trong giây lát.`,
              ];
            }
            return [
              `${labels[index]}: ${result.reason?.message || "Chưa cập nhật được"}`,
            ];
          }
          return [];
        }),
      );
      const [roster, vaultData, withdrawalsData, choresData, notices] =
        results.map((result) =>
          result.status === "fulfilled" ? result.value : null,
        );

      if (roster?.members && roster.members.length > 0) {
        const mappedMembers: FamilyMember[] = roster.members.map(
          (user: any) => ({
            id: user.id,
            name: user.fullName,
            role: user.role,
            title: user.role,
            walletAddress: user.walletAddress || "",
            address: user.walletAddress || "",
            avatar: user.avatarUrl || "",
            canManageMembers: user.canManageMembers,
            defaultTab:
              user.role === "ELDERLY"
                ? "kinetix-shield"
                : user.role === "CHILD"
                  ? "kinetix-kids"
                  : "quan-tri-cha-me",
          }),
        );
        setMembers(mappedMembers);
        if (auth.user) {
          setCurrentMember(
            mappedMembers.find((member) => member.id === auth.user!.id) ||
              mappedMembers[0] ||
              emptyMember,
          );
        }
      } else {
        setMembers(fallback.members);
        setCurrentMember(fallback.members[0] || emptyMember);
      }

      if (vaultData?.vaults && vaultData.vaults.length > 0) {
        const mappedVaults: DynamicVaultItem[] = vaultData.vaults.map(
          (vault: any) => ({
            ...vault,
            exactFastWithdrawLimit: vault.fastWithdrawLimit,
            exactTotalBalance: vault.cachedTotalBalance,
            exactL1Buffer: vault.cachedL1Buffer,
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
        setIsLiveBackend(true);
      } else {
        setDynamicVaults(fallback.vaults);
        setSelectedVault(
          (previous) =>
            fallback.vaults.find((vault) => vault.id === previous?.id) ||
            fallback.vaults[0] ||
            null,
        );
        setIsLiveBackend(false);
      }

      if (withdrawalsData?.data && withdrawalsData.data.length > 0) {
        setWithdrawalRequests(
          withdrawalsData.data.map((request: any) => ({
            ...request,
            exactAmount: request.amount,
            amount: Number(request.amount),
            requesterName: request.requesterName || "Thành viên",
            requesterAddress: request.requesterAddress || "",
            guardianSignatures: request.guardianSignatures || [],
            createdAt: request.createdAt,
          })),
        );
      } else {
        setWithdrawalRequests(fallback.withdrawals);
      }

      if (choresData?.data && choresData.data.length > 0) {
        setChores(
          choresData.data.map((chore: any) => ({
            ...chore,
            exactRewardAmount: chore.rewardAmount,
            rewardAmount: Number(chore.rewardAmount),
          })),
        );
      } else {
        setChores(fallback.chores);
      }

      if (notices?.data && notices.data.length > 0) {
        setNotifications(
          notices.data.filter((notice: any) => notice.familyId === workspaceId),
        );
      } else {
        setNotifications(fallback.notifications);
      }
    } catch {
      if (requestGeneration !== generation.current) return;
      setIsDataLoading(false);
      setMembers(fallback.members);
      setCurrentMember(fallback.members[0] || emptyMember);
      setDynamicVaults(fallback.vaults);
      setSelectedVault(fallback.vaults[0] || null);
      setWithdrawalRequests(fallback.withdrawals);
      setChores(fallback.chores);
      setNotifications(fallback.notifications);
      setIsLiveBackend(false);
    }
  };
  useEffect(() => {
    if (!auth.user || auth.onboarding !== "READY") return;

    // Hợp nhất các workspace từ backend với 4 workspace fallback để luôn đủ 4 không gian
    const merged = [...(auth.workspaces || [])];
    for (const fb of FALLBACK_WORKSPACES) {
      if (!merged.some((w) => w.type === fb.type)) {
        merged.push(fb);
      }
    }
    setWorkspaces(merged.length > 0 ? merged : FALLBACK_WORKSPACES);

    let savedWorkspace: string | null = null;
    try {
      savedWorkspace = sessionStorage.getItem(
        `kinetix-workspace:${auth.user.id}`,
      );
    } catch {
      /* không có storage */
    }
    const requestedWorkspace = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("workspace")
      : null;
    const first =
      merged.find((workspace) => workspace.id === requestedWorkspace) ||
      merged.find((workspace) => workspace.id === auth.entryWorkspaceId) ||
      merged.find((workspace) => workspace.id === savedWorkspace) ||
      merged.find((workspace) => workspace.id === auth.family?.id) ||
      merged[0] ||
      FALLBACK_WORKSPACES[0];

    if (!first) return;
    activeWorkspaceRef.current = first.id;
    setCurrentWorkspace(first);
    setTransactionWorkspace(first.id);
    const userId = auth.user.id;
    document.cookie = `kinetix_workspace=${userId}.${first.id}; Path=/; SameSite=Lax${typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : ""}`;
    void loadWorkspaceData(first.id).catch(() => {});
    return () => {
      generation.current++;
      setTransactionWorkspace(null);
    };
    // Memberships are refreshed by the shared auth provider; preserve the selected workspace where possible.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user?.id, auth.onboarding]);
  useEffect(() => {
    if (!currentWorkspace || !auth.user || auth.onboarding !== "READY") return;
    const available = workspaces.length > 0 ? workspaces : FALLBACK_WORKSPACES;
    const stillAllowed = available.some(
      (workspace) => workspace.id === currentWorkspace.id,
    );
    if (!stillAllowed) {
      const fallbackTarget = available[0] || FALLBACK_WORKSPACES[0];
      setCurrentWorkspace(fallbackTarget);
      activeWorkspaceRef.current = fallbackTarget.id;
      void loadWorkspaceData(fallbackTarget.id);
    } else {
      const latest = available.find(
        (workspace) => workspace.id === currentWorkspace.id,
      );
      if (
        latest &&
        (latest.creatorUserId !== currentWorkspace.creatorUserId ||
          latest.role !== currentWorkspace.role ||
          latest.l1HubAddress !== currentWorkspace.l1HubAddress)
      )
        setCurrentWorkspace(latest);
    }
  }, [auth.workspaces, auth.user, auth.onboarding, currentWorkspace, workspaces]);
  const switchWorkspace = async (workspaceId: string) => {
    const target =
      workspaces.find((workspace) => workspace.id === workspaceId) ||
      FALLBACK_WORKSPACES.find((workspace) => workspace.id === workspaceId) ||
      FALLBACK_WORKSPACES.find(
        (workspace) =>
          workspace.type.toLowerCase() === workspaceId.toLowerCase(),
      ) ||
      FALLBACK_WORKSPACES[0];

    generation.current++;
    activeWorkspaceRef.current = target.id;
    setDataErrors([]);
    setCurrentWorkspace(target);
    setTransactionWorkspace(target.id);

    const userId = auth.user?.id || "demo-user";
    document.cookie = `kinetix_workspace=${userId}.${target.id}; Path=/; SameSite=Lax${typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : ""}`;
    try {
      sessionStorage.setItem(`kinetix-workspace:${userId}`, target.id);
    } catch {
      /* không có storage */
    }

    // Nạp ngay dữ liệu fallback tương ứng với Workspace để giao diện phản hồi tức thì 0 latency
    const fallback = getFallbackDataForWorkspace(target.id || target.type);
    setMembers(fallback.members);
    setCurrentMember(fallback.members[0] || emptyMember);
    setDynamicVaults(fallback.vaults);
    setSelectedVault(fallback.vaults[0] || null);
    setWithdrawalRequests(fallback.withdrawals);
    setChores(fallback.chores);
    setNotifications(fallback.notifications);

    try {
      await loadWorkspaceData(target.id);
    } catch {
      // Giữ nguyên dữ liệu fallback nếu backend offline
    }
  };
  const refreshBalances = async () => {
    if (activeWorkspaceRef.current)
      await loadWorkspaceData(activeWorkspaceRef.current);
  };
  useEffect(() => {
    if (!auth.user) {
      generation.current++;
      // Khi không có phiên đăng nhập hoặc ở chế độ Demo/Thẩm định, kích hoạt bộ 4 Workspace Fallback
      setWorkspaces(FALLBACK_WORKSPACES);
      const fallbackTarget = currentWorkspace || FALLBACK_WORKSPACES[0];
      setCurrentWorkspace(fallbackTarget);
      activeWorkspaceRef.current = fallbackTarget.id;
      const fbData = getFallbackDataForWorkspace(
        fallbackTarget.id || fallbackTarget.type,
      );
      setMembers(fbData.members);
      setCurrentMember(fbData.members[0] || emptyMember);
      setDynamicVaults(fbData.vaults);
      setSelectedVault(fbData.vaults[0] || null);
      setWithdrawalRequests(fbData.withdrawals);
      setChores(fbData.chores);
      setNotifications(fbData.notifications);
      setIsDataLoading(false);
      setIsLiveBackend(false);
    }
  }, [auth.user?.id]);
  useEffect(() => {
    if (!currentWorkspace || !auth.user) return;
    const refresh = () => {
      if (document.visibilityState === "visible") void refreshBalances();
    };
    const timer = window.setInterval(refresh, 20000);
    window.addEventListener("focus", refresh);
    window.addEventListener("kinetix-sync-complete", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("kinetix-sync-complete", refresh);
    };
  }, [currentWorkspace?.id, auth.user?.id]);
  const createWorkspace = async (name: string, type = "FAMILY") => {
    try {
      const data = await authRequest("/api/workspaces", { name, type });
      await auth.checkSession();
      const owned = { ...data.workspace, role: "ADMIN", userRole: "ADMIN", isOwner: true, canAdminister: true, canManageMembers: true } as WorkspaceItem;
      setWorkspaces((previous) => [...previous, owned]);
      setCurrentWorkspace(owned);
      activeWorkspaceRef.current = data.workspace.id;
      setTransactionWorkspace(data.workspace.id);
      const userId = auth.user?.id || "demo-user";
      document.cookie = `kinetix_workspace=${userId}.${data.workspace.id}; Path=/; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
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
    onProgress?: (phase: CreationPhase) => void,
    customTargetAddress?: `0x${string}`,
    customAbi?: any,
  ) => {
    const wallet = getWalletClient(yieldContract ? avalancheFuji : hubChain);
    if (!wallet) throw new Error("Hãy kết nối đúng Core Wallet đã liên kết.");
    const target = customTargetAddress || contractAddress(yieldContract);
    const abi = customAbi || (yieldContract ? FAMILY_YIELD_VAULT_ABI : FAMILY_HUB_ABI);
    return (wallet as any).writeContract({
      address: target,
      abi,
      functionName,
      args,
      __kinetixSync: reconciliation,
      __kinetixProgress: onProgress,
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
    const userId = auth.user?.id || "demo-user";
    const data = await queueTransactionSync(
      userId,
      (body as { txHash: string }).txHash,
      path,
      body,
      method,
    );
    await refreshBalances();
    return data;
  };
  const createCustomVault: FamilyContextType["createCustomVault"] = async (params) => {
    let txHash: string | undefined;
    const progress = (phase: CreationPhase) => {
      if (phase.hash) txHash = phase.hash;
      params.onProgress?.(phase);
    };
    try {
      if (!currentWorkspace) throw new Error("Hãy chọn gia đình.");
      const call = buildVaultCall(params);
      const body = { workspaceId: currentWorkspace.id, draftId: params.draftId };
      txHash = await write(call.functionName, call.args, undefined, false, { path: "/api/vaults", body }, progress);
      progress({ status: "SYNC_PENDING", hash: txHash });
      const data = await sync("/api/vaults", { ...body, txHash });
      progress({ status: "COMPLETED", hash: txHash });
      return { success: true, vault: data.vault, txHash };
    } catch (error: any) {
      return { success: false, error: error.shortMessage || error.message, txHash };
    }
  };
  const depositToVault = async (vaultId: number, amount: string | number) => {
    try {
      if (
        !/^\d+(\.\d{1,18})?$/.test(String(amount)) ||
        parseEther(String(amount)) <= 0n
      )
        throw new Error("Số tiền phải lớn hơn 0, tối đa 18 chữ số thập phân.");
      const vault = vaultByChainId(vaultId);
      const isClone = Boolean(
        vault.onchainVaultAddress &&
          vault.onchainVaultAddress.startsWith("0x") &&
          vault.onchainVaultAddress !== "0x0000000000000000000000000000000000000000",
      );

      const functionName = isClone
        ? vault.ruleTemplate === "ROSCA"
          ? "contributeRosca"
          : "deposit"
        : vault.ruleTemplate === "ROSCA"
          ? "contributeRoscaRound"
          : "depositToVault";

      const txHash = await write(
        functionName,
        isClone ? [] : [BigInt(vaultId)],
        parseEther(amount.toString()),
        false,
        {
          path: "/api/vaults",
          body: { vaultId: vault.id, action: "DEPOSIT" },
          method: "PATCH",
        },
        undefined,
        isClone ? (vault.onchainVaultAddress as `0x${string}`) : undefined,
        isClone ? KINETIX_VAULT_V1_ABI : undefined,
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
          amount: Number(amount),
          txHash,
          senderAddress: auth.linkedWallet?.address || DEMO_PERSONAS.admin.wallet,
          senderName: auth.user?.fullName || "Bố Ba",
          timestamp: new Date().toLocaleString("vi-VN"),
        },
        ...previous,
      ]);
      return { success: true, txHash };
    } catch (error: any) {
      return { success: false, error: error.shortMessage || error.message };
    }
  };
  const transferBetweenVaults = async (
    sourceVaultId: number,
    destinationVaultAddress: string,
    amount: string | number,
  ) => {
    try {
      if (
        !/^\d+(\.\d{1,18})?$/.test(String(amount)) ||
        parseEther(String(amount)) <= 0n
      ) {
        throw new Error("Số tiền chuyển phải lớn hơn 0, tối đa 18 chữ số thập phân.");
      }
      const sourceVault = vaultByChainId(sourceVaultId);
      if (!sourceVault.onchainVaultAddress || !sourceVault.onchainVaultAddress.startsWith("0x")) {
        throw new Error("Hũ nguồn chưa có địa chỉ hợp đồng on-chain V1.");
      }
      if (!destinationVaultAddress || !destinationVaultAddress.startsWith("0x")) {
        throw new Error("Địa chỉ Hũ đích không hợp lệ.");
      }
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const transferId = ("0x" + Array.from(randomBytes).map(b => b.toString(16).padStart(2, "0")).join("")) as `0x${string}`;

      const txHash = await write(
        "executeVaultTransfer",
        [
          destinationVaultAddress as `0x${string}`,
          parseEther(amount.toString()),
          transferId,
        ],
        undefined,
        false,
        {
          path: "/api/vaults",
          body: { vaultId: sourceVault.id, action: "TRANSFER" },
          method: "PATCH",
        },
        undefined,
        sourceVault.onchainVaultAddress as `0x${string}`,
        KINETIX_VAULT_V1_ABI,
      );
      await sync(
        "/api/vaults",
        { vaultId: sourceVault.id, action: "TRANSFER", txHash },
        "PATCH",
      );
      return { success: true, txHash };
    } catch (error: any) {
      return { success: false, error: error.shortMessage || error.message };
    }
  };
  const fastWithdrawFromVault = async (vaultId: number, amount: number) => {
    try {
      const vault = vaultByChainId(vaultId);
      if (!Number.isFinite(amount) || amount <= 0) return false;
      const isClone = Boolean(
        vault.onchainVaultAddress &&
          vault.onchainVaultAddress.startsWith("0x") &&
          vault.onchainVaultAddress !== "0x0000000000000000000000000000000000000000",
      );

      const txHash = await write(
        isClone ? "withdrawFast" : "fastWithdraw",
        isClone
          ? [parseEther(amount.toString()), auth.linkedWallet!.address as `0x${string}`]
          : [BigInt(vaultId), parseEther(amount.toString())],
        undefined,
        false,
        {
          path: "/api/vaults",
          body: { vaultId: vault.id, action: "WITHDRAW" },
          method: "PATCH",
        },
        undefined,
        isClone ? (vault.onchainVaultAddress as `0x${string}`) : undefined,
        isClone ? KINETIX_VAULT_V1_ABI : undefined,
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
    amount: number | string,
    reason: string,
  ) => {
    try {
      const vault = vaultByChainId(vaultId);
      if (parseAmount(String(amount)) <= 0n || !reason.trim())
        return { success: false };
      const txHash = await write(
        "requestLargeWithdrawal",
        [BigInt(vaultId), parseAmount(String(amount)), reason],
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
  const cancelChore: FamilyContextType["cancelChore"] = async (id) => {
    try {
      const chore = chores.find((item) => String(item.id) === String(id));
      if (chore?.onchainTaskId === undefined) return false;
      const txHash = await write("cancelChore", [BigInt(chore.onchainTaskId)], undefined, false, { path: "/api/chores/cancel", body: { choreId: String(id) } });
      await sync("/api/chores/cancel", { choreId: String(id), txHash });
      return true;
    } catch (error) {
      window.dispatchEvent(new CustomEvent("kinetix-operation-error", { detail: error instanceof Error ? error.message : "Chưa hủy được nhiệm vụ." }));
      return false;
    }
  };
  const createChore: FamilyContextType["createChore"] = async (params) => {
    try {
      const vault = dynamicVaults.find((item) => item.id === params.vaultId);
      const child = members.find((item) => item.id === params.childId);
      if (!vault || !child?.walletAddress) return false;
      const txHash = await write(
        "createChore",
        [
          BigInt(vault.onchainVaultId),
          params.title,
          parseAmount(params.rewardAmount.toString()),
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
    attachmentId: string,
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
          body: { choreId, attachmentId },
        },
      );
      await sync("/api/chores/submit", {
        choreId,
        txHash,
        attachmentId,
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
        dataErrors,
        isDataLoading,
        workspaces,
        currentWorkspace,
        switchWorkspace,
        createWorkspace,
        dynamicVaults,
        selectedVault,
        setSelectedVault,
        createCustomVault,
        depositToVault,
        transferBetweenVaults,
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
        cancelChore,
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
