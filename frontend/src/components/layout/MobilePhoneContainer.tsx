"use client";

import React from "react";

interface MobilePhoneContainerProps {
  children: React.ReactNode;
  title: string;
  roleBadge: string;
}

export const MobilePhoneContainer: React.FC<MobilePhoneContainerProps> = ({
  children,
  title,
  roleBadge,
}) => {
  return (
    <div className="w-full flex flex-col items-center justify-center py-4 sm:py-8 px-2">
      {/* Khung viền Điện thoại cao cấp (Mockup Smartphone Frame) */}
      <div className="w-full max-w-[410px] bg-slate-900 rounded-[48px] p-3 shadow-2xl border-4 border-slate-700/80 ring-1 ring-white/10 relative transition-all">
        {/* Nút vật lý bên cạnh máy */}
        <div className="absolute -left-[7px] top-24 w-[3px] h-10 bg-slate-600 rounded-l-md" />
        <div className="absolute -left-[7px] top-38 w-[3px] h-12 bg-slate-600 rounded-l-md" />
        <div className="absolute -right-[7px] top-28 w-[3px] h-16 bg-slate-600 rounded-r-md" />

        {/* Màn hình điện thoại (Screen Canvas) */}
        <div className="w-full bg-slate-50 text-slate-900 rounded-[38px] overflow-hidden flex flex-col min-h-[720px] max-h-[820px] shadow-inner relative">
          {/* Status Bar: Thời gian & Dynamic Island */}
          <div className="h-10 w-full bg-slate-100/90 backdrop-blur-md px-6 flex items-center justify-between shrink-0 select-none border-b border-slate-200/50 z-20">
            <span className="text-[12px] font-bold font-mono text-slate-800">
              9:41
            </span>

            {/* Dynamic Island */}
            <div className="w-20 h-4 bg-black rounded-full flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-slate-900 mr-2" />
              <div className="w-1.5 h-1.5 rounded-full bg-blue-900/60" />
            </div>

            <div className="flex items-center gap-1.5 text-slate-700">
              <span className="material-symbols-outlined text-[14px]">
                signal_cellular_alt
              </span>
              <span className="material-symbols-outlined text-[14px]">
                wifi
              </span>
              <span className="material-symbols-outlined text-[16px]">
                battery_full
              </span>
            </div>
          </div>

          {/* Mini Mobile App Header */}
          <div className="px-5 py-3 bg-white border-b border-slate-200/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs">
                K
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900 leading-tight">
                  {title}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Fuji T1
                </span>
              </div>
            </div>

            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-mono">
              {roleBadge}
            </span>
          </div>

          {/* Vùng nội dung ứng dụng di động cuộn độc lập */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {children}
          </div>

          {/* Home Bar Indicator ở đáy máy */}
          <div className="h-6 w-full bg-white/80 backdrop-blur-md flex items-center justify-center shrink-0 border-t border-slate-100">
            <div className="w-32 h-1 bg-slate-300 rounded-full" />
          </div>
        </div>
      </div>

      <div className="mt-3 text-center text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
        <span className="material-symbols-outlined text-[14px] text-emerald-500">
          lock
        </span>
        <span>Avalanche Family L1 Private Network • Zero Gas Experience</span>
      </div>
    </div>
  );
};
