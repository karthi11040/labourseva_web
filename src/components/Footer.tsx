"use client";

import Link from "next/link";
import {
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  ArrowUp,
  ArrowRight,
  ShieldCheck,
  Mail,
  Phone,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

const footerGroups = [
  {
    title: "Quick links",
    links: [
      { label: "Home", href: "/" },
      { label: "Services", href: "/services" },
      { label: "Schemes", href: "/schemes" },
      { label: "Downloads", href: "/downloads" },
      { label: "Contact us", href: "/contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help & guidelines", href: "/help" },
      { label: "User manuals", href: "/downloads#manuals" },
      { label: "Frequently asked questions", href: "/help#faq" },
      { label: "Grievance", href: "/grievance" },
      { label: "Track application", href: "/track" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "About LabourSeva", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "News & updates", href: "/news" },
      { label: "Tenders", href: "/tenders" },
    ],
  },
  {
    title: "Policies",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of use", href: "/terms" },
      { label: "Refund policy", href: "/refund" },
      { label: "Accessibility", href: "/accessibility" },
      { label: "Sitemap", href: "/sitemap" },
    ],
  },
];

const socialLinks = [
  { label: "Facebook", href: "https://www.facebook.com/", icon: Facebook },
  { label: "Instagram", href: "https://www.instagram.com/", icon: Instagram },
  { label: "YouTube", href: "https://www.youtube.com/", icon: Youtube },
  { label: "LinkedIn", href: "https://www.linkedin.com/", icon: Linkedin },
];

export default function Footer() {
  const { language } = useLanguage();
  const tamil = language === "ta";
  return (
    <footer className="ls-footer">
      <div className="ls-footer-main">
        <div className="ls-footer-container">
          <div className="ls-footer-grid">
            {/* Brand */}
            <div className="ls-footer-brand">
              <Link href="/" className="ls-footer-logo" aria-label="LabourSeva home">
                <span className="ls-footer-brand-name">
                  Labour<span>Seva</span>
                </span>
                <span className="ls-footer-brand-accent" aria-hidden="true" />
                <span className="ls-footer-tamil">
                  தொழிலாளர் நல சேவைகள்
                </span>
              </Link>

              <p className="ls-footer-description">
                {tamil ? "LabourSeva தொழிலாளர் நலத் தகவல்கள் மற்றும் டிஜிட்டல் சேவைகளை ஒருங்கிணைத்து, சேவைகளைக் கண்டறிந்து தகுதியைப் புரிந்துகொண்டு விண்ணப்பங்களைத் தொடர உதவுகிறது." : "LabourSeva brings labour welfare information and digital services together, helping workers discover services, understand eligibility and follow their applications."}
              </p>

              <div className="ls-footer-socials" aria-label="Social media">
                {socialLinks.map(({ label, href, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="ls-social-link"
                  >
                    <Icon size={17} />
                  </a>
                ))}
              </div>
            </div>

            {/* Link groups */}
            {footerGroups.map((group) => (
              <nav
                key={group.title}
                className="ls-footer-column"
                aria-label={group.title}
              >
                <h2>{group.title}</h2>
                <ul>
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href}>
                        <span>{link.label}</span>
                        <ArrowRight size={13} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          {/* Support information */}
          <div className="ls-footer-contact">
            <div className="ls-footer-contact-heading">
              <ShieldCheck size={19} />
              <span>{tamil ? "LabourSeva-வில் வழிகாட்டுதல் தேவையா?" : "Need help navigating LabourSeva?"}</span>
            </div>

            <div className="ls-footer-contact-items">
              <Link href="/help" className="ls-footer-contact-link">
                <Phone size={17} />
                <span>{tamil ? "உதவி மையம்" : "Help centre"}</span>
              </Link>

              <Link href="/contact" className="ls-footer-contact-link">
                <Mail size={17} />
                <span>{tamil ? "ஆதரவைத் தொடர்பு கொள்ளுங்கள்" : "Contact support"}</span>
              </Link>
            </div>
          </div>

          {/* Copyright */}
          <div className="ls-footer-bottom">
            <p>
              © {new Date().getFullYear()} LabourSeva. All rights reserved.
            </p>
            <div className="ls-footer-legal">
              <Link href="/privacy">{tamil ? "தனியுரிமை" : "Privacy"}</Link>
              <span aria-hidden="true">·</span>
              <Link href="/terms">{tamil ? "விதிமுறைகள்" : "Terms"}</Link>
              <span aria-hidden="true">·</span>
              <Link href="/accessibility">{tamil ? "அணுகல்தன்மை" : "Accessibility"}</Link>
            </div>
            <button
              type="button"
              className="ls-back-to-top"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label="Back to top"
            >
              <ArrowUp size={19} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
