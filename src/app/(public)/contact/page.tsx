"use client";

import { useState } from "react";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  Building,
  Shield,
  HelpCircle,
} from "lucide-react";

interface DistrictOffice {
  district: string;
  officer: string;
  address: string;
  phone: string;
  email: string;
}

const districtOffices: DistrictOffice[] = [
  {
    district: "Chennai",
    officer: "Deputy Commissioner of Labour (Welfare)",
    address: "No. 80, Valluvar Kottam High Road, Nungambakkam, Chennai - 600034",
    phone: "044-28271234",
    email: "welfare.chennai@labourseva.tn.gov.in",
  },
  {
    district: "Coimbatore",
    officer: "Assistant Commissioner of Labour",
    address: "Integrated Labour Complex, Dr. Balasundaram Road, Coimbatore - 641018",
    phone: "0422-2245678",
    email: "welfare.cbe@labourseva.tn.gov.in",
  },
  {
    district: "Madurai",
    officer: "Deputy Commissioner of Labour",
    address: "Government Labour Welfare Complex, K.K. Nagar, Madurai - 625020",
    phone: "0452-2589012",
    email: "welfare.mdu@labourseva.tn.gov.in",
  },
  {
    district: "Tiruchirappalli",
    officer: "Assistant Commissioner of Labour",
    address: "District Collectorate Complex, Cantonment, Tiruchirappalli - 620001",
    phone: "0431-2412345",
    email: "welfare.try@labourseva.tn.gov.in",
  },
  {
    district: "Salem",
    officer: "Labour Welfare Officer",
    address: "Near Old Bus Stand, Bretts Road, Salem - 636001",
    phone: "0427-2456789",
    email: "welfare.salem@labourseva.tn.gov.in",
  },
  {
    district: "Tirunelveli",
    officer: "Assistant Commissioner of Labour",
    address: "Palayamkottai Road, Kokkirakulam, Tirunelveli - 627009",
    phone: "0462-2501234",
    email: "welfare.tvl@labourseva.tn.gov.in",
  },
  {
    district: "Vellore",
    officer: "Labour Officer (Welfare)",
    address: "Anna Salai, Near Collectorate, Vellore - 632009",
    phone: "0416-2223456",
    email: "welfare.vellore@labourseva.tn.gov.in",
  },
  {
    district: "Thanjavur",
    officer: "Labour Officer (Welfare)",
    address: "Court Road, Thanjavur - 613001",
    phone: "04362-234567",
    email: "welfare.tanjore@labourseva.tn.gov.in",
  },
];

