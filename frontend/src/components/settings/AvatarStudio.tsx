'use client';

import React, { useState, useRef } from 'react';
import { Camera, Upload, Trash2, Link as LinkIcon, Sparkles, Check, Image as ImageIcon } from 'lucide-react';

export interface AvatarStudioProps {
  currentAvatar: string;
  onAvatarChange: (newAvatarUrl: string) => void;
  roleBadge?: string;
  fullName?: string;
}

// Bộ sưu tập Avatar tuyển chọn phong phú và sắc nét
export const PRESET_AVATAR_COLLECTIONS = [
  {
    category: 'Gia Đình Đa Thế Hệ',
    avatars: [
      { id: 'dad', label: 'Bố Ba', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80' },
      { id: 'mom', label: 'Mẹ Hiền', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80' },
      { id: 'grandpa', label: 'Ông Nội', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB9RXFgUn83eP41jg2weE3YA8vd83fsVimUf5y0OcZS7SOQ3XPOzG_gbODV_xJIXeRQye9NHAh2TXP_28Oz-bPHhWTfscJFCZWXYRXq2gQAAtwAVTc1yseRsDx3GBa94HVhTHAal40UzoVwN7YY1IXQ5EmMOe0WhhEvzu4V7ZNBtixA0ZiaR61Ad1UJUADoRuNzug0ggIZW8eO5XEiktIZD-zCJ4THMAqG0i7Z1ivkCGPnUrjsBJg' },
      { id: 'grandma', label: 'Bà Ngoại', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80' },
      { id: 'brother', label: 'Anh Cả', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80' },
      { id: 'sister', label: 'Cô Út', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80' },
      { id: 'kid_girl', label: 'Bé Na', url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAc1UhNj0E3eKWwrEAv9WJ4KTtp_4pnR4-fyhwEHSKncOxXMGgdr5EdEkF7AMpuaguOYSWTwC-3Ovp1jhOZtflnABlKorh-7E9pPfvKLow6TvFQHGxmf0EgQh_J7eX2WyhgY_obtzgCtT892o3CCd1-TKpF3WABb42fGzxm4wVTK6S7fWG0bKJKRZGbEsWybndKRK3uK6Aix2ehMS1hOr8zRyDG3ZRA0ODbqcIHWiDv1p2ayRMtyQ' },
      { id: 'kid_boy', label: 'Bé Bi', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80' },
    ],
  },
  {
    category: '3D Web3 & Nhân Vật Phong Cách',
    avatars: [
      { id: 'crypto_1', label: 'Guardian 3D', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80' },
      { id: 'crypto_2', label: 'Avalanche Red', url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=200&auto=format&fit=crop&q=80' },
      { id: 'crypto_3', label: 'Cyber Tech', url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=200&auto=format&fit=crop&q=80' },
      { id: 'crypto_4', label: 'Gold Bullion', url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&auto=format&fit=crop&q=80' },
      { id: 'crypto_5', label: 'Astronaut', url: 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=200&auto=format&fit=crop&q=80' },
      { id: 'crypto_6', label: 'Meta Human', url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80' },
      { id: 'crypto_7', label: 'Minimalist', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80' },
      { id: 'crypto_8', label: 'Digital Wave', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&auto=format&fit=crop&q=80' },
    ],
  },
];

export const DEFAULT_AVATAR = PRESET_AVATAR_COLLECTIONS[0].avatars[0].url;

/**
 * @notice Component Studio Chỉnh sửa Avatar chuyên nghiệp
 * Hỗ trợ 3 luồng: Tải ảnh từ máy (nén canvas DataURL), Chọn Presets tuyển chọn, hoặc Dán URL ảnh
 */
export const AvatarStudio: React.FC<AvatarStudioProps> = ({
  currentAvatar,
  onAvatarChange,
  roleBadge = 'MEMBER',
  fullName = 'Người Dùng',
}) => {
  const [mode, setMode] = useState<'presets' | 'upload' | 'url'>('presets');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayAvatar = currentAvatar || DEFAULT_AVATAR;

  // Xử lý nén và scale ảnh từ máy tính thành DataURL nhẹ (< 30KB)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP).');
      return;
    }

    setIsCompressing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Tạo canvas để scale hình vuông 200x200
        const canvas = document.createElement('canvas');
        const size = 200;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsCompressing(false);
          return;
        }

        // Cắt ảnh theo tỉ lệ hình vuông chính giữa (center crop)
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

        // Xuất data URL định dạng JPEG chất lượng 82%
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        onAvatarChange(compressedDataUrl);
        setIsCompressing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError('');
    const trimmed = customUrlInput.trim();
    if (!trimmed) return;

    if (!/^https:\/\//.test(trimmed)) {
      setUrlError('Vui lòng nhập đường link bắt đầu bằng https://');
      return;
    }

    onAvatarChange(trimmed);
    setCustomUrlInput('');
  };

  const handleResetDefault = () => {
    onAvatarChange(DEFAULT_AVATAR);
  };

  return (
    <div className="space-y-6">
      {/* 1. KHUNG PREVIEW AVATAR LỚN CHUYÊN NGHIỆP */}
      <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/70 dark:from-slate-800/60 dark:to-slate-900 border border-slate-200/80 dark:border-slate-700">
        <div className="relative group shrink-0">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr from-red-500 via-rose-400 to-amber-400 shadow-md">
            <img
              src={displayAvatar}
              alt={fullName}
              className="w-full h-full rounded-full object-cover bg-white dark:bg-slate-800 border-2 border-white dark:border-slate-800"
            />
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Đổi ảnh từ máy tính"
            className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-slate-900 text-white hover:bg-red-600 flex items-center justify-center shadow-lg transition-colors cursor-pointer border-2 border-white dark:border-slate-800"
          >
            <Camera size={15} />
          </button>
        </div>

        <div className="flex flex-col text-center sm:text-left gap-1">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{fullName}</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300">
              {roleBadge}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ảnh đại diện hiển thị trên bảng điều khiển, giao dịch gia đình và chữ ký phê duyệt.
          </p>
          <div className="flex items-center justify-center sm:justify-start gap-3 pt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Upload size={13} />
              <span>Tải ảnh lên từ máy</span>
            </button>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <button
              type="button"
              onClick={handleResetDefault}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Đặt lại mặc định</span>
            </button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* 2. TAB LỰA CHỌN PHƯƠNG THỨC AVATAR */}
      <div className="space-y-4">
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
          {[
            { id: 'presets', label: 'Bộ Sưu Tập Presets', icon: Sparkles },
            { id: 'upload', label: 'Tải Tệp Từ Thiết Bị', icon: Upload },
            { id: 'url', label: 'Đường Dẫn URL', icon: LinkIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMode(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-red-600 text-red-600 dark:text-red-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* CHẾ ĐỘ 1: PRESETS THƯ VIỆN */}
        {mode === 'presets' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {PRESET_AVATAR_COLLECTIONS.map((collection) => (
              <div key={collection.category} className="space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                  {collection.category}
                </span>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                  {collection.avatars.map((preset) => {
                    const isSelected = displayAvatar === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => onAvatarChange(preset.url)}
                        title={preset.label}
                        className={`group relative flex flex-col items-center gap-1 p-1 rounded-2xl transition-all cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-red-600 ring-offset-2 dark:ring-offset-slate-900 scale-105'
                            : 'hover:scale-105 opacity-85 hover:opacity-100'
                        }`}
                      >
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs bg-slate-100">
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {isSelected && (
                          <div className="absolute top-0 right-0 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xs">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        )}
                        <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium truncate max-w-full">
                          {preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CHẾ ĐỘ 2: TẢI ẢNH TỪ MÁY */}
        {mode === 'upload' && (
          <div className="animate-in fade-in duration-200">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-red-500 dark:hover:border-red-500 rounded-2xl flex flex-col items-center justify-center text-center gap-3 cursor-pointer bg-slate-50/50 dark:bg-slate-900/50 transition-all hover:bg-red-50/20"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center">
                <ImageIcon size={26} />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-800 dark:text-white block">
                  {isCompressing ? 'Đang xử lý và tối ưu ảnh...' : 'Nhấn để chọn ảnh từ máy tính của bạn'}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Hỗ trợ định dạng PNG, JPG, WEBP. Ảnh sẽ được tự động tối ưu hóa tròn và sắc nét.
                </p>
              </div>
              <button
                type="button"
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Chọn tệp từ máy
              </button>
            </div>
          </div>
        )}

        {/* CHẾ ĐỘ 3: DÁN LINK URL HTTPS */}
        {mode === 'url' && (
          <form onSubmit={handleApplyCustomUrl} className="space-y-3 animate-in fade-in duration-200">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Đường Dẫn URL Ảnh Trực Tiếp (HTTPS)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                Áp dụng
              </button>
            </div>
            {urlError && <p className="text-xs text-red-600 font-medium">{urlError}</p>}
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Bạn có thể dán link ảnh từ bất kỳ dịch vụ lưu trữ nào (Imgur, Cloudinary, GitHub, Unsplash...).
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
