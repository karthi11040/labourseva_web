"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import {
  ArrowRight,
  FileCheck2,
  Heart,
  ShieldCheck,
  Users,
  Search,
  ClipboardList,
  Network,
  Store,
  UserRound,
  FileText,
  Headphones,
  Mail,
  Phone,
  Bell,
  ChevronDown,
} from "lucide-react";
import ManualAdSlider from "@/components/ads/ManualAdSlider";

const portals = [
  {
    title: "Distributor",
    description: "Manage retailer networks, service requests and regional operations.",
    action: "Network login",
    href: "/distributor/login",
    icon: Network,
    tone: "violet", ta: ["விநியோகஸ்தர்", "சில்லறை வலையமைப்பு, சேவை கோரிக்கைகள் மற்றும் பிராந்திய செயல்பாடுகளை நிர்வகிக்கவும்.", "வலையமைப்பு உள்நுழைவு"],
  },
  {
    title: "Retail partner",
    description: "Manage customer applications, transactions and daily operations.",
    action: "Partner login",
    href: "/retailer/login",
    icon: Store,
    tone: "green", ta: ["சில்லறை கூட்டாளர்", "வாடிக்கையாளர் விண்ணப்பங்கள், பரிவர்த்தனைகள் மற்றும் தினசரி செயல்பாடுகளை நிர்வகிக்கவும்.", "கூட்டாளர் உள்நுழைவு"],
  },
  {
    title: "Customer portal",
    description: "Track applications, access certificates and manage your profile.",
    action: "Customer login",
    href: "/user/login",
    icon: UserRound,
    tone: "blue", ta: ["வாடிக்கையாளர் தளம்", "விண்ணப்பங்களைக் கண்காணித்து சான்றிதழ்களை அணுகி சுயவிவரத்தை நிர்வகிக்கவும்.", "வாடிக்கையாளர் உள்நுழைவு"],
  },
  {
    title: "New registration",
    description: "Explore available services and start your registration.",
    action: "Get started",
    href: "/register",
    icon: FileText,
    tone: "orange", ta: ["புதிய பதிவு", "கிடைக்கும் சேவைகளைப் பார்த்து உங்கள் பதிவைத் தொடங்குங்கள்.", "தொடங்குங்கள்"],
  },
];

const services = [
  { title: "Worker registration", description: "Register as a labour welfare beneficiary.", fee: "Check fee", ta: ["தொழிலாளர் பதிவு", "தொழிலாளர் நலப் பயனாளியாகப் பதிவு செய்யுங்கள்.", "கட்டணத்தைப் பார்க்க"], icon: Users },
  { title: "Accident relief", description: "Information and applications for eligible assistance.", fee: "View details", ta: ["விபத்து நிவாரணம்", "தகுதியான உதவிக்கான தகவல்கள் மற்றும் விண்ணப்பங்கள்.", "விவரங்களைப் பார்க்க"], icon: ShieldCheck },
  { title: "Scholarship scheme", description: "Explore education assistance for eligible families.", fee: "View details", ta: ["கல்வி உதவித்தொகை", "தகுதியான குடும்பங்களுக்கான கல்வி உதவியைப் பாருங்கள்.", "விவரங்களைப் பார்க்க"], icon: FileCheck2 },
  { title: "Housing assistance", description: "Explore available housing-related benefits.", fee: "View details", ta: ["வீட்டு உதவி", "கிடைக்கும் வீட்டு வசதி சார்ந்த நலன்களைப் பாருங்கள்.", "விவரங்களைப் பார்க்க"], icon: Heart },
  { title: "Maternity benefit", description: "Review eligibility and application requirements.", fee: "View details", ta: ["மகப்பேறு நல உதவி", "தகுதி மற்றும் விண்ணப்பத் தேவைகளைப் பாருங்கள்.", "விவரங்களைப் பார்க்க"], icon: Users },
  { title: "Tool kit assistance", description: "Find support options for eligible workers.", fee: "View details", ta: ["கருவிப்பெட்டி உதவி", "தகுதியான தொழிலாளர்களுக்கான ஆதரவு வாய்ப்புகளைக் கண்டறியுங்கள்.", "விவரங்களைப் பார்க்க"], icon: ClipboardList },
];

const notices = [
  ["Check the latest scheme application deadlines.", "திட்டங்களுக்கான சமீபத்திய விண்ணப்பக் காலக்கெடுவைப் பாருங்கள்."],
  ["Review your required documents before applying.", "விண்ணப்பிக்கும் முன் தேவையான ஆவணங்களைச் சரிபார்க்கவும்."],
  ["Keep your registered mobile number accessible for OTP verification.", "OTP சரிபார்ப்புக்காக பதிவு செய்த கைபேசி எண்ணைத் தயாராக வைத்திருங்கள்."],
];

