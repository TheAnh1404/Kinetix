"use client";

import React, { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { speakElderlyText, stopElderlyText } from "./elderlyUtils";

interface ElderlySpeakerButtonProps {
  /** Nội dung cần đọc to bằng tiếng Việt */
  textToSpeak: string;
  /** Nhãn hiển thị trên nút (mặc định: "Nghe đọc") */
  label?: string;
  /** Tùy chọn class bổ sung */
  className?: string;
  /** Kích thước thu gọn chỉ hiện icon hay kèm cả chữ */
  variant?: "full" | "icon-only";
}

/**
 * Nút kích hoạt đọc văn bản tiếng Việt cho người cao tuổi.
 * Đạt chuẩn WCAG AAA: tương phản màu >= 7:1, kích thước cảm ứng >= 56px,
 * phản hồi xúc giác / trạng thái rung trực quan (active scale và viền sáng rõ).
 */
export function ElderlySpeakerButton({
  textToSpeak,
  label = "Nghe đọc",
  className = "",
  variant = "full",
}: ElderlySpeakerButtonProps) {
  const [speaking, setSpeaking] = useState(false);

  // Khi unmount đảm bảo tắt loa
  useEffect(() => {
    return () => {
      if (speaking) {
        stopElderlyText();
      }
    };
  }, [speaking]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (speaking) {
      stopElderlyText();
      setSpeaking(false);
    } else {
      setSpeaking(true);
      const started = speakElderlyText(textToSpeak, () => {
        setSpeaking(false);
      });
      if (!started) {
        setSpeaking(false);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={speaking ? "Dừng đọc âm thanh" : `Nghe đọc: ${label}`}
      title={speaking ? "Dừng đọc âm thanh" : label}
      className={`min-h-[56px] min-w-[56px] px-4 py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-lg border-2 transition-all duration-150 active:scale-95 focus:outline-none focus:ring-4 ${
        speaking
          ? "bg-amber-100 text-amber-950 border-amber-600 animate-pulse dark:bg-amber-950 dark:text-amber-100 dark:border-amber-400 focus:ring-amber-300"
          : "bg-slate-100 text-slate-900 hover:bg-slate-200 border-slate-400 hover:border-slate-600 dark:bg-slate-800 dark:text-slate-50 dark:border-slate-500 dark:hover:bg-slate-700 focus:ring-emerald-400"
      } ${className}`}
    >
      {speaking ? (
        <VolumeX
          className="w-7 h-7 flex-shrink-0 text-amber-700 dark:text-amber-300"
          aria-hidden="true"
        />
      ) : (
        <Volume2
          className="w-7 h-7 flex-shrink-0 text-emerald-800 dark:text-emerald-400"
          aria-hidden="true"
        />
      )}
      {variant === "full" && (
        <span className="whitespace-nowrap tracking-wide">
          {speaking ? "Đang đọc (Bấm để dừng)" : label}
        </span>
      )}
    </button>
  );
}
