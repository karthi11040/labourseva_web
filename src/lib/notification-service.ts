/**
 * LabourSeva — Unified Notification Service
 * Orchestrates Email, SMS, In-App Notifications, and Outbox Tracking.
 */
import { prisma } from "@/lib/prisma";
import { sendEmail, type EmailAttachment } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import * as templates from "@/lib/email-templates";

export interface NotificationLogResult {
  emailSent: boolean;
  smsSent: boolean;
  inAppSaved: boolean;
  errors?: string[];
}

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://labourseva.com").replace(/\/$/, "");

/**
 * Helper to record notification in database outbox/notifications table safely
 */
async function logNotificationRecord(params: {
  userId?: string | number | null;
  channel: "EMAIL" | "SMS" | "INAPP";
  templateKey: string;
  recipient: string;
  status: "QUEUED" | "SENT" | "DELIVERED" | "FAILED";
  title: string;
  body: string;
  payload?: Record<string, any>;
  error?: string;
}) {
  try {
    const rawUserId = params.userId ? String(params.userId) : null;
    const payloadStr = JSON.stringify({
      title: params.title,
      body: params.body,
      recipient: params.recipient,
      ...(params.payload || {}),
    });

    await prisma.$executeRawUnsafe(
      `INSERT INTO \`notifications\` 
        (\`userId\`, \`channel\`, \`templateKey\`, \`language\`, \`status\`, \`error\`, \`payload\`, \`createdAt\`, \`sentAt\`)
       VALUES (?, ?, ?, 'EN', ?, ?, ?, NOW(3), NOW(3))`,
      rawUserId || "1",
      params.channel,
      params.templateKey,
      params.status,
      params.error || null,
      payloadStr
    );
  } catch (err: any) {
    // Non-blocking log failure
    console.warn("[Notification Log Warning]: Could not persist notification record:", err?.message || err);
  }
}

// ===========================================================================
// 1. ACCOUNT VERIFICATION & AUTH NOTIFICATIONS
// ===========================================================================

/**
 * Mandatory Requirement: When account is approved by admin/staff,
 * MUST dispatch BOTH Email AND SMS!
 */
export async function dispatchAccountApprovedNotification(params: {
  userId: string | number;
  name: string;
  email: string;
  phone?: string;
  userType: string;
}): Promise<NotificationLogResult> {
  const errors: string[] = [];
  let emailSent = false;
  let smsSent = false;

  const loginUrl = `${APP_URL}/user/login`;
  const emailRender = templates.renderAccountApprovedEmail({
    name: params.name,
    userType: params.userType,
    loginUrl,
  });

  // 1. Dispatch Email
  if (params.email) {
    try {
      const emailRes = await sendEmail({
        to: params.email,
        subject: emailRender.subject,
        html: emailRender.html,
        text: emailRender.text,
      });
      emailSent = emailRes.success;
      await logNotificationRecord({
        userId: params.userId,
        channel: "EMAIL",
        templateKey: "ACCOUNT_APPROVED",
        recipient: params.email,
        status: emailRes.success ? "DELIVERED" : "FAILED",
        title: emailRender.subject,
        body: "Your LabourSeva account has been verified and approved.",
        error: emailRes.error,
      });
      if (!emailRes.success) errors.push(`Email error: ${emailRes.error}`);
    } catch (e: any) {
      errors.push(`Email exception: ${e?.message}`);
    }
  }

  // 2. Dispatch SMS
  if (params.phone) {
    const smsMessage = `Your account has been verified successfully. You can now sign in and use the available services. Visit ${APP_URL}`;
    try {
      const smsRes = await sendSms({
        mobile: params.phone,
        message: smsMessage,
      });
      smsSent = smsRes.success;
      await logNotificationRecord({
        userId: params.userId,
        channel: "SMS",
        templateKey: "ACCOUNT_APPROVED_SMS",
        recipient: params.phone,
        status: smsRes.success ? "DELIVERED" : "FAILED",
        title: "Account Approved SMS",
        body: smsMessage,
        error: smsRes.error,
      });
      if (!smsRes.success) errors.push(`SMS error: ${smsRes.error}`);
    } catch (e: any) {
      errors.push(`SMS exception: ${e?.message}`);
    }
  }

  return { emailSent, smsSent, inAppSaved: true, errors };
}

