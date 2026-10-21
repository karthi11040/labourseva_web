"use client";

import React from "react";
import {
  Bell,
  CheckCheck,
  RefreshCw,
  AlertCircle,
  Loader2,
  Inbox,
} from "lucide-react";
import { InAppNotificationItem, NotificationFilter } from "../types/notification.types";
import NotificationItem from "./NotificationItem";

interface NotificationListProps {
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
}

export function NotificationList({
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
}: NotificationListProps) {
  return (
    <div className="flex flex-col h-full max-h-[540px]">
      {/* Header with Title and Mark-All-As-Read */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-slate-900 dark:text-white">
            {locale === "ta" ? "அறிவிப்புகள்" : "Notifications"}
          </span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1e3a8a] dark:bg-blue-600 text-white shadow-xs">
              {unreadCount} {locale === "ta" ? "புதியவை" : "new"}
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllAsRead}
            className="text-xs font-bold text-[#1e3a8a] dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:underline flex items-center gap-1 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>{locale === "ta" ? "அனைத்தையும் படித்ததாகக் குறி" : "Mark all read"}</span>
          </button>
        )}
      </div>

      {/* Filter Tabs: All vs Unread */}
      <div className="px-4 pt-2.5 pb-2 border-b border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onFilterChange("ALL")}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            filter === "ALL"
              ? "bg-[#1e3a8a] text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50"
          }`}
        >
          {locale === "ta" ? "அனைத்தும்" : "All"}
          {totalCount > 0 && (
            <span className={`ml-1.5 text-[10px] ${filter === "ALL" ? "text-blue-200" : "text-slate-400"}`}>
              {totalCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onFilterChange("UNREAD")}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            filter === "UNREAD"
              ? "bg-[#1e3a8a] text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50"
          }`}
        >
          <span>{locale === "ta" ? "படிக்காதவை" : "Unread"}</span>
          {unreadCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                filter === "UNREAD" ? "bg-white text-[#1e3a8a]" : "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300"
              }`}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Main List Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-slate-100/60 dark:divide-slate-700/40">
        {/* Loading Initial Skeleton */}
        {isLoading && (
          <div className="space-y-2.5 py-2">
            {[1, 2, 3].map((key) => (
              <div
                key={key}
                className="p-3 rounded-xl border border-slate-100 dark:border-slate-700 animate-pulse flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-sm w-3/4" />
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-sm w-full" />
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-sm w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="py-8 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {locale === "ta" ? "அறிவிப்புகளை ஏற்றுவதில் பிழை" : "Failed to load notifications"}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 mb-3">
              {error}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e3a8a] text-white text-xs font-semibold hover:bg-blue-900 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{locale === "ta" ? "மீண்டும் முயற்சிக்கவும்" : "Retry"}</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && notifications.length === 0 && (
          <div className="py-10 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700/60 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3">
              {filter === "UNREAD" ? <Inbox className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {filter === "UNREAD"
                ? locale === "ta"
                  ? "படிக்காத அறிவிப்புகள் ஏதுமில்லை"
                  : "All caught up!"
                : locale === "ta"
                ? "அறிவிப்புகள் ஏதுமில்லை"
                : "No notifications yet"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
              {filter === "UNREAD"
                ? locale === "ta"
                  ? "நீங்கள் அனைத்து அறிவிப்புகளையும் படித்துவிட்டீர்கள்."
                  : "You have reviewed all your active updates and alerts."
                : locale === "ta"
                ? "உங்கள் விண்ணப்பங்கள் மற்றும் சேவைகள் தொடர்பான விவரங்கள் இங்கு தோன்றும்."
                : "Real-time updates regarding your statutory filings and payments will appear here."}
            </p>
          </div>
        )}

        {/* Populated List */}
        {!isLoading && !error && notifications.length > 0 && (
          <div className="space-y-2 pt-1">
            {notifications.map((item) => (
              <NotificationItem
                key={item.id}
                notification={item}
                onMarkAsRead={onMarkAsRead}
                onItemClick={onItemClick}
                locale={locale}
              />
            ))}
          </div>
        )}

        {/* Load More Button */}
        {!isLoading && !error && hasMore && (
          <div className="pt-3 pb-1 text-center">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{locale === "ta" ? "ஏற்றுகிறது..." : "Loading more..."}</span>
                </>
              ) : (
                <span>{locale === "ta" ? "மேலும் பார்க்க" : "Load more"}</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationList;
