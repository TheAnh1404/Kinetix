"use client";

import React, { useState } from "react";

interface SafeAvatarProps {
  avatar?: string | null;
  name?: string | null;
  role?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const SafeAvatar: React.FC<SafeAvatarProps> = ({
  avatar,
  name,
  role,
  className = "",
  size = "md",
}) => {
  const [loadError, setLoadError] = useState(false);

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-11 h-11 text-base",
    lg: "w-14 h-14 text-xl",
  };

  const initial = (name || "K").trim().charAt(0).toUpperCase();
  const fallback =
    role === "CHILD" ? "👦" : role === "ELDERLY" ? "👵" : initial;

  const isImageCandidate =
    avatar &&
    (avatar.startsWith("data:") ||
      avatar.startsWith("http://") ||
      avatar.startsWith("https://") ||
      avatar.startsWith("/") ||
      avatar.length > 30);

  let imageSrc = "";
  if (isImageCandidate) {
    imageSrc =
      avatar.startsWith("data:") ||
      avatar.startsWith("http") ||
      avatar.startsWith("/")
        ? avatar
        : `data:image/jpeg;base64,${avatar}`;
  }

  const isShortEmoji = avatar && !isImageCandidate && avatar.length <= 4;

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-slate-100 border border-slate-200/90 shadow-2xs flex items-center justify-center font-bold text-slate-700 overflow-hidden shrink-0 select-none ${className}`}
    >
      {imageSrc && !loadError ? (
        <img
          src={imageSrc}
          alt={name || "Avatar"}
          className="w-full h-full object-cover"
          onError={() => setLoadError(true)}
        />
      ) : isShortEmoji ? (
        <span>{avatar}</span>
      ) : (
        <span>{fallback}</span>
      )}
    </div>
  );
};
