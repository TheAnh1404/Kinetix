import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-surface-container-low mt-margin border-t border-outline-variant/20">
      <div className="max-w-7xl mx-auto px-gutter py-space-xl flex flex-col md:flex-row items-center justify-between gap-space-lg">
        <div className="flex flex-col items-center md:items-start gap-space-xs">
          <div className="flex items-center gap-space-xs">
            <span className="font-headline-sm text-headline-sm text-on-surface">Kinetix OS</span>
            <span className="px-space-xs py-0.5 rounded font-label-caps text-label-caps bg-surface-container-high text-on-surface">
              Subnet v2.4
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant text-center md:text-left">
            Hệ điều hành tài chính gia đình đa thế hệ xây dựng trên nền tảng Avalanche L1.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-space-lg font-label-lg text-label-lg text-on-surface-variant">
          <a className="hover:text-on-surface transition-colors" href="#unihack">
            Avalanche UniHack Team 1
          </a>
          <a className="hover:text-on-surface transition-colors" href="#docs">
            Tài Liệu Kỹ Thuật
          </a>
          <a className="hover:text-on-surface transition-colors" href="#audit">
            Kiểm Toán Bảo Mật
          </a>
          <a className="hover:text-on-surface transition-colors flex items-center gap-space-xs" href="#teleporter">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Teleporter ICM Live
          </a>
        </div>
        <div className="font-label-caps text-label-caps text-on-surface-variant text-center md:text-right">
          © 2026 Kinetix Labs. Secured on Avalanche.
        </div>
      </div>
    </footer>
  );
};
