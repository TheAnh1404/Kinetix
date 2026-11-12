"use client";

import React, { useEffect, useState } from "react";

// Định nghĩa màu sắc pháo hoa rực rỡ dành cho trẻ em
const CONFETTI_COLORS = [
  "#8B5CF6", // Tím Kinetix Kids
  "#EC4899", // Hồng tươi
  "#F59E0B", // Vàng ánh kim
  "#10B981", // Xanh ngọc
  "#3B82F6", // Xanh da trời
  "#F43F5E", // Đỏ dâu tây
  "#A855F7", // Tím mộng mơ
  "#FBBF24", // Vàng nắng
];

interface Particle {
  id: number;
  x: number; // Tọa độ ngang xuất phát (%)
  color: string;
  size: number;
  rotation: number;
  delay: number;
  duration: number;
  shape: "circle" | "square" | "strip";
}

/**
 * Hiệu ứng pháo hoa giấy (Confetti) chúc mừng bé khi hoàn thành việc nhà hoặc đạt cột mốc thưởng.
 * Hoạt động mượt mà bằng CSS Keyframes thuần túy, không phụ thuộc thư viện ngoài, tối ưu hiệu năng di động.
 */
export function ConfettiEffect({
  active = true,
  count = 45,
  durationMs = 3500,
  onComplete,
}: {
  active?: boolean;
  count?: number;
  durationMs?: number;
  onComplete?: () => void;
}) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(active);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }

    // Khởi tạo danh sách các mảnh giấy pháo hoa ngẫu nhiên
    const items: Particle[] = Array.from({ length: count }, (_, index) => ({
      id: index,
      x: Math.floor(Math.random() * 95) + 2,
      color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
      size: Math.floor(Math.random() * 8) + 8, // 8px - 16px
      rotation: Math.floor(Math.random() * 360),
      delay: Math.random() * 0.6, // độ trễ ngẫu nhiên 0s - 0.6s
      duration: Math.random() * 1.5 + 2, // 2s - 3.5s
      shape: index % 3 === 0 ? "circle" : index % 3 === 1 ? "strip" : "square",
    }));

    setParticles(items);
    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [active, count, durationMs, onComplete]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
      aria-hidden="true"
    >
      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(-20px) rotate(0deg) scale(0.8);
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            transform: translateY(105vh) rotate(720deg) scale(0.6);
            opacity: 0;
          }
        }
      `}</style>
      {particles.map((p) => {
        const isCircle = p.shape === "circle";
        const isStrip = p.shape === "strip";
        return (
          <div
            key={p.id}
            style={{
              position: "absolute",
              top: "-20px",
              left: `${p.x}%`,
              width: isStrip ? `${p.size * 0.4}px` : `${p.size}px`,
              height: isStrip ? `${p.size * 1.8}px` : `${p.size}px`,
              backgroundColor: p.color,
              borderRadius: isCircle ? "50%" : isStrip ? "2px" : "3px",
              animation: `confettiFall ${p.duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
              animationDelay: `${p.delay}s`,
              transform: `rotate(${p.rotation}deg)`,
              boxShadow: `0 0 6px ${p.color}80`,
            }}
          />
        );
      })}
    </div>
  );
}
