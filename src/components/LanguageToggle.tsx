"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { Globe } from "lucide-react";

interface LanguageToggleProps {
  className?: string;
  variant?: "pill" | "outline" | "compact";
}

export default function LanguageToggle({
  className = "",
  variant = "pill",
}: LanguageToggleProps) {
  const { language, toggleLanguage } = useLanguage();
  const isEn = language === "en";

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={toggleLanguage}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs ${className}`}
        aria-label="Switch Language / மொழியை மாற்றுக"
        title="Switch Language / மொழியை மாற்றுக"
      >
        <Globe size={13} className="text-[#1e3a8a] dark:text-blue-400" />
        <span>{isEn ? "தமிழ்" : "English"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={`relative inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-[#1e3a8a] hover:bg-slate-50 transition-all shadow-2xs ${className}`}
      aria-label="Switch language between English and தமிழ்"
      title={isEn ? "Switch to தமிழ்" : "ஆங்கிலத்திற்கு மாறுக"}
    >
      <Globe size={14} className="text-[#ea580c]" />
      <span className="flex items-center gap-1">
        <span className={isEn ? "text-[#1e3a8a] font-extrabold" : "text-slate-400 font-medium"}>
          EN
        </span>
        <span className="text-slate-300">/</span>
        <span className={!isEn ? "text-[#ea580c] font-extrabold" : "text-slate-400 font-medium"}>
          தமிழ்
        </span>
      </span>
    </button>
  );
}
