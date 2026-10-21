"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Shield,
  Clock,
  CheckCircle2,
  FileText,
  AlertCircle,
  HelpCircle,
  Phone,
  UserRound,
  Star,
  MapPin,
  Heart,
  Zap,
  Wheat,
  BadgeCheck,
  Building,
  Check,
} from "lucide-react";
import { useState } from "react";

interface ServiceDetail {
  id: number;
  name: string;
  nameTa: string;
  category: string;
  categoryTa: string;
  fee: string;
  time: string;
  desc: string;
  descTa: string;
  benefitAmount: string;
  eligibility: string[];
  documents: string[];
  steps: { title: string; desc: string }[];
  faqs: { q: string; a: string }[];
  icon: React.ElementType;
}

const serviceDatabase: Record<number, ServiceDetail> = {
  1: {
    id: 1,
    name: "Worker Registration",
    nameTa: "தொழிலாளர் பதிவு",
    category: "General / All Trades",
    categoryTa: "அனைத்து தொழிலாளர்கள்",
    fee: "₹50 (One-time)",
    time: "3-5 Working Days",
    desc: "Official registration as an unorganised manual labour welfare beneficiary under the Tamil Nadu Manual Workers Welfare Board. Once registered, workers receive a unique Worker ID Card and become eligible for 15+ welfare assistance schemes.",
    descTa: "தமிழ்நாடு அமைப்புசாரா உடலுழைப்பு தொழிலாளர்கள் நல வாரியத்தில் அதிகாரப்பூர்வ பதிவு. பதிவு செய்த பின் தனித்துவ அடையாள அட்டை மற்றும் 15க்கும் மேற்பட்ட நலத்திட்ட உதவிகள் வழங்கப்படும்.",
    benefitAmount: "Access to 15+ Welfare Schemes & Accidental Insurance Cover up to ₹5,00,000",
    eligibility: [
      "Must be between 18 and 60 years of age.",
      "Must be engaged in manual labour, construction, agriculture, or an unorganised trade for at least 90 days in the preceding 12 months.",
      "Must not be an active member of EPFO (Employees' Provident Fund) or ESIC.",
      "Must be a resident of Tamil Nadu with valid Aadhaar authentication.",
    ],
    documents: [
      "Aadhaar Card (front & back)",
      "Smart Ration Card / Family Card",
      "Bank Account Passbook (Front page with IFSC & Name)",
      "Passport Size Photograph (Recent, white background)",
      "Employment Certificate / Trade Union Certificate / Village Administrative Officer (VAO) Certificate",
      "Age proof document (Aadhaar / Voter ID / Birth Certificate / School Transfer Certificate)",
    ],
    steps: [
      { title: "Fill Online Application", desc: "Enter your personal profile, Aadhaar, trade details, and nominee information." },
      { title: "Upload Supporting Documents", desc: "Upload clear copies of your Aadhaar, Ration Card, Bank Passbook, and Trade Certificate." },
      { title: "Pay Statutory Fee (₹50)", desc: "Pay securely via UPI (GPay/PhonePe), NetBanking, or Debit Card." },
      { title: "Field Officer Verification", desc: "The Labour Welfare Officer in your taluk will review and verify the documents within 3-5 days." },
      { title: "Digital Card Download", desc: "Download your digitally signed Tamil Nadu Labour Welfare Smart Card directly from your portal." },
    ],
    faqs: [
      { q: "Can I apply if I am already 60 years old?", a: "Workers between 18 and 60 years can register. If you are already 60+, you may be eligible to apply directly for Old Age Welfare Pension under the specific board." },
      { q: "What should I do if my trade union certificate is pending?", a: "You can obtain a work engagement certificate from the Village Administrative Officer (VAO) or your employer/contractor." },
      { q: "How long is the registration card valid?", a: "The registration is valid for 5 years and can be renewed online with zero hassle." },
    ],
    icon: UserRound,
  },
  2: {
    id: 2,
    name: "Accident Relief Fund",
    nameTa: "விபத்து நிவாரண நிதி",
    category: "Construction & Manual Workers",
    categoryTa: "கட்டுமானம் மற்றும் உடலுழைப்பு",
    fee: "Free of cost (இலவசம்)",
    time: "7-10 Working Days",
    desc: "Immediate ex-gratia financial assistance and hospitalization compensation for registered workers who encounter fatal or non-fatal workplace accidents.",
    descTa: "பணிபுரியும் போது விபத்துக்குள்ளாகும் பதிவுபெற்ற தொழிலாளர்களுக்கு உடனடி நிதி உதவி மற்றும் மருத்துவ சிகிச்சை உதவித்தொகை.",
    benefitAmount: "Up to ₹5,00,000 for fatal accidents; up to ₹1,00,000 for disability & hospitalization",
    eligibility: [
      "Applicant must be an active registered worker with valid subscription.",
      "Accident must have occurred during the course of employment or transit to work.",
      "Claim must be filed within 12 months of the accident date.",
      "FIR / Police report or Hospital emergency certificate must be furnished.",
    ],
    documents: [
      "Worker Welfare Registration ID Card",
      "FIR Copy (First Information Report) or Police Diary extract",
      "Hospital Discharge Summary / Medical Fitness Certificate",
      "Disability Certificate from Government Medical Board (if applicable)",
      "Bank Account details of the beneficiary or legal heir",
      "Death Certificate & Legal Heir Certificate (in fatal accident cases)",
    ],
    steps: [
      { title: "Claim Intimation", desc: "Submit claim notice online with FIR and hospital admission details." },
      { title: "Verification by Welfare Inspector", desc: "The District Welfare Officer coordinates with the treating hospital or police authorities." },
      { title: "Committee Approval", desc: "The Welfare Board Sanctioning Committee approves the relief amount." },
      { title: "Direct Benefit Transfer (DBT)", desc: "Relief amount is transferred directly to the worker's or nominee's bank account." },
    ],
    faqs: [
      { q: "Can the nominee apply if the worker is hospitalized?", a: "Yes, the registered nominee or legal heir can file the claim on behalf of the injured worker." },
      { q: "Is this relief applicable for road accidents during work commute?", a: "Yes, transit to and from the registered workplace is covered under the Board's welfare provisions." },
    ],
    icon: Shield,
  },
  3: {
    id: 3,
    name: "Children's Scholarship",
    nameTa: "குழந்தைகள் கல்வி உதவித்தொகை",
    category: "Education Assistance",
    categoryTa: "கல்வி நல உதவி",
    fee: "Free of cost (இலவசம்)",
    time: "15-30 Working Days",
    desc: "Annual educational financial assistance for children of registered manual workers studying in 10th standard, 12th standard, ITI, Polytechnic, Undergraduate, and Postgraduate degrees.",
    descTa: "பதிவுசெய்த தொழிலாளர்களின் பிள்ளைகள் 10, 12-ம் வகுப்பு, பாலிடெக்னிக், ஐடிஐ மற்றும் பட்டப்படிப்பு பயில்வதற்கான வருடாந்திர கல்வி உதவித்தொகை.",
    benefitAmount: "₹1,000 to ₹12,000 per academic year based on course level",
    eligibility: [
      "Parent must have completed at least 1 year of continuous registration in the Board.",
      "Student must have passed the previous academic examination in first attempt.",
      "Benefit available for up to two children per registered worker family.",
      "Student must be studying in a recognized school, college, or university.",
    ],
    documents: [
      "Parent's Worker Welfare Card",
      "Student's Study Certificate / Bonafide Certificate issued by Headmaster / Principal",
      "Mark sheet of previous academic year",
      "Student's Aadhaar Card",
      "Bank Passbook front page in student's or joint account with parent",
    ],
    steps: [
      { title: "Submit Academic Records", desc: "Upload student bonafide certificate, marksheet, and current fee receipt." },
      { title: "Institutional Cross-Check", desc: "Automatic verification with Tamil Nadu EMIS / College database." },
      { title: "Board Sanction", desc: "District Labour Officer sanctions the scholarship batch." },
      { title: "Direct Bank Transfer", desc: "Scholarship deposited directly into student's bank account." },
    ],
    faqs: [
      { q: "Can postgraduate or engineering students apply?", a: "Yes, professional degree courses including B.E./B.Tech, MBBS, Law, and MBA qualify for the highest scholarship tier (₹8,000 - ₹12,000/year)." },
      { q: "What is the deadline for applying?", a: "Applications are open year-round, with peak sanction cycles in September and January." },
    ],
    icon: Star,
  },
  4: {
    id: 4,
    name: "Housing Loan Subsidy",
    nameTa: "வீட்டுக்கடன் மானியம்",
    category: "Construction & Housing",
    categoryTa: "கட்டுமான நலன்",
    fee: "₹100 (Processing)",
    time: "30-60 Working Days",
    desc: "Interest subsidy and financial grant for registered construction workers for constructing a permanent pucca house or purchasing residential land.",
    descTa: "பதிவுபெற்ற கட்டுமானத் தொழிலாளர்கள் சொந்த வீடு கட்ட அல்லது வீட்டுமனை வாங்க வழங்கப்படும் நிதி மானியம்.",
    benefitAmount: "Up to ₹4,00,000 financial subsidy under the Tamil Nadu Affordable Housing Scheme",
    eligibility: [
      "Must have completed at least 3 years of continuous registration in the Construction Board.",
      "Must own a valid patta / house site in applicant's or spouse's name.",
      "Applicant must not already own a concrete pucca house.",
      "Approved building plan from local panchayat / municipality.",
    ],
    documents: [
      "Worker Welfare Smart Card (minimum 3 years validity)",
      "Land Patta / Title Deed / Sale Deed copy",
      "Approved Building Plan from Panchayat / Municipality",
      "Estimate of construction from a licensed civil engineer",
      "Bank Account details for subsidy installment disbursement",
    ],
    steps: [
      { title: "Initial Verification", desc: "Submit building plan and land ownership documents for scrutiny." },
      { title: "Site Inspection", desc: "Taluk Assistant Engineer conducts physical site inspection." },
      { title: "Phased Disbursement", desc: "Subsidy released in 4 stages: Foundation, Lintel, Roof, and Finishing." },
    ],
    faqs: [
      { q: "Can I apply if the land is in my spouse's name?", a: "Yes, land registered in the name of the worker or legal spouse is eligible." },
    ],
    icon: MapPin,
  },
  5: {
    id: 5,
    name: "Maternity Benefit",
    nameTa: "மகப்பேறு நல உதவி",
    category: "Women Worker Welfare",
    categoryTa: "பெண்கள் நலம்",
    fee: "Free of cost (இலவசம்)",
    time: "7-15 Working Days",
    desc: "Comprehensive maternity assistance for registered female manual workers covering delivery expenses, postnatal care, and wage compensation.",
    descTa: "பதிவுபெற்ற பெண் தொழிலாளர்களுக்கு பிரசவ உதவி, ஊட்டச்சத்து உதவி மற்றும் ஊதிய இழப்பீட்டு நிதி.",
    benefitAmount: "₹6,000 per child (up to 2 children) + Nutrition kit support",
    eligibility: [
      "Registered female worker with at least 1 year of active membership.",
      "Assistance applicable for the first two deliveries.",
      "Must submit Pregnancy Registration Number (RCH ID / PICME number).",
    ],
    documents: [
      "Worker Registration ID Card",
      "Mother-Child Protection Card (RCH / PICME Booklet)",
      "Hospital Delivery Certificate / Birth Certificate of the child",
      "Bank Passbook copy of the mother",
      "Aadhaar Card of the mother",
    ],
    steps: [
      { title: "Submit Maternity Claim", desc: "Enter PICME number, hospital details, and delivery date." },
      { title: "PHC / Hospital Cross-Verification", desc: "Welfare staff checks RCH portal records." },
      { title: "Fund Disbursement", desc: "Direct payment to the mother's bank account within 10 days." },
    ],
    faqs: [
      { q: "Is miscarriage covered?", a: "Yes, miscarriage or termination of pregnancy on medical grounds carries a benefit of ₹3,000." },
    ],
    icon: Heart,
  },
  6: {
    id: 6,
    name: "Tool Kit Assistance",
    nameTa: "தொழிற்கருவிகள் உதவி",
    category: "Industrial & Artisan Trades",
    categoryTa: "தொழிற்கலைஞர் நலம்",
    fee: "Free of cost (இலவசம்)",
    time: "10-15 Working Days",
    desc: "Free modern professional toolkits and equipment subsidies provided to registered carpenters, masons, electricians, plumbers, welders, and artisans.",
    descTa: "கொத்தனார், தச்சர், எலக்ட்ரீஷியன், பிளம்பர் மற்றும் கைவினைத் தொழிலாளர்களுக்கு தொழில் உபகரணங்கள் மற்றும் கருவிகள் வழங்கும் திட்டம்.",
    benefitAmount: "Free trade kit valued up to ₹5,000 or equipment grant",
    eligibility: [
      "Registered manual worker in skilled artisanal trade (mason, carpenter, painter, plumber, etc.).",
      "Completed minimum 2 years of active membership.",
      "Has not availed tool kit assistance in the preceding 3 years.",
    ],
    documents: [
      "Worker ID Card",
      "Trade declaration / skill certificate",
      "Aadhaar Card and Ration Card",
      "Passport size photograph",
    ],
    steps: [
      { title: "Select Trade Toolkit", desc: "Choose your trade category and required toolkit specifications." },
      { title: "Verification", desc: "District Welfare Officer checks membership standing." },
      { title: "Distribution / Voucher", desc: "Collect the toolkit from the nearest District Labour Kendra or authorized depot." },
    ],
    faqs: [
      { q: "Can I receive cash instead of tools?", a: "The scheme provides high-quality ISI-certified tools directly or e-vouchers redeemable at state-approved equipment vendors." },
    ],
    icon: Zap,
  },
  7: {
    id: 7,
    name: "Death Relief Fund",
    nameTa: "இறப்பு நிவாரண நிதி",
    category: "Social Security",
    categoryTa: "சமூகப் பாதுகாப்பு",
    fee: "Free of cost (இலவசம்)",
    time: "15-30 Working Days",
    desc: "Ex-gratia financial grant and funeral assistance disbursed to the nominee or legal heirs upon the natural or accidental death of a registered worker.",
    descTa: "பதிவுபெற்ற தொழிலாளர் இயற்கை அல்லது விபத்து மரணம் அடையும் பட்சத்தில் அவரது குடும்பத்திற்கு வழங்கப்படும் நிதி உதவி மற்றும் இறுதிச்சடங்கு உதவி.",
    benefitAmount: "₹2,00,000 (Natural Death) / ₹5,00,000 (Accidental Death) + ₹5,000 Funeral Expenses",
    eligibility: [
      "Deceased worker was a registered member at the time of demise.",
      "Claim filed by registered nominee or legal heir within 12 months.",
    ],
    documents: [
      "Deceased worker's Welfare Registration Card",
      "Official Death Certificate issued by Local Body",
      "Legal Heir Certificate / Nominee verification",
      "Post-mortem report and FIR (if accidental death)",
      "Bank Account details of nominee/heir",
    ],
    steps: [
      { title: "Nominee Application", desc: "Submit death certificate, nominee Aadhaar, and bank details." },
      { title: "Taluk Investigation", desc: "Village Administrative Officer and Labour Inspector verify heir credentials." },
      { title: "Sanction & Payout", desc: "Direct deposit of death relief to nominee's bank account." },
    ],
    faqs: [
      { q: "Is immediate funeral expense provided?", a: "Yes, ₹5,000 interim funeral expense can be claimed immediately through the taluk office." },
    ],
    icon: FileText,
  },
  8: {
    id: 8,
    name: "Marriage Assistance",
    nameTa: "திருமண உதவித்தொகை",
    category: "Family Welfare",
    categoryTa: "குடும்ப நலம்",
    fee: "Free of cost (இலவசம்)",
    time: "15-20 Working Days",
    desc: "Financial assistance provided for the marriage of registered workers or their sons and daughters.",
    descTa: "பதிவுபெற்ற தொழிலாளியின் திருமணம் அல்லது அவரது மகன், மகளின் திருமணத்திற்கு வழங்கப்படும் நிதி உதவி.",
    benefitAmount: "₹5,000 (Male worker marriage) / ₹10,000 (Female worker or daughter marriage)",
    eligibility: [
      "Registered member for at least 1 continuous year.",
      "Bride must have attained 18 years, Bridegroom must have attained 21 years.",
      "Applicable for up to two marriages per family.",
    ],
    documents: [
      "Worker Registration ID Card",
      "Marriage Registration Certificate or Certificate from Village Authority/Church/Mosque/Temple",
      "Age proof of bride and groom",
      "Wedding Invitation card",
      "Bank passbook copy of the applicant",
    ],
    steps: [
      { title: "File Marriage Claim", desc: "Submit wedding registration details and proof of age." },
      { title: "Document Review", desc: "Labour officer verifies marriage registration validity." },
      { title: "Payment Sanction", desc: "Grant deposited directly into applicant's account." },
    ],
    faqs: [
      { q: "Can I apply before the marriage takes place?", a: "You can apply up to 30 days before or within 6 months after the wedding date." },
    ],
    icon: Heart,
  },
  9: {
    id: 9,
    name: "Disability Benefit",
    nameTa: "மாற்றுத்திறனாளி நல உதவி",
    category: "Disability Security",
    categoryTa: "மாற்றுத்திறனாளி நலம்",
    fee: "Free of cost (இலவசம்)",
    time: "20-30 Working Days",
    desc: "Monthly financial pension and rehabilitation grant for registered workers with permanent total or partial disability.",
    descTa: "நிரந்தர அல்லது பகுதி ஊனமுற்ற பதிவுபெற்ற தொழிலாளர்களுக்கு மாதாந்திர உதவித்தொகை மற்றும் மறுவாழ்வு நிதி.",
    benefitAmount: "Monthly pension of ₹1,000 + Assistive aids grant up to ₹50,000",
    eligibility: [
      "Registered worker with certified disability of 40% or more.",
      "Medical Board disability certificate from Government Medical Officer.",
    ],
    documents: [
      "Worker Welfare Card",
      "Disability ID Card / Medical Board Certificate",
      "Aadhaar Card and Passport Photo showing disability",
      "Bank Account details",
    ],
    steps: [
      { title: "Submit Medical Certificate", desc: "Upload Disability Medical Board certificate and details." },
      { title: "Medical Board Endorsement", desc: "District Welfare Officer coordinates with District Differently Abled Welfare Officer." },
      { title: "Monthly Pension Setup", desc: "Life-long direct bank credit on the 1st of every month." },
    ],
    faqs: [
      { q: "Is this in addition to the state disability pension?", a: "Yes, Board welfare disability benefits are supplemental for registered manual labourers." },
    ],
    icon: Shield,
  },
  10: {
    id: 10,
    name: "Crop Loss Compensation",
    nameTa: "பயிர் இழப்பீட்டு உதவி",
    category: "Agriculture Welfare",
    categoryTa: "விவசாய நலம்",
    fee: "Free of cost (இலவசம்)",
    time: "30-45 Working Days",
    desc: "Emergency ex-gratia compensation for registered agricultural labourers whose livelihood is impacted by flood, drought, or cyclone damage.",
    descTa: "வெள்ளம், வறட்சி, புயல் போன்ற இயற்கை பேரிடரால் பாதிக்கப்பட்ட விவசாய தொழிலாளர்களுக்கு வழங்கப்படும் நிவாரணம்.",
    benefitAmount: "Up to ₹10,000 per affected agricultural worker family",
    eligibility: [
      "Registered member of the Tamil Nadu Agricultural Labourers Welfare Board.",
      "Resident of a notified disaster-affected district or taluk.",
    ],
    documents: [
      "Agricultural Labourer Welfare Card",
      "VAO Loss Assessment Certificate",
      "Aadhaar and Ration Card",
      "Bank Account details",
    ],
    steps: [
      { title: "Disaster Claim Entry", desc: "Register grievance under the notified calamity." },
      { title: "Revenue Dept Verification", desc: "Taluk Tehsildar cross-checks crop loss records." },
      { title: "Disbursement", desc: "DBT credit to the worker's bank account." },
    ],
    faqs: [
      { q: "Do tenant farmers qualify?", a: "Yes, all registered agricultural manual labourers and tenant farm workers qualify." },
    ],
    icon: Wheat,
  },
  11: {
    id: 11,
    name: "Pension Scheme",
    nameTa: "ஓய்வூதியத் திட்டம்",
    category: "Senior Citizens / Pension",
    categoryTa: "முதியோர் ஓய்வூதியம்",
    fee: "₹50/month contribution",
    time: "60-90 Working Days",
    desc: "Monthly old age social security pension disbursed to registered workers who have attained 60 years of age.",
    descTa: "60 வயது பூர்த்தியடைந்த பதிவுபெற்ற உடலுழைப்பு தொழிலாளர்களுக்கு வழங்கப்படும் மாதாந்திர சமூகப் பாதுகாப்பு ஓய்வூதியம்.",
    benefitAmount: "Monthly pension of ₹1,000 per month for life",
    eligibility: [
      "Attained 60 years of age.",
      "Completed at least 5 years of active registered membership before retirement age.",
      "Not drawing another government employee pension.",
    ],
    documents: [
      "Worker Welfare Card (with proof of 5-year membership)",
      "Proof of Age (Aadhaar Card / School Certificate / Medical Officer Certificate)",
      "Bank Passbook copy for direct pension credit",
      "Life Certificate (to be submitted annually)",
    ],
    steps: [
      { title: "Retirement Claim", desc: "Submit pension application upon turning 60 years." },
      { title: "Service Record Audit", desc: "Welfare board verifies 5 years of active subscription." },
      { title: "Pension Payment Order (PPO)", desc: "Receive digital PPO number and start monthly deposits." },
    ],
    faqs: [
      { q: "How is the life certificate submitted?", a: "You can submit your digital life certificate (Jeevan Pramaan) online or at any e-Seva Kendra." },
    ],
    icon: BadgeCheck,
  },
  12: {
    id: 12,
    name: "Medical Assistance",
    nameTa: "மருத்துவ சிகிச்சை உதவி",
    category: "Healthcare Assistance",
    categoryTa: "மருத்துவ நலம்",
    fee: "Free of cost (இலவசம்)",
    time: "10-20 Working Days",
    desc: "Financial reimbursement for major surgeries, cancer therapy, kidney treatment, heart surgery, and critical hospitalisation expenses.",
    descTa: "பதிவுபெற்ற தொழிலாளர்களுக்கு இதய அறுவை சிகிச்சை, புற்றுநோய், சிறுநீரக சிகிச்சை போன்ற தீவிர நோய்களுக்கான மருத்துவ உதவி.",
    benefitAmount: "Up to ₹1,00,000 reimbursement for critical treatments",
    eligibility: [
      "Active registered worker or dependent family member (spouse, child, dependent parent).",
      "Treatment in a Government Hospital or State-Employed Embanked Hospital.",
    ],
    documents: [
      "Worker Welfare ID Card",
      "Hospital Bills and Discharge Summary (Original)",
      "Medical Certificate signed by Civil Surgeon",
      "Bank Account details",
    ],
    steps: [
      { title: "Submit Hospital Vouchers", desc: "Upload bills, discharge summary, and medical prescriptions." },
      { title: "Medical Audit", desc: "Board medical referee verifies claims against approved tariff rates." },
      { title: "Reimbursement", desc: "Direct credit into patient's or worker's bank account." },
    ],
    faqs: [
      { q: "Are prescription medicines covered?", a: "Yes, medicines prescribed during certified hospitalisation are covered up to policy limits." },
    ],
    icon: Shield,
  },
  13: {
    id: 13,
    name: "Domestic Worker Welfare",
    nameTa: "வீட்டுப் பணியாளர் நலத்திட்டம்",
    category: "Domestic Workers",
    categoryTa: "வீட்டுப் பணியாளர்கள்",
    fee: "Free of cost (இலவசம்)",
    time: "7-14 Working Days",
    desc: "Dedicated social security coverage, identity cards, annual health checkups, and safety insurance for domestic household helpers, cooks, and cleaners.",
    descTa: "வீட்டு வேலை செய்யும் பணியாளர்கள், சமையல் கலைஞர்கள் மற்றும் துப்புரவுப் பணியாளர்களுக்கான பிரத்யேக நலத்திட்டம் மற்றும் அடையாள அட்டை.",
    benefitAmount: "Free ID Card, Health Checkup grants, and Full Welfare Cover",
    eligibility: [
      "Employed as domestic worker, housemaid, cook, or home caretaker.",
      "Age between 18 and 60 years.",
      "Resident of Tamil Nadu.",
    ],
    documents: [
      "Aadhaar Card",
      "Ration Card",
      "Self-declaration / Employer recommendation certificate",
      "Bank Passbook copy",
      "Passport size photos",
    ],
    steps: [
      { title: "Submit Registration", desc: "Enter trade details and employer addresses." },
      { title: "Taluk Verification", desc: "Verification by Domestic Workers Board inspector." },
      { title: "Card Issuance", desc: "Receive Tamil Nadu Domestic Worker Welfare Smart Card." },
    ],
    faqs: [
      { q: "What if I work for multiple households?", a: "You can list your primary employer or provide a self-declaration countersigned by your local ward member or VAO." },
    ],
    icon: Heart,
  },
};

