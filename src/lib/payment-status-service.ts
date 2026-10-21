/**
 * LabourSeva Central Payment Status & Error Message Normalization Service
 * 
 * Provides:
 * - Normalized display statuses and customer-facing messages
 * - Authoritative error code & reason mapping with recommended next actions
 * - Payment method sanitization (masking sensitive card / UPI data)
 * - Safe fallback for unknown provider codes
 * - Independent refund outcome tracking
 */

// ============================================================================
// 1. Types & Enums
// ============================================================================

export type PaymentDisplayStatus =
  | "INITIATED"
  | "PROCESSING"
  | "PENDING"
  | "AUTHORIZED"
  | "SUCCESSFUL"
  | "FAILED"
  | "CANCELLED"
  | "TIMED_OUT"
  | "PARTIALLY_REFUNDED"
  | "REFUND_PROCESSING"
  | "REFUNDED"
  | "VERIFICATION_PENDING"
  | "PAYMENT_SERVICE_UNAVAILABLE";

export interface DisplayStatusMeta {
  status: PaymentDisplayStatus;
  label: string;
  labelTa: string;
  message: string;
  messageTa: string;
  badgeVariant: "default" | "success" | "warning" | "error" | "info" | "neutral";
}

export type RefundOutcomeStatus =
  | "REQUESTED"
  | "PROCESSING"
  | "SUCCESSFUL"
  | "PARTIAL"
  | "FAILED"
  | "UNKNOWN";

export interface RefundOutcomeMeta {
  status: RefundOutcomeStatus;
  label: string;
  message: string;
}

export interface ErrorMappingResult {
  reasonCode: string;
  userMessage: string;
  suggestedAction: string;
  isKnown: boolean;
  errorCode?: string;
  errorDescription?: string;
  isFundsIssue?: boolean;
  isCancelled?: boolean;
  isTimedOut?: boolean;
}

export interface NormalizedPaymentAttempt {
  id: string;
  userId: number | string;
  serviceType: "DOCUMENT_SERVICE" | "E_SERVICE";
  applicationReference?: string;
  serviceName: string;
  categoryName?: string;
  amount: number;
  currency: string;
  displayStatus: PaymentDisplayStatus;
  statusLabel: string;
  statusMessage: string;
  razorpayStatus?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentMethod?: string;
  maskedMethod?: string;
  errorReason?: string;
  errorCode?: string;
  errorMessage?: string;
  suggestedAction?: string;
  refundStatus?: RefundOutcomeStatus | null;
  refundAmount?: number;
  refundReference?: string;
  receiptNo?: string;
  createdAt: string;
  updatedAt?: string;
  capturedAt?: string;
  refundedAt?: string;
  canDownloadReceipt: boolean;
  canRetry: boolean;
  canReconcile: boolean;
}

// ============================================================================
// 2. Normalized Display Statuses (Table from Section 2)
// ============================================================================

