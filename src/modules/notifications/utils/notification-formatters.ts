/**
 * LabourSeva — Notification Formatting Utilities
 * Handles localized date/time formatting, category color mappings, and icons.
 */
import { NotificationCategory } from "../types/notification.types";

export function formatNotificationRelativeTime(
  isoDate: string | Date,
  locale: "en" | "ta" = "en"
): string {
  try {
    const d = typeof isoDate === "string" ? new Date(isoDate) : isoDate;
    if (isNaN(d.getTime())) return "";

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (locale === "ta") {
      if (diffSec < 45) return "சற்று முன்";
      if (diffMin < 60) return `${diffMin} நிமிடம் முன்`;
      if (diffHr < 24) return `${diffHr} மணி நேரம் முன்`;
      if (diffDays === 1) return "நேற்று";
      if (diffDays < 7) return `${diffDays} நாட்கள் முன்`;
      return d.toLocaleDateString("ta-IN", { month: "short", day: "numeric" });
    }

    if (diffSec < 45) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export interface CategoryStyle {
  bgLight: string;
  bgDark: string;
  textLight: string;
  textDark: string;
  borderLight: string;
  borderDark: string;
  accent: string;
  labelEn: string;
  labelTa: string;
}

export const CATEGORY_STYLES: Record<NotificationCategory, CategoryStyle> = {
  APPLICATION: {
    bgLight: "bg-blue-50",
    bgDark: "dark:bg-blue-950/50",
    textLight: "text-[#1e3a8a]",
    textDark: "dark:text-blue-300",
    borderLight: "border-blue-200",
    borderDark: "dark:border-blue-800",
    accent: "#1e3a8a",
    labelEn: "Application",
    labelTa: "விண்ணப்பம்",
  },
  PAYMENT: {
    bgLight: "bg-emerald-50",
    bgDark: "dark:bg-emerald-950/50",
    textLight: "text-emerald-700",
    textDark: "dark:text-emerald-300",
    borderLight: "border-emerald-200",
    borderDark: "dark:border-emerald-800",
    accent: "#059669",
    labelEn: "Payment",
    labelTa: "கட்டணம்",
  },
  ACCOUNT: {
    bgLight: "bg-purple-50",
    bgDark: "dark:bg-purple-950/50",
    textLight: "text-purple-700",
    textDark: "dark:text-purple-300",
    borderLight: "border-purple-200",
    borderDark: "dark:border-purple-800",
    accent: "#7c3aed",
    labelEn: "Account",
    labelTa: "கணக்கு",
  },
  DOCUMENT: {
    bgLight: "bg-indigo-50",
    bgDark: "dark:bg-indigo-950/50",
    textLight: "text-indigo-700",
    textDark: "dark:text-indigo-300",
    borderLight: "border-indigo-200",
    borderDark: "dark:border-indigo-800",
    accent: "#4f46e5",
    labelEn: "Certificate",
    labelTa: "சான்றிதழ்",
  },
  REFUND: {
    bgLight: "bg-amber-50",
    bgDark: "dark:bg-amber-950/50",
    textLight: "text-amber-800",
    textDark: "dark:text-amber-300",
    borderLight: "border-amber-200",
    borderDark: "dark:border-amber-800",
    accent: "#d97706",
    labelEn: "Refund",
    labelTa: "ரீஃபண்ட்",
  },
  ASSIGNMENT: {
    bgLight: "bg-teal-50",
    bgDark: "dark:bg-teal-950/50",
    textLight: "text-teal-700",
    textDark: "dark:text-teal-300",
    borderLight: "border-teal-200",
    borderDark: "dark:border-teal-800",
    accent: "#0d9488",
    labelEn: "Task Assigned",
    labelTa: "ஒதுக்கீடு",
  },
  SYSTEM: {
    bgLight: "bg-slate-100",
    bgDark: "dark:bg-slate-800",
    textLight: "text-slate-700",
    textDark: "dark:text-slate-300",
    borderLight: "border-slate-200",
    borderDark: "dark:border-slate-700",
    accent: "#475569",
    labelEn: "System",
    labelTa: "அமைப்பு",
  },
};

export function getCategoryStyle(category?: string | null): CategoryStyle {
  if (category && category in CATEGORY_STYLES) {
    return CATEGORY_STYLES[category as NotificationCategory];
  }
  return CATEGORY_STYLES.SYSTEM;
}
