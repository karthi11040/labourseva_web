import Link from "next/link";
import { Eye, Shield, CheckCircle2, Globe, Monitor, Type } from "lucide-react";

export default function AccessibilityPage() {
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
            <Eye size={14} style={{ color: "var(--color-6)" }} />
            <span>WCAG 2.2 AA Compliance Statement · அணுகல் வசதி</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
            Accessibility Statement
          </h1>
          <p className="text-sm text-slate-500">Commitment to universal digital access for all workers</p>
        </div>

        <div
          className="bg-white rounded-3xl border p-8 sm:p-12 shadow-xs space-y-8 text-sm text-slate-700 leading-relaxed"
          style={{ borderColor: "var(--border)" }}
        >
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">1. Universal Access Philosophy</h2>
            <p>
              LabourSeva is engineered to be universally accessible to all citizens regardless of physical disability, age, literacy level, visual impairment, or device limitations. We adhere strictly to the <strong>Web Content Accessibility Guidelines (WCAG) 2.2 Level AA</strong> and the Guidelines for Indian Government Websites (GIGW).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">2. Built-in Accessibility Features</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                  <Type size={16} className="text-[#1e3a8a]" />
                  <span>Dynamic Font Sizing (A− / A / A+)</span>
                </div>
                <p className="text-xs text-slate-600">
                  Adjust typography from 14px up to 20px dynamically using the header controls without breaking page layouts.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                  <Monitor size={16} className="text-[#1e3a8a]" />
                  <span>High-Contrast & Dark Mode</span>
                </div>
                <p className="text-xs text-slate-600">
                  Switch instantly between high-contrast daylight theme and dark mode with contrast ratios exceeding 7:1.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                  <Globe size={16} className="text-[#1e3a8a]" />
                  <span>Full Bilingual Support</span>
                </div>
                <p className="text-xs text-slate-600">
                  Complete parallel copy in Tamil (Noto Sans Tamil) and English with heightened line heights for Tamil script readability.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                  <Eye size={16} className="text-[#1e3a8a]" />
                  <span>Screen Reader Compatibility</span>
                </div>
                <p className="text-xs text-slate-600">
                  Semantic HTML5 elements, descriptive ARIA attributes, skip-to-content links, and full keyboard tab indexing.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-2">3. Keyboard Navigation</h2>
            <p className="mb-2">All interactive controls, forms, and modal dialogs can be fully operated using a standard keyboard:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
              <li><strong>Tab / Shift + Tab:</strong> Navigate forward and backward between interactive links and inputs.</li>
              <li><strong>Enter / Space:</strong> Activate buttons, select checkboxes, and submit forms.</li>
              <li><strong>Escape:</strong> Dismiss popups and modal dialogues.</li>
              <li><strong>Skip to main content:</strong> First focusable element allows bypassing repeated navigation menus.</li>
            </ul>
          </section>

          <section className="pt-4 border-t border-slate-100">
            <h2 className="text-base font-bold text-slate-900 mb-2">4. Accessibility Feedback</h2>
            <p className="text-xs text-slate-600">
              If you experience any accessibility barrier while browsing LabourSeva, please let us know at <span className="font-semibold text-[#1e3a8a]">accessibility@labourseva.com</span>. We actively review and implement improvements.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