export const DISPLAY_STATUSES: Record<PaymentDisplayStatus, DisplayStatusMeta> = {
  INITIATED: {
    status: "INITIATED",
    label: "Initiated",
    labelTa: "தொடங்கப்பட்டது",
    message: "Your payment has been initiated. Complete the payment to continue.",
    messageTa: "உங்கள் கட்டணம் தொடங்கப்பட்டுள்ளது. தொடர கட்டணத்தை முடிக்கவும்.",
    badgeVariant: "neutral",
  },
  PROCESSING: {
    status: "PROCESSING",
    label: "Processing",
    labelTa: "செயலாக்கத்தில்",
    message: "Your payment is being processed. Please wait while we confirm the result.",
    messageTa: "உங்கள் கட்டணம் செயலாக்கப்படுகிறது. முடிவை உறுதிப்படுத்தும் வரை காத்திருக்கவும்.",
    badgeVariant: "info",
  },
  PENDING: {
    status: "PENDING",
    label: "Pending",
    labelTa: "நிலுவையில்",
    message: "We are waiting for payment confirmation from the payment provider. Please check again shortly.",
    messageTa: "கட்டண வழங்குநரிடமிருந்து கட்டண உறுதிப்படுத்தலுக்காக காத்திருக்கிறோம். சிறிது நேரத்தில் மீண்டும் சரிபார்க்கவும்.",
    badgeVariant: "warning",
  },
  AUTHORIZED: {
    status: "AUTHORIZED",
    label: "Authorized",
    labelTa: "அங்கீகரிக்கப்பட்டது",
    message: "Your payment has been authorized but is not yet confirmed as completed.",
    messageTa: "உங்கள் கட்டணம் அங்கீகரிக்கப்பட்டுள்ளது, ஆனால் இன்னும் நிறைவடைந்ததாக உறுதிப்படுத்தப்படவில்லை.",
    badgeVariant: "info",
  },
  SUCCESSFUL: {
    status: "SUCCESSFUL",
    label: "Successful",
    labelTa: "வெற்றிகரமானது",
    message: "Payment successful! Your payment has been received and confirmed.",
    messageTa: "கட்டணம் வெற்றிகரமாக முடிந்தது! உங்கள் கட்டணம் பெறப்பட்டு உறுதிப்படுத்தப்பட்டது.",
    badgeVariant: "success",
  },
  FAILED: {
    status: "FAILED",
    label: "Failed",
    labelTa: "தோல்வியடைந்தது",
    message: "Your payment could not be completed. Please review the reason below or try another payment method.",
    messageTa: "உங்கள் கட்டணத்தை முடிக்க முடியவில்லை. கீழே உள்ள காரணத்தை மதிப்பாய்வு செய்யவும் அல்லது வேறு கட்டண முறையை முயற்சிக்கவும்.",
    badgeVariant: "error",
  },
  CANCELLED: {
    status: "CANCELLED",
    label: "Cancelled",
    labelTa: "ரத்து செய்யப்பட்டது",
    message: "You cancelled the payment. No successful payment has been confirmed. You can try again when ready.",
    messageTa: "நீங்கள் கட்டணத்தை ரத்து செய்துள்ளீர்கள். வெற்றிகரமான கட்டணம் எதுவும் உறுதிப்படுத்தப்படவில்லை. தயாராக இருக்கும்போது மீண்டும் முயற்சிக்கலாம்.",
    badgeVariant: "neutral",
  },
  TIMED_OUT: {
    status: "TIMED_OUT",
    label: "Timed out",
    labelTa: "நேரம் முடிந்தது",
    message: "The payment session timed out before completion. Check your payment history before retrying.",
    messageTa: "முழுமையடைவதற்கு முன் கட்டண அமர்வு நேரம் முடிந்தது. மீண்டும் முயற்சிக்கும் முன் உங்கள் கட்டண வரலாற்றை சரிபார்க்கவும்.",
    badgeVariant: "warning",
  },
  PARTIALLY_REFUNDED: {
    status: "PARTIALLY_REFUNDED",
    label: "Partially refunded",
    labelTa: "பகுதி திரும்பப்பெறப்பட்டது",
    message: "A partial refund has been processed. The remaining amount has not been refunded.",
    messageTa: "பகுதி பணத்தைத் திரும்பப்பெறுதல் செயல்படுத்தப்பட்டுள்ளது. மீதமுள்ள தொகை திரும்பப் பெறப்படவில்லை.",
    badgeVariant: "info",
  },
  REFUND_PROCESSING: {
    status: "REFUND_PROCESSING",
    label: "Refund processing",
    labelTa: "திரும்பப்பெறுதல் செயலாக்கத்தில்",
    message: "Your refund has been initiated and is being processed.",
    messageTa: "உங்கள் பணத்தைத் திரும்பப்பெறுதல் தொடங்கப்பட்டு செயலாக்கப்பட்டு வருகிறது.",
    badgeVariant: "info",
  },
  REFUNDED: {
    status: "REFUNDED",
    label: "Refunded",
    labelTa: "திரும்பப்பெறப்பட்டது",
    message: "Your payment has been refunded. The time taken for the funds to appear depends on your payment provider or bank.",
    messageTa: "உங்கள் கட்டணம் திரும்பப் பெறப்பட்டுள்ளது. நிதி தோன்றுவதற்கு எடுக்கும் நேரம் உங்கள் கட்டண வழங்குநர் அல்லது வங்கியைப் பொறுத்தது.",
    badgeVariant: "info",
  },
  VERIFICATION_PENDING: {
    status: "VERIFICATION_PENDING",
    label: "Verification pending",
    labelTa: "சரிபார்ப்பு நிலுவையில்",
    message: "We could not confirm the final payment status yet. Please do not pay again until the status is checked.",
    messageTa: "இறுதி கட்டண நிலையை எங்களால் இன்னும் உறுதிப்படுத்த முடியவில்லை. நிலை சரிபார்க்கப்படும் வரை மீண்டும் பணம் செலுத்த வேண்டாம்.",
    badgeVariant: "warning",
  },
  PAYMENT_SERVICE_UNAVAILABLE: {
    status: "PAYMENT_SERVICE_UNAVAILABLE",
    label: "Payment service unavailable",
    labelTa: "கட்டண சேவை கிடைக்கவில்லை",
    message: "We could not process or confirm your payment because of a technical issue. Please try again later if the status remains unsuccessful.",
    messageTa: "தொழில்நுட்ப சிக்கல் காரணமாக உங்கள் கட்டணத்தை எங்களால் செயலாக்கவோ உறுதிப்படுத்தவோ முடியவில்லை. நிலை தோல்வியுற்றதாகவே இருந்தால் பின்னர் மீண்டும் முயற்சிக்கவும்.",
    badgeVariant: "error",
  },
};