/**
 * Dispatches Account Rejected Notification
 */
export async function dispatchAccountRejectedNotification(params: {
  userId: string | number;
  name: string;
  email: string;
  userType: string;
  reason: string;
  resubmitUrl?: string;
}): Promise<NotificationLogResult> {
  let emailSent = false;
  const resubmitUrl = params.resubmitUrl || `${APP_URL}/user/profile`;

  const emailRender = templates.renderAccountRejectedEmail({
    name: params.name,
    userType: params.userType,
    reason: params.reason,
    resubmitUrl,
  });

  if (params.email) {
    const res = await sendEmail({
      to: params.email,
      subject: emailRender.subject,
      html: emailRender.html,
      text: emailRender.text,
    });
    emailSent = res.success;
    await logNotificationRecord({
      userId: params.userId,
      channel: "EMAIL",
      templateKey: "ACCOUNT_REJECTED",
      recipient: params.email,
      status: res.success ? "DELIVERED" : "FAILED",
      title: emailRender.subject,
      body: `Account verification rejected: ${params.reason}`,
      error: res.error,
    });
  }

  return { emailSent, smsSent: false, inAppSaved: true };
}

/**
 * Dispatches Additional Information Requested Notification
 */
export async function dispatchAdditionalInfoRequestedNotification(params: {
  userId: string | number;
  name: string;
  email: string;
  userType: string;
  requestedInfo: string;
  resubmitUrl?: string;
}): Promise<NotificationLogResult> {
  let emailSent = false;
  const resubmitUrl = params.resubmitUrl || `${APP_URL}/user/profile`;

  const emailRender = templates.renderAdditionalInfoRequestedEmail({
    name: params.name,
    userType: params.userType,
    requestedInfo: params.requestedInfo,
    resubmitUrl,
  });

  if (params.email) {
    const res = await sendEmail({
      to: params.email,
      subject: emailRender.subject,
      html: emailRender.html,
      text: emailRender.text,
    });
    emailSent = res.success;
    await logNotificationRecord({
      userId: params.userId,
      channel: "EMAIL",
      templateKey: "ADDITIONAL_INFO_REQUESTED",
      recipient: params.email,
      status: res.success ? "DELIVERED" : "FAILED",
      title: emailRender.subject,
      body: `Additional information requested: ${params.requestedInfo}`,
      error: res.error,
    });
  }

  return { emailSent, smsSent: false, inAppSaved: true };
}

/**
 * Dispatches Email Verification Link
 */
export async function dispatchEmailVerificationNotification(params: {
  name: string;
  email: string;
  verifyUrl: string;
  expiryHours?: number;
}): Promise<boolean> {
  const emailRender = templates.renderEmailVerificationEmail({
    name: params.name,
    verifyUrl: params.verifyUrl,
    expiryHours: params.expiryHours,
  });

  const res = await sendEmail({
    to: params.email,
    subject: emailRender.subject,
    html: emailRender.html,
    text: emailRender.text,
  });

  await logNotificationRecord({
    channel: "EMAIL",
    templateKey: "EMAIL_VERIFICATION",
    recipient: params.email,
    status: res.success ? "DELIVERED" : "FAILED",
    title: emailRender.subject,
    body: "Please verify your email address.",
    error: res.error,
  });

  return res.success;
}

/**
 * Dispatches Password Reset Link
 */
