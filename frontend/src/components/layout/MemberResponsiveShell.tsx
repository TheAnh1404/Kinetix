"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  Home,
  HeartHandshake,
  ListChecks,
  Gift,
  PiggyBank,
  UserRound,
  ReceiptText,
  LogOut,
  ArrowUpRight,
  Volume2,
  VolumeX,
  Settings2,
  Sun,
  Moon,
  ShieldCheck,
  FileCheck2,
  Sparkles,
  HandCoins,
  ChevronDown,
  Check,
  Radio,
  Info,
  X,
  Layers,
  ArrowLeftRight,
} from "lucide-react";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/context/SettingsContext";
import { MemberMobileDock } from "@/components/navigation/MemberMobileDock";
import { RoleType } from "@/types";
import { KinetixLogo } from "@/components/ui/KinetixLogo";

/* ========================================================================= */
/* NGỮ CẢNH TRỢ NĂNG (ACCESSIBILITY PREFERENCES CONTEXT)                    */
/* Hỗ trợ chữ cực đại và giọng đọc Tiếng Việt cho Người cao tuổi & Trẻ nhỏ  */
/* ========================================================================= */
interface MemberPreferencesContextType {
  largeText: boolean;
  voice: boolean;
  toggleLarge: () => void;
  toggleVoice: () => void;
  read: (text: string) => void;
}

const Preferences = createContext<MemberPreferencesContextType>({
  largeText: false,
  voice: false,
  toggleLarge: () => {},
  toggleVoice: () => {},
  read: (_text: string) => {},
});

export const useMemberPreferences = () => useContext(Preferences);

/* ========================================================================= */
/* THANH ĐIỀU HƯỚNG MÀN HÌNH LỚN / DESKTOP (ROLE NAVIGATION)                */
/* Hiển thị trên thanh bên trái (Sidebar) khi xem trên máy tính bảng/PC     */
/* ========================================================================= */
export function RoleNavigation({ elderly }: { elderly: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const source = searchParams.get("source");
  const auth = useAuth();
  const family = useFamily();

  const currentMembership = auth.workspaces.find(
    (item) => item.id === family.currentWorkspace?.id
  );
  const isGuardian = currentMembership?.role === "GUARDIAN";
  const isElderly = elderly || currentMembership?.role === "ELDERLY";

  // Cấu hình danh mục điều hướng cho màn hình lớn theo từng vai trò
  const entries = isGuardian
    ? [
        { href: "/dashboard/member", label: "Hũ an sinh", Icon: ShieldCheck },
        { href: "/dashboard/elderly/requests", label: "Duyệt yêu cầu", Icon: FileCheck2 },
        { href: "/dashboard/kids", label: "Việc nhà", Icon: ListChecks },
        { href: "/dashboard/rosca", label: "Góp vốn", Icon: ReceiptText },
        { href: "/dashboard/tools", label: "Giao dịch", Icon: Layers },
        { href: "/settings", label: "Cài đặt", Icon: Settings2 },
      ]
    : isElderly
      ? [
          { href: "/dashboard/elderly", label: "Trang chính", Icon: Home },
          { href: "/dashboard/elderly/requests", label: "Yêu cầu trợ cấp", Icon: HandCoins },
          { href: "/dashboard/elderly/family", label: "Người thân", Icon: HeartHandshake },
          { href: "/dashboard/rosca", label: "Góp vốn", Icon: ReceiptText },
          { href: "/dashboard/tools", label: "Giao dịch", Icon: Layers },
          { href: "/settings", label: "Cài đặt", Icon: Settings2 },
        ]
      : [
          { href: "/dashboard/kids", label: "Hôm nay", Icon: Home },
          { href: "/dashboard/kids/chores", label: "Việc của con", Icon: ListChecks },
          { href: "/dashboard/kids/rewards", label: "Heo đất & Thưởng", Icon: PiggyBank },
          { href: "/dashboard/kids/profile", label: "Của con", Icon: UserRound },
          { href: "/dashboard/rosca", label: "Góp vốn", Icon: ReceiptText },
          { href: "/settings", label: "Cài đặt", Icon: Settings2 },
        ];

  return (
    <nav className="role-navigation" aria-label="Điều hướng thành viên">
      {entries.map(({ href, label, Icon }, index) => {
        const active =
          index === 0
            ? pathname === href || pathname.includes("/withdraw")
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={
              source === "contract" && href.startsWith("/dashboard/") && href !== "/dashboard/tools"
                ? `${href}?source=contract`
                : href
            }
            aria-current={active ? "page" : undefined}
            className={active ? "active" : ""}
          >
            <Icon size={22} aria-hidden="true" />
            <span>{label}</span>
            <ArrowUpRight className="nav-arrow" size={18} aria-hidden="true" />
          </Link>
        );
      })}
    </nav>
  );
}

