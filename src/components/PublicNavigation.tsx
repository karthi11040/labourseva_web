"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Schemes", href: "/schemes" },
  { label: "Downloads", href: "/downloads" },
  { label: "Registration", href: "/register" },
  { label: "Contact Us", href: "/contact" },
  { label: "Help", href: "/help" },
];

function isCurrent(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

export default function PublicNavigation() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="ls-nav-shell" aria-label="Main navigation">
      <div className="ls-header-container ls-nav-inner">
        <div className="ls-desktop-nav">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={`ls-nav-link${isCurrent(pathname, link.href) ? " is-active" : ""}`} aria-current={isCurrent(pathname, link.href) ? "page" : undefined}>
              {link.label}
            </Link>
          ))}
        </div>
        <button type="button" className="ls-mobile-menu-button" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={menuOpen} aria-controls="ls-mobile-navigation">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {menuOpen && (
        <div id="ls-mobile-navigation" className="ls-mobile-nav">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={`ls-mobile-nav-link${isCurrent(pathname, link.href) ? " is-active" : ""}`} aria-current={isCurrent(pathname, link.href) ? "page" : undefined} onClick={() => setMenuOpen(false)}>
              {link.label}
            </Link>
          ))}
          <Link href="/login" className="ls-mobile-login" onClick={() => setMenuOpen(false)}>Sign in</Link>
        </div>
      )}
    </nav>
  );
}