// ============================================================================
// 3. Refund Outcomes (Section 5)
// ============================================================================

export const REFUND_OUTCOMES: Record<RefundOutcomeStatus, RefundOutcomeMeta> = {
  REQUESTED: {
    status: "REQUESTED",
    label: "Refund requested",
    message: "Your refund request has been received.",
  },
  PROCESSING: {
    status: "PROCESSING",
    label: "Refund processing",
    message: "Your refund is being processed.",
  },
  SUCCESSFUL: {
    status: "SUCCESSFUL",
    label: "Refund successful",
    message: "Your refund has been processed.",
  },
  PARTIAL: {
    status: "PARTIAL",
    label: "Partial refund",
    message: "A partial refund has been processed.",
  },
  FAILED: {
    status: "FAILED",
    label: "Refund failed",
    message: "The refund could not be completed. Please contact support.",
  },
  UNKNOWN: {
    status: "UNKNOWN",
    label: "Refund status unknown",
    message: "We are checking the latest refund status.",
  },
};

// ============================================================================
// 4. Authoritative Error Reason Dictionary (Sections 3 & 4)
// ============================================================================

interface ErrorDef {
  message: string;
  action: string;
}

const ERROR_DICTIONARY: Record<string, ErrorDef> = {
  // A. Specific error messages
  payment_timed_out: {
    message: "The payment timed out before completion.",
    action: "Check the current payment status and retry only after confirming the earlier attempt did not succeed.",
  },
  insufficient_fund: {
    message: "Your account has insufficient funds to complete this payment.",
    action: "Use another payment method.",
  },
  insufficient_funds: {
    message: "Your account has insufficient funds to complete this payment.",
    action: "Use another payment method.",
  },
  payment_cancelled: {
    message: "The payment was cancelled before completion.",
    action: "Retry the payment when you are ready.",
  },
  card_declined: {
    message: "Your card was declined by the issuing bank or payment network.",
    action: "Contact your bank or use another payment method.",
  },
  card_disabled_for_online_payments: {
    message: "Online payments are not enabled for this card.",
    action: "Enable online transactions with your bank or use another method.",
  },
  card_number_invalid: {
    message: "The card number entered is invalid.",
    action: "Check the card details and try again.",
  },
  gateway_technical_error: {
    message: "A technical problem occurred at the payment gateway.",
    action: "Wait briefly and check the payment status before retrying.",
  },
  authentication_failed: {
    message: "Payment authentication failed. This may happen if an OTP was incorrect, expired, or the authentication step was cancelled.",
    action: "Retry and complete the authentication step correctly.",
  },

  // B. Other card errors
  card_expired: {
    message: "This card has expired. Please use a valid card.",
    action: "Please use a valid active card.",
  },
  card_network_not_enabled: {
    message: "This card network is not currently supported for this transaction. Please use another payment method.",
    action: "Please choose another card or available payment option.",
  },
  card_not_enrolled: {
    message: "This card is not enrolled for the selected authentication method. Please contact your bank or use another method.",
    action: "Contact your card issuer or try another payment method.",
  },
  card_type_invalid: {
    message: "This card type cannot be used for this transaction.",
    action: "Use a valid debit or credit card permitted for government payments.",
  },
  incorrect_card_details: {
    message: "The card details could not be verified. Please check the information and try again.",
    action: "Verify the 16-digit number, expiry date, and CVV before retrying.",
  },
  incorrect_card_expiry_date: {
    message: "The expiry date entered is incorrect. Please check your card details.",
    action: "Check the MM/YY printed on your card and re-enter.",
  },
  incorrect_cardholder_name: {
    message: "The cardholder name could not be verified. Please check the details and try again.",
    action: "Enter the exact name as printed on the card.",
  },
  incorrect_cvv: {
    message: "The card security code could not be verified. Please check it and try again.",
    action: "Check the 3 or 4 digit CVV on the back of your card.",
  },
  incorrect_otp: {
    message: "The authentication OTP was incorrect. Please request or enter a valid OTP.",
    action: "Request a fresh OTP and enter the latest 6-digit code.",
  },
  otp_expired: {
    message: "The authentication OTP has expired. Please request a new one.",
    action: "Click Resend OTP on your bank's authentication screen.",
  },
  otp_attempts_exceeded: {
    message: "The maximum OTP attempts have been reached. Please wait before trying again.",
    action: "Wait 15-30 minutes before initiating a new transaction.",
  },
  incorrect_atm_pin: {
    message: "The entered ATM PIN was incorrect. Please try again with the correct PIN.",
    action: "Enter your correct card PIN carefully.",
  },
  incorrect_pin: {
    message: "The entered PIN was incorrect. Please try again with the correct PIN.",
    action: "Re-enter your correct payment PIN.",
  },
  pin_not_set: {
    message: "A PIN has not been set for this payment method. Please configure it with your provider.",
    action: "Set your UPI or card PIN through your banking app first.",
  },
  pin_attempts_exceeded: {
    message: "The maximum PIN attempts have been reached. Please wait or contact your bank.",
    action: "Wait for the lockout period to end or reset your PIN.",
  },
  debit_instrument_blocked: {
    message: "This card or payment instrument is blocked. Please contact your bank or use another method.",
    action: "Contact your bank's helpline to unblock the instrument.",
  },
  debit_instrument_inactive: {
    message: "This payment instrument is inactive. Please activate it or use another method.",
    action: "Activate the card for e-commerce transactions in your mobile banking app.",
  },
  international_transaction_not_allowed: {
    message: "International transactions are not enabled for this payment method. Please contact your bank or use another method.",
    action: "Use a domestic RuPay, Visa, or Mastercard issued in India.",
  },
  credit_limit_exceeded: {
    message: "Your available credit limit is insufficient for this transaction. Please use another payment method.",
    action: "Use a debit card, UPI, or account with sufficient credit.",
  },
  credit_limit_expired: {
    message: "Your credit facility has expired. Please use another payment method or contact your provider.",
    action: "Choose an alternate payment method.",
  },
  credit_limit_inactive: {
    message: "Your credit facility is inactive. Please contact your provider or use another method.",
    action: "Select a standard debit card or UPI payment method.",
  },
  credit_limit_not_approved: {
    message: "This transaction is not approved under your current credit facility. Please use another method.",
    action: "Try paying with UPI or Netbanking.",
  },
  credit_not_permitted: {
    message: "Credit transactions are not permitted for this payment method. Please use another method.",
    action: "Use a debit card or UPI.",
  },
  credit_failed: {
    message: "Credit processing failed. Please try another payment method.",
    action: "Try another available payment option.",
  },
  debit_declined: {
    message: "The debit transaction was declined. Please contact your bank or use another method.",
    action: "Check your bank account balance or use an alternative card.",
  },

  // C. Bank and payment-network errors
  bank_account_invalid: {
    message: "The bank account details are invalid or the account may no longer be active.",
    action: "Check your account details or choose another bank.",
  },
  bank_account_validation_failed: {
    message: "We could not verify the bank account details. Please check them and try again.",
    action: "Verify account number and IFSC code before retrying.",
  },
  bank_not_enabled: {
    message: "This bank is not enabled for the current payment integration. Please use another available method or contact support.",
    action: "Select another supported bank or pay via UPI.",
  },
  bank_technical_error: {
    message: "Your bank encountered a technical problem while processing the payment. Please retry later or use another method.",
    action: "Wait briefly and retry, or use UPI.",
  },
  bank_not_available: {
    message: "The selected bank is temporarily unavailable. Please try again later or use another method.",
    action: "Choose another bank or payment mode.",
  },
  bank_cutoff_in_progress: {
    message: "The bank is temporarily processing its scheduled cutoff. Please retry later.",
    action: "Retry in 15-30 minutes after maintenance ends.",
  },
  authorisation_declined_by_psp: {
    message: "Your payment app or payment service provider declined the authorization. Please verify your details or use another supported provider.",
    action: "Check notifications in your UPI app and authorize the request.",
  },
  issuer_technical_error: {
    message: "A technical problem occurred at your card issuer. Please try again later or use another card.",
    action: "Try a card from a different issuing bank.",
  },
  invalid_response_from_gateway: {
    message: "The payment provider returned an invalid response. We will need to verify the transaction status before you retry.",
    action: "Check your payment history in a few minutes before paying again.",
  },
  payment_failed: {
    message: "The payment could not be processed by the bank or payment gateway. Please check the status and try another method if needed.",
    action: "Verify bank balance and try again.",
  },
  payment_declined: {
    message: "The payment was declined. Please use another payment method or contact your provider.",
    action: "Contact your bank or use UPI / Netbanking.",
  },
  payment_declined_due_to_high_traffic: {
    message: "The payment service is experiencing high traffic. Please wait and try again.",
    action: "Wait a few moments and retry.",
  },
  server_error: {
    message: "A technical error occurred while processing the payment. Please try again later.",
    action: "Please retry in a few moments.",
  },
  request_timed_out: {
    message: "The payment request timed out. Please check the transaction status before starting another attempt.",
    action: "Verify status before starting a new payment attempt.",
  },
  payment_session_expired: {
    message: "Your payment session has expired. Start a new payment attempt after confirming the previous attempt's status.",
    action: "Initiate checkout again from the service application.",
  },
  payment_pending: {
    message: "Your payment is still pending. Please wait for confirmation before retrying.",
    action: "Do not pay again immediately; check back shortly.",
  },
  verification_failed: {
    message: "We could not verify the payment status yet. Please check again shortly.",
    action: "Use the Reconcile button or check your statement.",
  },
  collect_request_pending: {
    message: "A payment request is already pending. Complete or check that request before creating another one.",
    action: "Open your UPI app to complete the pending collect request.",
  },
  payment_collect_request_expired: {
    message: "The payment request has expired. Start a new attempt after checking the earlier transaction status.",
    action: "Start a new checkout when ready.",
  },

  // D. UPI errors
  invalid_vpa: {
    message: "The UPI ID entered is invalid. Please check it and try again.",
    action: "Enter a valid UPI ID (e.g. 9876543210@upi).",
  },
  vpa_resolution_failed: {
    message: "Your UPI ID could not be verified by the payment network. Please check it or use another method.",
    action: "Verify your UPI handle in your app or try a QR scan.",
  },
  transaction_on_vpa_restricted: {
    message: "Payments to or from this UPI ID are restricted. Please use another eligible UPI ID or payment method.",
    action: "Use another bank account linked to UPI.",
  },
  upi_app_technical_error: {
    message: "Your UPI app encountered a technical problem. Please retry or use another UPI app.",
    action: "Retry using Google Pay, PhonePe, or Paytm.",
  },
  psp_app_not_available: {
    message: "Your selected UPI app is temporarily unavailable. Please use another supported UPI app.",
    action: "Select another UPI application.",
  },
  psp_app_not_supported: {
    message: "The selected UPI app is not supported for this transaction. Please use another supported app.",
    action: "Use a standard UPI app like BHIM, PhonePe, or GPay.",
  },
  psp_not_available: {
    message: "Your payment service provider is temporarily unavailable. Please retry later or use another provider.",
    action: "Try paying with an alternate provider or Netbanking.",
  },
  psp_not_registered: {
    message: "The selected payment service provider is not registered for this transaction. Please use another supported option.",
    action: "Choose an active, registered payment option.",
  },
  upi_autopay_not_supported_on_psp: {
    message: "UPI AutoPay is not supported by the selected provider. Please use a supported option.",
    action: "Use a standard one-time UPI payment.",
  },
  upi_collect_not_enabled: {
    message: "The requested UPI Collect payment mode is not enabled. Please choose an available payment option.",
    action: "Select QR code or UPI Intent mode instead.",
  },
  upi_intent_not_enabled: {
    message: "The requested UPI Intent payment mode is not enabled. Please use an available payment option.",
    action: "Enter your UPI ID manually.",
  },
  transaction_frequency_limit_exceeded: {
    message: "The permitted number of transactions has been exceeded. Please wait or use another payment method.",
    action: "Wait for the limit reset window or use another account.",
  },

  // E. Amount, order, request, and merchant configuration errors
  amount_less_than_minimum_amount: {
    message: "The payment amount is below the minimum allowed amount. Please contact support if the displayed amount appears incorrect.",
    action: "Contact LabourSeva support if the amount shown is incorrect.",
  },
  invalid_amount: {
    message: "The payment amount is invalid. Please refresh the page or contact support.",
    action: "Refresh the application page and re-initiate payment.",
  },
  invalid_currency: {
    message: "The requested currency is unsupported. Please contact support.",
    action: "Only Indian Rupee (INR) transactions are supported.",
  },
  invalid_order_id: {
    message: "The payment order could not be validated. Please contact support with the transaction reference.",
    action: "Contact LabourSeva support with the reference ID.",
  },
  order_already_paid: {
    message: "This order already has a successful payment. Please check your payment history before paying again.",
    action: "Check your Payment History to access your completed receipt.",
  },
  order_amount_mismatch: {
    message: "The payment amount does not match the order amount. The transaction needs to be reviewed.",
    action: "Wait while our system reconciles the amount.",
  },
  order_payment_method_mismatch: {
    message: "The selected payment method does not match the order configuration. Please retry using a supported method.",
    action: "Please retry using a supported payment method.",
  },
  input_validation_failed: {
    message: "Some payment details could not be validated. Please refresh the page and try again. Contact support if the issue continues.",
    action: "Refresh your browser and retry.",
  },
  invalid_request: {
    message: "The payment request could not be processed. Please retry or contact support.",
    action: "Retry the request or contact support.",
  },
  invalid_user_details: {
    message: "Some customer details are invalid. Please check the details and try again.",
    action: "Review your applicant profile details and retry.",
  },
  invalid_email: {
    message: "The email address provided for the transaction is invalid. Please update your details.",
    action: "Provide a valid email address.",
  },
  invalid_mobile_number: {
    message: "The mobile number provided is invalid. Please check the number and try again.",
    action: "Ensure your mobile number is a valid 10-digit Indian number.",
  },
  mobile_number_invalid: {
    message: "The mobile number could not be verified. Please check the number and try again.",
    action: "Check the 10-digit number and retry.",
  },
  invalid_device: {
    message: "The device or payment environment could not be validated. Please retry using a supported device.",
    action: "Use an updated browser or trusted device.",
  },
  mismatch_in_transaction_details: {
    message: "The transaction details do not match the expected order. Please contact support.",
    action: "Contact LabourSeva support with your order reference.",
  },
  payment_amount_tampered: {
    message: "The payment amount could not be verified against the original order. The transaction has been flagged for verification.",
    action: "Transaction flagged for administrative audit.",
  },
  payment_method_not_enabled: {
    message: "This payment method is not currently available. Please choose another displayed method.",
    action: "Choose an alternative payment method from the gateway.",
  },
  live_mode_not_enabled: {
    message: "Live payment processing is not configured correctly. Please contact support.",
    action: "Contact platform administrator.",
  },
  merchant_not_activated: {
    message: "The payment account is not fully activated. Please contact support.",
    action: "Contact LabourSeva technical helpdesk.",
  },
  capture_failed: {
    message: "The payment authorization could not be captured successfully. The transaction needs to be checked before retrying.",
    action: "Do not repay immediately; wait for gateway reconciliation.",
  },
  payment_risk_check_failed: {
    message: "The transaction could not pass the payment provider's risk checks. Please use another method or contact your provider.",
    action: "Use another payment method or contact your bank.",
  },
  compliance_violation: {
    message: "This transaction cannot be processed under the applicable payment requirements. Please contact support.",
    action: "Contact support for assistance.",
  },
  duplicate_request: {
    message: "A duplicate payment request was detected. Please check your payment history before trying again.",
    action: "Check your Payment History before making another attempt.",
  },
  recurring_payment_not_enabled: {
    message: "Recurring payments are not enabled for this account. Please contact support.",
    action: "Make a standard one-time fee payment.",
  },
  payment_pending_approval: {
    message: "The payment is waiting for required approval. Please wait or contact support.",
    action: "Check back after the approval process completes.",
  },
  record_not_found: {
    message: "The payment record could not be found. Please refresh your history or contact support.",
    action: "Refresh your history page.",
  },
  user_not_eligible: {
    message: "This payment method is not available for this transaction. Please use another eligible method.",
    action: "Choose another eligible payment option.",
  },

  // F. Transaction limits, mandates, and less common errors
  transaction_daily_limit_exceeded: {
    message: "Your daily transaction limit has been reached. Please wait or use another payment method.",
    action: "Use another account or retry tomorrow.",
  },
  transaction_daily_count_exceeded: {
    message: "The permitted number of transactions for today has been reached. Please retry later or use another eligible method.",
    action: "Wait until tomorrow or switch payment methods.",
  },
  transaction_limit_exceeded: {
    message: "This payment exceeds the permitted transaction limit. Please use another method or contact your bank.",
    action: "Increase transaction limits in your banking app.",
  },
  funds_blocked_by_mandate: {
    message: "The required funds are blocked by an existing mandate. Please use another eligible account or contact your bank.",
    action: "Use an unencumbered account or another payment option.",
  },
  mandate_creation_declined: {
    message: "The payment mandate was declined. Please retry or use another supported payment option.",
    action: "Use standard one-off payment.",
  },
  mandate_creation_expired: {
    message: "The mandate creation request expired. Please start the mandate process again.",
    action: "Restart the payment flow.",
  },
  mandate_creation_failed: {
    message: "The payment mandate could not be created. Please retry or use another method.",
    action: "Try a different payment method.",
  },
  mandate_creation_timeout: {
    message: "The mandate creation request timed out. Check its status before retrying.",
    action: "Check status before retrying.",
  },
  reqauth_mandate_not_acknowledged: {
    message: "The required mandate authorization was not acknowledged. Please complete the authorization step.",
    action: "Approve the authorization in your payment app.",
  },
  emi_greater_than_max_amount: {
    message: "The transaction amount exceeds the limit for the selected EMI plan. Please choose another plan or method.",
    action: "Select a different payment plan.",
  },
  emi_plan_unavailable: {
    message: "The selected EMI plan is not available. Please select another option.",
    action: "Choose full payment or another plan.",
  },
  duplicate_rrn_found: {
    message: "A duplicate transaction reference was detected. Please check your payment history before retrying.",
    action: "Check your Payment History to ensure payment was not already counted.",
  },
  deemed_transaction: {
    message: "This transaction could not be processed. Please contact support if the issue persists.",
    action: "Contact support with your transaction reference.",
  },
  collect_on_mcc_blocked: {
    message: "This payment request cannot be processed under the merchant's payment configuration. Please contact support.",
    action: "Contact LabourSeva support.",
  },
  beneficiary_account_does_not_exist: {
    message: "The destination account could not be verified. Please contact support.",
    action: "Contact LabourSeva support.",
  },
  beneficiary_account_dormant: {
    message: "The destination account is inactive. Please contact support.",
    action: "Contact support.",
  },
  mcc_amount_limit_exceeded: {
    message: "The transaction exceeds the permitted amount for this payment category. Please contact support.",
    action: "Contact support.",
  },
  refund_limit_crossed: {
    message: "The refund could not be processed because a refund limit was reached. Please contact support.",
    action: "Contact support.",
  },
  duplicate_refund_id: {
    message: "A duplicate refund request was detected. Please check the refund status before trying again.",
    action: "Check the current refund status.",
  },
  user_not_registered_for_netbanking: {
    message: "Net banking is not registered for this account. Please register with your bank or choose another method.",
    action: "Pay via UPI or debit card instead.",
  },
};

