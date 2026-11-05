"use client";

import { useState, useEffect, useCallback } from "react";
import { authRequest } from "./useAuth";

export interface SettingsUser {
  id: string;
  fullName: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  primaryWallet: string;
  authMethod: "CORE_WALLET" | "PASSKEY_EMBEDDED";
}

export interface UserPreferencesData {
  id?: string;
  uiMode: "LITE" | "PRO";
  defaultCurrency: "VND" | "USD" | "AVAX";
  preferredNetwork: "MAINNET" | "TESTNET";
  gasPreference: "SPONSORED" | "STABLECOIN" | "NATIVE";
  privacyHideBalance: boolean;
  notificationConfig: Record<string, boolean>;
}

export interface LinkedWalletItem {
  id: string;
  userId: string;
  walletAddress: string;
  walletType: "EMBEDDED_MPC" | "EXTERNAL_CORE" | "EXTERNAL_METAMASK";
  isPrimaryReceiving: boolean;
  chainId: number;
  label?: string | null;
  verifiedAt: string;
}

export interface WorkspaceMemberItem {
  id: string;
  fullName: string;
  username?: string | null;
  walletAddress?: string | null;
  role: "ADMIN" | "GUARDIAN" | "ELDERLY" | "CHILD";
  avatarUrl?: string | null;
  joinedAt: string;
}

export interface MemberAllowancePolicyItem {
  id: string;
  workspaceId: string;
  memberUserId: string;
  walletAddress?: string | null;
  role: "ADMIN" | "SPENDER" | "DEPENDENT" | "AI_AGENT";
  dailyLimitAmount: string;
  autoApproveThreshold: string;
  allowedCategories: string[];
  isFrozen: boolean;
  onchainSyncStatus: "SYNCED" | "PENDING_SIGNATURE" | "OUT_OF_SYNC";
  lastTxHash?: string | null;
  updatedAt: string;
}

export interface SessionKeyItem {
  id: string;
  sessionKeyAddress: string;
  label: string;
  permissionsScope: Record<string, any>;
  expiresAt: string;
  isRevoked: boolean;
  revokeTxHash?: string | null;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  actorId: string;
  actorName: string;
  actorAvatar?: string | null;
  actionType: string;
  layer: "OFF_CHAIN" | "ON_CHAIN" | "HYBRID_DUAL";
  metadataDiff: Record<string, any>;
  txHash?: string | null;
  status: "COMPLETED" | "PENDING_CONFIRMATION" | "FAILED";
  createdAt: string;
}

export interface SecurityScoreData {
  score: number;
  level: "Cao" | "Trung bình" | "Cần chú ý";
  factors: string[];
}

export interface SettingsOverviewData {
  user: SettingsUser;
  preferences: UserPreferencesData;
  linkedWallets: LinkedWalletItem[];
  workspace: {
    id: string;
    name: string;
    type: string;
    workspaceCode: string;
    l1HubAddress: string;
    cchainVaultAddress?: string | null;
    userRole: string;
    isAdmin: boolean;
  } | null;
  members: WorkspaceMemberItem[];
  allowancePolicies: MemberAllowancePolicyItem[];
  sessionKeys: SessionKeyItem[];
  auditTimeline: AuditLogItem[];
  security: SecurityScoreData;
}

export function useSettingsData(workspaceId?: string) {
  const [data, setData] = useState<SettingsOverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [lastRefreshed, setLastRefreshed] = useState<number>(Date.now());

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : "";
      const res = await authRequest(`/api/settings/overview${query}`, undefined, "GET");
      if (res && res.data) {
        setData(res.data);
      }
    } catch (err: any) {
      console.error("Lỗi tải thông tin cài đặt:", err);
      setError(err.message || "Không thể tải cài đặt.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview, lastRefreshed]);

  const refresh = useCallback(() => {
    setLastRefreshed(Date.now());
  }, []);

  // 1. Cập nhật preferences Web2
  const updatePreferences = useCallback(
    async (newPreferences: Partial<UserPreferencesData>) => {
      const res = await authRequest("/api/settings/preferences", {
        ...newPreferences,
        workspaceId,
      }, "PUT");
      if (res && res.preferences) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                preferences: { ...prev.preferences, ...res.preferences },
              }
            : null,
        );
      }
      return res;
    },
    [workspaceId],
  );

  // 2. Thêm ví liên kết mới
  const linkWallet = useCallback(
    async (payload: {
      walletAddress: string;
      walletType: "EMBEDDED_MPC" | "EXTERNAL_CORE" | "EXTERNAL_METAMASK";
      label?: string;
      isPrimaryReceiving?: boolean;
    }) => {
      const res = await authRequest("/api/settings/wallets", {
        ...payload,
        workspaceId,
      }, "POST");
      refresh();
      return res;
    },
    [workspaceId, refresh],
  );

  // 3. Đặt ví làm địa chỉ nhận tiền mặc định
  const setPrimaryWallet = useCallback(
    async (walletId: string) => {
      const res = await authRequest(`/api/settings/wallets/${walletId}/primary`, {
        workspaceId,
      }, "PATCH");
      if (data) {
        setData({
          ...data,
          linkedWallets: data.linkedWallets.map((w) => ({
            ...w,
            isPrimaryReceiving: w.id === walletId,
          })),
        });
      }
      return res;
    },
    [workspaceId, data],
  );

  // 4. Chuẩn bị Dual-Sync cho on-chain
  const prepareSync = useCallback(
    async (payload: {
      actionType: "UPDATE_ALLOWANCE" | "FREEZE_MEMBER" | "REVOKE_SESSION";
      targetMemberUserId?: string;
      dailyLimitAmount?: number | string;
      autoApproveThreshold?: number | string;
      allowedCategories?: string[];
      isFrozen?: boolean;
      sessionKeyAddress?: string;
    }) => {
      return await authRequest("/api/settings/prepare-sync", {
        ...payload,
        workspaceId,
      }, "POST");
    },
    [workspaceId],
  );

  // 5. Xác nhận TxHash sau khi ký on-chain
  const confirmSync = useCallback(
    async (payload: {
      pendingLogId?: string;
      txHash: string;
      targetMemberUserId?: string;
    }) => {
      const res = await authRequest("/api/settings/confirm-sync", {
        ...payload,
        workspaceId,
      }, "POST");
      refresh();
      return res;
    },
    [workspaceId, refresh],
  );

  // 6. Đóng băng khẩn cấp 1 chạm
  const freezeMember = useCallback(
    async (memberUserId: string, freeze: boolean) => {
      const res = await authRequest("/api/settings/freeze-member", {
        workspaceId,
        memberUserId,
        freeze,
      }, "POST");
      refresh();
      return res;
    },
    [workspaceId, refresh],
  );

  // 7. Thu hồi Session Key
  const revokeSessionKey = useCallback(
    async (sessionId: string, txHash?: string) => {
      const res = await authRequest("/api/settings/revoke-session", {
        workspaceId,
        sessionId,
        txHash,
      }, "POST");
      refresh();
      return res;
    },
    [workspaceId, refresh],
  );

  return {
    data,
    loading,
    error,
    refresh,
    updatePreferences,
    linkWallet,
    setPrimaryWallet,
    prepareSync,
    confirmSync,
    freezeMember,
    revokeSessionKey,
  };
}
