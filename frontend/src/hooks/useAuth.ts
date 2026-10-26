"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

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
   * 1. Đăng nhập bằng ví Avalanche Core Wallet qua chuẩn SIWE EIP-4361
   */
  const loginWithCoreWallet = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      // Kiểm tra extension ví Avalanche Core hoặc Web3 Provider
      const provider = (typeof window !== "undefined" && (window.avalanche || window.ethereum)) || null;
      if (!provider) {
        return {
          success: false,
          error: "Vui lòng cài đặt và kích hoạt tiện ích ví Avalanche Core Wallet!",
        };
      }

      // Lấy địa chỉ ví
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) {
        return { success: false, error: "Người dùng đã từ chối cấp quyền truy cập ví" };
      }
      const address = accounts[0];

      // Lấy nonce ngẫu nhiên từ server
      const nonceRes = await fetch("/api/auth/nonce");
      const { nonce } = await nonceRes.json();

      // Chuẩn hóa thông điệp SIWE EIP-4361
      const domain = window.location.host;
      const origin = window.location.origin;
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

      // Kích hoạt popup ví ký thông điệp (personal_sign)
      const signature = await provider.request({
        method: "personal_sign",
        params: [message, address],
      });

      // Gửi chữ ký lên server xác thực
      const verifyRes = await fetch("/api/auth/verify-siwe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature }),
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
      return { success: false, error: err.message || "Lỗi kết nối ví Core Wallet" };
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
   * 3. Chuyển đổi nhanh vai diễn Demo khi quay video / thuyết trình
   */
  const switchDemoPersona = async (
    role: "ADMIN" | "GUARDIAN" | "ELDERLY" | "CHILD"
  ) => {
    await loginAsFamilyMember(undefined, role, "1234");
  };

  /**
   * 4. Đăng xuất
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
    loginWithCoreWallet,
    loginAsFamilyMember,
    switchDemoPersona,
    logout,
    checkSession,
  };
}