export default function HomePage() {
  const { language } = useLanguage();
  const tamil = language === "ta";
  return (
    <div className="ls-home">
      <div className="ls-main">
        {/* Hero */}
        <section className="ls-hero">
          <div className="ls-hero-copy">
            <h1>{tamil ? "LabourSeva தளத்திற்கு வரவேற்கிறோம்" : "Welcome to LabourSeva Portal"}</h1>

            <p className="ls-hero-description">
              {tamil ? "தொழிலாளர் ஆவணங்கள், நிதிச் சேவைகள் மற்றும் சமூகப் பாதுகாப்பு நலன்களுக்கான ஒருங்கிணைந்த தளம். சேவைகளை எளிதாகப் பெற கீழே உள்ள தளத்தைத் தேர்ந்தெடுக்கவும்." : "A unified digital platform for labour documentation, financial services, and social security benefits. Access your dedicated portal below to avail services efficiently."}
            </p>

            <div className="ls-hero-actions">
              <Link href="/login" className="ls-button ls-button-primary">
                {tamil ? "தளங்களை அணுகவும்" : "Access Portals"} <ChevronDown size={18} />
              </Link>
              <Link href="/help" className="ls-button ls-button-outline">
                {tamil ? "உதவி மற்றும் வழிகாட்டுதல்" : "Help & Guidelines"}
              </Link>
            </div>
          </div>
        </section>

        {/* Search and statistics */}
        <section className="ls-overview" aria-label="Find services and platform overview">
          <form action="/services" method="get" className="ls-search">
            <Search size={21} />
            <input
              type="search"
              name="q"
              placeholder={tamil ? "சேவைகள், திட்டங்கள் மற்றும் சான்றிதழ்களைத் தேடுங்கள்..." : "Search services, schemes and certificates..."}
              aria-label={tamil ? "சேவைகளைத் தேடுங்கள்" : "Search services"}
            />
            <button type="submit">{tamil ? "தேடுக" : "Search"}</button>
          </form>

          <div className="ls-stats">
            <div className="ls-stat">
              <span className="ls-stat-icon"><FileCheck2 /></span>
              <div><strong>Services</strong><span>Explore the catalogue</span></div>
            </div>
            <div className="ls-stat">
              <span className="ls-stat-icon green"><Heart /></span>
              <div><strong>Welfare schemes</strong><span>Check eligibility</span></div>
            </div>
            <div className="ls-stat">
              <span className="ls-stat-icon orange"><Users /></span>
              <div><strong>Worker support</strong><span>Find relevant services</span></div>
            </div>
            <div className="ls-stat">
              <span className="ls-stat-icon green"><ShieldCheck /></span>
              <div><strong>Secure access</strong><span>Protected workflows</span></div>
            </div>
          </div>
        </section>

        {/* Portals */}
        <section className="ls-section ls-portal-section">
          <div className="ls-section-heading">
            <div>
              <span className="ls-section-kicker">{tamil ? "தொடங்குங்கள்" : "GET STARTED"}</span>
              <h2>{tamil ? "உங்கள் தளத்தைத் தேர்ந்தெடுக்கவும்" : "Choose your portal"}</h2>
              <p>{tamil ? "உங்கள் பங்கிற்கேற்ற தளத்தைத் தேர்ந்தெடுக்கவும்." : "Select the portal that matches your role."}</p>
            </div>
            <Link href="/login" className="ls-text-link">
              {tamil ? "அனைத்து தளங்களையும் பார்க்க" : "View all portals"} <ArrowRight size={17} />
            </Link>
          </div>

          <div className="ls-portal-grid">
            {portals.map((portal) => {
              const Icon = portal.icon;
              return (
                <article className="ls-portal-card" key={portal.title}>
                  <span className={`ls-icon-tile ${portal.tone}`}>
                    <Icon size={27} />
                  </span>
                  <h3>{tamil ? portal.ta[0] : portal.title}</h3>
                  <p>{tamil ? portal.ta[1] : portal.description}</p>
                  <Link href={portal.href} className="ls-card-button">
                    {tamil ? portal.ta[2] : portal.action} <ArrowRight size={17} />
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        <section className="my-8 flex flex-col gap-5 rounded-2xl bg-gradient-to-r from-blue-950 to-blue-800 p-7 text-white sm:flex-row sm:items-center sm:justify-between sm:p-9">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">{tamil ? "உள்ளூர் சில்லறை விற்பனையாளர்கள்" : "LOCAL RETAILERS"}</span>
            <h2 className="mt-2 text-2xl font-black">{tamil ? "LabourSeva சந்தையைப் பாருங்கள்" : "Shop the LabourSeva marketplace"}</h2>
            <p className="mt-2 text-sm leading-6 text-blue-100">{tamil ? "சரிபார்க்கப்பட்ட உள்ளூர் கடைகளின் பொருட்களை உலாவி, விற்பனையாளரை நேரடியாகத் தொடர்புகொள்ளுங்கள்." : "Browse products from verified local shops and contact retailers directly."}</p>
          </div>
          <Link href="/marketplace" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-blue-950 hover:bg-blue-50">{tamil ? "சந்தையைப் பார்க்க" : "Browse marketplace"} <ArrowRight size={17} /></Link>
        </section>

        {/* Promotional Banner & Ad Slider (Google AdSense & Manual Ads) */}
        <div className="w-full my-6">
          <ManualAdSlider placement="HOME_SLIDER" />
        </div>

        {/* Services */}
        <section className="ls-section">
          <div className="ls-section-heading">
            <div>
              <span className="ls-section-kicker">{tamil ? "சேவை அடைவு" : "SERVICE DIRECTORY"}</span>
              <h2>{tamil ? "எங்கள் சேவைகள்" : "Browse Our Services"}</h2>
              <p>{tamil ? "விண்ணப்பிக்கும் முன் சேவை விவரங்கள் மற்றும் தகுதியைப் பாருங்கள்." : "Review service details and eligibility before applying."}</p>
            </div>
            <Link href="/services" className="ls-text-link">
              {tamil ? "சேவைகளைப் பார்க்க" : "Browse services"} <ArrowRight size={17} />
            </Link>
          </div>

          <div className="ls-service-grid">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <article className="ls-service-card" key={service.title}>
                  <span className="ls-service-icon"><Icon size={22} /></span>
                  <div className="ls-service-content">
                    <h3>{tamil ? service.ta[0] : service.title}</h3>
                    <p>{tamil ? service.ta[1] : service.description}</p>
                    <Link href="/services" className="ls-service-link">
                      {tamil ? service.ta[2] : service.fee} <ArrowRight size={15} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Support and notices */}
        <section className="ls-bottom-grid">
          <div className="ls-support-panel">
            <span className="ls-support-icon"><Headphones size={32} /></span>
            <div>
              <span className="ls-section-kicker">{tamil ? "உதவ நாங்கள் உள்ளோம்" : "WE ARE HERE TO HELP"}</span>
              <h2>{tamil ? "உதவி தேவையா?" : "Need assistance?"}</h2>
              <p>{tamil ? "பதிவு, விண்ணப்பங்கள் மற்றும் தள அணுகல் குறித்த வழிகாட்டுதலைப் பெறுங்கள்." : "Find guidance on registration, applications and portal access."}</p>
              <div className="ls-contact-row">
                <Link href="/help" className="ls-contact-item">
                  <Headphones size={19} /> {tamil ? "உதவி மையம்" : "Help centre"}
                </Link>
                <Link href="/contact" className="ls-contact-item">
                  <Mail size={19} /> {tamil ? "ஆதரவைத் தொடர்பு கொள்ளுங்கள்" : "Contact support"}
                </Link>
              </div>
            </div>
          </div>

          <div className="ls-notices">
            <div className="ls-notices-heading">
              <h2><Bell size={20} /> {tamil ? "சமீபத்திய அறிவிப்புகள்" : "Latest notices"}</h2>
              <Link href="/notices">{tamil ? "அனைத்தையும் பார்க்க" : "View all"} <ArrowRight size={15} /></Link>
            </div>
            {notices.map((notice, index) => (
              <article className="ls-notice" key={notice[0]}>
                <span className="ls-notice-icon"><Bell size={17} /></span>
                <div>
                  <span className="ls-notice-date">Notice {String(index + 1).padStart(2, "0")}</span>
                  <p>{tamil ? notice[1] : notice[0]}</p>
                  <Link href="/notices">{tamil ? "அறிவிப்பைப் படிக்க" : "Read notice"} <ArrowRight size={14} /></Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="ls-trust-strip">
          <span><ShieldCheck size={18} /> {tamil ? "பாதுகாப்பான சேவை அணுகல்" : "Secure service access"}</span>
          <span><FileCheck2 size={18} /> {tamil ? "தெளிவான விண்ணப்பப் படிகள்" : "Clear application steps"}</span>
          <span><Phone size={18} /> {tamil ? "உதவி மற்றும் வழிகாட்டுதல்" : "Help and guidance"}</span>
        </div>
      </div>
    </div>
  );
}
