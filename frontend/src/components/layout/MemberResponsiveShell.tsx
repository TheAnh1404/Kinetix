"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  HeartHandshake,
  ListChecks,
  Gift,
  UserRound,
  ReceiptText,
  LogOut,
  ArrowUpRight,
  Volume2,
  VolumeX,
  Settings2,
} from "lucide-react";
import { useFamily } from "@/context/FamilyContext";
import { useAuth } from "@/hooks/useAuth";

const Preferences = createContext({
  largeText: false,
  voice: false,
  toggleLarge: () => {},
  toggleVoice: () => {},
  read: (_text: string) => {},
});
export const useMemberPreferences = () => useContext(Preferences);

export function RoleNavigation({ elderly }: { elderly: boolean }) {
  const pathname = usePathname();
  const auth = useAuth();
  const family = useFamily();
  const adult =
    auth.workspaces.find((item) => item.id === family.currentWorkspace?.id)
      ?.role === "GUARDIAN";
  const entries = adult
    ? [
        { href: "/dashboard/member", label: "Hũ an sinh", Icon: Home },
        { href: "/dashboard/kids", label: "Heo đất", Icon: Gift },
        { href: "/settings", label: "Cài đặt", Icon: UserRound },
      ]
    : elderly
      ? [
          { href: "/dashboard/elderly", label: "Trang chính", Icon: Home },
          {
            href: "/dashboard/elderly/requests",
            label: "Yêu cầu",
            Icon: ReceiptText,
          },
          {
            href: "/dashboard/elderly/family",
            label: "Người thân",
            Icon: HeartHandshake,
          },
        ]
      : [
          { href: "/dashboard/kids", label: "Hôm nay", Icon: Home },
          {
            href: "/dashboard/kids/chores",
            label: "Việc của con",
            Icon: ListChecks,
          },
          { href: "/dashboard/kids/rewards", label: "Tiền thưởng", Icon: Gift },
          {
            href: "/dashboard/kids/profile",
            label: "Của con",
            Icon: UserRound,
          },
        ];
  entries.push({
    href: "/dashboard/rosca",
    label: "Góp vốn",
    Icon: ReceiptText,
  });
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
            href={href}
            aria-current={active ? "page" : undefined}
            className={active ? "active" : ""}
          >
            <Icon size={23} aria-hidden="true" />
            <span>{label}</span>
            <ArrowUpRight className="nav-arrow" size={18} aria-hidden="true" />
          </Link>
        );
      })}
    </nav>
  );
}

export function MemberResponsiveShell({
  children,
  elderly,
}: {
  children: React.ReactNode;
  elderly: boolean;
}) {
  const auth = useAuth();
  const family = useFamily();
  const adult =
    auth.workspaces.find((item) => item.id === family.currentWorkspace?.id)
      ?.role === "GUARDIAN";
  const [largeText, setLargeText] = useState(false);
  const [voice, setVoice] = useState(false);
  const [error, setError] = useState("");
  const [loadedKey, setLoadedKey] = useState("");
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
        className={`member-app ${elderly ? "elderly-theme" : "kids-theme"} ${largeText ? "member-large-text" : ""}`}
      >
        <a className="skip-link" href="#member-main">
          Đến nội dung chính
        </a>
        <aside className="member-sidebar">
          <Link
            className="member-brand"
            href={
              adult
                ? "/dashboard/member"
                : elderly
                  ? "/dashboard/elderly"
                  : "/dashboard/kids"
            }
          >
            <span>K</span>kinetix<span className="brand-period">.</span>
          </Link>
          <p className="sidebar-caption">GIA ĐÌNH LUÔN BÊN BẠN</p>
          <RoleNavigation elderly={elderly} />
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
            onClick={() =>
              void auth.logout().catch((err) => setError(err.message))
            }
          >
            <LogOut size={20} aria-hidden="true" />
            Đăng xuất
          </button>
        </aside>
        <div className="member-body">
          <header className="member-topbar">
            <div className="workspace-picker">
              <label htmlFor="member-workspace">Không gian của bạn</label>
              <select
                id="member-workspace"
                value={family.currentWorkspace?.id || ""}
                onChange={(event) =>
                  void family.switchWorkspace(event.target.value)
                }
              >
                {family.workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="member-identity">
              <Link
                href="/settings"
                aria-label="Mở cài đặt tài khoản"
                className="member-secondary"
              >
                <Settings2 size={21} aria-hidden="true" />
              </Link>
              <span className="member-avatar" aria-hidden="true">
                {auth.user?.fullName?.charAt(0).toUpperCase()}
              </span>
              <span>
                {auth.user?.fullName}
                <small>
                  {adult
                    ? "Thành viên gia đình"
                    : elderly
                      ? "Thành viên · An sinh"
                      : "Thành viên · Việc nhà"}
                </small>
              </span>
            </div>
          </header>
          <main id="member-main" className="member-content" tabIndex={-1}>
            {error && (
              <p role="alert" className="member-error">
                {error}
              </p>
            )}
            {elderly && (
              <div className="accessibility-bar">
                <button
                  aria-pressed={largeText}
                  onClick={() => setLargeText((value) => !value)}
                >
                  Aa · {largeText ? "Chữ rất lớn" : "Chữ lớn hơn"}
                </button>
                <button aria-pressed={voice} onClick={toggleVoice}>
                  {voice ? <Volume2 size={20} /> : <VolumeX size={20} />}Giọng
                  đọc: {voice ? "Bật" : "Tắt"}
                </button>
              </div>
            )}
            {children}
            <footer className="member-footer">
              <span>Kinetix · Cùng nhau vun đắp</span>
              <span>{family.currentWorkspace?.name}</span>
            </footer>
          </main>
          <div className="member-mobile-navigation">
            <RoleNavigation elderly={elderly} />
          </div>
        </div>
      </div>
    </Preferences.Provider>
  );
}