export default function ContactPage() {
  const [selectedDistrict, setSelectedDistrict] = useState("Chennai");
  const [form, setForm] = useState({ name: "", phone: "", district: "Chennai", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentOffice = districtOffices.find((d) => d.district === selectedDistrict) || districtOffices[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <div style={{ background: "var(--bg-subtle)", minHeight: "100vh" }} className="py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-3 border shadow-xs"
            style={{
              background: "var(--color-12)",
              color: "var(--color-dark-blue-1)",
              borderColor: "var(--color-11)",
            }}
          >
            <Phone size={14} style={{ color: "var(--color-6)" }} />
            <span>Citizen Helpdesk & District Offices · தொடர்பு விவரங்கள்</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
            Contact Support
          </h1>
          <p className="text-base font-semibold mb-3" style={{ color: "var(--color-8)", fontFamily: "var(--font-sans-ta)" }}>
            தொழிலாளர் நல உதவி மையம் மற்றும் மாவட்ட அலுவலகங்கள்
          </p>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Need assistance with worker registration, welfare scheme claims, or status tracking? Reach out through our toll-free helpline, contact your district welfare office, or submit an online inquiry.
          </p>
        </div>

        {/* Quick Contact Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <div
            className="bg-white rounded-2xl border p-6 flex items-start gap-4 shadow-xs"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-12)", color: "var(--color-6)" }}>
              <Phone size={22} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Toll-Free Helpline</h2>
              <p className="text-lg font-black text-[#1e3a8a] mt-0.5">1800 425 1234</p>
              <p className="text-xs text-slate-500 mt-1">Mon - Sat (9:30 AM to 6:00 PM IST)</p>
            </div>
          </div>

          <div
            className="bg-white rounded-2xl border p-6 flex items-start gap-4 shadow-xs"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-12)", color: "var(--color-8)" }}>
              <Mail size={22} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Email Support</h2>
              <p className="text-sm font-bold text-slate-800 mt-0.5 break-all">support@labourseva.com</p>
              <p className="text-xs text-slate-500 mt-1">Response within 24 working hours</p>
            </div>
          </div>

          <div
            className="bg-white rounded-2xl border p-6 flex items-start gap-4 shadow-xs"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-12)", color: "var(--color-6)" }}>
              <Building size={22} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Headquarters</h2>
              <p className="text-xs text-slate-700 mt-0.5 leading-snug">
                Tamil Nadu Labour Welfare Board, Valluvar Kottam High Rd, Chennai - 600034
              </p>
            </div>
          </div>
        </div>

        {/* District Directory & Contact Form Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* District Directory */}
          <div
            className="bg-white rounded-3xl border p-6 sm:p-8 shadow-xs"
            style={{ borderColor: "var(--border)" }}
          >
            <h2 className="text-xl font-black text-slate-900 mb-2">
              District Welfare Offices · மாவட்ட அலுவலகங்கள்
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mb-6">
              Select your district to view the local Assistant Commissioner of Labour and contact details:
            </p>

            <div className="mb-6">
              <label className="text-xs font-bold text-slate-700 block mb-2">Choose District</label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border text-sm outline-none bg-slate-50 font-semibold text-slate-800"
                style={{ borderColor: "var(--border)" }}
              >
                {districtOffices.map((d) => (
                  <option key={d.district} value={d.district}>
                    {d.district} District Welfare Office
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Office Details Card */}
            <div
              className="rounded-2xl border p-5 bg-slate-50/80 space-y-3.5"
              style={{ borderColor: "var(--color-11)" }}
            >
              <div className="flex items-center justify-between border-b pb-3 border-slate-200">
                <span className="text-base font-bold text-slate-900">{currentOffice.district} District</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-[#1e3a8a] font-semibold">Active Office</span>
              </div>

              <div className="text-xs text-slate-600">
                <span className="font-bold text-slate-800 block mb-0.5">Officer in Charge:</span>
                {currentOffice.officer}
              </div>

              <div className="text-xs text-slate-600">
                <span className="font-bold text-slate-800 block mb-0.5">Address:</span>
                {currentOffice.address}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                  <Phone size={13} className="text-[#1e3a8a]" />
                  <span>{currentOffice.phone}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700 font-semibold truncate">
                  <Mail size={13} className="text-[#1e3a8a]" />
                  <span>{currentOffice.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Online Inquiry Form */}
          <div
            className="bg-white rounded-3xl border p-6 sm:p-8 shadow-xs"
            style={{ borderColor: "var(--border)" }}
          >
            <h2 className="text-xl font-black text-slate-900 mb-2">
              Send an Online Inquiry · இணைய வழி விசாரணை
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mb-6">
              Have a question or facing difficulty? Submit your query and our team will get in touch:
            </p>

            {submitted ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--success-bg)" }}>
                  <CheckCircle2 size={32} style={{ color: "var(--success)" }} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Inquiry Submitted Successfully!</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto mb-4">
                  Reference Ticket ID: <span className="font-mono font-bold text-slate-900">INQ-2026-99214</span>. We have sent an SMS confirmation to your mobile number.
                </p>
                <button
                  type="button"
                  onClick={() => { setSubmitted(false); setForm({ name: "", phone: "", district: "Chennai", subject: "", message: "" }); }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1e3a8a] text-white"
                >
                  Submit Another Query
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. K. Murugan"
                      className="w-full h-11 px-3.5 rounded-xl border text-sm outline-none"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Mobile Number</label>
                    <input
                      type="tel"
                      required
                      pattern="[6-9][0-9]{9}"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="10-digit mobile"
                      className="w-full h-11 px-3.5 rounded-xl border text-sm outline-none"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Subject / Category</label>
                  <select
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    required
                    className="w-full h-11 px-3.5 rounded-xl border text-sm outline-none bg-white"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <option value="">Select subject category</option>
                    <option value="Worker Registration Query">Worker Registration Query</option>
                    <option value="Accident Relief Assistance">Accident Relief Assistance</option>
                    <option value="Educational Scholarship Status">Educational Scholarship Status</option>
                    <option value="Maternity Benefit Inquiry">Maternity Benefit Inquiry</option>
                    <option value="e-Seva Kendra Issue">e-Seva Kendra Issue</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Message Details</label>
                  <textarea
                    rows={4}
                    required
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Describe your issue or question in detail..."
                    className="w-full p-3.5 rounded-xl border text-sm outline-none resize-none"
                    style={{ borderColor: "var(--border)" }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-xs hover:opacity-95 transition-opacity"
                  style={{ background: "var(--color-6)" }}
                >
                  <Send size={15} />
                  <span>{loading ? "Submitting Inquiry..." : "Submit Inquiry"}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
