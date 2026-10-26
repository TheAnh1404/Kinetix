"use client";

import React from "react";
import { DEMO_MEMBERS, DemoMember } from "../types";

interface RoleSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMember: DemoMember;
  onSelectMember: (member: DemoMember) => void;
}

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentMember,
  onSelectMember,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-surface-container-high flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[24px]">
              switch_account
            </span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">
              Chuyển Đổi Vai Trò Gia Đình
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <p className="text-body-sm text-on-surface-variant">
          Chọn một vai trò thành viên để trải nghiệm giao diện phân tầng riêng biệt
          được thiết kế tối ưu cho 3 thế hệ:
        </p>

        <div className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto pr-1">
          {DEMO_MEMBERS.map((member) => {
            const isSelected = member.id === currentMember.id;
            return (
              <div
                key={member.id}
                onClick={() => {
                  onSelectMember(member);
                  onClose();
                }}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  isSelected
                    ? "bg-secondary-fixed/30 border-secondary-container shadow-sm"
                    : "bg-surface-container-low/60 hover:bg-surface-container border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-12 h-12 rounded-full object-cover shadow-sm bg-surface-container"
                    />
                    {isSelected && (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-secondary-container rounded-full flex items-center justify-center text-[10px] text-white">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-title-md text-title-md font-semibold text-on-surface">
                        {member.name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface uppercase">
                        {member.role}
                      </span>
                    </div>
                    <span className="text-body-sm text-on-surface-variant">
                      {member.title}
                    </span>
                    <span className="text-[11px] font-mono text-outline">
                      {member.walletAddress.slice(0, 6)}...
                      {member.walletAddress.slice(-4)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-surface-container text-on-surface">
                    Chế độ: {member.defaultTab}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-container text-on-surface font-label-lg text-label-lg hover:bg-surface-container-high transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
