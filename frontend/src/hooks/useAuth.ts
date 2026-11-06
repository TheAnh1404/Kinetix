"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { createWalletClient, custom } from "viem";
import {
  getCoreProvider,
  setTransactionWorkspace,
  setWalletUseEnabled,
  switchNetwork,
  disconnectSessionProvider,
  clearPrivateTransactions,
  registerTransactionAccount,
} from "@/lib/web3/client";
import { avalancheFamilyL1 } from "@/contracts/config";
import { shareReadRequest, clearReadRequests } from "@/lib/api/readRequests";

export interface AuthUser {
  id: string;
  familyId: string;
  fullName: string;
  role: "ADMIN" | "GUARDIAN" | "ELDERLY" | "CHILD";
  walletAddress: string;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  username?: string;
}
export interface AuthFamily {
  id: string;
  name: string;
  familyCode: string;
  adminWallet: string;
}
export type Onboarding =
  "SET_PASSWORD" | "CHANGE_PASSWORD" | "LINK_WALLET" | "READY";
export async function authRequest(
  path: string,
  body?: unknown,
  method = "POST",
) {
  const request = async () => {
    const response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok)
      throw Object.assign(new Error(data.error || "Không thể xử lý yêu cầu."), {
        code: data.code,
        status: response.status,
        fields: data.fields,
      });
    return data;
  };
  return method.toUpperCase() === "GET" && body === undefined
    ? shareReadRequest(path, request)
    : request();
}
async function signChallenge(
  purpose: "REGISTER" | "LOGIN" | "LINK" | "REAUTH",
  expectedAddress?: string,
) {
  const provider = getCoreProvider();
  if (!provider)
    throw new Error(
      "Chưa có kết nối Core. Trên máy tính hãy mở Core Extension. Kết nối Core Mobile cần WalletConnect được cấu hình cho môi trường này.",
    );
  const accounts: string[] = await provider.request({
    method: "eth_requestAccounts",
  });
  if (!accounts[0]) throw new Error("Chưa kết nối tài khoản Core.");
  if (expectedAddress && accounts[0].toLowerCase() !== expectedAddress.toLowerCase())
    throw new Error("Ví Core đang chọn khác ví trong lời mời. Hãy chuyển đúng tài khoản trước khi ký.");
  let chainId = Number.parseInt(
    await provider.request({ method: "eth_chainId" }),
    16,
  );
  if (chainId !== 43113 && chainId !== avalancheFamilyL1.id) {
    if (!(await switchNetwork(43113)))
      throw new Error("Hãy chuyển Core sang Avalanche Fuji để ký xác minh.");
    chainId = Number.parseInt(
      await provider.request({ method: "eth_chainId" }),
      16,
    );
  }
  const challenge = await authRequest("/api/auth/wallet/challenge", {
    purpose,
    address: accounts[0],
    chainId,
  });
  const signature = await createWalletClient({
    transport: custom(provider),
  }).signMessage({
    account: accounts[0] as `0x${string}`,
    message: challenge.message,
  });
  return { challengeId: challenge.challengeId, signature };
}
function useAuthState() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [family, setFamily] = useState<AuthFamily | null>(null);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [entryWorkspaceId, setEntryWorkspaceId] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState("/dashboard");
  const [onchainPermissions, setOnchainPermissions] = useState<
    {
      id: string;
      workspaceId: string;
      chainId: number;
      status: string;
      txHash: string | null;
    }[]
  >([]);
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [linkedWallet, setLinkedWallet] = useState<{
    address: string;
    verifiedAt: string;
  } | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [providerVersion, setProviderVersion] = useState(0);
  const acceptedUserId = useRef<string | null>(null);
  useEffect(() => {
    const changed = () => setProviderVersion((value) => value + 1);
    window.addEventListener("kinetix-provider-changed", changed);
    return () =>
      window.removeEventListener("kinetix-provider-changed", changed);
  }, []);
  const accept = useCallback((data: any) => {
    if (acceptedUserId.current !== (data.user?.id || null)) clearReadRequests();
    if (acceptedUserId.current && acceptedUserId.current !== data.user?.id) {
      clearPrivateTransactions(acceptedUserId.current);
      setWalletUseEnabled(false);
      void disconnectSessionProvider().catch(() => {});
    }
    acceptedUserId.current = data.user?.id || null;
    if (data.user?.id) registerTransactionAccount(data.user.id);
    setUser(data.user);
    setFamily(data.family || null);
    setWorkspaces(data.workspaces || []);
    setEntryWorkspaceId(data.entryWorkspaceId || data.family?.id || null);
    setRedirectUrl(data.redirectUrl || "/dashboard");
    setOnchainPermissions(data.onchainPermissions || []);
    setOnboarding(data.onboarding);
    setLinkedWallet(data.linkedWallet || null);
    setSessionError(null);
  }, []);
  const clear = useCallback(() => {
    clearReadRequests();
    if (acceptedUserId.current)
      clearPrivateTransactions(acceptedUserId.current);
    acceptedUserId.current = null;
    setSessionError(null);
    setUser(null);
    setFamily(null);
    setWorkspaces([]);
    setEntryWorkspaceId(null);
    setRedirectUrl("/login");
    document.cookie = "kinetix_workspace=; Path=/; Max-Age=0; SameSite=Lax";
    setOnchainPermissions([]);
    setOnboarding(null);
    setLinkedWallet(null);
    setConnectedAddress(null);
    setTransactionWorkspace(null);
    setWalletUseEnabled(false);
    void disconnectSessionProvider().catch(() => {});
    sessionStorage.clear();
    window.dispatchEvent(new Event("kinetix-session-cleared"));
  }, []);
  const checkSession = useCallback(async () => {
    try {
      accept(await authRequest("/api/auth/me", undefined, "GET"));
    } catch (error: any) {
      if (error.status === 401) clear();
      else setSessionError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [accept, clear]);
  useEffect(() => {
    checkSession();
    const onFocus = () => {
      void checkSession();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [checkSession]);
  useEffect(() => {
    const provider = getCoreProvider();
    if (!provider) return;
    const accountsChanged = (accounts: string[]) =>
      setConnectedAddress(accounts[0] || null);
    const chainChanged = (value: string) =>
      setChainId(Number.parseInt(value, 16));
    const disconnected = () => {
      setConnectedAddress(null);
      setChainId(null);
    };
    provider.on?.("accountsChanged", accountsChanged);
    provider.on?.("chainChanged", chainChanged);
    provider.on?.("disconnect", disconnected);
    provider
      .request({ method: "eth_accounts" })
      .then(accountsChanged)
      .catch(disconnected);
    provider
      .request({ method: "eth_chainId" })
      .then(chainChanged)
      .catch(() => setChainId(null));
    return () => {
      provider.removeListener?.("accountsChanged", accountsChanged);
      provider.removeListener?.("chainChanged", chainChanged);
      provider.removeListener?.("disconnect", disconnected);
    };
  }, [user?.id, providerVersion]);
  const finish = async (data: any) => {
    accept(data);
    window.location.assign(data.redirectUrl || "/dashboard");
    return { success: true };
  };
  const login = async (username: string, password: string) =>
    finish(await authRequest("/api/auth/login", { username, password }));
  const loginWithCoreWallet = async () =>
    finish(
      await authRequest("/api/auth/verify-siwe", await signChallenge("LOGIN")),
    );
  const registerFamily = async (params: {
    familyName: string;
    adminName: string;
    username: string;
    password: string;
    phoneNumber?: string;
    invitationToken?: string;
  }) => {
    const preview = params.invitationToken
      ? await authRequest("/api/auth/invitations/preview", { token: params.invitationToken })
      : null;
    return finish(await authRequest("/api/auth/register-family", {
      ...params,
      ...(await signChallenge("REGISTER", preview?.invitation.expectedWallet)),
    }));
  };
  const changePassword = async (
    currentPassword: string,
    newPassword: string,
  ) => {
    const data = await authRequest("/api/auth/change-password", {
      currentPassword,
      newPassword,
    });
    accept(data);
    return data;
  };
  const setupCredentials = async (username: string, password: string) => {
    const data = await authRequest("/api/auth/credentials", {
      username,
      password,
    });
    accept(data);
    return data;
  };
  const linkWallet = async () => {
    const data = await authRequest(
      "/api/auth/wallet/link",
      await signChallenge("LINK"),
    );
    accept(data);
    return data;
  };
  const reauthenticate = async () =>
    authRequest("/api/auth/reauthenticate", await signChallenge("REAUTH"));
  const logout = async () => {
    await authRequest("/api/auth/logout", {});
    if (user) clearPrivateTransactions(user.id);
    clear();
    window.location.assign("/login");
  };
  const connectWallet = async () => {
    const provider = getCoreProvider();
    if (!provider)
      throw new Error(
        "Chưa có kết nối Core. Máy tính: mở Core Extension. Điện thoại: môi trường cần cấu hình WalletConnect; có thể xem dữ liệu mà không mở ví.",
      );
    setWalletUseEnabled(true);
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    setConnectedAddress(accounts[0] || null);
  };
  const disconnectWallet = () => {
    setWalletUseEnabled(false);
    setConnectedAddress(null);
  };
  return {
    user,
    family,
    workspaces,
    entryWorkspaceId,
    redirectUrl,
    onchainPermissions,
    onboarding,
    linkedWallet,
    connectedAddress,
    chainId,
    sessionError,
    walletMatches:
      !!linkedWallet &&
      connectedAddress?.toLowerCase() === linkedWallet.address.toLowerCase(),
    role: user?.role || null,
    isLoading,
    isAuthenticated: !!user,
    login,
    loginWithCoreWallet,
    registerFamily,
    changePassword,
    setupCredentials,
    linkWallet,
    reauthenticate,
    logout,
    checkSession,
    connectWallet,
    disconnectWallet,
    isWalletExtensionAvailable: () => !!getCoreProvider(),
  };
}
const AuthContext = createContext<ReturnType<typeof useAuthState> | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const value = useAuthState();
  return React.createElement(AuthContext.Provider, { value }, children);
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth requires AuthProvider");
  return context;
}
