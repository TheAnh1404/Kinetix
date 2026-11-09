'use client';

import React from 'react';
import { ActiveTab } from '@/types';
import { useLanguage } from '@/context/LanguageContext';

interface MobileNavBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenDeposit: () => void;
}

/**
 * Thanh Điều Hướng Đáy Di Động (Floating Glass Dock)
 * Thiết kế theo phong cách Ergonomic Thumb-Zone:
 * - Kính mờ cao cấp (Backdrop Blur Glassmorphism)
 * - Nút nạp tiền nổi bật trung tâm (Floating Action Button) với hiệu ứng Avalanche Red
 * - Khoảng chạm rộng rãi (≥ 48px), chống mỏi ngón tay
 * - Phản hồi xúc giác trực quan khi nhấn (Active Scale)
 */
export const MobileNavBar: React.FC<MobileNavBarProps> = ({
  activeTab,
  onTabChange,
  onOpenDeposit,
}) => {
  const { language } = useLanguage();

  const navItems = [
    {
      tab: 'quan-tri-cha-me' as ActiveTab,
      label: language === 'vi' ? 'Quản Trị' : 'Command',
      icon: 'dashboard',
    },
    {
      tab: 'kinetix-shield' as ActiveTab,
      label: language === 'vi' ? 'An Sinh' : 'Shield',
      icon: 'shield',
    },
    {
      action: 'deposit',
      label: language === 'vi' ? 'Nạp Quỹ' : 'Deposit',
      icon: 'bolt',
      isCenter: true,
    },
    {
      tab: 'kinetix-kids' as ActiveTab,
      label: language === 'vi' ? 'Việc Nhà' : 'Kids',
      icon: 'savings',
    },
    {
      tab: 'quy-rosca' as ActiveTab,
      label: language === 'vi' ? 'Họ Hụi' : 'ROSCA',
      icon: 'groups',
    },
  ];

  return (
    <nav
      aria-label="Điều hướng chính trên di động"
      className="lg:hidden fixed bottom-3 left-3 right-3 max-w-md mx-auto z-40 bg-slate-900/90 backdrop-blur-xl text-white rounded-3xl border border-white/10 shadow-2xl px-2 py-1.5 flex items-center justify-around"
    >
      {navItems.map((item, idx) => {
        if (item.isCenter) {
          return (
            <button
              key={idx}
              onClick={onOpenDeposit}
              type="button"
              className="flex flex-col items-center justify-center -mt-6 cursor-pointer group"
              title="Nạp tiền vào Quỹ"
            >
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 text-white shadow-lg shadow-red-600/40 flex items-center justify-center transition-all duration-200 group-active:scale-90 border-2 border-slate-900">
                <span className="material-symbols-outlined text-[26px] text-white">bolt</span>
              </div>
              <span className="text-[10px] font-bold text-slate-300 group-hover:text-white mt-1">
                {item.label}
              </span>
            </button>
          );
        }

        const isActive = activeTab === item.tab;
        return (
          <button
            key={idx}
            onClick={() => item.tab && onTabChange(item.tab)}
            type="button"
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all cursor-pointer min-w-[56px] ${
              isActive
                ? 'text-white font-bold bg-white/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[22px] transition-transform ${
                isActive ? 'scale-110 text-red-500' : 'text-slate-400'
              }`}
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-medium leading-tight mt-0.5 truncate max-w-[50px]">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
export default MobileNavBar;