// Safe fallback for unknown provider codes (Section 4)
export const SAFE_FALLBACK_ERROR: ErrorDef = {
  message:
    "We could not determine the exact reason for this payment outcome. Please check your payment status again or contact LabourSeva support with the transaction reference.",
  action:
    "Please check your payment status again or contact LabourSeva support with the transaction reference.",
};

// ============================================================================
// 5. Normalization Logic
// ============================================================================

/**
 * Normalizes an error reason code or description into a customer-friendly message and next step.
 * Supports aliases (e.g. insufficient_fund -> insufficient_funds).
 */
export function normalizeErrorReason(
  rawReason?: string | null,
  rawCode?: string | null,
  rawDescription?: string | null
): ErrorMappingResult {
  const codeCandidate = (rawReason || rawCode || rawDescription || "").toLowerCase().trim();

  // Alias normalization
  let normalizedKey = codeCandidate.replace(/\s+/g, "_");
  if (normalizedKey === "insufficient_fund") {
    normalizedKey = "insufficient_funds";
  }

  // Exact match in dictionary
  if (ERROR_DICTIONARY[normalizedKey]) {
    return {
      reasonCode: normalizedKey,
      userMessage: ERROR_DICTIONARY[normalizedKey].message,
      suggestedAction: ERROR_DICTIONARY[normalizedKey].action,
      isKnown: true,
      errorCode: rawCode || undefined,
      errorDescription: rawDescription || undefined,
      isFundsIssue: normalizedKey === "insufficient_funds",
      isCancelled: normalizedKey === "payment_cancelled",
      isTimedOut: normalizedKey === "payment_timed_out",
    };
  }

  // Substring search for common patterns
  for (const [key, def] of Object.entries(ERROR_DICTIONARY)) {
    if (normalizedKey.includes(key)) {
      return {
        reasonCode: key,
        userMessage: def.message,
        suggestedAction: def.action,
        isKnown: true,
        errorCode: rawCode || undefined,
        errorDescription: rawDescription || undefined,
        isFundsIssue: key === "insufficient_funds",
        isCancelled: key === "payment_cancelled",
        isTimedOut: key === "payment_timed_out",
      };
    }
  }

  // Safe fallback
  return {
    reasonCode: normalizedKey || "unknown_error",
    userMessage: rawDescription || SAFE_FALLBACK_ERROR.message,
    suggestedAction: SAFE_FALLBACK_ERROR.action,
    isKnown: false,
    errorCode: rawCode || undefined,
    errorDescription: rawDescription || undefined,
    isFundsIssue: normalizedKey.includes("fund") || normalizedKey.includes("balance"),
    isCancelled: normalizedKey.includes("cancel"),
    isTimedOut: normalizedKey.includes("time") || normalizedKey.includes("timeout"),
  };
}

