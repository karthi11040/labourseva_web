"use client";

import Link from "next/link";
import { HelpCircle, FileText, BookOpen, MessageSquareWarning, Mail } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

const faqs = [
  { q: "How do I register for LabourSeva?", a: "Click 'New Registration' on the homepage and follow the 3-step process: enter your mobile number, verify with OTP, and fill in your profile details." },
  { q: "What documents do I need to apply?", a: "Requirements vary by service. Each service page lists the exact documents needed. Most services require an Aadhaar card and a bank passbook." },
  { q: "How long does an application take?", a: "Processing time varies by service and is displayed on each service card. It typically ranges from 3 to 60 working days." },
  { q: "How do I track my application?", a: "Visit the Track Application page and enter your reference number. You can also see status updates in your customer dashboard." },
  { q: "Who can I contact for assistance?", a: "Call our toll-free helpline 1800 425 1234 or email support@labourseva.com. We respond within 24 hours." },
];

export default function HelpPage() {
  const { language } = useLanguage();
  const tamil = language === "ta";
  const quickLinks = tamil
    ? [{ icon: FileText, label: "பயனர் கையேடுகள்", href: "/downloads#manuals" }, { icon: MessageSquareWarning, label: "குறைதீர்வு", href: "/grievance" }, { icon: Mail, label: "தொடர்பு கொள்ளுங்கள்", href: "/contact" }]
    : [{ icon: FileText, label: "User Manuals", href: "/downloads#manuals" }, { icon: MessageSquareWarning, label: "Grievance", href: "/grievance" }, { icon: Mail, label: "Contact Us", href: "/contact" }];
  const tamilFaqs = [
    ["LabourSeva-வில் எவ்வாறு பதிவு செய்வது?", "முகப்புப் பக்கத்தில் உள்ள புதிய பதிவு என்பதைத் தேர்ந்தெடுத்து, உங்கள் கைபேசி எண்ணை உள்ளிட்டு OTP மூலம் சரிபார்த்து சுயவிவரத்தை நிரப்பவும்."],
    ["விண்ணப்பிக்க என்ன ஆவணங்கள் தேவை?", "தேவையான ஆவணங்கள் ஒவ்வொரு சேவைப் பக்கத்திலும் குறிப்பிடப்பட்டுள்ளன. பெரும்பாலான சேவைகளுக்கு ஆதார் அட்டை மற்றும் வங்கிக் கணக்கு புத்தகம் தேவைப்படும்."],
    ["விண்ணப்பம் செயல்பட எவ்வளவு காலம் ஆகும்?", "செயலாக்க நேரம் சேவையைப் பொறுத்து மாறுபடும். பொதுவாக 3 முதல் 60 வேலை நாட்கள் ஆகலாம்."],
    ["எனது விண்ணப்பத்தை எவ்வாறு கண்காணிப்பது?", "விண்ணப்பத்தைக் கண்காணிக்கவும் பக்கத்திற்குச் சென்று உங்கள் குறிப்பு எண்ணை உள்ளிடவும். உங்கள் கணக்கிலும் நிலையைப் பார்க்கலாம்."],
    ["உதவிக்கு யாரைத் தொடர்பு கொள்ளலாம்?", "1800 425 1234 என்ற கட்டணமில்லா உதவி எண்ணை அழைக்கவும் அல்லது support@labourseva.com என்ற மின்னஞ்சலுக்கு எழுதவும்."],
  ];
  return (
    <div style={{ background: "var(--bg-subtle)", minHeight: "100vh" }}>
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-4xl font-bold mb-2" style={{ color: "var(--text)" }}>{tamil ? "உதவி மையம்" : "Help Centre"}</h1>
          <p style={{ color: "var(--text-secondary)" }}>{tamil ? "LabourSeva பற்றிய பொதுவான கேள்விகளுக்கான பதில்களைக் கண்டறியுங்கள்." : "Find answers to common questions about LabourSeva."}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Quick links */}
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {quickLinks.map(({ icon: Icon, label, href }) => (
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
        <h2 className="text-2xl font-bold mb-5" style={{ color: "var(--text)" }}>{tamil ? "அடிக்கடி கேட்கப்படும் கேள்விகள்" : "Frequently Asked Questions"}</h2>
        <div className="space-y-3">
          {(tamil ? tamilFaqs.map(([q, a]) => ({ q, a })) : faqs).map((faq, i) => (
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
