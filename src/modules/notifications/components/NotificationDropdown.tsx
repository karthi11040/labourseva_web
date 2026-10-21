"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronRight, X } from "lucide-react";
import { InAppNotificationItem, NotificationFilter } from "../types/notification.types";
import NotificationList from "./NotificationList";

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: InAppNotificationItem[];
  unreadCount: number;
  totalCount: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  filter: NotificationFilter;
  onFilterChange: (filter: NotificationFilter) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onItemClick?: (item: InAppNotificationItem) => void;
  locale?: "en" | "ta";
  align?: "right" | "left" | "center";
}

export function NotificationDropdown({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  totalCount,
  hasMore,
  isLoading,
  isLoadingMore,
  error,
  filter,
  onFilterChange,
  onMarkAsRead,
  onMarkAllAsRead,
  onLoadMore,
  onRetry,
  onItemClick,
  locale = "en",
  align = "right",
}: NotificationDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(e: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    // Close on Escape key
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const alignmentClass =
    align === "right"
      ? "right-0"
      : align === "left"
      ? "left-0"
      : "left-1/2 -translate-x-1/2";

  return (
    <div
      ref={dropdownRef}
      className={`absolute ${alignmentClass} mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-[420px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-700/80 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
      role="dialog"
      aria-label={locale === "ta" ? "அறிவிப்புகள் பலகம்" : "Notifications panel"}
      aria-modal="false"
    >
      <NotificationList
        notifications={notifications}
        unreadCount={unreadCount}
        totalCount={totalCount}
        hasMore={hasMore}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        error={error}
        filter={filter}
        onFilterChange={onFilterChange}
        onMarkAsRead={onMarkAsRead}
        onMarkAllAsRead={onMarkAllAsRead}
        onLoadMore={onLoadMore}
        onRetry={onRetry}
        onItemClick={(item) => {
          if (onItemClick) onItemClick(item);
          onClose();
        }}
        locale={locale}
      />

      {/* Footer Link */}
      <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-700/80 text-center">
        <Link
          href="/user/applications"
          onClick={onClose}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#1e3a8a] dark:text-blue-400 hover:underline transition-colors"
        >
          <span>
            {locale === "ta"
              ? "அனைத்து விண்ணப்பங்களையும் பார்க்க"
              : "View all applications"}
          </span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default NotificationDropdown;