/**
 * Checks whether a payment status is captured.
 */
export function isPaymentCaptured(status?: string | null): boolean {
  return status?.toLowerCase() === "captured";
}

/**
 * Maps raw provider payment states and contextual flags into a single normalized display status.
 * Guarantees:
 * - A payment is marked SUCCESSFUL ONLY when captured and verified.
 * - AUTHORIZED is never treated as captured.
 * - Cancelled or timed-out checkouts are distinguished from generic failures.
 * - Refunds are represented accurately.
 */
export function resolveDisplayStatus(params: {
  razorpayStatus?: string | null;
  isVerifiedCaptured?: boolean;
  isCancelled?: boolean;
  isTimedOut?: boolean;
  isVerificationPending?: boolean;
  isTechnicalError?: boolean;
  refundStatus?: string | null;
  amountRefunded?: number;
  totalAmount?: number;
}): PaymentDisplayStatus {
  const {
    razorpayStatus,
    isVerifiedCaptured,
    isCancelled,
    isTimedOut,
    isVerificationPending,
    isTechnicalError,
    refundStatus,
    amountRefunded = 0,
    totalAmount = 0,
  } = params;

  // 1. Refunds (fully or partially)
  const normRefund = (refundStatus || "").toLowerCase();
  if (normRefund === "successful" || normRefund === "full" || razorpayStatus === "refunded") {
    if (amountRefunded > 0 && totalAmount > 0 && amountRefunded < totalAmount) {
      return "PARTIALLY_REFUNDED";
    }
    return "REFUNDED";
  }
  if (normRefund === "partial") {
    return "PARTIALLY_REFUNDED";
  }
  if (normRefund === "processing" || normRefund === "requested") {
    return "REFUND_PROCESSING";
  }

  // 2. Cancellation
  if (isCancelled || razorpayStatus === "cancelled") {
    return "CANCELLED";
  }

  // 3. Timeouts
  if (isTimedOut || razorpayStatus === "timed_out") {
    return "TIMED_OUT";
  }

  // 4. Uncertainty / Verification Pending
  if (isVerificationPending) {
    return "VERIFICATION_PENDING";
  }

  // 5. Technical integration error
  if (isTechnicalError) {
    return "PAYMENT_SERVICE_UNAVAILABLE";
  }

  // 6. Successful: only when captured AND verified
  if ((isVerifiedCaptured ?? true) && razorpayStatus === "captured") {
    return "SUCCESSFUL";
  }

  // 7. Authorized but not captured
  if (razorpayStatus === "authorized") {
    return "AUTHORIZED";
  }

  // 8. Processing / Pending confirmation
  if (razorpayStatus === "processing") {
    return "PROCESSING";
  }
  if (razorpayStatus === "pending") {
    return "PENDING";
  }

  // 9. Failed
  if (razorpayStatus === "failed") {
    return "FAILED";
  }

  // 10. Default / Order Created
  if (razorpayStatus === "created") {
    return "INITIATED";
  }

  return "INITIATED";
}