export async function dispatchPasswordResetNotification(params: {
  name: string;
  email: string;
  resetUrl: string;
  expiryMinutes?: number;
}): Promise<boolean> {
  const emailRender = templates.renderPasswordResetEmail({
    name: params.name,
    resetUrl: params.resetUrl,
    expiryMinutes: params.expiryMinutes,
  });

  const res = await sendEmail({
    to: params.email,
    subject: emailRender.subject,
    html: emailRender.html,
    text: emailRender.text,
  });

  await logNotificationRecord({
    channel: "EMAIL",
    templateKey: "PASSWORD_RESET",
    recipient: params.email,
    status: res.success ? "DELIVERED" : "FAILED",
    title: emailRender.subject,
    body: "Password reset instructions sent.",
    error: res.error,
  });

  return res.success;
}

/**
 * Dispatches Password Changed Security Alert
 */
export async function dispatchPasswordChangedNotification(params: {
  name: string;
  email: string;
  timestamp?: string;
}): Promise<boolean> {
  const emailRender = templates.renderPasswordChangedEmail({
    name: params.name,
    timestamp: params.timestamp,
  });

  const res = await sendEmail({
    to: params.email,
    subject: emailRender.subject,
    html: emailRender.html,
    text: emailRender.text,
  });

  await logNotificationRecord({
    channel: "EMAIL",
    templateKey: "PASSWORD_CHANGED",
    recipient: params.email,
    status: res.success ? "DELIVERED" : "FAILED",
    title: emailRender.subject,
    body: "Password changed successfully.",
    error: res.error,
  });

  return res.success;
}

// ===========================================================================
// 2. PAYMENT CONFIRMATIONS & RECEIPTS
// ===========================================================================

/**
 * Mandatory Requirement: On verified payment success:
 * Dispatches PDF receipt email AND short purchase confirmation SMS!
 */
