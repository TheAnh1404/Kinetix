'use client';

import React from 'react';
import { ActiveTab } from '@/types';
import { useLanguage } from '@/context/LanguageContext';

interface MobileNavBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenDeposit: () => void;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({
  activeTab,
  onTabChange,
  onOpenDeposit,
}) => {
  const { language } = useLanguage();

  const navItems = [
    {
      tab: 'quan-tri-cha-me' as ActiveTab,
      label: language === 'vi' ? 'Quản Trị' : 'Admin',
      icon: 'dashboard',
    },
    {
      tab: 'kinetix-shield' as ActiveTab,
      label: language === 'vi' ? 'Báo Hiếu' : 'Shield',
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-container-lowest/95 backdrop-blur-lg border-t border-surface-container shadow-2xl px-2 py-1.5 flex items-center justify-around safe-area-inset-bottom">
      {navItems.map((item, idx) => {
        if (item.isCenter) {
          return (
            <button
              key={idx}
              onClick={onOpenDeposit}
              type="button"
              className="flex flex-col items-center justify-center -mt-5"
            >
              <div className="w-12 h-12 rounded-full bg-primary text-white shadow-lg flex items-center justify-center transition-transform active:scale-90 border-2 border-surface-container-lowest">
                <span className="material-symbols-outlined text-[24px]">bolt</span>
              </div>
              <span className="text-[10px] font-bold text-primary mt-0.5">
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
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              isActive
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[22px] transition-transform ${
                isActive ? 'scale-110' : ''
              }`}
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-medium leading-tight mt-0.5">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
