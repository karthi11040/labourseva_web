/**
 * LabourSeva — Notification Content Templates
 * Official bilingual templates for all required system events.
 */
import { NotificationCategory, NotificationTemplateKey } from "../types/notification.types";

export interface TemplateDefinition {
  category: NotificationCategory;
  defaultTitleEn: string;
  defaultTitleTa: string;
  formatBodyEn: (data: Record<string, any>) => string;
  formatBodyTa: (data: Record<string, any>) => string;
  defaultLink?: (data: Record<string, any>) => string;
}

export const NOTIFICATION_TEMPLATES: Record<NotificationTemplateKey, TemplateDefinition> = {
  ACCOUNT_APPROVED: {
    category: "ACCOUNT",
    defaultTitleEn: "Your account has been approved",
    defaultTitleTa: "உங்கள் கணக்கு அங்கீகரிக்கப்பட்டது",
    formatBodyEn: (d) =>
      `Congratulations ${d.name || "Citizen"}! Your LabourSeva account verification is complete and your portal access is now active.`,
    formatBodyTa: (d) =>
      `வாழ்த்துக்கள் ${d.name || ""}! உங்கள் லேபர்சேவா கணக்கு சரிபார்ப்பு நிறைவடைந்து அணுகல் வழங்கப்பட்டுள்ளது.`,
    defaultLink: () => "/user/dashboard",
  },

  ACCOUNT_REJECTED: {
    category: "ACCOUNT",
    defaultTitleEn: "Your account verification request was rejected",
    defaultTitleTa: "கணக்கு சரிபார்ப்பு நிராகரிக்கப்பட்டது",
    formatBodyEn: (d) =>
      `Your verification request could not be approved. Reason: ${d.reason || "Document mismatch"}. Please review your profile and re-submit.`,
    formatBodyTa: (d) =>
      `உங்கள் கணக்கு சரிபார்ப்பு நிராகரிக்கப்பட்டது. காரணம்: ${d.reason || "ஆவண முரண்பாடு"}. சுயவிவரத்தை மீண்டும் சமர்ப்பிக்கவும்.`,
    defaultLink: () => "/user/profile",
  },

  SERVICE_PAYMENT_SUCCESS: {
    category: "PAYMENT",
    defaultTitleEn: "Your service payment was completed",
    defaultTitleTa: "சேவைக் கட்டணம் வெற்றிகரமாக செலுத்தப்பட்டது",
    formatBodyEn: (d) =>
      `Payment of ₹${Number(d.amount || 0).toFixed(2)} received for ${d.serviceName || "Statutory Scheme"} (Ref: ${d.applicationId || d.orderId}).`,
    formatBodyTa: (d) =>
      `${d.serviceName || "திட்டம்"}க்கான கட்டணம் ₹${Number(d.amount || 0).toFixed(2)} வெற்றிகரமாக பெறப்பட்டது (குறிப்பு: ${d.applicationId || d.orderId}).`,
    defaultLink: (d) => d.link || "/user/payments",
  },

  ESERVICE_PAYMENT_SUCCESS: {
    category: "PAYMENT",
    defaultTitleEn: "Your e-service payment was completed",
    defaultTitleTa: "மின்சேவைக் கட்டணம் வெற்றிகரமாக செலுத்தப்பட்டது",
    formatBodyEn: (d) =>
      `Statutory fee of ₹${Number(d.amount || 0).toFixed(2)} received for e-service application ${d.applicationNumber || d.applicationId}. Receipt: ${d.receiptNo || "Generated"}.`,
    formatBodyTa: (d) =>
      `மின்சேவை விண்ணப்பம் ${d.applicationNumber || d.applicationId}க்கான கட்டணம் ₹${Number(d.amount || 0).toFixed(2)} வெற்றிகரமாக செலுத்தப்பட்டது.`,
    defaultLink: () => "/user/es-services",
  },

  APPLICATION_SUBMITTED: {
    category: "APPLICATION",
    defaultTitleEn: "Your application was submitted successfully",
    defaultTitleTa: "விண்ணப்பம் வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது",
    formatBodyEn: (d) =>
      `Your application ${d.applicationId || d.applicationNumber} for "${d.serviceName || "Service"}" has been submitted and queued for departmental verification.`,
    formatBodyTa: (d) =>
      `"${d.serviceName || "சேவை"}"க்கான விண்ணப்பம் ${d.applicationId || d.applicationNumber} அதிகாரப்பூர்வ சரிபார்ப்பிற்கு சமர்ப்பிக்கப்பட்டது.`,
    defaultLink: (d) => d.link || "/user/applications",
  },

  APPLICATION_APPROVED: {
    category: "APPLICATION",
    defaultTitleEn: "Your application has been approved",
    defaultTitleTa: "உங்கள் விண்ணப்பம் அங்கீகரிக்கப்பட்டது",
    formatBodyEn: (d) =>
      `Application ${d.applicationId || d.applicationNumber} (${d.serviceName || "Statutory Certificate"}) has been officially approved by the competent authority.`,
    formatBodyTa: (d) =>
      `விண்ணப்பம் ${d.applicationId || d.applicationNumber} (${d.serviceName || "சான்றிதழ்"}) சம்பந்தப்பட்ட அதிகாரியால் அங்கீகரிக்கப்பட்டது.`,
    defaultLink: (d) => d.link || "/user/applications",
  },

  APPLICATION_REJECTED: {
    category: "APPLICATION",
    defaultTitleEn: "Your application needs attention",
    defaultTitleTa: "உங்கள் விண்ணப்பத்தில் திருத்தம் தேவை",
    formatBodyEn: (d) =>
      `Application ${d.applicationId || d.applicationNumber} requires attention or was rejected. Reason: ${d.reason || "Incomplete documentation"}.`,
    formatBodyTa: (d) =>
      `விண்ணப்பம் ${d.applicationId || d.applicationNumber} பரிசீலனையில் நிறுத்தி வைக்கப்பட்டுள்ளது. காரணம்: ${d.reason || "முழுமையற்ற ஆவணங்கள்"}.`,
    defaultLink: (d) => d.link || "/user/applications",
  },

  ADDITIONAL_INFO_REQUESTED: {
    category: "APPLICATION",
    defaultTitleEn: "Please provide the requested information",
    defaultTitleTa: "கூடுதல் தகவல் தேவைப்படுகிறது",
    formatBodyEn: (d) =>
      `The reviewing officer has requested additional clarification or supporting documents for Application ${d.applicationId || d.applicationNumber}.`,
    formatBodyTa: (d) =>
      `விண்ணப்பம் ${d.applicationId || d.applicationNumber} தொடர்பாக கூடுதல் ஆவணங்கள் அல்லது விளக்கங்களை சமர்ப்பிக்கவும்.`,
    defaultLink: (d) => d.link || "/user/applications",
  },

  SIGNED_DOCUMENT_READY: {
    category: "DOCUMENT",
    defaultTitleEn: "Your signed document is ready to download",
    defaultTitleTa: "கையொப்பமிட்ட சான்றிதழ் தயார்",
    formatBodyEn: (d) =>
      `Your digitally signed certificate for Application ${d.applicationId || d.applicationNumber} (${d.serviceName || "Service"}) is stamped and ready for download.`,
    formatBodyTa: (d) =>
      `விண்ணப்பம் ${d.applicationId || d.applicationNumber}க்கான டிஜிட்டல் கையொப்பமிட்ட சான்றிதழ் பதிவிறக்கத்திற்கு தயாராக உள்ளது.`,
    defaultLink: (d) => d.link || "/user/applications",
  },

  REFUND_PROCESSED: {
    category: "REFUND",
    defaultTitleEn: "Your refund has been processed",
    defaultTitleTa: "ரீஃபண்ட் தொகை செயலாக்கப்பட்டது",
    formatBodyEn: (d) =>
      `A refund of ₹${Number(d.amount || 0).toFixed(2)} for ${d.applicationId || d.orderId} has been credited via ${d.paymentMode || "original payment method"}.`,
    formatBodyTa: (d) =>
      `${d.applicationId || d.orderId}க்கான ரீஃபண்ட் தொகை ₹${Number(d.amount || 0).toFixed(2)} உங்கள் கணக்கிற்கு திரும்ப செலுத்தப்பட்டது.`,
    defaultLink: () => "/user/payments",
  },

  STAFF_APPLICATION_ASSIGNED: {
    category: "ASSIGNMENT",
    defaultTitleEn: "A new application has been assigned to you",
    defaultTitleTa: "புதிய விண்ணப்பம் உங்களுக்கு ஒதுக்கப்பட்டுள்ளது",
    formatBodyEn: (d) =>
      `New application ${d.applicationId || d.applicationNumber} (${d.serviceName || "Service"}) has been assigned to your verification queue.`,
    formatBodyTa: (d) =>
      `சரிபார்ப்புக்காக புதிய விண்ணப்பம் ${d.applicationId || d.applicationNumber} உங்கள் வரிசையில் ஒதுக்கப்பட்டுள்ளது.`,
    defaultLink: () => "/admin/applications",
  },

  SERVICE_CONFIRMED: {
    category: "APPLICATION",
    defaultTitleEn: "Service Request Confirmed",
    defaultTitleTa: "சேவை கோரிக்கை உறுதிப்படுத்தப்பட்டது",
    formatBodyEn: (d) =>
      `Your service request ${d.applicationId || d.applicationNumber} for ${d.serviceName || "Scheme"} is confirmed.`,
    formatBodyTa: (d) =>
      `சேவை கோரிக்கை ${d.applicationId || d.applicationNumber} உறுதிப்படுத்தப்பட்டது.`,
    defaultLink: () => "/user/applications",
  },

  DOCUMENT_UPLOADED: {
    category: "DOCUMENT",
    defaultTitleEn: "Document Uploaded — Under Review",
    defaultTitleTa: "ஆவணம் பதிவேற்றப்பட்டது — பரிசீலனையில்",
    formatBodyEn: (d) =>
      `Supporting documents for Application ${d.applicationId || d.applicationNumber} have been uploaded and queued for verification.`,
    formatBodyTa: (d) =>
      `விண்ணப்பம் ${d.applicationId || d.applicationNumber}க்கான ஆவணங்கள் பதிவேற்றப்பட்டு பரிசீலனையில் உள்ளன.`,
    defaultLink: () => "/user/applications",
  },
};
