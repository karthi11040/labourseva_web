"use client";

import React, { useState } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";
import NotificationBadge from "./NotificationBadge";
import NotificationDropdown from "./NotificationDropdown";
import { InAppNotificationItem } from "../types/notification.types";

interface NotificationBellProps {
  className?: string;
  buttonClassName?: string;
  dropdownAlign?: "right" | "left" | "center";
  pollingIntervalMs?: number;
  onNotificationClick?: (notification: InAppNotificationItem) => void;
  locale?: "en" | "ta";
}

export function NotificationBell({
  className = "",
  buttonClassName = "",
  dropdownAlign = "right",
  pollingIntervalMs = 45000,
  onNotificationClick,
  locale: propLocale,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Fallback language detection
  let currentLocale: "en" | "ta" = propLocale || "en";
  try {
    if (typeof document !== "undefined") {
      const cookieLang = document.cookie.match(/(?:^|; )labourseva-language=(en|ta)/)?.[1];
      if (cookieLang === "ta" || cookieLang === "en") {
        currentLocale = propLocale || (cookieLang as "en" | "ta");
      }
    }
  } catch {
    // Default to en
  }

  const {
    notifications,
    unreadCount,
    totalCount,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    filter,
    setFilter,
    refetch,
    loadMore,
    markAsRead,
    markAllAsRead,
  } = useNotifications({ pollingIntervalMs });

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={toggleDropdown}
        className={`relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#1e3a8a] dark:focus:ring-blue-400 transition-colors ${buttonClassName}`}
        aria-label={
          currentLocale === "ta"
            ? `அறிவிப்புகள்${unreadCount > 0 ? `, ${unreadCount} படிக்காதவை` : ""}`
            : `Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`
        }
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        <NotificationBadge count={unreadCount} />
      </button>

      <NotificationDropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        totalCount={totalCount}
        hasMore={hasMore}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        error={error}
        filter={filter}
        onFilterChange={setFilter}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onLoadMore={loadMore}
        onRetry={refetch}
        onItemClick={onNotificationClick}
        locale={currentLocale}
        align={dropdownAlign}
      />
    </div>
  );
}

export default NotificationBell;
