"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  Search,
  Globe,
  Sun,
  Moon,
  Monitor,
  ChevronDown,
  UserRound,
  LogOut,
  Bell,
  Shield,
} from "lucide-react";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Schemes", href: "/schemes" },
  { label: "Downloads", href: "/downloads" },
  { label: "About Us", href: "/about" },
  { label: "Help", href: "/help" },
];

type Theme = "light" | "dark" | "system";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [themeOpen, setThemeOpen] = useState(false);
  const [lang, setLang] = useState<"en" | "ta">("en");
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Kolkata",
        })
      );
    };
    updateTime();
    const id = setInterval(updateTime, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme === "system" ? "system" : theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const themeIcons: Record<Theme, React.ReactNode> = {
    light: <Sun size={16} />,
    dark: <Moon size={16} />,
    system: <Monitor size={16} />,
  };

  return (
    <>
      {/* Info bar */}
      <div className="bg-[#0C0A09] text-white text-xs px-4 py-1.5 hidden sm:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <p className="text-gray-300">
            தொழிலாளர் நல சேவைகள் — Labour Welfare Services Portal
          </p>
          <div className="flex items-center gap-4 text-gray-300">
            <span>{currentTime}</span>
            <button
              className="flex items-center gap-1 hover:text-white transition-colors"
              aria-label="Increase font size"
              onClick={() => {
                const html = document.documentElement;
                const current = parseFloat(getComputedStyle(html).fontSize);
                html.style.fontSize = Math.min(current + 1, 20) + "px";
              }}
            >
              A+
            </button>
            <button
              className="flex items-center gap-1 hover:text-white transition-colors"
              aria-label="Decrease font size"
              onClick={() => {
                const html = document.documentElement;
                const current = parseFloat(getComputedStyle(html).fontSize);
                html.style.fontSize = Math.max(current - 1, 14) + "px";
              }}
            >
              A-
            </button>
          </div>
        </div>
      </div>

      {/* Main header */}
      <header
        className={`sticky top-0 z-50 bg-[var(--surface)] transition-shadow duration-200 ${
          scrolled ? "shadow-md" : "border-b border-[var(--border)]"
        }`}
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 flex-shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] rounded-sm"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ background: "var(--primary)" }}
                aria-hidden="true"
              >
                LS
              </div>
              <div>
                <div
                  className="font-bold text-base leading-tight"
                  style={{ color: "var(--primary)" }}
                >
                  LabourSeva
                </div>
                <div
                  className="text-[10px] leading-tight hidden sm:block"
                  style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans-ta)" }}
                >
                  தொழிலாளர் நல சேவைகள்
                </div>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav
              className="hidden lg:flex items-center gap-1"
              aria-label="Main navigation"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 hover:bg-[var(--primary-tint)] hover:text-[var(--primary)]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <button
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-subtle)] transition-colors"
                aria-label="Search"
              >
                <Search size={18} style={{ color: "var(--text-secondary)" }} />
              </button>

              {/* Language toggle */}
              <button
                onClick={() => setLang(lang === "en" ? "ta" : "en")}
                className="hidden sm:flex items-center gap-1 px-3 h-8 rounded-full border text-xs font-medium transition-colors hover:bg-[var(--primary-tint)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                style={{
                  borderColor: "var(--border-strong)",
                  color: "var(--text-secondary)",
                }}
                aria-label="Language switcher"
              >
                <Globe size={14} />
                <span>{lang === "en" ? "EN" : "தமிழ்"}</span>
              </button>

              {/* Theme toggle */}
              <div className="relative hidden sm:block">
                <button
                  onClick={() => setThemeOpen(!themeOpen)}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-subtle)] transition-colors"
                  aria-label="Theme selector"
                  aria-expanded={themeOpen}
                  aria-haspopup="listbox"
                >
                  <span style={{ color: "var(--text-secondary)" }}>
                    {themeIcons[theme]}
                  </span>
                </button>
                {themeOpen && (
                  <div
                    className="absolute right-0 mt-2 w-36 rounded-[var(--radius-md)] border shadow-[var(--shadow-md)] overflow-hidden z-50"
                    style={{
                      background: "var(--surface)",
                      borderColor: "var(--border)",
                    }}
                    role="listbox"
                    aria-label="Theme options"
                  >
                    {(["light", "dark", "system"] as Theme[]).map((t) => (
                      <button
                        key={t}
                        role="option"
                        aria-selected={theme === t}
                        onClick={() => {
                          setTheme(t);
                          setThemeOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                          theme === t
                            ? "bg-[var(--primary-tint)] text-[var(--primary)] font-medium"
                            : "hover:bg-[var(--bg-subtle)]"
                        }`}
                        style={{ color: theme === t ? "var(--primary)" : "var(--text)" }}
                      >
                        {themeIcons[t]}
                        <span className="capitalize">{t}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sign in */}
              <Link
                href="/login"
                className="hidden sm:flex items-center gap-1.5 h-9 px-4 rounded-full text-sm font-medium transition-all duration-150 hover:shadow-[var(--shadow-primary)] active:scale-[0.98]"
                style={{
                  background: "var(--primary)",
                  color: "var(--on-primary)",
                }}
              >
                <UserRound size={16} />
                Sign in
              </Link>

              {/* Mobile hamburger */}
              <button
                className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-subtle)] transition-colors"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
              >
                {menuOpen ? (
                  <X size={20} style={{ color: "var(--text)" }} />
                ) : (
                  <Menu size={20} style={{ color: "var(--text)" }} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div
            id="mobile-menu"
            className="lg:hidden border-t"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <nav
              className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1"
              aria-label="Mobile navigation"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center px-3 py-3 rounded-[var(--radius-sm)] text-sm font-medium transition-colors hover:bg-[var(--primary-tint)] hover:text-[var(--primary)]"
                  style={{ color: "var(--text)" }}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 pt-2 border-t flex gap-2" style={{ borderColor: "var(--border)" }}>
                <Link
                  href="/login"
                  className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-full text-sm font-medium"
                  style={{ background: "var(--primary)", color: "var(--on-primary)" }}
                  onClick={() => setMenuOpen(false)}
                >
                  <UserRound size={16} />
                  Sign in
                </Link>
                <button
                  onClick={() => setLang(lang === "en" ? "ta" : "en")}
                  className="flex items-center gap-1 px-3 h-10 rounded-full border text-xs font-medium"
                  style={{ borderColor: "var(--border-strong)", color: "var(--text-secondary)" }}
                >
                  <Globe size={14} />
                  {lang === "en" ? "EN" : "தமிழ்"}
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
