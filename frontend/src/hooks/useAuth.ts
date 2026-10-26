"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createWalletClient, custom } from "viem";

export interface AuthUser {
  id: string;
  familyId: string;
  fullName: string;
  role: "ADMIN" | "GUARDIAN" | "ELDERLY" | "CHILD";
  walletAddress: string;
  avatarUrl?: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  // Kiểm tra phiên đăng nhập hiện tại từ server
  const checkSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
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
   * 1. Đăng nhập bằng ví Avalanche Core Wallet qua chuẩn SIWE EIP-4361
   */
  const loginWithCoreWallet = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      const provider =
        (typeof window !== "undefined" && (window.avalanche || window.ethereum)) || null;

      if (!provider) {
        return {
          success: false,
          error: "Chưa phát hiện tiện ích ví Avalanche Core Wallet. Hãy cài đặt extension hoặc sử dụng nút 'Trải nghiệm nhanh Ví Core Mẫu' bên dưới!",
        };
      }

      // Lấy danh sách tài khoản
      let accounts: string[];
      try {
        accounts = await provider.request({ method: "eth_requestAccounts" });
      } catch (reqErr: any) {
        if (reqErr?.code === 4001 || reqErr?.message?.includes("rejected")) {
          return { success: false, error: "Bạn đã từ chối cấp quyền kết nối ví." };
        }
        if (reqErr?.code === -32002) {
          return { success: false, error: "Yêu cầu kết nối ví đang chờ xử lý. Vui lòng mở popup ví để xác nhận." };
        }
        throw reqErr;
      }

      if (!accounts || accounts.length === 0) {
        return { success: false, error: "Người dùng đã từ chối cấp quyền truy cập ví" };
      }
      const address = accounts[0];

      // Lấy nonce ngẫu nhiên từ server
      let nonce: string = "kntx-" + Date.now();
      try {
        const nonceRes = await fetch("/api/auth/nonce");
        const nonceData = await nonceRes.json();
        if (nonceData.nonce) nonce = nonceData.nonce;
      } catch (e) {
        console.warn("Nonce fetch warning:", e);
      }

      // Chuẩn hóa thông điệp SIWE EIP-4361
      const domain = typeof window !== "undefined" ? window.location.host : "localhost:3000";
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const chainId = 43114; // Family L1 (hoặc 43113 Fuji)
      const issuedAt = new Date().toISOString();

      const message = `${domain} wants you to sign in with your Ethereum account:
${address}

Sign in to Kinetix - The Multi-Generational Family Finance OS on Avalanche

URI: ${origin}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${issuedAt}`;

      // Ký thông điệp bằng Viem walletClient (tự động chuyển mã hex chuẩn xác)
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
        if (signErr?.code === 4001 || signErr?.message?.includes("rejected") || signErr?.message?.includes("User rejected")) {
          return { success: false, error: "Bạn đã hủy ký thông điệp xác thực trên ví." };
        }
        console.warn("Viem signMessage fallback to personal_sign:", signErr);
        try {
          const { stringToHex } = await import("viem");
          signature = await provider.request({
            method: "personal_sign",
            params: [stringToHex(message), address],
          });
        } catch (hexErr: any) {
          if (hexErr?.code === 4001 || hexErr?.message?.includes("rejected")) {
            return { success: false, error: "Bạn đã hủy ký thông điệp xác thực trên ví." };
          }
          signature = await provider.request({
            method: "personal_sign",
            params: [message, address],
          });
        }
      }

      // Gửi chữ ký lên server xác thực
      const verifyRes = await fetch("/api/auth/verify-siwe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature, address }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        return { success: false, error: verifyData.error || "Xác thực chữ ký thất bại" };
      }

      setUser(verifyData.user);
      router.push("/?tab=quan-tri-cha-me");
      return { success: true };
    } catch (err: any) {
      console.error("Lỗi loginWithCoreWallet:", err);
      return { success: false, error: err.message || "Lỗi kết nối hoặc chữ ký bị từ chối" };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 2. Đăng nhập nhanh cho Ông Bà / Trẻ Nhỏ (mã PIN hoặc 1-chạm)
   */
  const loginAsFamilyMember = async (
    userId?: string,
    role?: string,
    pinCode?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/family-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role, pinCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Đăng nhập gia đình thất bại" };
      }

      setUser(data.user);
      if (data.redirectUrl) {
        router.push(data.redirectUrl);
      }
      return { success: true };
    } catch (err: any) {
      console.error("Lỗi loginAsFamilyMember:", err);
      return { success: false, error: err.message || "Lỗi xử lý đăng nhập" };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 3. Đăng nhập nhanh ví Core Wallet Bố Ba (Dành cho demo / giám khảo không cần cài extension)
   */
  const loginWithDemoAdmin = async (): Promise<{ success: boolean; error?: string }> => {
    return loginAsFamilyMember(undefined, "ADMIN", "1234");
  };

  /**
   * 4. Chuyển đổi nhanh vai diễn Demo khi quay video / thuyết trình
   */
  const switchDemoPersona = async (
    role: "ADMIN" | "GUARDIAN" | "ELDERLY" | "CHILD"
  ) => {
    await loginAsFamilyMember(undefined, role, "1234");
  };

  /**
   * 5. Đăng xuất
   */
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/login");
    } catch (err) {
      console.error("Lỗi đăng xuất:", err);
    }
  };

  return {
    user,
    role: user?.role || null,
    isLoading,
    isAuthenticated: !!user,
    isWalletExtensionAvailable,
    loginWithCoreWallet,
    loginWithDemoAdmin,
    loginAsFamilyMember,
    switchDemoPersona,
    logout,
    checkSession,
  };
}
