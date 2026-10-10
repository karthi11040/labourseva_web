import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Facebook,
  Twitter,
  Youtube,
  Instagram,
  ExternalLink,
} from "lucide-react";

const footerLinks = {
  quickLinks: [
    { label: "Home", href: "/" },
    { label: "Services", href: "/services" },
    { label: "Schemes", href: "/schemes" },
    { label: "Downloads", href: "/downloads" },
    { label: "Contact Us", href: "/contact" },
  ],
  support: [
    { label: "Help & Guidelines", href: "/help" },
    { label: "User Manuals", href: "/downloads#manuals" },
    { label: "FAQ", href: "/help#faq" },
    { label: "Grievance", href: "/grievance" },
    { label: "Track Application", href: "/track" },
  ],
  about: [
    { label: "About Us", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "News & Updates", href: "/news" },
    { label: "Tenders", href: "/tenders" },
  ],
  policies: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Use", href: "/terms" },
    { label: "Refund Policy", href: "/refund" },
    { label: "Accessibility", href: "/accessibility" },
    { label: "Sitemap", href: "/sitemap" },
  ],
};

export default function Footer() {
  return (
    <footer
      className="text-gray-300"
      style={{ background: "#0C0A09" }}
      role="contentinfo"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top section */}
        <div className="py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ background: "var(--primary)" }}
                aria-hidden="true"
              >
                LS
              </div>
              <div>
                <div className="font-bold text-base text-white">LabourSeva</div>
                <div
                  className="text-[10px] text-gray-400"
                  style={{ fontFamily: "var(--font-sans-ta)" }}
                >
                  தொழிலாளர் நல சேவைகள்
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-5 max-w-xs">
              LabourSeva provides digital access to labour welfare services,
              making it easier for workers in Tamil Nadu to access schemes,
              register, apply and track applications securely.
            </p>

            {/* Contact */}
            <div className="space-y-2 mb-5">
              <a
                href="tel:18004251234"
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <Phone size={14} className="flex-shrink-0" />
                1800 425 1234
                <span className="text-xs text-gray-600">(Toll-free, placeholder)</span>
              </a>
              <a
                href="mailto:support@labourseva.com"
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <Mail size={14} className="flex-shrink-0" />
                support@labourseva.com
              </a>
            </div>

            {/* Social */}
            <div className="flex items-center gap-3">
              {[
                { icon: Facebook, label: "Facebook", href: "#" },
                { icon: Twitter, label: "Twitter / X", href: "#" },
                { icon: Youtube, label: "YouTube", href: "#" },
                { icon: Instagram, label: "Instagram", href: "#" },
              ].map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <FooterColumn title="Quick Links" links={footerLinks.quickLinks} />
          <FooterColumn title="Support" links={footerLinks.support} />
          <FooterColumn title="About" links={footerLinks.about} />
          <FooterColumn title="Policies" links={footerLinks.policies} />
        </div>

        {/* Bottom bar */}
        <div
          className="py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-600"
          style={{ borderColor: "#1C1917" }}
        >
          <p>
            © {new Date().getFullYear()} LabourSeva. All rights reserved.
          </p>
          <p>
            Contact details and service data shown are for demonstration purposes.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="text-white font-semibold text-sm mb-3">{title}</h3>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1 group"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
