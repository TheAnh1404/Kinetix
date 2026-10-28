'use client';

import React, { useState, useEffect } from 'react';
import { useFamily } from '@/context/FamilyContext';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/context/LanguageContext';
import { useSettings, DisplayCurrency, AppTheme } from '@/context/SettingsContext';
import { SNOWTRACE_TESTNET_URL, CONTRACT_ADDRESSES } from '@/contracts/config';
import { DemoMember } from '@/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'profile' | 'wallet' | 'preferences' | 'workspaces';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', // Bố Ba
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', // Anh Cả
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', // Cô Út
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB9RXFgUn83eP41jg2weE3YA8vd83fsVimUf5y0OcZS7SOQ3XPOzG_gbODV_xJIXeRQye9NHAh2TXP_28Oz-bPHhWTfscJFCZWXYRXq2gQAAtwAVTc1yseRsDx3GBa94HVhTHAal40UzoVwN7YY1IXQ5EmMOe0WhhEvzu4V7ZNBtixA0ZiaR61Ad1UJUADoRuNzug0ggIZW8eO5XEiktIZD-zCJ4THMAqG0i7Z1ivkCGPnUrjsBJg', // Ông Nội
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAc1UhNj0E3eKWwrEAv9WJ4KTtp_4pnR4-fyhwEHSKncOxXMGgdr5EdEkF7AMpuaguOYSWTwC-3Ovp1jhOZtflnABlKorh-7E9pPfvKLow6TvFQHGxmf0EgQh_J7eX2WyhgY_obtzgCtT892o3CCd1-TKpF3WABb42fGzxm4wVTK6S7fWG0bKJKRZGbEsWybndKRK3uK6Aix2ehMS1hOr8zRyDG3ZRA0ODbqcIHWiDv1p2ayRMtyQ', // Bé Na
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', // Mẹ
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', // Chú Hai
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', // Bé Bi
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { currentMember, setCurrentMember, members, workspaces, currentWorkspace, switchWorkspace } = useFamily();
  const { user, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const {
    theme,
    setTheme,
    displayCurrency,
    setDisplayCurrency,
    soundEnabled,
    setSoundEnabled,
    latency,
    checkLatency,
    playActionSound,
  } = useSettings();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Form states for profile
  const [fullName, setFullName] = useState(currentMember?.name || user?.fullName || 'Người Dùng Kinetix');
  const [avatarUrl, setAvatarUrl] = useState(currentMember?.avatar || user?.avatarUrl || PRESET_AVATARS[0]);
  const [phoneNumber, setPhoneNumber] = useState(currentMember?.phoneNumber || user?.phoneNumber || '0908889999');
  const [defaultRole, setDefaultRole] = useState<'ADMIN' | 'GUARDIAN' | 'ELDERLY' | 'CHILD'>(
    (currentMember?.role as any) || user?.role || 'GUARDIAN'
  );
  const [pinCode, setPinCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [copiedWallet, setCopiedWallet] = useState(false);

  useEffect(() => {
    if (currentMember) {
      setFullName(currentMember.name);
      setAvatarUrl(currentMember.avatar);
      setPhoneNumber(currentMember.phoneNumber || '0908889999');
      setDefaultRole(currentMember.role as any);
    }
  }, [currentMember]);

  if (!isOpen) return null;

  const connectedAddress =
    currentMember?.walletAddress || user?.walletAddress || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

  const handleCopyWallet = () => {
    navigator.clipboard?.writeText(connectedAddress);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveFeedback(null);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          avatarUrl,
          phoneNumber,
          defaultRole,
          pinCode: pinCode.trim() ? pinCode.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Cập nhật state context trực tiếp
        if (currentMember) {
          const updated: DemoMember = {
            ...currentMember,
            name: fullName,
            avatar: avatarUrl,
            phoneNumber,
            role: defaultRole,
          };
          setCurrentMember(updated);
        }
        playActionSound('success');
        setSaveFeedback('✓ Đã cập nhật hồ sơ cá nhân và cài đặt thành công!');
        setPinCode('');
        setTimeout(() => setSaveFeedback(null), 3500);
      } else {
        setSaveFeedback(`⚠️ ${data.error || 'Cập nhật thất bại'}`);
      }
    } catch (err: any) {
      setSaveFeedback(`⚠️ Lỗi: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">tune</span>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {language === 'vi' ? 'Cài Đặt & Quản Lý Tài Khoản' : 'Settings & Account Management'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kinetix Multi-Space Vault OS • Avalanche
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* 4 Tabs Selector Strip */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none bg-slate-50/30 dark:bg-slate-900/30 shrink-0">
          {[
            { id: 'profile', label: language === 'vi' ? 'Hồ Sơ & PIN' : 'Profile & PIN', icon: 'person' },
            { id: 'wallet', label: language === 'vi' ? 'Ví & Bảo Mật' : 'Wallet & Security', icon: 'shield' },
            { id: 'preferences', label: language === 'vi' ? 'Tùy Chọn Ứng Dụng' : 'Preferences', icon: 'palette' },
            { id: 'workspaces', label: language === 'vi' ? 'Không Gian' : 'Workspaces', icon: 'hub' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              type="button"
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap border-b-2 ${
                activeTab === tab.id
                  ? 'border-red-600 text-red-600 dark:text-red-400 font-bold bg-white dark:bg-slate-800 shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Feedback banner */}
          {saveFeedback && (
            <div
              className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
                saveFeedback.startsWith('✓')
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">info</span>
              <span>{saveFeedback}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 1: HỒ SƠ & MÃ PIN */}
          {/* ============================================================== */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Full Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'vi' ? 'Họ và Tên Hiển Thị *' : 'Display Full Name *'}
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'vi' ? 'Số Điện Thoại Khẩn Cấp' : 'Emergency Phone'}
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="0908889999"
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Avatar Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'vi' ? 'Chọn Ảnh Đại Diện Web3' : 'Choose Web3 Avatar'}
                </label>
                <div className="flex items-center gap-3 overflow-x-auto py-1 scrollbar-none">
                  {PRESET_AVATARS.map((url, idx) => {
                    const isSelected = avatarUrl === url;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAvatarUrl(url)}
                        className={`relative w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 transition-transform cursor-pointer ${
                          isSelected
                            ? 'border-red-600 scale-105 shadow-md ring-2 ring-red-400/40'
                            : 'border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt="preset" className="w-full h-full object-cover" />
                        {isSelected && (
                          <span className="absolute inset-0 bg-red-600/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[18px] text-white font-bold">check</span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4-Digit PIN Setup for Quick Authorization */}
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-600 text-[20px]">pin</span>
                    <span className="text-xs font-bold text-amber-950 dark:text-amber-200">
                      {language === 'vi' ? 'Cài Đặt / Đổi Mã PIN 4 Số' : '4-Digit PIN Security'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Chế độ Ông Bà & Trẻ Nhỏ
                  </span>
                </div>
                <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
                  Mã PIN 4 số giúp Ông Bà rút tiền nhanh hoặc Trẻ Nhỏ nộp bài việc nhà tức thì trên Family L1 mà không cần thao tác ký phức tạp trên ví Core.
                </p>
                <div className="pt-1 flex items-center gap-3">
                  <input
                    type="password"
                    maxLength={4}
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="•••• (để trống nếu không đổi)"
                    className="w-48 px-3.5 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-sm font-mono font-bold tracking-widest text-center text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-xs text-slate-500 font-mono">
                    {pinCode.length === 4 ? '✓ Hợp lệ' : 'Nhập đúng 4 chữ số'}
                  </span>
                </div>
              </div>

              {/* Default Role Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'vi' ? 'Vai Trò Mặc Định Khi Đăng Nhập' : 'Default Family Role'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { role: 'ADMIN', label: 'Bố Mẹ (Admin)', icon: 'shield_person' },
                    { role: 'GUARDIAN', label: 'Người Bảo Hộ', icon: 'verified_user' },
                    { role: 'ELDERLY', label: 'Ông Bà (Shield)', icon: 'elderly' },
                    { role: 'CHILD', label: 'Con Nhỏ (Kids)', icon: 'savings' },
                  ].map((r) => (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => setDefaultRole(r.role as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        defaultRole === r.role
                          ? 'border-red-600 bg-red-50/50 dark:bg-red-950/30 text-red-700 dark:text-red-300 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{r.icon}</span>
                      <span className="text-xs font-bold">{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60 active:scale-95"
                >
                  {isSaving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      <span>{language === 'vi' ? 'Lưu Hồ Sơ Cá Nhân' : 'Save Profile'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* TAB 2: VÍ & BẢO MẬT */}
          {/* ============================================================== */}
          {activeTab === 'wallet' && (
            <div className="space-y-4">
              {/* Connected Core Wallet Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold text-slate-500 font-mono">
                    Avalanche Core Wallet
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">
                    Connected ✓
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white break-all">
                    {connectedAddress}
                  </span>
                  <button
                    onClick={handleCopyWallet}
                    type="button"
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 shrink-0 cursor-pointer"
                    title="Sao chép địa chỉ ví"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {copiedWallet ? 'check' : 'content_copy'}
                    </span>
                  </button>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <a
                    href={`${SNOWTRACE_TESTNET_URL}/address/${connectedAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    <span>Xem trên SnowTrace Fuji Explorer</span>
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </a>
                </div>
              </div>

              {/* SIWE Session Status */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600 text-[20px]">key</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Phiên Đăng Nhập SIWE (EIP-4361)
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-500">Cookie HTTPOnly (7 ngày)</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Chữ ký xác thực mật mã được lưu trữ bảo mật qua cookie máy khách. Không lộ khóa riêng tư (Private Key) trên trình duyệt.
                </p>
              </div>

              {/* Family L1 Allowlist Status */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-3">
                <span className="material-symbols-outlined text-emerald-600 text-[22px] shrink-0 mt-0.5">
                  verified
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    Allowlisted on Family L1 Precompile
                  </span>
                  <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                    Ví của bạn đã được ủy quyền tương tác 0 gas fee trên Family L1 Appchain. Mọi giao dịch chi tiêu thường nhật đều được miễn phí gas hoàn toàn.
                  </p>
                </div>
              </div>

              {/* Logout Action */}
              <div className="pt-2 flex justify-between items-center">
                <span className="text-xs text-slate-400">Kết thúc phiên làm việc an toàn</span>
                <button
                  type="button"
                  onClick={logout}
                  className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  <span>Đăng Xuất Tài Khoản</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: TÙY CHỌN ỨNG DỤNG */}
          {/* ============================================================== */}
          {activeTab === 'preferences' && (
            <div className="space-y-5">
              {/* Theme Toggle (Light / Dark) */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'vi' ? 'Giao Diện Ứng Dụng (Theme)' : 'Theme Mode'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                      theme === 'light'
                        ? 'border-red-600 bg-red-50/40 text-red-700 font-bold shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[24px] text-amber-500">light_mode</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">Chế Độ Sáng (Light)</span>
                      <span className="text-[10px] text-slate-400">Tươi sáng, rõ ràng</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                      theme === 'dark'
                        ? 'border-red-600 bg-red-950/40 text-red-300 font-bold shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[24px] text-indigo-400">dark_mode</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">Chế Độ Tối (Dark)</span>
                      <span className="text-[10px] text-slate-400">Bảo vệ mắt ban đêm</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Display Currency */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === 'vi' ? 'Đơn Vị Tiền Tệ Hiển Thị' : 'Display Currency'}
                  </label>
                  <span className="text-[11px] font-mono text-slate-500">
                    1 AVAX ≈ 750,000 VNĐ ($30 USD)
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'AVAX' as DisplayCurrency, label: 'Native AVAX', sub: 'Mạng Avalanche' },
                    { id: 'VND' as DisplayCurrency, label: 'VNĐ (Việt Nam Đồng)', sub: '750,000đ / AVAX' },
                    { id: 'USD' as DisplayCurrency, label: 'USD ($)', sub: '$30.00 / AVAX' },
                  ].map((cur) => (
                    <button
                      key={cur.id}
                      type="button"
                      onClick={() => setDisplayCurrency(cur.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                        displayCurrency === cur.id
                          ? 'border-red-600 bg-red-50/50 dark:bg-red-950/30 text-red-700 dark:text-red-300 font-bold shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-400'
                      }`}
                    >
                      <span className="text-xs font-bold font-mono">{cur.label}</span>
                      <span className="text-[10px] text-slate-400">{cur.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Switcher */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-slate-600 text-[20px]">translate</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Ngôn Ngữ Ứng Dụng
                    </span>
                    <span className="text-[11px] text-slate-500">Tiếng Việt 🇻🇳 hoặc English 🇬🇧</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold font-mono text-slate-900 dark:text-white cursor-pointer hover:bg-slate-100"
                >
                  {language === 'vi' ? '🇻🇳 Tiếng Việt' : '🇬🇧 English'}
                </button>
              </div>

              {/* Sound & Haptic toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-slate-600 text-[20px]">
                    {soundEnabled ? 'volume_up' : 'volume_off'}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Âm Thanh Phản Hồi Giao Dịch
                    </span>
                    <span className="text-[11px] text-slate-500">Phát âm thanh chúc mừng khi nạp/rút tiền thành công</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    if (next) playActionSound('success');
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    soundEnabled ? 'bg-red-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      soundEnabled ? 'right-0.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Dual-Chain Latency Inspector */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Độ Trễ Mạng Dual-Chain (Network Ping)
                  </span>
                  <button
                    type="button"
                    onClick={checkLatency}
                    disabled={latency.isChecking}
                    className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className={`material-symbols-outlined text-[14px] ${latency.isChecking ? 'animate-spin' : ''}`}>
                      sync
                    </span>
                    <span>Kiểm tra lại</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500">Avalanche Fuji C-Chain</span>
                    <span className="text-sm font-bold font-mono text-emerald-600">
                      {latency.fujiCChainMs ? `${latency.fujiCChainMs} ms` : '...'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500">Avalanche Family L1</span>
                    <span className="text-sm font-bold font-mono text-emerald-600">
                      {latency.familyL1Ms ? `${latency.familyL1Ms} ms` : '...'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: KHÔNG GIAN CỦA TÔI */}
          {/* ============================================================== */}
          {activeTab === 'workspaces' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Các Không Gian Bạn Đang Tham Gia
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chuyển đổi nhanh không gian làm việc hoặc xem quyền hạn
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold font-mono">
                  {workspaces.length} Không Gian
                </span>
              </div>

              <div className="space-y-2.5">
                {workspaces.map((ws) => {
                  const isCurrent = currentWorkspace?.id === ws.id;
                  return (
                    <div
                      key={ws.id}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'border-red-600 bg-red-50/30 dark:bg-red-950/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                            isCurrent
                              ? 'bg-red-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {ws.type === 'FAMILY'
                              ? 'family_restroom'
                              : ws.type === 'SIBLINGS'
                              ? 'diversity_1'
                              : ws.type === 'FRIENDS'
                              ? 'group'
                              : 'hub'}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {ws.name}
                            </span>
                            {isCurrent && (
                              <span className="px-2 py-0.2 rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-[10px] font-bold">
                                Đang chọn
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                            <span>Mã: {ws.workspaceCode || 'KNTX-8888'}</span>
                            <span>•</span>
                            <span className="uppercase font-bold text-slate-700 dark:text-slate-300">
                              {ws.userRole || 'MEMBER'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => {
                            switchWorkspace(ws.id);
                            onClose();
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-bold text-slate-800 dark:text-white transition-colors cursor-pointer"
                        >
                          Chuyển đến
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
