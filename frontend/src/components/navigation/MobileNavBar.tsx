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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg px-2 py-1.5 flex items-center justify-around safe-area-inset-bottom">
      {navItems.map((item, idx) => {
        if (item.isCenter) {
          return (
            <button
              key={idx}
              onClick={onOpenDeposit}
              type="button"
              className="flex flex-col items-center justify-center -mt-6 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md flex items-center justify-center transition-transform active:scale-90 border-2 border-white">
                <span className="material-symbols-outlined text-[24px] text-amber-300">bolt</span>
              </div>
              <span className="text-[10px] font-bold text-red-600 mt-0.5">
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
                ? 'text-red-600 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[22px] transition-transform ${
                isActive ? 'scale-110 text-red-600' : 'text-slate-500'
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
