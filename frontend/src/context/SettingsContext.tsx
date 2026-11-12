"use client";

import manifest from "../../../shared/deployment.json";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";

export type AppTheme = "light" | "dark";
export type DisplayCurrency = "AVAX" | "VND" | "USD";
export type UiMode = "LITE" | "PRO";
export type GasPreference = "SPONSORED" | "STABLECOIN" | "NATIVE";

export interface DualChainLatency {
  fujiCChainMs: number | null;
  familyL1Ms: number | null;
  isChecking: boolean;
}

interface SettingsContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  displayCurrency: DisplayCurrency;
  setDisplayCurrency: (currency: DisplayCurrency) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  latency: DualChainLatency;
  checkLatency: () => Promise<void>;
  formatCurrency: (amountInAvax: number) => string;
  playActionSound: (type?: "success" | "alert") => void;
  // Mở rộng cho mô hình Hybrid Web2 + Web3 Finance:
  uiMode: UiMode;
  setUiMode: (mode: UiMode) => void;
  toggleUiMode: () => void;
  gasPreference: GasPreference;
  setGasPreference: (pref: GasPreference) => void;
  privacyHideBalance: boolean;
  setPrivacyHideBalance: (hide: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = useState<AppTheme>("light");
  const [displayCurrency, setDisplayCurrencyState] =
    useState<DisplayCurrency>("AVAX");
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(true);
  const [uiMode, setUiModeState] = useState<UiMode>("LITE");
  const [gasPreference, setGasPreferenceState] =
    useState<GasPreference>("SPONSORED");
  const [privacyHideBalance, setPrivacyHideBalanceState] =
    useState<boolean>(false);
  const [latency, setLatency] = useState<DualChainLatency>({
    fujiCChainMs: null,
    familyL1Ms: null,
    isChecking: false,
  });

  // Khởi tạo từ localStorage khi chạy trên trình duyệt và đồng bộ với class dark trên <html>
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(
        "kinetix_theme",
      ) as AppTheme | null;
      let effectiveTheme: AppTheme = "light";
      if (savedTheme === "dark" || savedTheme === "light") {
        effectiveTheme = savedTheme;
      }

      setThemeState(effectiveTheme);
      if (effectiveTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }

      // Lắng nghe sự kiện storage khi người dùng đổi theme ở tab khác
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === "kinetix_theme" && (e.newValue === "dark" || e.newValue === "light")) {
          const newT = e.newValue as AppTheme;
          setThemeState(newT);
          if (newT === "dark") {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        }
      };
      window.addEventListener("storage", handleStorageChange);

      const savedCurrency = localStorage.getItem(
        "kinetix_currency",
      ) as DisplayCurrency | null;
      if (savedCurrency === "AVAX") {
        setDisplayCurrencyState(savedCurrency);
      }

      const savedSound = localStorage.getItem("kinetix_sound");
      if (savedSound !== null) {
        setSoundEnabledState(savedSound === "true");
      }

      const savedUiMode = localStorage.getItem("kinetix_ui_mode") as UiMode | null;
      if (savedUiMode === "LITE" || savedUiMode === "PRO") {
        setUiModeState(savedUiMode);
      }

      const savedGas = localStorage.getItem("kinetix_gas_pref") as GasPreference | null;
      if (savedGas && ["SPONSORED", "STABLECOIN", "NATIVE"].includes(savedGas)) {
        setGasPreferenceState(savedGas);
      }

      const savedHideBalance = localStorage.getItem("kinetix_hide_balance");
      if (savedHideBalance !== null) {
        setPrivacyHideBalanceState(savedHideBalance === "true");
      }

      return () => {
        window.removeEventListener("storage", handleStorageChange);
      };
    } catch (e) {
      console.warn("Lỗi đọc settings từ localStorage:", e);
    }
  }, []);

  const setTheme = useCallback((newTheme: AppTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("kinetix_theme", newTheme);
      if (newTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      window.dispatchEvent(
        new CustomEvent("kinetix-theme-change", { detail: newTheme })
      );
    } catch (e) {
      console.warn("Lỗi lưu theme:", e);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const nextTheme: AppTheme = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("kinetix_theme", nextTheme);
        if (nextTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
        window.dispatchEvent(
          new CustomEvent("kinetix-theme-change", { detail: nextTheme })
        );
      } catch (e) {
        console.warn("Lỗi lưu theme:", e);
      }
      return nextTheme;
    });
  }, []);

  const setDisplayCurrency = useCallback((currency: DisplayCurrency) => {
    if (currency !== "AVAX") return;
    setDisplayCurrencyState(currency);
    try {
      localStorage.setItem("kinetix_currency", currency);
    } catch (e) {
      console.warn("Lỗi lưu currency:", e);
    }
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      localStorage.setItem("kinetix_sound", String(enabled));
    } catch (e) {
      console.warn("Lỗi lưu sound setting:", e);
    }
  }, []);

  const setUiMode = useCallback((mode: UiMode) => {
    setUiModeState(mode);
    try {
      localStorage.setItem("kinetix_ui_mode", mode);
    } catch (e) {
      console.warn("Lỗi lưu uiMode:", e);
    }
  }, []);

  const toggleUiMode = useCallback(() => {
    setUiModeState((prev) => {
      const next = prev === "LITE" ? "PRO" : "LITE";
      try {
        localStorage.setItem("kinetix_ui_mode", next);
      } catch (e) {
        console.warn("Lỗi lưu uiMode:", e);
      }
      return next;
    });
  }, []);

  const setGasPreference = useCallback((pref: GasPreference) => {
    setGasPreferenceState(pref);
    try {
      localStorage.setItem("kinetix_gas_pref", pref);
    } catch (e) {
      console.warn("Lỗi lưu gasPreference:", e);
    }
  }, []);

  const setPrivacyHideBalance = useCallback((hide: boolean) => {
    setPrivacyHideBalanceState(hide);
    try {
      localStorage.setItem("kinetix_hide_balance", String(hide));
    } catch (e) {
      console.warn("Lỗi lưu privacyHideBalance:", e);
    }
  }, []);

  // Kiểm tra độ trễ mạng Dual-Chain (Fuji C-Chain vs Family L1)
  const checkLatency = useCallback(async () => {
    setLatency({ fujiCChainMs: null, familyL1Ms: null, isChecking: true });
    const start = performance.now();
    try {
      const response = await fetch(manifest.rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_chainId",
          params: [],
        }),
        signal: AbortSignal.timeout(8000),
      });
      const result = await response.json();
      if (
        !response.ok ||
        Number.parseInt(result.result, 16) !== manifest.chainId
      )
        throw new Error("RPC_CHAIN_MISMATCH");
      setLatency({
        fujiCChainMs: Math.round(performance.now() - start),
        familyL1Ms: null,
        isChecking: false,
      });
    } catch {
      setLatency({ fujiCChainMs: null, familyL1Ms: null, isChecking: false });
    }
  }, []);

  const formatCurrency = useCallback(
    (amountInAvax: number) =>
      `${amountInAvax.toLocaleString("en-US", { maximumFractionDigits: 18 })} AVAX`,
    [],
  );

  // Âm thanh phản hồi hành động (Web Audio API không cần load file ngoài)
  const playActionSound = useCallback(
    (type: "success" | "alert" = "success") => {
      if (!soundEnabled || typeof window === "undefined") return;
      try {
        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === "success") {
          // Âm thanh chúc mừng thanh thoát (Chime)
          osc.type = "sine";
          osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
          osc.frequency.exponentialRampToValueAtTime(
            880,
            ctx.currentTime + 0.15,
          ); // A5
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.35);
        } else {
          // Âm thanh cảnh báo (Beep)
          osc.type = "triangle";
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(
            330,
            ctx.currentTime + 0.2,
          );
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.3);
        }
      } catch (e) {
        // Trình duyệt chặn autoplay audio, bỏ qua an toàn
      }
    },
    [soundEnabled],
  );

  return (
    <SettingsContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        displayCurrency,
        setDisplayCurrency,
        soundEnabled,
        setSoundEnabled,
        latency,
        checkLatency,
        formatCurrency,
        playActionSound,
        uiMode,
        setUiMode,
        toggleUiMode,
        gasPreference,
        setGasPreference,
        privacyHideBalance,
        setPrivacyHideBalance,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings phải được dùng bên trong SettingsProvider");
  }
  return context;
};
