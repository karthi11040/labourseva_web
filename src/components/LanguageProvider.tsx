"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { t as resolveTranslation, I18N_DICTIONARY } from "@/lib/i18n-dictionary";

export type Language = "en" | "ta";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  isTamil: boolean;
  t: (key: string, fallback?: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export default function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const saved = document.cookie.match(/(?:^|; )labourseva-language=(en|ta)/)?.[1] as Language | undefined;
    const next = saved ?? (document.documentElement.lang === "ta" ? "ta" : "en");
    setLanguageState(next);
    document.documentElement.lang = next;
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    document.cookie = `labourseva-language=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
    window.dispatchEvent(new CustomEvent("labourseva-language-change", { detail: next }));
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "en" ? "ta" : "en");
  }, [language, setLanguage]);

  const t = useCallback(
    (key: string, fallback?: string) => {
      return resolveTranslation(key, language, fallback);
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      isTamil: language === "ta",
      t,
    }),
    [language, setLanguage, toggleLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used within LanguageProvider");
  return value;
}