/* ========================================================================= */
/* KHUNG GIAO DIỆN THÀNH VIÊN ĐA THIẾT BỊ (MEMBER RESPONSIVE SHELL)          */
/* Hỗ trợ ELDERLY, CHILD, GUARDIAN theo chuẩn ui-ux-pro-max                  */
/* ========================================================================= */
export function MemberResponsiveShell({
  children,
  elderly = false,
  role,
}: {
  children: React.ReactNode;
  elderly?: boolean;
  role?: RoleType;
}) {
  const auth = useAuth();
  const family = useFamily();
  const router = useRouter();
  const { theme, toggleTheme } = useSettings();

  // Xác định vai trò chính xác của thành viên trong Không gian đang chọn
  const currentMembership = auth.workspaces.find(
    (item) => item.id === family.currentWorkspace?.id
  );
  const detectedRole: RoleType =
    role ||
    (family.currentWorkspace?.role as RoleType) ||
    (family.currentWorkspace?.userRole as RoleType) ||
    (currentMembership?.role as RoleType) ||
    (elderly ? "ELDERLY" : "CHILD");

  const isElderly = detectedRole === "ELDERLY" || Boolean(elderly);
  const isGuardian = detectedRole === "GUARDIAN";
  const isChild = !isElderly && !isGuardian;
  const effectiveRole: RoleType = isElderly
    ? "ELDERLY"
    : isGuardian
      ? "GUARDIAN"
      : "CHILD";

  // Quản lý trạng thái trợ năng (Phóng to chữ & Giọng đọc Tiếng Việt)
  const [largeText, setLargeText] = useState(false);
  const [voice, setVoice] = useState(false);
  const [error, setError] = useState("");
  const [loadedKey, setLoadedKey] = useState("");

  // Quản lý trạng thái mở các trình đơn thả xuống trên thanh tiêu đề Mobile
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isTelemetryModalOpen, setIsTelemetryModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const key = `kinetix-accessibility:${auth.user?.id}`;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "{}");
      setLargeText(!!saved.largeText);
      setVoice(!!saved.voice);
    } catch {
      /* giá trị lỗi dùng mặc định */
    }
    setLoadedKey(key);
    return () => window.speechSynthesis?.cancel();
  }, [key]);

  useEffect(() => {
    if (loadedKey === key) {
      try {
        localStorage.setItem(key, JSON.stringify({ largeText, voice }));
      } catch {
        /* tùy chọn vẫn dùng trong phiên */
      }
    }
  }, [largeText, voice, key, loadedKey]);

  // Đóng trình đơn khi nhấn chuột ra ngoài vùng dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        workspaceRef.current &&
        !workspaceRef.current.contains(event.target as Node)
      ) {
        setIsWorkspaceMenuOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const read = (text: string) => {
    if (!voice || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "vi-VN";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  const toggleVoice = () => {
    window.speechSynthesis?.cancel();
    setVoice((value) => !value);
  };

  const handleLogout = async () => {
    try {
      await auth.logout();
      router.push("/login");
    } catch (err: any) {
      setError(err?.message || "Không thể đăng xuất");
    }
  };

  // Ký tự viết tắt tên người dùng hiển thị trên Avatar
  const userInitial = (auth.user?.fullName || "T")
    .trim()
    .charAt(0)
    .toUpperCase();

  // Nhãn hiển thị vai trò theo chuẩn tiếng Việt thân thiện
  const roleDisplayLabel = isElderly
    ? "Ông Bà · An Sinh"
    : isGuardian
      ? "Người Giám Hộ"
      : "Bé Yêu · Việc Nhà";

  const roleThemeClass = isElderly
    ? "elderly-theme"
    : isGuardian
      ? "guardian-theme"
      : "kids-theme";

  return (
    <Preferences.Provider
      value={{
        largeText,
        voice,
        toggleLarge: () => setLargeText((value) => !value),
        toggleVoice,
        read,
      }}
    >
      <div
        className={`member-app ${roleThemeClass} ${
          largeText ? "member-large-text" : ""
        }`}
      >
        <a className="skip-link" href="#member-main">
          Đến nội dung chính
        </a>

        {/* ============================================================== */}
        {/* SIDEBAR BÊN TRÁI: HIỂN THỊ TRÊN MÀN HÌNH DESKTOP (>= 768px)    */}
        {/* ============================================================== */}
        <aside className="member-sidebar">
          <Link
            className="flex items-center gap-3 select-none mb-1 group"
            href={
              isGuardian
                ? "/dashboard/member"
                : isElderly
                  ? "/dashboard/elderly"
                  : "/dashboard/kids"
            }
          >
            <KinetixLogo size="md" subtitle="Gia Đình" />
          </Link>
          <p className="sidebar-caption">GIA ĐÌNH LUÔN BÊN BẠN</p>
          <RoleNavigation elderly={isElderly} />
          <div className="sidebar-note">
            <HeartHandshake aria-hidden="true" size={30} />
            <p>
              Mỗi việc nhỏ,
              <br />
              <strong>thêm một niềm vui.</strong>
            </p>
            <span>Một không gian cho cả gia đình.</span>
          </div>
          <button
            className="member-logout"
            onClick={handleLogout}
          >
            <LogOut size={20} aria-hidden="true" />
            Đăng xuất
          </button>
        </aside>

        {/* ============================================================== */}
        {/* KHUNG THÂN TRANG & THANH TIÊU ĐỀ DI ĐỘNG (TOP BAR)            */}
        {/* ============================================================== */}
        <div className="member-body">
          <header className="member-topbar">
            {/* --- GÓC TRÁI: LOGO BIỂU TƯỢNG VÀ BỘ CHỌN KHÔNG GIAN (WORKSPACE) --- */}
            <div className="flex items-center gap-2 min-w-0" ref={workspaceRef}>
              <Link
                href={
                  isGuardian
                    ? "/dashboard/member"
                    : isElderly
                      ? "/dashboard/elderly"
                      : "/dashboard/kids"
                }
                className="flex items-center justify-center shrink-0 md:hidden active:scale-95 transition-transform"
                title="Về trang chủ Kinetix"
                aria-label="Về trang chủ Kinetix"
              >
                <KinetixLogo size="sm" showText={false} />
              </Link>

              {/* Nút bấm chuyển Không gian Dropdown / Sheet trên Di động (Touch target >= 48px) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
                  className="flex items-center gap-1.5 min-h-[48px] px-3 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 transition-all text-left max-w-[130px] sm:max-w-[200px] cursor-pointer active:scale-95 shadow-2xs"
                  aria-expanded={isWorkspaceMenuOpen}
                  aria-label="Chọn Không gian gia đình"
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-none">
                      Không gian
                    </span>
                    <span className="text-xs font-bold leading-tight truncate text-slate-900 dark:text-white mt-0.5">
                      {family.currentWorkspace?.name || "Gia đình"}
                    </span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-slate-400 dark:text-slate-400 transition-transform duration-200 shrink-0 ${
                      isWorkspaceMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Hộp thoại danh sách Không gian thả xuống */}
                {isWorkspaceMenuOpen && (
                  <div className="absolute left-0 mt-2 w-64 sm:w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 mb-1 flex items-center justify-between">
                      <span>Không gian của bạn</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px]">
                        {family.workspaces.length}
                      </span>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {family.workspaces.map((ws) => {
                        const isSelected = ws.id === family.currentWorkspace?.id;
                        return (
                          <button
                            key={ws.id}
                            type="button"
                            onClick={() => {
                              void family.switchWorkspace(ws.id);
                              setIsWorkspaceMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                              isSelected
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold border border-emerald-200 dark:border-emerald-800/60"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="text-xs font-bold truncate">
                                {ws.name}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 opacity-90">
                                {ws.type === "SIBLINGS"
                                  ? "Anh Chị Em"
                                  : ws.type === "FRIENDS"
                                    ? "Bạn Thân"
                                    : ws.type === "COMMUNITY"
                                      ? "Cộng Đồng"
                                      : "Đại Gia Đình"}
                              </div>
                            </div>
                            {isSelected && (
                              <Check
                                size={15}
                                className="text-emerald-600 dark:text-emerald-400 shrink-0"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* --- GÓC PHẢI: HUY HIỆU DUAL-CHAIN, ĐỔI GIAO DIỆN, AVATAR & VAI TRÒ --- */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0" ref={userMenuRef}>
              {/* Huy hiệu Mạng kép Avalanche (Family L1 / Fuji C-Chain) - Touch target >= 48px */}
              <button
                type="button"
                onClick={() => setIsTelemetryModalOpen(!isTelemetryModalOpen)}
                className="flex items-center gap-1.5 min-h-[48px] px-2.5 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/80 text-[11px] font-mono transition-all active:scale-95 cursor-pointer shadow-2xs text-slate-700 dark:text-slate-300"
                title="Xem trạng thái kết nối Avalanche Dual-Chain"
                aria-label="Thông tin mạng kép Avalanche"
              >
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-slate-800 dark:text-slate-200 hidden xs:inline">
                    L1
                  </span>
                </div>
                <ArrowLeftRight
                  size={13}
                  className="text-slate-400 dark:text-slate-500 shrink-0"
                  aria-hidden="true"
                />
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="font-bold text-slate-800 dark:text-slate-200 hidden xs:inline">
                    Fuji
                  </span>
                </div>
              </button>

              {/* Nút bấm chuyển đổi Giao diện Sáng / Tối - Touch target >= 48px */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={
                  theme === "dark"
                    ? "Chuyển sang giao diện sáng"
                    : "Chuyển sang giao diện tối"
                }
                title={theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}
                className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                {theme === "dark" ? (
                  <Sun size={19} className="text-amber-400" aria-hidden="true" />
                ) : (
                  <Moon size={19} className="text-slate-600" aria-hidden="true" />
                )}
              </button>

              {/* Avatar người dùng & Huy hiệu vai trò - Touch target >= 48px */}
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1.5 min-h-[48px] min-w-[48px] px-2 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer active:scale-95"
                aria-expanded={isUserMenuOpen}
                aria-label="Thông tin tài khoản"
              >
                <span
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                    isElderly
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700"
                      : isGuardian
                        ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200 border border-sky-300 dark:border-sky-700"
                        : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200 border border-purple-300 dark:border-purple-700"
                  }`}
                  aria-hidden="true"
                >
                  {userInitial}
                </span>

                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold leading-tight truncate max-w-[100px] text-slate-900 dark:text-white">
                    {auth.user?.fullName || "Thành viên"}
                  </span>
                  <span
                    className={`text-[9px] font-semibold px-1 py-0.2 rounded self-start mt-0.5 ${
                      isElderly
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                        : isGuardian
                          ? "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200"
                          : "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200"
                    }`}
                  >
                    {isElderly ? "Ông Bà" : isGuardian ? "Giám Hộ" : "Con Trẻ"}
                  </span>
                </div>
              </button>

              {/* Hộp thoại thông tin người dùng & Phím tắt cài đặt */}
              {isUserMenuOpen && (
                <div className="absolute right-3 sm:right-6 top-14 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                        isElderly
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                          : isGuardian
                            ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200"
                            : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200"
                      }`}
                    >
                      {userInitial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold truncate text-slate-900 dark:text-white">
                        {auth.user?.fullName || "Thành viên"}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {roleDisplayLabel}
                      </div>
                    </div>
                  </div>

                  <div className="py-2 space-y-1">
                    {/* Phím tắt trợ năng cho Người cao tuổi */}
                    {isElderly && (
                      <>
                        <button
                          type="button"
                          onClick={() => setLargeText((v) => !v)}
                          className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        >
                          <span>Aa · Phóng to chữ</span>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            {largeText ? "Bật" : "Tắt"}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={toggleVoice}
                          className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        >
                          <span>Giọng đọc trợ năng</span>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            {voice ? "Bật" : "Tắt"}
                          </span>
                        </button>
                      </>
                    )}

                    <Link
                      href="/settings"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                      <Settings2 size={16} className="text-slate-400" />
                      <span>Cài đặt tài khoản</span>
                    </Link>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        void handleLogout();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all cursor-pointer"
                    >
                      <LogOut size={16} />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* ============================================================== */}
          {/* HỘP THOẠI POPUP THÔNG TIN TELEMETRY DUAL-CHAIN                */}
          {/* ============================================================== */}
          {isTelemetryModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 w-full max-w-sm text-left animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Kiến Trúc Đa Chuỗi Avalanche
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsTelemetryModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    aria-label="Đóng"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="py-4 space-y-3">
                  {/* Family L1 */}
                  <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900 dark:text-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Family L1 (Appchain)
                      </div>
                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded">
                        0 Gas Fee
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
                      Mạng nội bộ riêng tư. Rút tiền tức thì (&lt;1 giây) từ bộ đệm L1
                      cho các nhu cầu chi tiêu thường nhật.
                    </p>
                  </div>

                  {/* Fuji C-Chain */}
                  <div className="p-3 rounded-2xl bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-red-900 dark:text-red-200">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        Fuji C-Chain (Chain ID: 43113)
                      </div>
                      <span className="text-[10px] bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-300 font-bold px-1.5 py-0.2 rounded">
                        ~8% APY
                      </span>
                    </div>
                    <p className="text-[11px] text-red-800/90 dark:text-red-300/90 leading-relaxed">
                      Môi trường DeFi thanh khoản cao. Tiền nhàn rỗi được tự động
                      chuyển qua Avalanche Teleporter để sinh lời tối ưu.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTelemetryModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs transition-all cursor-pointer hover:opacity-90 active:scale-98"
                >
                  Đã hiểu
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* NỘI DUNG CHÍNH (MAIN CONTENT)                                 */}
          {/* ============================================================== */}
          <main id="member-main" className="member-content" tabIndex={-1}>
            {error && (
              <p role="alert" className="member-error">
                {error}
              </p>
            )}

            {/* Thanh điều khiển trợ năng dành riêng cho Người cao tuổi */}
            {isElderly && (
              <div className="accessibility-bar">
                <button
                  type="button"
                  aria-pressed={largeText}
                  onClick={() => setLargeText((value) => !value)}
                >
                  Aa · {largeText ? "Chữ rất lớn" : "Chữ lớn hơn"}
                </button>
                <button
                  type="button"
                  aria-pressed={voice}
                  onClick={toggleVoice}
                >
                  {voice ? <Volume2 size={20} /> : <VolumeX size={20} />}
                  Giọng đọc: {voice ? "Bật" : "Tắt"}
                </button>
              </div>
            )}

            {children}

            <footer className="member-footer">
              <span>Kinetix · Cùng nhau vun đắp</span>
              <span>{family.currentWorkspace?.name}</span>
            </footer>
          </main>

          {/* ============================================================== */}
          {/* THANH ĐIỀU HƯỚNG ĐÁY NỔI DI ĐỘNG (MOBILE FLOATING DOCK)        */}
          {/* ============================================================== */}
          <MemberMobileDock role={effectiveRole} />
        </div>
      </div>
    </Preferences.Provider>
  );
}
