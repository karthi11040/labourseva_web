import Link from "next/link";
import { Shield, Lock, Eye, FileText, CheckCircle2, AlertCircle } from "lucide-react";

export default function PrivacyPage() {
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
            <Shield size={14} style={{ color: "var(--color-6)" }} />
            <span>Digital Personal Data Protection (DPDP) Act 2023 Compliance</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-500">Last updated: October 2026 · பதிப்பு: அக்டோபர் 2026</p>
        </div>

        <div
          className="bg-white rounded-3xl border p-8 sm:p-12 shadow-xs space-y-8 text-sm text-slate-700 leading-relaxed"
          style={{ borderColor: "var(--border)" }}
        >
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Lock size={18} className="text-[#1e3a8a]" />
              1. Commitment to Citizen Privacy
            </h2>
            <p>
              LabourSeva is committed to protecting the privacy, dignity, and confidential identity of all unorganised workers, beneficiaries, and applicants across Tamil Nadu. This Privacy Policy outlines how personal data is collected, processed, encrypted, and stored in strict accordance with the Digital Personal Data Protection (DPDP) Act, 2023.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <FileText size={18} className="text-[#1e3a8a]" />
              2. Data We Collect
            </h2>
            <p className="mb-2">We collect only necessary minimum information required to deliver statutory labour welfare benefits:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600">
              <li><strong>Identity Data:</strong> Full Name, Date of Birth, Gender, Nominee details.</li>
              <li><strong>Authentication Data:</strong> Mobile phone number for OTP-based verification.</li>
              <li><strong>Government Identifiers:</strong> Only the last 4 digits of Aadhaar are permanently stored; full 12 digits are used solely for UIDAI e-KYC validation.</li>
              <li><strong>Banking Data:</strong> Bank account number, IFSC code, and branch name exclusively for Direct Benefit Transfer (DBT).</li>
              <li><strong>Employment & Trade Proofs:</strong> Trade category, union membership or Village Administrative Officer (VAO) work certificate.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Shield size={18} className="text-[#1e3a8a]" />
              3. Encryption & Data Security Architecture
            </h2>
            <p>
              All sensitive Personal Identifiable Information (PII) is encrypted at rest using industry-standard <strong>AES-256-GCM</strong> encryption with isolated cryptographic key stores. Searchable fields such as phone numbers employ HMAC blind indexing. Documents uploaded to the vault are stored outside public paths and served only via temporary, authenticated tokens expiring within 3 minutes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Eye size={18} className="text-[#1e3a8a]" />
              4. Masking & Access Control
            </h2>
            <p>
              In accordance with our strict data protection standards, citizen identity numbers are masked by default across all staff and verification screens (e.g. <code>XXXX XXXX 4821</code>). Any unmasking or document viewing action by verification officers is recorded in an immutable audit log.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-[#1e3a8a]" />
              5. Citizen Data Rights
            </h2>
            <p className="mb-2">Under the DPDP Act 2023, every registered citizen has the right to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600">
              <li>Access a summary of personal data held and processed by the platform.</li>
              <li>Request correction of inaccurate or outdated profile information.</li>
              <li>Withdraw consent or request profile archiving, subject to statutory audit requirements.</li>
              <li>Lodge a grievance with our Data Protection Officer regarding data handling.</li>
            </ul>
          </section>

          <section className="pt-4 border-t border-slate-100">
            <h2 className="text-base font-bold text-slate-900 mb-2">6. Data Protection Officer (DPO) Contact</h2>
            <p className="text-xs text-slate-600">
              For any privacy inquiries or data rights requests, contact: <br />
              <strong className="text-slate-800">Data Protection Officer</strong>, LabourSeva Directorate <br />
              No. 80, Valluvar Kottam High Road, Nungambakkam, Chennai - 600034 <br />
              Email: <span className="text-[#1e3a8a] font-semibold">dpo@labourseva.com</span> | Helpline: 1800 425 1234
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