export async function dispatchPaymentSuccessNotification(params: {
  userId?: string | number;
  name: string;
  email?: string;
  phone?: string;
  serviceName: string;
  applicationRef: string;
  receiptNo: string;
  amount: number;
  paymentId: string;
  date?: string;
  serviceType: "DOCUMENT_SERVICE" | "E_SERVICE";
  pdfBuffer?: Buffer;
}): Promise<NotificationLogResult> {
  const errors: string[] = [];
  let emailSent = false;
  let smsSent = false;

  const dateStr = params.date || new Date().toLocaleDateString("en-IN", { dateStyle: "medium" });
  const viewUrl = `${APP_URL}/user/payments`;

  // 1. Email with PDF attachment if provided
  if (params.email) {
    const isDoc = params.serviceType === "DOCUMENT_SERVICE";
    const emailRender = isDoc
      ? templates.renderDocumentServicePaymentReceiptEmail({
          name: params.name,
          serviceName: params.serviceName,
          applicationRef: params.applicationRef,
          receiptNo: params.receiptNo,
          amount: params.amount,
          paymentId: params.paymentId,
          date: dateStr,
          downloadUrl: viewUrl,
        })
      : templates.renderEServicePaymentReceiptEmail({
          name: params.name,
          serviceName: params.serviceName,
          applicationRef: params.applicationRef,
          receiptNo: params.receiptNo,
          amount: params.amount,
          paymentId: params.paymentId,
          date: dateStr,
          trackingUrl: viewUrl,
        });

    const attachments: EmailAttachment[] = [];
    if (params.pdfBuffer) {
      attachments.push({
        filename: `Receipt-${params.receiptNo}.pdf`,
        content: params.pdfBuffer,
        contentType: "application/pdf",
      });
    }

    try {
      const emailRes = await sendEmail({
        to: params.email,
        subject: emailRender.subject,
        html: emailRender.html,
        text: emailRender.text,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      emailSent = emailRes.success;
      await logNotificationRecord({
        userId: params.userId,
        channel: "EMAIL",
        templateKey: "PAYMENT_RECEIPT",
        recipient: params.email,
        status: emailRes.success ? "DELIVERED" : "FAILED",
        title: emailRender.subject,
        body: `Payment of ₹${params.amount.toFixed(2)} confirmed for ${params.serviceName}.`,
        payload: { receiptNo: params.receiptNo, paymentId: params.paymentId },
        error: emailRes.error,
      });
      if (!emailRes.success) errors.push(`Email error: ${emailRes.error}`);
    } catch (e: any) {
      errors.push(`Email exception: ${e?.message}`);
    }
  }

  // 2. Short Purchase Confirmation SMS
  if (params.phone) {
    const smsMessage = `Payment successful! Your application for ${params.serviceName.slice(0, 30)} has been recorded. Amount: Rs.${params.amount.toFixed(2)}. Ref: ${params.applicationRef}. Check labourseva.com for details.`;
    try {
      const smsRes = await sendSms({
        mobile: params.phone,
        message: smsMessage,
      });
      smsSent = smsRes.success;
      await logNotificationRecord({
        userId: params.userId,
        channel: "SMS",
        templateKey: "PAYMENT_CONFIRMATION_SMS",
        recipient: params.phone,
        status: smsRes.success ? "DELIVERED" : "FAILED",
        title: "Payment Confirmation SMS",
        body: smsMessage,
        payload: { receiptNo: params.receiptNo, paymentId: params.paymentId },
        error: smsRes.error,
      });
      if (!smsRes.success) errors.push(`SMS error: ${smsRes.error}`);
    } catch (e: any) {
      errors.push(`SMS exception: ${e?.message}`);
    }
  }

  return { emailSent, smsSent, inAppSaved: true, errors };
}

// ===========================================================================
// 3. SERVICE APPLICATION APPROVAL (NO OTP REQUEST!)
// ===========================================================================

/**
 * Mandatory Requirement: When staff approves document-service or e-service,
 * send application approval email (WITHOUT ANY OTP!).
 */
export async function dispatchServiceApplicationApprovedNotification(params: {
  userId?: string | number;
  name: string;
  email?: string;
  serviceName: string;
  applicationRef: string;
  approvedDate?: string;
  serviceType: "DOCUMENT_SERVICE" | "E_SERVICE";
}): Promise<NotificationLogResult> {
  let emailSent = false;
  const approvedDate = params.approvedDate || new Date().toLocaleDateString("en-IN", { dateStyle: "medium" });
  const viewUrl = `${APP_URL}/user/applications`;

  if (params.email) {
    const isDoc = params.serviceType === "DOCUMENT_SERVICE";
    const emailRender = isDoc
      ? templates.renderDocumentServiceApplicationApprovedEmail({
          name: params.name,
          serviceName: params.serviceName,
          applicationRef: params.applicationRef,
          approvedDate,
          downloadUrl: viewUrl,
        })
      : templates.renderEServiceApplicationApprovedEmail({
          name: params.name,
          serviceName: params.serviceName,
          applicationRef: params.applicationRef,
          approvedDate,
          statusUrl: viewUrl,
        });

    const res = await sendEmail({
      to: params.email,
      subject: emailRender.subject,
      html: emailRender.html,
      text: emailRender.text,
    });
    emailSent = res.success;

    await logNotificationRecord({
      userId: params.userId,
      channel: "EMAIL",
      templateKey: "APPLICATION_APPROVED",
      recipient: params.email,
      status: res.success ? "DELIVERED" : "FAILED",
      title: emailRender.subject,
      body: `Your application for ${params.serviceName} (${params.applicationRef}) has been approved.`,
      payload: { applicationRef: params.applicationRef, serviceType: params.serviceType },
      error: res.error,
    });
  }

  return { emailSent, smsSent: false, inAppSaved: true };
}

/**
 * Dispatches Signed Document Ready Notification
 */
export async function dispatchSignedDocumentReadyNotification(params: {
  userId?: string | number;
  name: string;
  email?: string;
  serviceName: string;
  applicationRef: string;
  downloadUrl?: string;
}): Promise<NotificationLogResult> {
  let emailSent = false;
  const downloadUrl = params.downloadUrl || `${APP_URL}/user/applications`;

  if (params.email) {
    const emailRender = templates.renderSignedDocumentReadyEmail({
      name: params.name,
      serviceName: params.serviceName,
      applicationRef: params.applicationRef,
      downloadUrl,
    });

    const res = await sendEmail({
      to: params.email,
      subject: emailRender.subject,
      html: emailRender.html,
      text: emailRender.text,
    });
    emailSent = res.success;

    await logNotificationRecord({
      userId: params.userId,
      channel: "EMAIL",
      templateKey: "SIGNED_DOCUMENT_READY",
      recipient: params.email,
      status: res.success ? "DELIVERED" : "FAILED",
      title: emailRender.subject,
      body: `Official signed certificate for ${params.serviceName} is ready for download.`,
      payload: { applicationRef: params.applicationRef },
      error: res.error,
    });
  }

  return { emailSent, smsSent: false, inAppSaved: true };
}

/**
 * Dispatches Application Rejected Notification
 */
export async function dispatchApplicationRejectedNotification(params: {
  userId?: string | number;
  name: string;
  email?: string;
  serviceName: string;
  applicationRef: string;
  reason: string;
  appealUrl?: string;
}): Promise<NotificationLogResult> {
  let emailSent = false;
  const appealUrl = params.appealUrl || `${APP_URL}/user/applications`;

  if (params.email) {
    const emailRender = templates.renderApplicationRejectedEmail({
      name: params.name,
      serviceName: params.serviceName,
      applicationRef: params.applicationRef,
      reason: params.reason,
      supportUrl: appealUrl,
    });

    const res = await sendEmail({
      to: params.email,
      subject: emailRender.subject,
      html: emailRender.html,
      text: emailRender.text,
    });
    emailSent = res.success;

    await logNotificationRecord({
      userId: params.userId,
      channel: "EMAIL",
      templateKey: "APPLICATION_REJECTED",
      recipient: params.email,
      status: res.success ? "DELIVERED" : "FAILED",
      title: emailRender.subject,
      body: `Your application for ${params.serviceName} (${params.applicationRef}) was rejected: ${params.reason}`,
      payload: { applicationRef: params.applicationRef, reason: params.reason },
      error: res.error,
    });
  }

  return { emailSent, smsSent: false, inAppSaved: true };
}

/**
 * Dispatches Application Additional Information Requested Notification
 */
export async function dispatchApplicationInformationRequestedNotification(params: {
  userId?: string | number;
  name: string;
  email?: string;
  serviceName: string;
  applicationRef: string;
  instructions: string;
  resubmitUrl?: string;
}): Promise<NotificationLogResult> {
  let emailSent = false;
  const resubmitUrl = params.resubmitUrl || `${APP_URL}/user/applications`;

  if (params.email) {
    const emailRender = templates.renderApplicationInfoRequestedEmail({
      name: params.name,
      serviceName: params.serviceName,
      applicationRef: params.applicationRef,
      instructions: params.instructions,
      resubmitUrl,
    });

    const res = await sendEmail({
      to: params.email,
      subject: emailRender.subject,
      html: emailRender.html,
      text: emailRender.text,
    });
    emailSent = res.success;

    await logNotificationRecord({
      userId: params.userId,
      channel: "EMAIL",
      templateKey: "APPLICATION_INFO_REQUESTED",
      recipient: params.email,
      status: res.success ? "DELIVERED" : "FAILED",
      title: emailRender.subject,
      body: `Additional documentation requested for ${params.serviceName} (${params.applicationRef}): ${params.instructions}`,
      payload: { applicationRef: params.applicationRef, instructions: params.instructions },
      error: res.error,
    });
  }

  return { emailSent, smsSent: false, inAppSaved: true };
}

/**
 * Dispatches verified top-up success notification with attached official PDF receipt
 */
export async function dispatchRetailerWalletSuccessNotification(params: {
  retailerId: number | string;
  name: string;
  shopName?: string;
  registrationNo?: string;
  email?: string;
  phone?: string;
  amount: number;
  newBalance: number;
  paymentId: string;
  orderId?: string;
  receiptNo: string;
  pdfBuffer?: Buffer;
  date?: string;
}): Promise<NotificationLogResult> {
  const errors: string[] = [];
  let emailSent = false;
  let smsSent = false;

  const dateStr = params.date || new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  const walletUrl = `${APP_URL}/retailer/wallet`;

  if (params.email) {
    const emailRender = templates.renderRetailerWalletTopupSuccessEmail({
      name: params.name,
      shopName: params.shopName,
      registrationNo: params.registrationNo,
      receiptNo: params.receiptNo,
      amount: params.amount,
      newBalance: params.newBalance,
      paymentId: params.paymentId,
      orderId: params.orderId,
      date: dateStr,
      walletUrl,
    });

    const attachments: EmailAttachment[] = [];
    if (params.pdfBuffer) {
      attachments.push({
        filename: `Receipt-${params.receiptNo}.pdf`,
        content: params.pdfBuffer,
        contentType: "application/pdf",
      });
    }

    try {
      const emailRes = await sendEmail({
        to: params.email,
        subject: emailRender.subject,
        html: emailRender.html,
        text: emailRender.text,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      emailSent = emailRes.success;
      if (!emailRes.success) errors.push(emailRes.error || "Email delivery failed");
    } catch (e: any) {
      errors.push(e.message);
    }
  }

  if (params.phone) {
    try {
      const smsRes = await sendSms({
        mobile: params.phone,
        message: `LabourSeva Kendra: ₹${params.amount.toFixed(2)} successfully credited to your wallet. Ref: ${params.paymentId}. New Balance: ₹${params.newBalance.toFixed(2)}. Download receipt at ${walletUrl}`,
      });
      smsSent = smsRes.success;
    } catch {
      // Non-blocking SMS
    }
  }

  return { emailSent, smsSent, inAppSaved: true, errors };
}

/**
 * Dispatches top-up initiated / pending verification notification
 */
export async function dispatchRetailerWalletPendingNotification(params: {
  retailerId: number | string;
  name: string;
  shopName?: string;
  registrationNo?: string;
  email?: string;
  amount: number;
  orderId: string;
  date?: string;
}): Promise<{ emailSent: boolean }> {
  let emailSent = false;
  const dateStr = params.date || new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  const walletUrl = `${APP_URL}/retailer/wallet`;

  if (params.email) {
    const emailRender = templates.renderRetailerWalletTopupPendingEmail({
      name: params.name,
      shopName: params.shopName,
      registrationNo: params.registrationNo,
      orderId: params.orderId,
      amount: params.amount,
      date: dateStr,
      walletUrl,
    });

    try {
      const res = await sendEmail({
        to: params.email,
        subject: emailRender.subject,
        html: emailRender.html,
        text: emailRender.text,
      });
      emailSent = res.success;
    } catch {
      // Non-blocking
    }
  }

  return { emailSent };
}

/**
 * Dispatches top-up failure notification
 */
export async function dispatchRetailerWalletFailureNotification(params: {
  retailerId: number | string;
  name: string;
  shopName?: string;
  registrationNo?: string;
  email?: string;
  phone?: string;
  amount: number;
  reason: string;
  orderId?: string;
  paymentId?: string;
  errorCode?: string;
  date?: string;
}): Promise<{ emailSent: boolean }> {
  let emailSent = false;
  const dateStr = params.date || new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  const retryUrl = `${APP_URL}/retailer/wallet`;

  if (params.email) {
    const emailRender = templates.renderRetailerWalletTopupFailureEmail({
      name: params.name,
      shopName: params.shopName,
      registrationNo: params.registrationNo,
      orderId: params.orderId,
      paymentId: params.paymentId,
      amount: params.amount,
      reason: params.reason,
      errorCode: params.errorCode,
      date: dateStr,
      retryUrl,
    });

    try {
      const res = await sendEmail({
        to: params.email,
        subject: emailRender.subject,
        html: emailRender.html,
        text: emailRender.text,
      });
      emailSent = res.success;
    } catch {
      // Non-blocking
    }
  }

  return { emailSent };
}

