"use client";

import React, { useState } from "react";
import { ActiveTab, DemoMember } from "../types";
import { RoleSwitcherModal } from "./RoleSwitcherModal";

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  currentMember: DemoMember;
  onMemberChange: (member: DemoMember) => void;
  isWalletConnected: boolean;
  onConnectWallet: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  currentMember,
  onMemberChange,
  isWalletConnected,
  onConnectWallet,
}) => {
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  const navItems: { id: ActiveTab; label: string }[] = [
    { id: "trang-chu", label: "Trang Chủ" },
    { id: "kinetix-shield", label: "Kinetix Shield" },
    { id: "quan-tri-cha-me", label: "Quản Trị" },
    { id: "kinetix-kids", label: "Kinetix Kids" },
    { id: "quy-rosca", label: "Quỹ ROSCA" },
  ];

  return (
    <>
      <header className="fixed top-0 w-full z-40 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-surface-container/60">
        <div className="h-20 max-w-7xl mx-auto px-gutter flex items-center justify-between gap-space-md">
          {/* Logo Brand */}
          <div
            onClick={() => onTabChange("trang-chu")}
            className="flex items-center gap-space-sm cursor-pointer select-none group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <span className="material-symbols-outlined text-[24px] text-secondary-container">
                family_restroom
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight leading-none">
                Kinetix
              </span>
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                Family Finance OS
              </span>
            </div>
          </div>

          {/* Navigation Pill Bar */}
          <nav className="hidden xl:flex items-center gap-space-xs p-space-xs bg-surface-container-low rounded-full">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`px-space-md py-space-xs rounded-full font-label-lg text-label-lg transition-all ${
                    isActive
                      ? "bg-surface-container-high text-on-surface font-bold shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Status & Actions */}
          <div className="flex items-center gap-space-sm">
            {/* Avalanche Subnet Zero Gas Badge */}
            <div className="hidden md:flex items-center gap-space-xs px-space-sm py-space-xs bg-surface-container-low rounded-full">
              <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse"></span>
              <span className="font-label-caps text-label-caps text-on-surface-variant font-medium">
                Avalanche Family L1 | 0 Gwei Gas
              </span>
            </div>

            {/* Quick Role Switcher Button */}
            <button
              onClick={() => setIsRoleModalOpen(true)}
              className="flex items-center gap-space-xs px-space-sm py-space-xs rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-all shadow-sm"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">
                switch_account
              </span>
              <span className="hidden sm:inline font-semibold">
                {currentMember.name.split(" ")[0]} ({currentMember.role})
              </span>
            </button>

            {/* Connect Wallet Button */}
            <button
              onClick={onConnectWallet}
              className={`flex items-center gap-space-xs px-space-md py-space-xs font-label-lg text-label-lg rounded-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-all ${
                isWalletConnected
                  ? "bg-surface-container-high text-on-surface font-semibold"
                  : "bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-on-secondary"
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isWalletConnected ? "account_balance_wallet" : "login"}
              </span>
              <span>
                {isWalletConnected
                  ? `${currentMember.walletAddress.slice(0, 6)}...${currentMember.walletAddress.slice(-4)}`
                  : "Kết nối Ví Core"}
              </span>
            </button>

            {/* Member Avatar */}
            <div
              onClick={() => setIsRoleModalOpen(true)}
              className="w-9 h-9 rounded-full overflow-hidden border border-surface-container-high shadow-sm cursor-pointer hover:ring-2 hover:ring-secondary-container transition-all"
            >
              <img
                src={currentMember.avatar}
                alt={currentMember.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Role Switcher Dialog */}
      <RoleSwitcherModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        currentMember={currentMember}
        onSelectMember={onMemberChange}
      />
    </>
  );
};
