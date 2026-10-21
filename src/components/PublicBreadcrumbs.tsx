"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

const labels: Record<string, [string, string]> = {
  about: ["About Us", "எங்களை பற்றி"], accessibility: ["Accessibility", "அணுகல்தன்மை"], contact: ["Contact Us", "தொடர்பு"],
  downloads: ["Downloads", "பதிவிறக்கங்கள்"], grievance: ["Grievance", "குறைதீர்வு"], help: ["Help Centre", "உதவி மையம்"],
  login: ["Sign in", "உள்நுழைக"], privacy: ["Privacy Policy", "தனியுரிமைக் கொள்கை"], refund: ["Refund Policy", "பணத்தைத் திரும்பப்பெறும் கொள்கை"],
  register: ["Registration", "பதிவு"], schemes: ["Schemes", "திட்டங்கள்"], services: ["Services", "சேவைகள்"], terms: ["Terms of Use", "பயன்பாட்டு விதிமுறைகள்"], track: ["Track Application", "விண்ணப்பத்தைத் தொடரவும்"],
};

export default function PublicBreadcrumbs() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const text = (key: string, fallback: string) => labels[key]?.[language === "ta" ? 1 : 0] ?? fallback;
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) {
    return (
      <div className="ls-breadcrumb-shell">
        <nav className="ls-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">{text("home", "Home")}</Link>
          <span className="ls-breadcrumb-item">
            <ChevronRight size={14} aria-hidden="true" />
            <span aria-current="page">{language === "ta" ? "தள அணுகல்" : "Portal Access"}</span>
          </span>
        </nav>
      </div>
    );
  }

  const crumbs = segments.map((segment, index) => ({
    label: text(segment, segments[index - 1] === "services" ? (language === "ta" ? "சேவை விவரங்கள்" : "Service details") : (language === "ta" ? "பக்கம்" : "Page")),
    href: `/${segments.slice(0, index + 1).join("/")}`,
  }));

  return (
    <div className="ls-breadcrumb-shell">
      <nav className="ls-breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">{text("home", "Home")}</Link>
        {crumbs.map((crumb, index) => (
          <span className="ls-breadcrumb-item" key={crumb.href}>
            <ChevronRight size={14} aria-hidden="true" />
            {index === crumbs.length - 1 ? <span aria-current="page">{crumb.label}</span> : <Link href={crumb.href}>{crumb.label}</Link>}
          </span>
        ))}
      </nav>
    </div>
  );
}
