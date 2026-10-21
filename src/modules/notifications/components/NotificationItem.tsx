"use client";

import React from "react";
import Link from "next/link";
import {
  FileText,
  Receipt,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  UserCheck,
  Briefcase,
  Bell,
  Check,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { InAppNotificationItem } from "../types/notification.types";
import {
  formatNotificationRelativeTime,
  CATEGORY_STYLES,
} from "../utils/notification-formatters";

interface NotificationItemProps {
  notification: InAppNotificationItem;
  onMarkAsRead: (id: string) => void;
  onItemClick?: (notification: InAppNotificationItem) => void;
  locale?: "en" | "ta";
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onItemClick,
  locale = "en",
}: NotificationItemProps) {
  const { id, title, message, category, isRead, createdAt, link } = notification;

  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.SYSTEM;
  const relativeTime = formatNotificationRelativeTime(createdAt, locale);

  const getCategoryIcon = () => {
    switch (category) {
      case "APPLICATION":
        return <FileText className="w-4 h-4" />;
      case "PAYMENT":
        return <Receipt className="w-4 h-4" />;
      case "ACCOUNT":
        return <UserCheck className="w-4 h-4" />;
      case "DOCUMENT":
        return <CheckCircle2 className="w-4 h-4" />;
      case "REFUND":
        return <RotateCcw className="w-4 h-4" />;
      case "ASSIGNMENT":
        return <Briefcase className="w-4 h-4" />;
      case "SYSTEM":
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const handleContainerClick = () => {
    if (!isRead) {
      onMarkAsRead(id);
    }
    if (onItemClick) {
      onItemClick(notification);
    }
  };

  const handleMarkAsReadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onMarkAsRead(id);
  };

  const content = (
    <div
      onClick={handleContainerClick}
      className={`group relative p-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
        !isRead
          ? "bg-blue-50/70 dark:bg-blue-950/30 border-blue-200/90 dark:border-blue-800/80 shadow-[0_2px_8px_rgba(30,58,138,0.04)]"
          : "bg-white dark:bg-slate-800/70 border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/40"
      }`}
      role="article"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleContainerClick();
        }
      }}
    >
      <div className="flex items-start gap-3">
        {/* Category Icon Badge */}
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border ${style.bgLight} ${style.bgDark} ${style.textLight} ${style.textDark} ${style.borderLight} ${style.borderDark} shadow-xs`}
          aria-hidden="true"
        >
          {getCategoryIcon()}
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${style.bgLight} ${style.bgDark} ${style.textLight} ${style.textDark}`}
              >
                {locale === "ta" ? style.labelTa : style.labelEn}
              </span>
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                {relativeTime}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {!isRead && (
                <>
                  <span
                    className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400"
                    title={locale === "ta" ? "படிக்காதது" : "Unread"}
                    aria-label="Unread indicator"
                  />
                  <button
                    type="button"
                    onClick={handleMarkAsReadClick}
                    className="p-1 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    title={locale === "ta" ? "படித்ததாகக் குறிக்கவும்" : "Mark as read"}
                    aria-label="Mark as read"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          <h4
            className={`text-xs font-bold leading-snug mt-1.5 ${
              !isRead
                ? "text-slate-900 dark:text-white"
                : "text-slate-700 dark:text-slate-300"
            }`}
          >
            {title}
          </h4>

          <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
            {message}
          </p>

          {/* Action Footer */}
          {link && (
            <div className="mt-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-[11px]">
              <span className="font-bold text-[#1e3a8a] dark:text-blue-400 group-hover:underline flex items-center gap-1">
                <span>{locale === "ta" ? "விவரங்களைப் பார்க்க" : "View Details"}</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (link) {
    return (
      <Link href={link} className="block no-underline">
        {content}
      </Link>
    );
  }

  return content;
}

export default NotificationItem;
