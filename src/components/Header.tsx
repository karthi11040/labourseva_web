"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useLanguage } from "@/components/LanguageProvider";
import {
  CalendarDays,
  Contrast,
  Globe,
  Search,
  UserRound,
  Menu,
  X,
} from "lucide-react";

const navLinks = [
  { label: "Home", labelTa: "முகப்பு", href: "/" },
  { label: "Services", labelTa: "சேவைகள்", href: "/services" },
  { label: "Marketplace", labelTa: "சந்தை", href: "/marketplace" },
  { label: "Schemes", labelTa: "திட்டங்கள்", href: "/schemes" },
  { label: "Downloads", labelTa: "பதிவிறக்கங்கள்", href: "/downloads" },
  { label: "About Us", labelTa: "எங்களை பற்றி", href: "/about" },
  { label: "Help", labelTa: "உதவி", href: "/help" },
];

export default function Header() {
  const pathname = usePathname();
  const { language: lang, setLanguage } = useLanguage();
  const [highContrast, setHighContrast] = useState(false);
  const [dateTime, setDateTime] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const savedContrast = document.cookie.match(/(?:^|; )labourseva-contrast=(high|normal)/)?.[1];
    const contrast = savedContrast ?? document.documentElement.dataset.contrast ?? "normal";
    setHighContrast(contrast === "high");
    document.documentElement.dataset.contrast = contrast;

    const updateDateTime = () => {
      const date = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      });
      const time = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      });
      setDateTime(`${date} at ${time} IST`);
    };

    updateDateTime();
    const timer = window.setInterval(updateDateTime, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  function changeLanguage(next: "en" | "ta") {
    setLanguage(next);
  }

  function toggleContrast() {
    const next = highContrast ? "normal" : "high";
    setHighContrast(!highContrast);
    document.documentElement.dataset.contrast = next;
    document.cookie = `labourseva-contrast=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  function changeFontSize(amount: number) {
    const root = document.documentElement;
    const current = Number.parseFloat(getComputedStyle(root).fontSize) || 16;
    root.style.fontSize = `${Math.min(20, Math.max(14, current + amount))}px`;
  }

  return (
    <header className="ls-header">
      {/* Top utility bar */}
      <div className="ls-topbar">
        <div className="ls-header-container ls-topbar-inner">
          <p className="ls-topbar-message">
            ஜெய் ஜெகன் நாத்
          </p>
          <div className="ls-utilities">
            <div className="ls-font-controls" aria-label="Font size controls">
              <button
                type="button"
                onClick={() => changeFontSize(-1)}
                aria-label="Decrease text size"
              >
                A−
              </button>
              <button
                type="button"
                onClick={() => changeFontSize(1)}
                aria-label="Increase text size"
              >
                A+
              </button>
            </div>
            <span className="ls-utility-divider" aria-hidden="true" />
            <button
              type="button"
              className="ls-utility-button ls-contrast-button"
              onClick={toggleContrast}
              aria-pressed={highContrast}
            >
              <Contrast size={16} aria-hidden="true" /> Contrast
            </button>
            <span className="ls-utility-divider" aria-hidden="true" />
            <div className="ls-language-controls" aria-label="Language">
              <Globe size={15} aria-hidden="true" />
              <button
                type="button"
                aria-pressed={lang === "en"}
                className={lang === "en" ? "is-selected" : ""}
                onClick={() => changeLanguage("en")}
              >
                English
              </button>
              <span aria-hidden="true">/</span>
              <button
                type="button"
                aria-pressed={lang === "ta"}
                className={lang === "ta" ? "is-selected" : ""}
                onClick={() => changeLanguage("ta")}
              >
                தமிழ்
              </button>
            </div>
            <span className="ls-utility-divider" aria-hidden="true" />
            <div className="ls-date-time">
              <CalendarDays size={15} aria-hidden="true" />
              <span>{dateTime || "Tamil Nadu, India"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main navigation header */}
      <div className="ls-nav-shell">
        <div className="ls-header-container ls-nav-inner">
          <Link href="/" className="ls-brand" aria-label="LabourSeva Home">
            <Image src="/images/Logo.webp" alt="LabourSeva logo" width={34} height={34} className="ls-brand-logo" priority />
            <span className="ls-brand-copy">
              <span className="ls-brand-name">
                Labour<span>Seva</span>
              </span>
              <span className="ls-brand-accent" aria-hidden="true" />
              <span className="ls-brand-tamil">
                தொழிலாளர் நல சேவைகள்
              </span>
            </span>
          </Link>

          <nav className="ls-desktop-nav" aria-label="Main navigation">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`ls-nav-link ${isActive ? "is-active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  {lang === "ta" ? link.labelTa : link.label}
                </Link>
              );
            })}
          </nav>

          <div className="ls-nav-actions">
            <Link
              href="/services"
              className="ls-search-button"
              aria-label="Search services"
              title="Search services"
            >
              <Search size={19} />
            </Link>

            <Link href="/login" className="ls-signin-button">
              <UserRound size={17} />
              <span>{lang === "ta" ? "உள்நுழைக" : "Sign in"}</span>
            </Link>

            <button
              type="button"
              className="ls-mobile-menu-button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {menuOpen && (
          <nav className="ls-mobile-nav" aria-label="Mobile navigation">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`ls-mobile-nav-link ${isActive ? "is-active" : ""}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {lang === "ta" ? link.labelTa : link.label}
                </Link>
              );
            })}
            <Link
              href="/login"
              className="ls-mobile-login"
              onClick={() => setMenuOpen(false)}
            >
              <UserRound size={17} />
              <span>{lang === "ta" ? "உள்நுழைக" : "Sign in"}</span>
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
