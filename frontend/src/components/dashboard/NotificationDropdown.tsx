'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useFamily, NotificationItem } from '@/context/FamilyContext';

export const NotificationDropdown: React.FC = () => {
  const {
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    withdrawalRequests,
    approveWithdrawal,
  } = useFamily();

  const [isOpen, setIsOpen] = useState(false);
  const [signingId, setSigningId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApproveFromNotif = async (notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const pending = withdrawalRequests.find((r) => r.status === 'PENDING');
    if (!pending) return;

    setSigningId(notifId);
    try {
      await approveWithdrawal(pending.id);
      markNotificationRead(notifId);
    } finally {
      setSigningId(null);
    }
  };

  const handleMarkAllRead = () => {
    notifications.forEach((n) => markNotificationRead(n.id));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Nút Chuông Thông Báo */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className="relative w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-slate-200/60 dark:border-slate-700"
        title="Thông báo gia đình thời gian thực"
      >
        <span className="material-symbols-outlined text-[19px]">notifications</span>
        
        {unreadNotificationCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white font-bold text-[10px] font-mono flex items-center justify-center shadow-sm animate-pulse border-2 border-white dark:border-slate-800">
            {unreadNotificationCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 overflow-hidden text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header Popover */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Thông Báo Gia Đình
              </span>
              <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-[10px] font-bold font-mono">
                {unreadNotificationCount} mới
              </span>
            </div>

            {unreadNotificationCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                type="button"
                className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 cursor-pointer hover:underline"
              >
                Đọc tất cả
              </button>
            )}
          </div>

          {/* Danh sách thông báo */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                Chưa có thông báo mới nào. Mọi hoạt động đang bình yên!
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markNotificationRead(n.id)}
                  className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 ${
                    n.isRead ? 'bg-white dark:bg-slate-900 opacity-70 hover:opacity-100' : 'bg-red-50/40 dark:bg-red-950/20 hover:bg-red-50/80 dark:hover:bg-red-950/40'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                      n.type === 'APPROVAL_NEEDED'
                        ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                        : n.type === 'ALERT_SCAM'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                        : n.type === 'TASK_COMPLETED'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        : 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                    }`}
                  >
                    {n.type === 'APPROVAL_NEEDED' && '✍️'}
                    {n.type === 'ALERT_SCAM' && '🚨'}
                    {n.type === 'TASK_COMPLETED' && '⭐'}
                    {n.type === 'FAST_WITHDRAW' && '⚡'}
                    {n.type === 'YIELD_PAYOUT' && '💰'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {n.title}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                        {n.createdAt || 'Vừa xong'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                      {n.message}
                    </p>

                    {/* Nút hành động trực tiếp nếu cần ký duyệt */}
                    {n.type === 'APPROVAL_NEEDED' && !n.isRead && (
                      <button
                        onClick={(e) => handleApproveFromNotif(n.id, e)}
                        disabled={signingId === n.id}
                        type="button"
                        className="mt-2 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[13px]">draw</span>
                        <span>{signingId === n.id ? 'Đang ký...' : 'Ký Duyệt Nhanh'}</span>
                      </button>
                    )}
                  </div>

                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer Popover */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 text-center">
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
              ⚡ Avalanche Family L1 Event Bus Sync Active
            </span>
          </div>

        </div>
      )}
    </div>
  );
};