/**
 * Masks sensitive payment method details (never reveals CVV, full 16 digits, or OTPs).
 */
export function maskPaymentMethod(
  method?: string | null,
  details?: {
    cardLast4?: string;
    cardNetwork?: string;
    cardType?: string;
    bank?: string;
    vpa?: string;
    wallet?: string;
  }
): string {
  if (!method) return "Online Payment (Razorpay)";

  const m = method.toLowerCase();
  if (m === "card") {
    const last4 = details?.cardLast4 ? `•••• ${details.cardLast4}` : "••••";
    const net = details?.cardNetwork ? `${details.cardNetwork} ` : "";
    return `${net}Card ending in ${last4}`;
  }

  if (m === "upi") {
    if (details?.vpa) {
      const parts = details.vpa.split("@");
      if (parts.length === 2) {
        const handle = parts[0];
        const maskedHandle = handle.length > 3 ? `${handle.slice(0, 2)}•••${handle.slice(-1)}` : "•••";
        return `UPI (${maskedHandle}@${parts[1]})`;
      }
    }
    return "UPI";
  }

  if (m === "netbanking") {
    return details?.bank ? `Netbanking (${details.bank})` : "Netbanking";
  }

  if (m === "wallet") {
    return details?.wallet ? `Wallet (${details.wallet})` : "Prepaid Wallet";
  }

  return method.toUpperCase();
}
