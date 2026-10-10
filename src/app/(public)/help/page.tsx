import Link from "next/link";
import { HelpCircle, FileText, BookOpen, MessageSquareWarning, Mail } from "lucide-react";

const faqs = [
  { q: "How do I register for LabourSeva?", a: "Click 'New Registration' on the homepage and follow the 3-step process: enter your mobile number, verify with OTP, and fill in your profile details." },
  { q: "What documents do I need to apply?", a: "Requirements vary by service. Each service page lists the exact documents needed. Most services require an Aadhaar card and a bank passbook." },
  { q: "How long does an application take?", a: "Processing time varies by service and is displayed on each service card. It typically ranges from 3 to 60 working days." },
  { q: "How do I track my application?", a: "Visit the Track Application page and enter your reference number. You can also see status updates in your customer dashboard." },
  { q: "Who can I contact for assistance?", a: "Call our toll-free helpline 1800 425 1234 or email support@labourseva.com. We respond within 24 hours." },
];

export default function HelpPage() {
  return (
    <div style={{ background: "var(--bg-subtle)", minHeight: "100vh" }}>
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-4xl font-bold mb-2" style={{ color: "var(--text)" }}>Help Centre</h1>
          <p style={{ color: "var(--text-secondary)" }}>Find answers to common questions about LabourSeva.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Quick links */}
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: FileText, label: "User Manuals", href: "/downloads#manuals" },
            { icon: MessageSquareWarning, label: "Grievance", href: "/grievance" },
            { icon: Mail, label: "Contact Us", href: "/contact" },
          ].map(({ icon: Icon, label, href }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 p-4 rounded-[var(--radius-lg)] border transition-all hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center" style={{ background: "var(--primary-tint)" }}>
                <Icon size={18} style={{ color: "var(--primary)" }} />
              </div>
              <span className="font-medium text-sm" style={{ color: "var(--text)" }}>{label}</span>
            </Link>
          ))}
        </div>

        {/* FAQs */}
        <h2 className="text-2xl font-bold mb-5" style={{ color: "var(--text)" }}>Frequently Asked Questions</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <details
              key={i}
              className="rounded-[var(--radius-lg)] border overflow-hidden group"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <summary
                className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-sm list-none"
                style={{ color: "var(--text)" }}
              >
                {faq.q}
              </summary>
              <div className="px-5 pb-4 text-sm leading-relaxed" style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
