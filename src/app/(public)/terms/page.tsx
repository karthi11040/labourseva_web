import Link from "next/link";
import { FileCheck, Shield, AlertTriangle } from "lucide-react";

export default function TermsPage() {
  return (
    <div style={{ background: "var(--bg-subtle)", minHeight: "100vh" }} className="py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-3 border shadow-xs"
            style={{
              background: "var(--color-12)",
              color: "var(--color-dark-blue-1)",
              borderColor: "var(--color-11)",
            }}
          >
            <FileCheck size={14} style={{ color: "var(--color-6)" }} />
            <span>Statutory Service Terms · பயன்பாட்டு விதிகள்</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
            Terms of Use
          </h1>
          <p className="text-sm text-slate-500">Effective from: October 2026</p>
        </div>

        <div
          className="bg-white rounded-3xl border p-8 sm:p-12 shadow-xs space-y-8 text-sm text-slate-700 leading-relaxed"
          style={{ borderColor: "var(--border)" }}
        >
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing, browsing, registering, or submitting applications on the LabourSeva portal (or via authorized retail e-Seva Kendras), you agree to be bound by these Terms of Use and all applicable rules of the Government of Tamil Nadu Labour Welfare Boards.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">2. Eligibility for Registration</h2>
            <p className="mb-2">Registration on this portal is restricted to genuine unorganised and manual workers meeting the following criteria:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
              <li>Age between 18 and 60 years at the time of initial registration.</li>
              <li>Engaged in manual labour or construction for at least 90 days in the preceding 12 months.</li>
              <li>Not covered under formal sector social security schemes (EPFO/ESIC).</li>
              <li>Ordinary resident of the State of Tamil Nadu.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">3. Accuracy of Information & Legal Penalty</h2>
            <p>
              Applicants are strictly responsible for the veracity of all personal information, age proofs, employment certificates, and banking credentials submitted. Submitting forged documents or false statements is a punishable offence under Section 420 and related sections of the Indian Penal Code and will result in permanent blacklisting and recovery of disbursed benefits.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">4. Fee Payments & Official Receipts</h2>
            <p>
              Prescribed statutory fees (e.g., ₹50 for worker registration) must be paid exclusively through our integrated payment gateways (Razorpay/authorized Kendra wallets). Always demand and verify the system-generated digital receipt with QR code.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">5. Service Delivery Timelines</h2>
            <p>
              Service delivery and verification timelines are subject to field inquiry by respective taluk and district welfare inspectors. While standard applications are processed within 3 to 10 working days, incomplete documentation may lead to requests for correction or temporary suspension.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
