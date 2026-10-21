/**
 * LabourSeva — Unified English & Tamil Translation Dictionary
 * Comprehensive localization covering Admin, Staff/Employee Desk, and Common Operations.
 */

export type Locale = "en" | "ta";

export interface TranslationDictionary {
  [key: string]: {
    en: string;
    ta: string;
  };
}

export const I18N_DICTIONARY: Record<string, { en: string; ta: string }> = {
  // Navigation & Sections
  "nav.dashboard": { en: "Dashboard", ta: "டாஷ்போர்டு" },
  "nav.analytics": { en: "Analytics & Reports", ta: "பகுப்பாய்வு மற்றும் அறிக்கைகள்" },
  "nav.manageRegistration": { en: "Manage Registration", ta: "பதிவு மேலாண்மை" },
  "nav.accountVerifications": { en: "Account Verifications", ta: "கணக்கு சரிபார்ப்புகள்" },
  "nav.customers": { en: "Customers", ta: "வாடிக்கையாளர்கள்" },
  "nav.customerRequests": { en: "Customer Requests", ta: "வாடிக்கையாளர் கோரிக்கைகள்" },
  "nav.retailers": { en: "Retailers", ta: "சில்லறை விற்பனையாளர்கள்" },
  "nav.retailRequests": { en: "Retail Requests", ta: "சில்லறை கோரிக்கைகள்" },
  "nav.distributors": { en: "Distributors", ta: "விநியோகஸ்தர்கள்" },
  "nav.feeWalletHub": { en: "Fee & Wallet Hub", ta: "கட்டணம் & வாலட் மையம்" },
  "nav.distributorRequests": { en: "Distributor Requests", ta: "விநியோகஸ்தர் கோரிக்கைகள்" },
  "nav.guestUsers": { en: "Guest Users", ta: "விருந்தினர் பயனர்கள்" },
  "nav.guestRequests": { en: "Guest Requests", ta: "விருந்தினர் கோரிக்கைகள்" },
  "nav.guestOrders": { en: "Guest Orders", ta: "விருந்தினர் ஆர்டர்கள்" },
  "nav.manageServices": { en: "Manage Services", ta: "சேவைகள் மேலாண்மை" },
  "nav.serviceTypes": { en: "Service Types", ta: "சேவை வகைகள்" },
  "nav.employees": { en: "Employees", ta: "பணியாளர்கள்" },
  "nav.tickets": { en: "Support Tickets", ta: "ஆதரவு கோரிக்கைகள்" },
  "nav.allRequests": { en: "All Requests", ta: "அனைத்து கோரிக்கைகள்" },
  "nav.districts": { en: "Districts", ta: "மாவட்டங்கள்" },
  "nav.signatures": { en: "Signatures", ta: "கையொப்பங்கள்" },
  "nav.manageTaluks": { en: "Manage Taluks", ta: "வட்டங்கள் மேலாண்மை" },
  "nav.managePanchayats": { en: "Manage Panchayats", ta: "ஊராட்சிகள் மேலாண்மை" },
  "nav.eserviceList": { en: "E-Service List", ta: "இ-சேவைகள் பட்டியல்" },
  "nav.formStudio": { en: "Form Studio", ta: "படிவ வடிவமைப்பு அரங்கம்" },
  "nav.eserviceRecords": { en: "E-Service Records", ta: "இ-சேவை பதிவுகள்" },
  "nav.walletPayments": { en: "Wallet & Payments", ta: "வாலட் & கட்டணங்கள்" },
  "nav.commissions": { en: "Commissions", ta: "கமிஷன்கள்" },
  "nav.reports": { en: "Reports", ta: "அறிக்கைகள்" },
  "nav.manualTransactions": { en: "Manual Transactions", ta: "கைமுறை பரிவர்த்தனைகள்" },
  "nav.pendingRequests": { en: "Pending Requests", ta: "நிலுவை கோரிக்கைகள்" },
  "nav.systemUsers": { en: "System Users", ta: "கணினி பயனர்கள்" },
  "nav.announcements": { en: "Announcements", ta: "அறிவிப்புகள்" },
  "nav.noticeManagement": { en: "Notice Management", ta: "சுற்றறிக்கைகள் மேலாண்மை" },
  "nav.grievancePortal": { en: "Grievance Portal", ta: "குறைதீர்ப்பு தளம்" },
  "nav.adManager": { en: "Ad Manager", ta: "விளம்பர மேலாண்மை" },
  "nav.careers": { en: "Careers", ta: "வேலைவாய்ப்புகள்" },
  "nav.schemes": { en: "Welfare Schemes", ta: "நலத்திட்டங்கள்" },
  "nav.downloads": { en: "Download Manager", ta: "பதிவிறக்கங்கள்" },
  "nav.settings": { en: "System Settings", ta: "கணினி அமைப்புகள்" },
  "nav.backup": { en: "Database Backup", ta: "தரவுத்தள காப்புப்பிரதி" },
  "nav.approvalDecisions": { en: "Approval Decisions", ta: "ஒப்புதல் முடிவுகள்" },
  "nav.auditTrail": { en: "Audit Trail", ta: "தணிக்கை பதிவு" },

  // Sections
  "section.main": { en: "Main", ta: "முக்கிய பிரிவு" },
  "section.customer": { en: "Customer", ta: "வாடிக்கையாளர்" },
  "section.retail": { en: "Retail", ta: "சில்லறை வணிகம்" },
  "section.distributor": { en: "Distributor", ta: "விநியோகஸ்தர்" },
  "section.guest": { en: "Guest", ta: "விருந்தினர்" },
  "section.operations": { en: "Operations", ta: "செயல்பாடுகள்" },
  "section.eservice": { en: "E-Service", ta: "இ-சேவை" },
  "section.finance": { en: "Finance", ta: "நிதி & கணக்குகள்" },
  "section.system": { en: "System", ta: "கணினி மேலாண்மை" },

  // Staff Desk Navigation
  "staff.workDashboard": { en: "Work Dashboard", ta: "பணி டாஷ்போர்டு" },
  "staff.verificationQueue": { en: "Verification Queue", ta: "சரிபார்ப்பு வரிசை" },
  "staff.pdfStudio": { en: "PDF Document Studio", ta: "ஆவண வடிவமைப்பு அரங்கம்" },
  "staff.queryDesk": { en: "Query Desk", ta: "வினவல் மையம்" },
  "staff.iamRequests": { en: "IAM Requests", ta: "அடையாள அணுகல் கோரிக்கைகள்" },

  // Geography Header & Labels
  "geo.district": { en: "District", ta: "மாவட்டம்" },
  "geo.taluk": { en: "Taluk", ta: "வட்டம்" },
  "geo.panchayat": { en: "Panchayat", ta: "கிராம ஊராட்சி" },
  "geo.districtLabel": { en: "District / மாவட்டம்", ta: "மாவட்டம் / District" },
  "geo.talukLabel": { en: "Taluk / வட்டம்", ta: "வட்டம் / Taluk" },
  "geo.panchayatLabel": { en: "Panchayat / ஊராட்சி", ta: "ஊராட்சி / Panchayat" },
  "geo.selectDistrict": { en: "-- Select District (மாவட்டம்) --", ta: "-- மாவட்டம் தேர்ந்தெடுக்கவும் (Select District) --" },
  "geo.selectTaluk": { en: "-- Select Taluk (வட்டம்) --", ta: "-- வட்டம் தேர்ந்தெடுக்கவும் (Select Taluk) --" },
  "geo.selectPanchayat": { en: "-- Select Panchayat (ஊராட்சி) --", ta: "-- ஊராட்சி தேர்ந்தெடுக்கவும் (Select Panchayat) --" },
  "geo.allDistricts": { en: "All 38 Districts of Tamil Nadu", ta: "தமிழ்நாட்டின் அனைத்து 38 மாவட்டங்கள்" },
  "geo.allTaluks": { en: "Taluks across Tamil Nadu", ta: "தமிழ்நாட்டின் வட்டங்கள்" },
  "geo.allPanchayats": { en: "Panchayats Directory", ta: "ஊராட்சிகள் பட்டியல்" },

  // Common UI Actions
  "action.search": { en: "Search", ta: "தேடுக" },
  "action.filter": { en: "Filter", ta: "வடிகட்டு" },
  "action.approve": { en: "Approve", ta: "ஒப்புதல் அளி" },
  "action.reject": { en: "Reject", ta: "நிராகரி" },
  "action.reupload": { en: "Request Re-Upload", ta: "மீண்டும் பதிவேற்றக் கோரு" },
  "action.view": { en: "View", ta: "பார்வையிடு" },
  "action.dossier": { en: "Dossier", ta: "கோப்பு காண்க" },
  "action.edit": { en: "Edit", ta: "திருத்து" },
  "action.delete": { en: "Delete", ta: "நீக்கு" },
  "action.save": { en: "Save", ta: "சேமி" },
  "action.cancel": { en: "Cancel", ta: "ரத்து செய்" },
  "action.submit": { en: "Submit", ta: "சமர்ப்பி" },
  "action.export": { en: "Export", ta: "ஏற்றுமதி செய்" },
  "action.exportCsv": { en: "Export CSV", ta: "CSV ஏற்றுமதி" },
  "action.print": { en: "Print", ta: "அச்சிடு" },
  "action.download": { en: "Download", ta: "பதிவிறக்கு" },
  "action.refresh": { en: "Refresh", ta: "புதுப்பி" },
  "action.close": { en: "Close", ta: "மூடு" },
  "action.confirm": { en: "Confirm", ta: "உறுதிப்படுத்து" },
  "action.addRecord": { en: "Add Record", ta: "புதிய பதிவு சேர்" },
  "action.signOut": { en: "Sign Out", ta: "வெளியேறு" },
  "action.escalate": { en: "Escalate", ta: "உயரதிகாரிக்கு அனுப்பு" },
  "action.reveal": { en: "Reveal Info", ta: "தகவலைக் காட்டு" },

  // Filter Tabs & Status
  "status.all": { en: "All Statuses", ta: "அனைத்து நிலைகளும்" },
  "status.pending": { en: "Pending", ta: "நிலுவையில்" },
  "status.approved": { en: "Approved", ta: "ஒப்புதல் அளிக்கப்பட்டது" },
  "status.rejected": { en: "Rejected", ta: "நிராகரிக்கப்பட்டது" },
  "status.active": { en: "Active", ta: "செயலில் உள்ளது" },
  "status.verified": { en: "Verified", ta: "சரிபார்க்கப்பட்டது" },
  "status.escalated": { en: "Escalated", ta: "உயர்மட்ட பரிசீலனையில்" },
  "status.hold": { en: "On Hold", ta: "நிறுத்தி வைக்கப்பட்டுள்ளது" },

  // Metrics & Headers
  "stat.totalEntries": { en: "Total Entries", ta: "மொத்த பதிவுகள்" },
  "stat.pendingProcessing": { en: "Pending Processing", ta: "செயலாக்கத்தில் உள்ளவை" },
  "stat.approvedActive": { en: "Approved / Active", ta: "ஒப்புதல் பெற்றவை / செயலில் உள்ளவை" },
  "stat.adherenceSla": { en: "Adherence SLA", ta: "காலக்கெடு இணக்கம்" },

  // Top Bar Shell Strings
  "shell.adminSession": { en: "Admin Session", ta: "நிர்வாகி அமர்வு" },
  "shell.secureLive": { en: "Secure Live", ta: "பாதுகாப்பான நேரலை" },
  "shell.employeeDesk": { en: "Employee Desk", ta: "பணியாளர் தளம்" },
  "shell.citizenPortal": { en: "Citizen Portal", ta: "குடிமக்கள் தளம்" },
  "shell.operationalAlerts": { en: "Operational Alerts", ta: "செயல்பாட்டு எச்சரிக்கைகள்" },
  "shell.noAlerts": { en: "No pending requests or KYC alerts.", ta: "நிலுவையில் உள்ள கோரிக்கைகள் அல்லது எச்சரிக்கைகள் ஏதுமில்லை." },
  "shell.globalNotice": {
    en: "FY 2026-27 Labour Welfare Board renewal audits and E-Service record sync in progress. Ensure taluk-level submissions are cleared before end of week.",
    ta: "நிதி ஆண்டு 2026-27 தொழிலாளர் நல வாரிய புதுப்பித்தல் தணிக்கை மற்றும் இ-சேவை பதிவுகள் ஒருங்கிணைப்பு நடைபெற்று வருகிறது. அனைத்து வட்ட அளவிலான விண்ணப்பங்களையும் வார இறுதிக்குள் முடிக்கவும்."
  },

  // Staff Desk Strings
  "staff.title": { en: "Employee Desk", ta: "பணியாளர் தளம்" },
  "staff.assignedWorkTitle": { en: "Today's Assigned Work", ta: "இன்றைய பணிக் கோரிக்கைகள்" },
  "staff.assignedWorkDesc": {
    en: "Work through verification, support, and identity requests. Customer data is masked by default and every reveal or decision must be recorded.",
    ta: "சரிபார்ப்பு, ஆதரவு மற்றும் அடையாள கோரிக்கைகளை கையாளவும். பயனாளி தரவுகள் மறைக்கப்பட்டுள்ளன; ஒவ்வொரு வெளிப்படுத்தலும் தணிக்கை பதிவேட்டில் பதிவு செய்யப்படும்."
  },
  "staff.priorityCases": { en: "Priority Cases", ta: "முன்னுரிமை வழக்குகள்" },
  "staff.priorityCasesDesc": { en: "Start with cases approaching their service target.", ta: "காலக்கெடு நெருங்கும் வழக்குகளை முதலில் கையாளவும்." },
  "staff.workingSafely": { en: "Working Safely & Protocol", ta: "பாதுகாப்பான பணி நெறிமுறைகள்" },
  "staff.auditNotice": { en: "All queue actions are added to the audit trail.", ta: "அனைத்து நடவடிக்கைகளும் தணிக்கை பதிவேட்டில் சேர்க்கப்படுகின்றன." },
  "staff.rule1": { en: "Only reveal personal data for the case you are handling.", ta: "நீங்கள் கையாளும் குறிப்பிட்ட வழக்கிற்கு மட்டுமே தனிநபர் தரவை வெளிப்படுத்தவும்." },
  "staff.rule2": { en: "State clear, factual reason for any rejection or returned file.", ta: "நிராகரிப்பு அல்லது திருப்பி அனுப்பப்படும் கோப்புகளுக்கு சரியான காரணத்தைக் குறிப்பிடவும்." },
  "staff.rule3": { en: "Do not change wallet, payment, or commission settings from this desk.", ta: "இந்தப் பிரிவில் இருந்து வாலட், கட்டணம் அல்லது கமிஷன் அமைப்புகளை மாற்ற இயலாது." },

  // Verification Queue
  "verify.title": { en: "Account Verification & Document Review", ta: "கணக்கு சரிபார்ப்பு & ஆவண மதிப்பாய்வு" },
  "verify.subtitle": {
    en: "Review identity documents, approve accounts, reject invalid submissions, or request additional proofs.",
    ta: "அடையாள ஆவணங்களை மதிப்பாய்வு செய்து கணக்குகளை அங்கீகரிக்கவும் அல்லது கூடுதல் ஆதாரங்களைக் கோரவும்."
  },
  "verify.decisionNotes": { en: "Official Decision Remarks", ta: "அலுவலக முடிவு குறிப்புகள்" },
  "verify.decisionNotesPlaceholder": {
    en: "Enter official remarks, compliance findings, or reason for decision...",
    ta: "அலுவலக சரிபார்ப்புக் குறிப்புகள், இணக்க அறிக்கைகள் அல்லது முடிவிற்கான காரணங்களை உள்ளிடவும்..."
  },
  "verify.maskNotice": {
    en: "Aadhaar / Identity document details are protected under data privacy standards. Reveal only when actively validating.",
    ta: "ஆதார் மற்றும் அடையாள ஆவண விவரங்கள் தனிநபர் தகவல் பாதுகாப்பு விதிகளின்படி பாதுகாக்கப்படுகின்றன."
  },

  // Query Desk
  "query.title": { en: "Citizen Query Desk & Helpdesk", ta: "குடிமக்கள் வினவல் மையம் மற்றும் ஆதரவு" },
  "query.subtitle": { en: "Resolve queries, assist applicants, and provide clarifications in real time.", ta: "குடிமக்களின் கேள்விகளுக்கு தீர்வு காணவும் நேரடி விளக்கம் அளிக்கவும்." },
  "query.typeReply": { en: "Type your official response to the citizen...", ta: "குடிமகனுக்கான உங்கள் அலுவலக பதிலை தட்டச்சு செய்யவும்..." },
  "query.sendReply": { en: "Send Response", ta: "பதிலை அனுப்பு" },

  // IAM Desk
  "iam.title": { en: "Identity and Access Management (IAM)", ta: "அடையாளம் மற்றும் அணுகல் மேலாண்மை (IAM)" },
  "iam.subtitle": {
    en: "Verify requests, keep account scopes limited, and escalate any sensitive staff access changes.",
    ta: "அணுகல் கோரிக்கைகளை சரிபார்த்து, முக்கியமான மாற்றங்களை நிர்வாகிக்கு பரிந்துரைக்கவும்."
  },
  "iam.queueTitle": { en: "Access Review Queue", ta: "அணுகல் மதிப்பாய்வு வரிசை" },

  // Table Headers
  "table.id": { en: "ID / எண்", ta: "எண் / ID" },
  "table.title": { en: "Title / Case", ta: "தலைப்பு / வழக்கு" },
  "table.detail": { en: "Details", ta: "விவரங்கள்" },
  "table.status": { en: "Status", ta: "நிலை" },
  "table.district": { en: "District / மாவட்டம்", ta: "மாவட்டம் / District" },
  "table.taluk": { en: "Taluk / வட்டம்", ta: "வட்டம் / Taluk" },
  "table.panchayat": { en: "Panchayat / ஊராட்சி", ta: "ஊராட்சி / Panchayat" },
  "table.amount": { en: "Amount / கட்டணம்", ta: "தொகை / Amount" },
  "table.date": { en: "Submission Date", ta: "சமர்ப்பித்த தேதி" },
  "table.actions": { en: "Actions", ta: "நடவடிக்கைகள்" },

  // Placeholders
  "placeholder.search": {
    en: "Search by ID, name, district, or mobile...",
    ta: "பதிவு எண், பெயர், மாவட்டம் அல்லது மொபைல் மூலம் தேடுக..."
  },
  "placeholder.remarks": {
    en: "Enter official remarks or reason...",
    ta: "அலுவலகக் குறிப்பு அல்லது காரணத்தை உள்ளிடவும்..."
  },
  "placeholder.searchPages": {
    en: "Search modules, services, reports...",
    ta: "பிரிவுகள், சேவைகள், அறிக்கைகளைத் தேடுக..."
  },
};

/**
 * Universal translation resolver
 */
export function t(key: string, locale: Locale = "en", fallback?: string): string {
  const item = I18N_DICTIONARY[key];
  if (!item) return fallback || key;
  return item[locale] || item.en || fallback || key;
}

/**
 * Returns a bilingual string: "English / தமிழ்" or localized string depending on mode
 */
export function tDual(key: string, fallbackEn?: string, fallbackTa?: string): string {
  const item = I18N_DICTIONARY[key];
  const en = item?.en || fallbackEn || key;
  const ta = item?.ta || fallbackTa || key;
  return `${en} / ${ta}`;
}
