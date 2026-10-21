import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";
import { ensurePaymentAttemptColumns } from "./payment-db-sync";
import {
  DISPLAY_STATUSES,
  normalizeErrorReason,
  resolveDisplayStatus,
  maskPaymentMethod,
  type PaymentDisplayStatus,
  type RefundOutcomeStatus,
  REFUND_OUTCOMES,
} from "./payment-status-service";

export interface CreateAttemptInput {
  userId: number | string;
  userType?: "citizen" | "retailer";
  serviceType: "DOCUMENT_SERVICE" | "E_SERVICE";
  serviceId: number;
  serviceName: string;
  categoryName?: string;
  amount: number;
  currency?: string;
  razorpayOrderId: string;
  applicantName?: string;
  applicantPhone?: string;
  applicantEmail?: string;
  metadata?: Record<string, any>;
}

export interface RecordSuccessInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature?: string;
  applicationReference: string;
  receiptNo: string;
  paymentMethod?: string;
  methodDetails?: {
    cardLast4?: string;
    cardNetwork?: string;
    cardType?: string;
    bank?: string;
    vpa?: string;
    wallet?: string;
  };
}

export interface RecordFailureInput {
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  errorCode?: string;
  errorReason?: string;
  errorSource?: string;
  errorStep?: string;
  errorDescription?: string;
  isCancelled?: boolean;
  isTimedOut?: boolean;
  metadata?: Record<string, any>;
}

export interface RecordRefundInput {
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  refundId: string;
  amountRefunded: number;
  isFullRefund: boolean;
  reason?: string;
  status: RefundOutcomeStatus;
}

/**
 * Persists an initiated payment attempt when checkout/order is created.
 */
export async function recordPaymentInitiation(input: CreateAttemptInput) {
  await ensurePaymentAttemptColumns();

  const referenceId = `TXN-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const displayStatus: PaymentDisplayStatus = "INITIATED";
  const statusMeta = DISPLAY_STATUSES.INITIATED;

  const metadataJson = JSON.stringify({
    applicantName: input.applicantName || "",
    applicantPhone: input.applicantPhone || "",
    applicantEmail: input.applicantEmail || "",
    ...(input.metadata || {}),
  });

  // Check if attempt for this orderId already exists (idempotency)
  const existing = await prisma.$queryRawUnsafe<any[]>(
    "SELECT * FROM payment_attempts WHERE razorpay_order_id = ? LIMIT 1",
    input.razorpayOrderId
  ).catch(() => []);

  if (existing && existing.length > 0) {
    return existing[0];
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO payment_attempts (
      user_id, txnid, amount, user_type, service_id, customer_id, retail_order_id, product_info,
      reference_id, service_type, service_name, category_name, currency,
      display_status, razorpay_status, razorpay_order_id,
      status_message, suggested_action, metadata, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, 0, ?,
      ?, ?, ?, ?, ?,
      ?, 'created', ?,
      ?, ?, ?, NOW(), NOW()
    )`,
    Number(input.userId) || 1,
    referenceId,
    input.amount,
    input.userType || "citizen",
    input.serviceId,
    Number(input.userId) || 1,
    input.serviceName.slice(0, 255),
    referenceId,
    input.serviceType,
    input.serviceName.slice(0, 255),
    (input.categoryName || "Government Scheme").slice(0, 255),
    input.currency || "INR",
    displayStatus,
    input.razorpayOrderId,
    statusMeta.message,
    "Complete the payment to continue.",
    metadataJson
  );

  const created = await prisma.$queryRawUnsafe<any[]>(
    "SELECT * FROM payment_attempts WHERE razorpay_order_id = ? LIMIT 1",
    input.razorpayOrderId
  ).catch(() => []);

  return created && created.length > 0 ? created[0] : { id: 1, razorpay_order_id: input.razorpayOrderId, display_status: displayStatus };
}

export const createPaymentAttempt = recordPaymentInitiation;

/**
 * Idempotently records a verified captured payment.
 */
export async function recordPaymentSuccess(input: RecordSuccessInput) {
  await ensurePaymentAttemptColumns();

  const masked = maskPaymentMethod(input.paymentMethod || "UPI", input.methodDetails);
  const statusMeta = DISPLAY_STATUSES.SUCCESSFUL;

  await prisma.$executeRawUnsafe(
    `UPDATE payment_attempts
     SET 
       display_status = 'SUCCESSFUL',
       razorpay_status = 'captured',
       razorpay_payment_id = ?,
       payment_method = ?,
       method_details = ?,
       application_reference = ?,
       receipt_no = ?,
       status_message = ?,
       suggested_action = NULL,
       error_code = NULL,
       error_reason = NULL,
       error_description = NULL,
       captured_at = NOW(),
       updated_at = NOW()
     WHERE razorpay_order_id = ?`,
    input.razorpayPaymentId,
    (input.paymentMethod || "UPI").slice(0, 50),
    masked,
    input.applicationReference,
    input.receiptNo,
    statusMeta.message,
    input.razorpayOrderId
  ).catch(() => {});

  const updated = await prisma.$queryRawUnsafe<any[]>(
    "SELECT * FROM payment_attempts WHERE razorpay_order_id = ? LIMIT 1",
    input.razorpayOrderId
  ).catch(() => []);

  return updated && updated.length > 0 ? updated[0] : { razorpay_order_id: input.razorpayOrderId, razorpay_payment_id: input.razorpayPaymentId, display_status: "SUCCESSFUL" };
}

