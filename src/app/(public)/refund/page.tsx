import Link from "next/link";
import { RefreshCcw, Shield, CheckCircle2, AlertCircle } from "lucide-react";

export default function RefundPage() {
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
            <RefreshCcw size={14} style={{ color: "var(--color-6)" }} />
            <span>Fee Policies & Redressal · கட்டணத் திருப்புக் கொள்கை</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
            Refund & Cancellation Policy
          </h1>
          <p className="text-sm text-slate-500">Effective: October 2026</p>
        </div>

        <div
          className="bg-white rounded-3xl border p-8 sm:p-12 shadow-xs space-y-8 text-sm text-slate-700 leading-relaxed"
          style={{ borderColor: "var(--border)" }}
        >
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">1. Statutory Registration & Processing Fees</h2>
            <p>
              Statutory registration fees (₹50) and processing charges paid towards Tamil Nadu Labour Welfare Board applications are non-refundable once an application has been assigned to a verification inspector or processed into the state registry.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">2. Double Deduction & Failed Transactions</h2>
            <p>
              If a citizen or Kendra operator experiences a double debit or an error where money is deducted from their bank account but the application reference ID is not generated:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 mt-2">
              <li>Our automated payment gateway reconciles all pending orders every 6 hours.</li>
              <li>Duplicate or orphan payments are automatically reversed to the originating bank account or UPI VPA within <strong>3 to 5 banking business days</strong>.</li>
              <li>You may also submit a payment grievance with your Razorpay payment ID on our <Link href="/grievance" className="text-[#1e3a8a] font-semibold underline">Grievance Portal</Link>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">3. Application Rejection & Corrections</h2>
            <p>
              If an application is returned for document deficiency or correction (such as an unclear photograph or missing VAO signature), citizens are allowed <strong>up to 3 resubmissions without any additional fee</strong>. Rejections due to ineligibility or age disqualification do not qualify for a refund of statutory verification charges.
            </p>
          </section>

          <section className="pt-4 border-t border-slate-100">
            <h2 className="text-base font-bold text-slate-900 mb-2">4. Payment Support Contact</h2>
            <p className="text-xs text-slate-600">
              For payment queries, write to: <span className="font-semibold text-slate-900">payments@labourseva.com</span> with transaction reference, date, and applicant phone number.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
