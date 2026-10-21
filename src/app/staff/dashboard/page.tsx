"use client";

import Link from "next/link";
import { ArrowRight, ClipboardCheck, Clock3, LifeBuoy, PenTool, ShieldCheck, UserCog } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

export default function StaffDashboardPage() {
  const { language } = useLanguage();
  const isTa = language === "ta";

  const queues = [
    {
      title: isTa ? "சரிபார்ப்பு வரிசை" : "Verification queue",
      value: "12",
      detail: isTa ? "4 வழக்குகள் 4 மணி நேரத்திற்குள் முடிக்க வேண்டும்" : "4 due within four hours",
      href: "/staff/verification",
      icon: ClipboardCheck,
      color: "text-[#1e3a8a] bg-blue-50",
    },
    {
      title: isTa ? "வினவல் மையம்" : "Query desk",
      value: "7",
      detail: isTa ? "2 கோரிக்கைகள் முதல் பதிலுக்காக காத்திருக்கின்றன" : "2 awaiting a first response",
      href: "/staff/queries",
      icon: LifeBuoy,
      color: "text-amber-700 bg-amber-50",
    },
    {
      title: isTa ? "அடையாள & அணுகல் கோரிக்கைகள்" : "IAM requests",
      value: "5",
      detail: isTa ? "1 கோரிக்கைக்கு இரண்டாம் நிலை ஆய்வு தேவை" : "1 needs second review",
      href: "/staff/iam",
      icon: UserCog,
      color: "text-emerald-700 bg-emerald-50",
    },
    {
      title: isTa ? "பிடிஎஃப் ஆவணப் பயிலகம்" : "PDF Document Studio",
      value: "32",
      detail: isTa ? "மாவட்ட முத்திரை அளவுத்திருத்தம் & அமைப்புகள்" : "District stamp calibration & placements",
      href: "/staff/services/studio",
      icon: PenTool,
      color: "text-[#ea580c] bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      <section className="rounded-lg border border-[#1e3a8a] border-t-4 bg-white p-6 shadow-sm sm:p-8">
        <span className="text-xs font-bold uppercase tracking-wide text-[#ea580c]">
          {isTa ? "பணியாளர் மையம் · பணித்தளம்" : "Employee desk"}
        </span>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
          {isTa ? "இன்றைய பணிகளின் விவரம்" : "Today's assigned work"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          {isTa
            ? "சரிபார்ப்பு, ஆதரவு மற்றும் அடையாள கோரிக்கைகளைச் செயல்படுத்தவும். வாடிக்கையாளர் தரவு இயல்பாகவே மறைக்கப்பட்டுள்ளது, மேலும் ஒவ்வொரு முடிவும் பதிவு செய்யப்பட வேண்டும்."
            : "Work through verification, support, and identity requests. Customer data is masked by default and every reveal or decision must be recorded."}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {queues.map((queue) => {
          const Icon = queue.icon;
          return (
            <Link
              key={queue.title}
              href={queue.href}
              className="group rounded-lg border-t-4 border-[#1e3a8a] border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <span className={`grid h-10 w-10 place-items-center rounded-md ${queue.color}`}>
                  <Icon size={19} />
                </span>
                <ArrowRight
                  size={17}
                  className="text-slate-400 transition-transform group-hover:translate-x-1"
                />
              </div>
              <strong className="mt-5 block text-2xl text-slate-950">{queue.value}</strong>
              <h2 className="mt-1 text-sm font-bold text-slate-800">{queue.title}</h2>
              <p className="mt-2 text-xs text-slate-500">{queue.detail}</p>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-bold text-slate-950">
              {isTa ? "முன்னுரிமை வழக்குகள்" : "Priority cases"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {isTa
                ? "இலக்கு நேரத்தை நெருங்கும் வழக்குகளுடன் தொடங்குங்கள்."
                : "Start with cases approaching their service target."}
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            <CaseItem
              id="LS202600781"
              title={isTa ? "குழந்தைகள் கல்வி உதவித்தொகை" : "Children's scholarship"}
              note={isTa ? "போனாஃபைட் சான்றிதழ் ஒப்பீடு தேவை" : "Bonafide certificate requires a comparison"}
              due={isTa ? "இலக்கு நேரம்: 1 மணி 40 நிமிடம்" : "SLA due in 1h 40m"}
              href="/staff/verification"
            />
            <CaseItem
              id="TCK-94420"
              title={isTa ? "கட்டண ஒப்புகை கோரிக்கை" : "Payment acknowledgement request"}
              note={isTa ? "குடிமகன் முதல் பதிலுக்காக காத்திருக்கிறார்" : "Citizen is waiting for a first response"}
              due={isTa ? "இலக்கு நேரம்: 3 மணி நேரம்" : "SLA due in 3h"}
              href="/staff/queries"
            />
            <CaseItem
              id="IAM-231"
              title={isTa ? "சில்லறை விற்பனையாளர் மீண்டும் செயல்படுத்துதல்" : "Retailer reactivation"}
              note={
                isTa
                  ? "அணுகல் தொடங்குவதற்கு முன் இரண்டாவது மதிப்பாய்வாளர் தேவை"
                  : "Second reviewer is required before access resumes"
              }
              due={isTa ? "இன்றே மறுபரிசீலனை செய்யவும்" : "Review today"}
              href="/staff/iam"
            />
          </div>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck size={19} className="text-[#1e3a8a]" />
            <h2 className="font-bold text-slate-950">
              {isTa ? "பாதுகாப்பாக பணிபுரிதல்" : "Working safely"}
            </h2>
          </div>
          <ul className="mt-4 space-y-3 text-sm leading-5 text-slate-600">
            <li>
              {isTa
                ? "நீங்கள் கையாளும் வழக்குக்கான தனிப்பட்ட தரவை மட்டுமே பார்க்கவும்."
                : "Only reveal personal data for the case you are handling."}
            </li>
            <li>
              {isTa
                ? "நிராகரிப்பு அல்லது திருப்பி அனுப்பப்பட்ட கோப்பிற்கான காரணத்தைக் குறிப்பிடவும்."
                : "State the reason for a rejection or returned file."}
            </li>
            <li>
              {isTa
                ? "இந்த மையத்தில் இருந்து பணப்பை, கட்டணம் அல்லது கமிஷன் அமைப்புகளை மாற்ற வேண்டாம்."
                : "Do not change wallet, payment, or commission settings from this desk."}
            </li>
          </ul>
          <p className="mt-5 flex items-center gap-2 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
            <Clock3 size={15} />{" "}
            {isTa
              ? "அனைத்து வரிசை நடவடிக்கைகளும் தணிக்கைப் பதிவில் சேர்க்கப்படுகின்றன."
              : "All queue actions are added to the audit trail."}
          </p>
        </aside>
      </section>
    </div>
  );
}

function CaseItem({
  id,
  title,
  note,
  due,
  href,
}: {
  id: string;
  title: string;
  note: string;
  due: string;
  href: string;
}) {
  return (
    <Link href={href} className="flex items-center justify-between gap-4 p-5 hover:bg-slate-50 transition-colors">
      <div>
        <span className="font-mono text-xs text-slate-400">{id}</span>
        <h3 className="mt-1 text-sm font-bold text-slate-900">{title}</h3>
        <p className="mt-1 text-xs text-slate-500">{note}</p>
      </div>
      <span className="text-right text-xs font-bold text-amber-700">{due}</span>
    </Link>
  );
}
