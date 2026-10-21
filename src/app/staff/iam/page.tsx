"use client";

import { useState } from "react";
import { CheckCircle2, LockKeyhole, ShieldAlert, UserRound, XCircle } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

type RequestStatus = "Pending" | "Approved" | "Escalated";

type IamRequest = {
  id: string;
  title: string;
  subject: string;
  action: string;
  status: RequestStatus;
  scope: string;
};

const initialRequests: IamRequest[] = [];

export default function IamRequestsPage() {
  const { language } = useLanguage();
  const isTa = language === "ta";

  const [requests, setRequests] = useState<IamRequest[]>(initialRequests);
  const [notice, setNotice] = useState("");

  function update(id: string, status: RequestStatus) {
    setRequests((current) => current.map((request) => (request.id === id ? { ...request, status } : request)));
    setNotice(
      status === "Approved"
        ? isTa
          ? `${id} பணியாளர் வரம்பிற்குள் ஒப்புதல் அளிக்கப்பட்டது.`
          : `${id} was approved within employee scope.`
        : isTa
        ? `${id} நிர்வாகியின் மதிப்பாய்வுக்கு அனுப்பப்பட்டது.`
        : `${id} was escalated to an administrator for review.`
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div>
        <span className="text-xs font-bold uppercase tracking-wide text-[#ea580c]">
          {isTa ? "பணியாளர் மையம் · அடையாளம் மற்றும் அணுகல்" : "Employee desk · identity and access"}
        </span>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
          {isTa ? "அடையாள & அணுகல் கோரிக்கைகள் (IAM)" : "IAM requests"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {isTa
            ? "கோரிக்கைகளைச் சரிபார்க்கவும், கணக்கு வரம்பைக் கட்டுப்படுத்தவும், பணப்பை தொடர்புடைய அல்லது முக்கியமான ஊழியர் அணுகல் மாற்றங்களை உயர் அதிகாரிகளுக்கு மாற்றவும்."
            : "Verify requests, keep the account scope limited, and escalate any wallet-linked or sensitive staff access change."}
        </p>
      </div>

      {notice && (
        <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {notice}
        </p>
      )}

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="flex items-center gap-2">
            <LockKeyhole size={18} className="text-[#1e3a8a]" />
            <h2 className="font-bold text-slate-950">
              {isTa ? "அணுகல் மதிப்பாய்வு வரிசை" : "Access review queue"}
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {isTa
              ? "ஊழியர்கள் வாடிக்கையாளர்கள், சில்லறை வணிகர்கள் மற்றும் விநியோகஸ்தர்கள் மீது நடவடிக்கை எடுக்கலாம். ஊழியர் மற்றும் நிர்வாகி பங்கு மாற்றங்கள் நிர்வாகிகளுக்கு மட்டுமே உரியவை."
              : "Employees can act on customers, retailers, and distributors. Staff and administrator role changes are administrator-only."}
          </p>
        </div>

        {requests.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            {isTa ? "மதிப்பாய்வு வரிசையில் எந்த அணுகல் கோரிக்கைகளும் நிலுவையில் இல்லை." : "No access requests pending in the review queue."}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((request) => (
              <article key={request.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex gap-3">
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ${
                      request.status === "Escalated" ? "bg-red-50 text-red-700" : "bg-blue-50 text-[#1e3a8a]"
                    }`}
                  >
                    {request.status === "Escalated" ? <ShieldAlert size={19} /> : <UserRound size={19} />}
                  </span>
                  <div>
                    <span className="font-mono text-xs text-slate-400">{request.id}</span>
                    <h3 className="mt-1 text-sm font-bold text-slate-900">{request.title}</h3>
                    <p className="mt-1 text-xs text-slate-600">
                      {request.subject} · {request.action}
                    </p>
                    <span
                      className={`mt-2 inline-block text-xs font-bold ${
                        request.status === "Escalated"
                          ? "text-red-700"
                          : request.status === "Approved"
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }`}
                    >
                      {request.scope}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {request.status === "Pending" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => update(request.id, "Escalated")}
                        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-red-200 px-3 text-xs font-bold text-red-700 hover:bg-red-50 transition-colors"
                      >
                        <ShieldAlert size={15} /> {isTa ? "உயர் அதிகாரிக்கு மாற்று" : "Escalate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => update(request.id, "Approved")}
                        className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#1e3a8a] px-3 text-xs font-bold text-white hover:bg-[#1e40af] transition-colors"
                      >
                        <CheckCircle2 size={15} /> {isTa ? "ஒப்புதல் அளி" : "Approve"}
                      </button>
                    </>
                  ) : (
                    <span
                      className={`inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-xs font-bold ${
                        request.status === "Approved" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                      }`}
                    >
                      {request.status === "Approved" ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                      {request.status === "Approved"
                        ? isTa
                          ? "ஒப்புதல் அளிக்கப்பட்டது"
                          : "Approved"
                        : isTa
                        ? "மேல்முறையீடு செய்யப்பட்டது"
                        : "Escalated"}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
