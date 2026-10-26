"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandparentName?: string;
  onVerified?: () => void;
}

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  isOpen,
  onClose,
  grandparentName = "Ông Nội",
  onVerified,
}) => {
  const { language } = useLanguage();
  const [callStatus, setCallStatus] = useState<"connecting" | "connected" | "ended">("connecting");
  const [callSeconds, setCallSeconds] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCallStatus("connecting");
      setCallSeconds(0);
      return;
    }

    const connectTimer = setTimeout(() => {
      setCallStatus("connected");
    }, 1800);

    return () => clearTimeout(connectTimer);
  }, [isOpen]);

  useEffect(() => {
    if (callStatus !== "connected") return;
    const interval = setInterval(() => {
      setCallSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callStatus]);

  if (!isOpen) return null;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest max-w-lg w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-outline-variant/30">
        {/* Video Screen Area */}
        <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
          {callStatus === "connecting" ? (
            <div className="flex flex-col items-center gap-3 text-white">
              <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center animate-pulse">
                <span className="material-symbols-outlined text-[32px] text-secondary">
                  videocam
                </span>
              </div>
              <p className="font-semibold text-sm">
                {language === "vi" ? `Đang kết nối tới ${grandparentName}...` : `Connecting to ${grandparentName}...`}
              </p>
              <span className="text-xs text-slate-400">
                {language === "vi" ? "Mã hóa E2EE bảo mật P2P qua Family L1" : "E2EE encrypted P2P verification"}
              </span>
            </div>
          ) : (
            <>
              {/* Grandparent simulated video feed */}
              <img
                src="https://images.unsplash.com/photo-1544717302-de2939b7ef71?w=800"
                alt="Grandparent"
                className="w-full h-full object-cover"
              />
              {/* Live overlay banner */}
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1.5 text-white text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>REC • {formatTimer(callSeconds)}</span>
              </div>
              <div className="absolute top-3 right-3 bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                <span>{language === "vi" ? "Chính Chủ • Đúng Giọng Nói" : "Verified Identity"}</span>
              </div>

              {/* PiP of Caller */}
              <div className="absolute bottom-3 right-3 w-24 h-32 rounded-xl overflow-hidden border-2 border-white/60 shadow-lg bg-slate-800">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300"
                  alt="You"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Verified Dialogue Box */}
              <div className="absolute bottom-3 left-3 max-w-[65%] bg-black/75 backdrop-blur-md p-2.5 rounded-xl border border-white/10 text-white text-xs">
                <p className="font-bold text-secondary-container">
                  {grandparentName}:
                </p>
                <p className="text-[11px] text-slate-200 mt-0.5">
                  {language === "vi"
                    ? '“Bố đang ở cổng Bệnh viện Tim TW rồi con ạ, vừa nộp tiền chụp mạch vành. Con duyệt giúp bố nhé!”'
                    : '"I am at the hospital entrance now son, need the deposit for tests. Please approve it!"'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Control Bar */}
        <div className="p-4 bg-surface-container-lowest flex items-center justify-between gap-3 border-t border-surface-container">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-on-surface">
              {language === "vi" ? `Cuộc gọi đối soát với ${grandparentName}` : `Verification with ${grandparentName}`}
            </span>
            <span className="text-[11px] text-on-surface-variant">
              {language === "vi" ? "Ngăn chặn triệt để Deepfake & cuộc gọi lừa đảo" : "Anti-Deepfake & Anti-AI Voice Scam"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-colors cursor-pointer"
            >
              {language === "vi" ? "Đóng Cuộc Gọi" : "End Call"}
            </button>
            {callStatus === "connected" && (
              <button
                type="button"
                onClick={() => {
                  if (onVerified) onVerified();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span>{language === "vi" ? "Xác Minh Hợp Lệ" : "Confirm Legitimate"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
