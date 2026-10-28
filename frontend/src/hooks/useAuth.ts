"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createWalletClient, custom } from "viem";
import { switchNetwork } from "@/lib/web3/client";

export interface AuthUser {
  id: string;
  familyId: string;
  fullName: string;
  role: "ADMIN" | "GUARDIAN" | "ELDERLY" | "CHILD";
  walletAddress: string;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
}

export interface AuthFamily {
  id: string;
  name: string;
  familyCode: string;
  adminWallet: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [family, setFamily] = useState<AuthFamily | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  // 1. Kiểm tra phiên đăng nhập hiện tại từ server (/api/auth/me)
  const checkSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        if (data.family) {
          setFamily(data.family);
        }
      } else {
        setUser(null);
        setFamily(null);
      }
    } catch (err) {
      setUser(null);
      setFamily(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  /**
   * Kiểm tra tiện ích ví Avalanche Core hoặc Web3 Provider
   */
  const isWalletExtensionAvailable = (): boolean => {
    if (typeof window === "undefined") return false;
    return !!(window.avalanche || window.ethereum);
  };

  /**
   * 2. Lấy nonce ngẫu nhiên từ server
   */
  const getNonce = async (): Promise<string> => {
    try {
      const res = await fetch("/api/auth/nonce");
      const data = await res.json();
      if (data.nonce) return data.nonce;
    } catch (e) {
      console.warn("Nonce warning:", e);
    }
    return "kntx-" + Date.now();
  };

  /**
   * 3. Kiểm tra địa chỉ ví đã đăng ký trong hệ thống chưa
   */
  const checkWalletRegistration = async (
    address: string
  ): Promise<{ isRegistered: boolean; user?: any; family?: any }> => {
    try {
      const res = await fetch(`/api/auth/check-wallet?address=${encodeURIComponent(address)}`);
      const data = await res.json();
      return {
        isRegistered: !!data.isRegistered,
        user: data.user,
        family: data.family,
      };
    } catch (err) {
      return { isRegistered: false };
    }
  };

  /**
   * 4. Helper ký thông điệp SIWE EIP-4361
   */
  const signSiweMessage = async (
    provider: any,
    address: string,
    statement: string = "Sign in to Kinetix - The Multi-Generational Family Finance OS on Avalanche"
  ): Promise<{ message: string; signature: string }> => {
    const nonce = await getNonce();
    const domain = typeof window !== "undefined" ? window.location.host : "localhost:3000";
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

    // 1. Tự động phát hiện Chain ID hiện tại của ví Core Wallet để tránh lỗi "Unsupported network"
    let chainId = 43113; // Mặc định Avalanche Fuji Testnet
    try {
      const chainIdHex = await provider.request({ method: "eth_chainId" });
      if (chainIdHex) {
        const detectedChainId = parseInt(chainIdHex, 16);
        // Nếu ví đang ở Fuji (43113) hoặc Avalanche Mainnet / Family L1 (43114 / 99999)
        if (detectedChainId === 43113 || detectedChainId === 43114 || detectedChainId === 99999) {
          chainId = detectedChainId;
        } else {
          // Nếu ví đang ở mạng khác (Ethereum, Polygon...), tự động yêu cầu chuyển sang Avalanche Fuji
          const switched = await switchNetwork(43113);
          if (switched) {
            chainId = 43113;
          } else {
            chainId = detectedChainId;
          }
        }
      }
    } catch (chainErr) {
      console.warn("Lỗi kiểm tra hoặc chuyển mạng ví:", chainErr);
    }

    const issuedAt = new Date().toISOString();

    const message = `${domain} wants you to sign in with your Ethereum account:
${address}

${statement}

URI: ${origin}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${issuedAt}`;

    let signature: string;
    try {
      const walletClient = createWalletClient({
        transport: custom(provider),
      });
      signature = await walletClient.signMessage({
        account: address as `0x${string}`,
        message,
      });
    } catch (signErr: any) {
      if (
        signErr?.code === 4001 ||
        signErr?.message?.includes("rejected") ||
        signErr?.message?.includes("User rejected")
      ) {
        throw new Error("Bạn đã hủy ký thông điệp xác thực trên ví.");
      }
      // Fallback personal_sign
      const { stringToHex } = await import("viem");
      signature = await provider.request({
        method: "personal_sign",
        params: [stringToHex(message), address],
      });
    }

    return { message, signature };
  };

  /**
   * 5. Đăng ký Gia đình mới (Register New Family)
   */
  const registerFamily = async (params: {
    familyName: string;
    adminName: string;
    phoneNumber?: string;
    pinCode?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const provider =
        (typeof window !== "undefined" && (window.avalanche || window.ethereum)) || null;

      if (!provider) {
        return {
          success: false,
          error: "Vui lòng cài đặt tiện ích ví Avalanche Core để tạo gia đình mới.",
        };
      }

      const accounts: string[] = await provider.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) {
        return { success: false, error: "Người dùng từ chối cấp quyền truy cập ví." };
      }
      const address = accounts[0];

      // Ký SIWE
      const { message, signature } = await signSiweMessage(
        provider,
        address,
        `Create and Register Family '${params.familyName}' on Kinetix OS`
      );

      // Gửi lên backend
      const res = await fetch("/api/auth/register-family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyName: params.familyName,
          adminName: params.adminName,
          phoneNumber: params.phoneNumber,
          pinCode: params.pinCode,
          walletAddress: address,
          message,
          signature,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Đăng ký gia đình thất bại." };
      }

      setUser(data.user);
      setFamily(data.family);
      router.push("/?tab=quan-tri-cha-me");
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Lỗi xử lý đăng ký gia đình." };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 6. Tham gia Gia đình bằng Family Code (Join Family)
   */
  const joinFamily = async (params: {
    familyCode: string;
    memberName: string;
    phoneNumber?: string;
    pinCode?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const provider =
        (typeof window !== "undefined" && (window.avalanche || window.ethereum)) || null;

      if (!provider) {
        return {
          success: false,
          error: "Vui lòng cài đặt tiện ích ví Avalanche Core để tham gia gia đình.",
        };
      }

      const accounts: string[] = await provider.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) {
        return { success: false, error: "Người dùng từ chối cấp quyền truy cập ví." };
      }
      const address = accounts[0];

      // Ký SIWE
      const { message, signature } = await signSiweMessage(
        provider,
        address,
        `Join Family with code '${params.familyCode}' on Kinetix OS`
      );

      // Gửi lên backend
      const res = await fetch("/api/auth/join-family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyCode: params.familyCode,
          memberName: params.memberName,
          phoneNumber: params.phoneNumber,
          pinCode: params.pinCode,
          walletAddress: address,
          message,
          signature,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Tham gia gia đình thất bại." };
      }

      setUser(data.user);
      setFamily(data.family);
      router.push("/?tab=quan-tri-cha-me");
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Lỗi xử lý tham gia gia đình." };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 7. Đăng nhập bằng Ví Avalanche Core (SIWE Login)
   */
  const loginWithCoreWallet = async (): Promise<{
    success: boolean;
    error?: string;
    isUnregistered?: boolean;
    unregisteredAddress?: string;
  }> => {
    try {
      setIsLoading(true);

      const provider =
        (typeof window !== "undefined" && (window.avalanche || window.ethereum)) || null;

      if (!provider) {
        return {
          success: false,
          error: "Chưa phát hiện tiện ích ví Avalanche Core Wallet. Vui lòng cài đặt tại core.app để tiếp tục.",
        };
      }

      let accounts: string[];
      try {
        accounts = await provider.request({ method: "eth_requestAccounts" });
      } catch (reqErr: any) {
        if (reqErr?.code === 4001 || reqErr?.message?.includes("rejected")) {
          return { success: false, error: "Bạn đã từ chối cấp quyền kết nối ví." };
        }
        if (reqErr?.code === -32002) {
          return {
            success: false,
            error: "Yêu cầu kết nối ví đang chờ xử lý. Vui lòng mở popup ví để xác nhận.",
          };
        }
        throw reqErr;
      }

      if (!accounts || accounts.length === 0) {
        return { success: false, error: "Không tìm thấy địa chỉ tài khoản nào từ ví." };
      }
      const address = accounts[0];

      // Ký thông điệp SIWE
      const { message, signature } = await signSiweMessage(provider, address);

      // Gửi lên server xác thực
      const verifyRes = await fetch("/api/auth/verify-siwe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature, address }),
      });

      const verifyData = await verifyRes.json();

      // Nếu ví chưa đăng ký
      if (!verifyRes.ok) {
        if (verifyData.code === "WALLET_NOT_REGISTERED") {
          return {
            success: false,
            isUnregistered: true,
            unregisteredAddress: address,
            error: verifyData.error,
          };
        }
        return {
          success: false,
          error: verifyData.error || "Xác thực chữ ký ví thất bại.",
        };
      }

      setUser(verifyData.user);
      if (verifyData.family) {
        setFamily(verifyData.family);
      }

      if (verifyData.redirectUrl) {
        router.push(verifyData.redirectUrl);
      } else {
        router.push("/?tab=quan-tri-cha-me");
      }
      return { success: true };
    } catch (err: any) {
      console.error("Lỗi loginWithCoreWallet:", err);
      return { success: false, error: err.message || "Lỗi kết nối ví." };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 8. Đăng nhập Thành viên Gia đình (Credentials: Family Code + Tên/SĐT + PIN)
   */
  const loginAsMember = async (params: {
    familyCode: string;
    identifier: string;
    pinCode: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/member-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error || "Đăng nhập thành viên gia đình thất bại.",
        };
      }

      setUser(data.user);
      if (data.family) {
        setFamily(data.family);
      }

      if (data.redirectUrl) {
        router.push(data.redirectUrl);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Lỗi xử lý đăng nhập thành viên." };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 9. Đăng xuất
   */
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setFamily(null);
      router.push("/login");
    } catch (err) {
      console.error("Lỗi đăng xuất:", err);
    }
  };

  return {
    user,
    family,
    role: user?.role || null,
    isLoading,
    isAuthenticated: !!user,
    isWalletExtensionAvailable,
    checkWalletRegistration,
    registerFamily,
    joinFamily,
    loginWithCoreWallet,
    loginAsMember,
    logout,
    checkSession,
  };
}