/**
 * Idempotently records a failed or cancelled payment attempt.
 */
export async function recordPaymentFailure(input: RecordFailureInput) {
  await ensurePaymentAttemptColumns();

  let displayStatus: PaymentDisplayStatus = "FAILED";
  if (input.isCancelled) {
    displayStatus = "CANCELLED";
  } else if (input.isTimedOut) {
    displayStatus = "TIMED_OUT";
  }

  const normalizedError = normalizeErrorReason(
    input.errorReason,
    input.errorCode,
    input.errorDescription
  );

  const statusMeta = DISPLAY_STATUSES[displayStatus];
  const userMessage = input.isCancelled
    ? statusMeta.message
    : normalizedError.userMessage;
  const suggestedAction = input.isCancelled
    ? "Retry the payment when you are ready."
    : normalizedError.suggestedAction;

  await prisma.$executeRawUnsafe(
    `UPDATE payment_attempts
     SET 
       display_status = ?,
       razorpay_status = ?,
       razorpay_payment_id = COALESCE(?, razorpay_payment_id),
       error_code = ?,
       error_reason = ?,
       error_source = ?,
       error_step = ?,
       error_description = ?,
       status_message = ?,
       suggested_action = ?,
       updated_at = NOW()
     WHERE razorpay_order_id = ?
       AND display_status NOT IN ('SUCCESSFUL', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED', 'CANCELLED', 'TIMED_OUT')`,
    displayStatus,
    input.isCancelled ? "cancelled" : input.isTimedOut ? "timed_out" : "failed",
    input.razorpayPaymentId || null,
    (input.errorCode || "").slice(0, 100),
    normalizedError.reasonCode.slice(0, 150),
    (input.errorSource || "").slice(0, 100),
    (input.errorStep || "").slice(0, 100),
    (input.errorDescription || userMessage).slice(0, 500),
    userMessage,
    suggestedAction,
    input.razorpayOrderId
  ).catch(() => {});

  const updated = await prisma.$queryRawUnsafe<any[]>(
    "SELECT * FROM payment_attempts WHERE razorpay_order_id = ? LIMIT 1",
    input.razorpayOrderId
  ).catch(() => []);

  return updated && updated.length > 0
    ? updated[0]
    : {
        razorpay_order_id: input.razorpayOrderId,
        display_status: displayStatus,
        error_code: input.errorCode,
        error_reason: normalizedError.reasonCode,
        status_message: userMessage,
      };
}

/**
 * Idempotently updates refund information on a payment attempt.
 */
export async function recordPaymentRefund(input: RecordRefundInput) {
  await ensurePaymentAttemptColumns();

  const displayStatus: PaymentDisplayStatus = input.isFullRefund
    ? "REFUNDED"
    : "PARTIALLY_REFUNDED";
  const refundMeta = REFUND_OUTCOMES[input.status] || REFUND_OUTCOMES.PROCESSING;

  if (input.razorpayOrderId) {
    await prisma.$executeRawUnsafe(
      `UPDATE payment_attempts
       SET 
         display_status = ?,
         razorpay_status = 'refunded',
         refund_status = ?,
         refund_amount = ?,
         refund_reference = ?,
         status_message = ?,
         refunded_at = NOW(),
         updated_at = NOW()
       WHERE razorpay_order_id = ?`,
      displayStatus,
      input.status,
      input.amountRefunded,
      input.refundId,
      refundMeta.message,
      input.razorpayOrderId
    ).catch(() => {});
  } else if (input.razorpayPaymentId) {
    await prisma.$executeRawUnsafe(
      `UPDATE payment_attempts
       SET 
         display_status = ?,
         razorpay_status = 'refunded',
         refund_status = ?,
         refund_amount = ?,
         refund_reference = ?,
         status_message = ?,
         refunded_at = NOW(),
         updated_at = NOW()
       WHERE razorpay_payment_id = ?`,
      displayStatus,
      input.status,
      input.amountRefunded,
      input.refundId,
      refundMeta.message,
      input.razorpayPaymentId
    ).catch(() => {});
  }
}

/**
 * Retrieves a payment attempt by Razorpay Order ID.
 */
export async function findPaymentAttemptByOrder(orderId: string) {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    "SELECT * FROM payment_attempts WHERE razorpay_order_id = ? LIMIT 1",
    orderId
  ).catch(() => []);
  return rows && rows.length > 0 ? rows[0] : null;
}