export default function ServiceDetailPage() {
  const params = useParams();
  const rawId = Number(params?.id);
  const service = serviceDatabase[rawId] || serviceDatabase[1];
  const Icon = service.icon;

  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  return (
    <div style={{ background: "var(--bg-subtle)", minHeight: "100vh" }} className="py-8 sm:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-xs sm:text-sm font-medium text-slate-500">
          <Link href="/services" className="inline-flex items-center gap-1 hover:text-[#1e3a8a] transition-colors">
            <ArrowLeft size={14} /> Back to All Services
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold truncate">{service.name}</span>
        </div>

        {/* Hero Card */}
        <div
          className="rounded-2xl border p-6 sm:p-8 mb-8 relative overflow-hidden shadow-xs"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4 sm:gap-5">
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--color-12)", color: "var(--color-6)" }}
              >
                <Icon size={36} />
              </div>
              <div>
                <div className="flex items-center flex-wrap gap-2 mb-1.5">
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full font-semibold border"
                    style={{ background: "var(--color-14)", color: "var(--color-dark-blue-1)", borderColor: "var(--color-11)" }}
                  >
                    {service.category}
                  </span>
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                    style={{ background: "var(--success-bg)", color: "var(--success-text)" }}
                  >
                    Fee: {service.fee}
                  </span>
                  <span className="text-xs flex items-center gap-1 text-slate-500 font-medium">
                    <Clock size={12} /> {service.time}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {service.name}
                </h1>
                <p className="text-sm sm:text-base font-semibold mt-0.5" style={{ color: "var(--color-8)", fontFamily: "var(--font-sans-ta)" }}>
                  {service.nameTa}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 min-w-[200px]">
              <Link
                href={`/user/apply?serviceId=${service.id}`}
                className="h-12 px-6 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-md hover:opacity-95 transition-all text-center"
                style={{ background: "var(--color-6)" }}
              >
                <span>Apply Online Now</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/track"
                className="h-11 px-5 rounded-xl font-semibold text-xs border flex items-center justify-center gap-2 text-slate-700 hover:bg-slate-50 transition-colors text-center"
                style={{ borderColor: "var(--border)" }}
              >
                <Clock size={14} />
                <span>Track Application</span>
              </Link>
            </div>
          </div>

          {/* Benefit Banner */}
          <div
            className="mt-6 pt-6 border-t flex items-center gap-3 p-3.5 rounded-xl"
            style={{ background: "var(--color-14)", borderColor: "var(--color-11)" }}
          >
            <Shield size={20} className="flex-shrink-0" style={{ color: "var(--color-6)" }} />
            <div className="text-xs sm:text-sm font-semibold text-slate-800">
              <span className="text-[#1e3a8a]">Welfare Entitlement:</span> {service.benefitAmount}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (2 Cols) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Overview */}
            <section
              className="rounded-2xl border p-6 bg-white shadow-xs"
              style={{ borderColor: "var(--border)" }}
            >
              <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <FileText size={18} style={{ color: "var(--color-6)" }} />
                Scheme Overview · திட்ட விளக்கம்
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">{service.desc}</p>
              <p className="text-sm leading-relaxed p-3.5 rounded-xl border bg-slate-50 font-medium" style={{ color: "var(--color-3)", fontFamily: "var(--font-sans-ta)" }}>
                {service.descTa}
              </p>
            </section>

            {/* Eligibility Requirements */}
            <section
              className="rounded-2xl border p-6 bg-white shadow-xs"
              style={{ borderColor: "var(--border)" }}
            >
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <CheckCircle2 size={18} style={{ color: "var(--success)" }} />
                Eligibility Criteria · தகுதி வரம்புகள்
              </h2>
              <ul className="space-y-3">
                {service.eligibility.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xs mt-0.5" style={{ background: "var(--success)" }}>
                      ✓
                    </span>
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Application Steps */}
            <section
              className="rounded-2xl border p-6 bg-white shadow-xs"
              style={{ borderColor: "var(--border)" }}
            >
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <BadgeCheck size={18} style={{ color: "var(--color-6)" }} />
                Step-by-Step Process · விண்ணப்பிக்கும் வழிமுறைகள்
              </h2>
              <div className="space-y-6 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                {service.steps.map((st, i) => (
                  <div key={i} className="flex items-start gap-4 relative">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-xs z-10"
                      style={{ background: "var(--color-6)" }}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{st.title}</h3>
                      <p className="text-xs sm:text-sm text-slate-600 mt-1">{st.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* FAQs */}
            <section
              className="rounded-2xl border p-6 bg-white shadow-xs"
              style={{ borderColor: "var(--border)" }}
            >
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <HelpCircle size={18} style={{ color: "var(--color-6)" }} />
                Frequently Asked Questions · அடிக்கடி கேட்கப்படும் கேள்விகள்
              </h2>
              <div className="space-y-3">
                {service.faqs.map((faq, index) => {
                  const isOpen = activeFaq === index;
                  return (
                    <div
                      key={index}
                      className="border rounded-xl overflow-hidden transition-all"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveFaq(isOpen ? null : index)}
                        className="w-full text-left p-4 font-semibold text-sm text-slate-800 flex justify-between items-center hover:bg-slate-50 gap-4"
                      >
                        <span>{faq.q}</span>
                        <span className="text-lg font-bold text-slate-400">{isOpen ? "−" : "+"}</span>
                      </button>
                      {isOpen && (
                        <div className="p-4 pt-0 text-xs sm:text-sm text-slate-600 border-t border-slate-100 bg-slate-50/50 leading-relaxed">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right Column (1 Col) - Documents & Help */}
          <div className="space-y-6">
            {/* Required Documents Card */}
            <div
              className="rounded-2xl border p-6 bg-white shadow-xs sticky top-4"
              style={{ borderColor: "var(--border)" }}
            >
              <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                <FileText size={18} style={{ color: "var(--color-8)" }} />
                Required Documents
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Keep scanned copies (PDF/JPG, under 2MB) ready before starting your application:
              </p>
              <ul className="space-y-2.5">
                {service.documents.map((doc, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <Check size={14} className="text-[#1e3a8a] flex-shrink-0 mt-0.5" />
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 pt-5 border-t border-slate-100">
                <Link
                  href={`/user/apply?serviceId=${service.id}`}
                  className="w-full h-11 rounded-xl font-bold text-xs sm:text-sm text-white flex items-center justify-center gap-2 shadow-xs hover:opacity-95 transition-opacity"
                  style={{ background: "var(--color-6)" }}
                >
                  <span>Start Application</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              {/* Assistance Box */}
              <div
                className="mt-6 p-4 rounded-xl border flex items-start gap-3"
                style={{ background: "var(--color-14)", borderColor: "var(--color-11)" }}
              >
                <Phone size={18} className="text-[#1e3a8a] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Need help applying?</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Call our citizen toll-free helpline: <span className="font-bold text-[#1e3a8a]">1800 425 1234</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">Mon - Sat (9:30 AM to 6:00 PM IST)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
