"use client";

import React from "react";

interface NotificationBadgeProps {
  count: number;
  className?: string;
  max?: number;
}

export function NotificationBadge({
  count,
  className = "",
  max = 99,
}: NotificationBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > max ? `${max}+` : `${count}`;

  return (
    <span
      className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-none flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-sm animate-in fade-in zoom-in duration-150 ${className}`}
      aria-label={`${count} unread notifications`}
    >
      {displayCount}
    </span>
  );
}

export default NotificationBadge;
