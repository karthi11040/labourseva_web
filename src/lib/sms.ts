/**
 * LabourSeva SMS Service
 * Gateway Provider: My Dreams Technology (http://app.mydreamstechnology.in/vb/apikey.php)
 */

export interface SmsConfig {
  apiUrl: string;
  apiKey: string;
  senderId: string;
  appName: string;
  template: string;
}

export function getSmsConfig(): SmsConfig | null {
  const apiKey = process.env.SMS_API_KEY?.trim();
  if (!apiKey) return null;

  return {
    apiUrl: process.env.SMS_API_URL?.trim() || "http://app.mydreamstechnology.in/vb/apikey.php",
    apiKey,
    senderId: process.env.SMS_SENDER_ID?.trim() || "MDTDMO",
    appName: process.env.SMS_APP_NAME?.trim() || "labourseva.com",
    template:
      process.env.SMS_TEMPLATE?.trim() ||
      "Dear {otp}, Your OTP for login to {app_name}. Valid for 30 minutes. Please do not share this OTP. Regards, My Dreams Technology Team",
  };
}

/**
 * Normalizes Indian phone numbers into 10 digits
 */
export function sanitizeIndianMobile(mobile: string): string {
  let digits = mobile.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  if (digits.length === 10) {
    return digits;
  }
  return digits;
}

function gatewayRejected(responseText: string): boolean {
  const body = responseText.trim();
  if (!body) return false;

  try {
    const result = JSON.parse(body);
    if (result && typeof result === "object") {
      if (result.success === false || result.ok === false || result.accepted === false) return true;
      if (typeof result.status === "string" && /^(error|failed|failure|rejected|denied)$/i.test(result.status)) {
        return true;
      }
    }
  } catch {
    // Some gateway versions return plain text instead of JSON.
  }

  return /^(error|failed|failure|invalid|unauthorized|rejected|denied)\b/i.test(body);
}

/**
 * Sends a generic transactional SMS through My Dreams Technology SMS gateway
 */
export async function sendSms(params: {
  mobile: string;
  message: string;
}): Promise<{ success: boolean; response?: string; error?: string }> {
  const config = getSmsConfig();
  if (!config) {
    return { success: false, error: "SMS configuration missing (SMS_API_KEY not set)." };
  }

  const cleanNumber = sanitizeIndianMobile(params.mobile);
  if (!cleanNumber || cleanNumber.length !== 10) {
    return { success: false, error: `Invalid Indian 10-digit mobile number: "${params.mobile}"` };
  }

  const maskedKey = `${config.apiKey.slice(0, 4)}...${config.apiKey.slice(-4)}`;

  try {
    const url = new URL(config.apiUrl);
    url.searchParams.set("apikey", config.apiKey);
    url.searchParams.set("senderid", config.senderId);
    url.searchParams.set("number", cleanNumber);
    url.searchParams.set("message", params.message);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url.toString(), {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timer);

    const responseText = await res.text();

    if (!res.ok) {
      console.error(`[SMS Error] Gateway HTTP ${res.status}: ${responseText}`);
      return { success: false, error: `HTTP ${res.status}: ${responseText}` };
    }

    if (gatewayRejected(responseText)) {
      console.error(`[SMS Error] Gateway rejected the message: ${responseText.slice(0, 300)}`);
      return { success: false, error: "SMS gateway rejected the message." };
    }

    console.log(`[SMS Sent] To: ******${cleanNumber.slice(-4)}, Key: ${maskedKey}, Response: ${responseText.slice(0, 100)}`);
    return { success: true, response: responseText };
  } catch (err: any) {
    console.error(`[SMS Exception] Failed to send SMS to ******${cleanNumber.slice(-4)}:`, err?.message || err);
    return { success: false, error: err?.message || "Failed to reach SMS gateway" };
  }
}

/**
 * Dispatches standard OTP SMS conforming to registered DLT template
 */
export async function sendOtpSms(
  mobile: string,
  otp: string
): Promise<{ success: boolean; response?: string; error?: string }> {
  const config = getSmsConfig();
  const template =
    config?.template ||
    "Dear {otp}, Your OTP for login to {app_name}. Valid for 30 minutes. Please do not share this OTP. Regards, My Dreams Technology Team";

  const appName = config?.appName || "labourseva.com";
  const message = template.replace("{otp}", otp).replace("{app_name}", appName);

  return sendSms({ mobile, message });
}
