import crypto from "node:crypto";

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
  env: "live" | "test";
  apiBase: string;
}

export function getRazorpayEnv(): "live" | "test" {
  const envVal = process.env.RAZORPAY_ENV?.toLowerCase().trim();
  return envVal === "test" ? "test" : "live";
}

export function getRazorpayCredentials(): RazorpayCredentials | null {
  const env = getRazorpayEnv();
  const apiBase = (process.env.RAZORPAY_API_BASE || "https://api.razorpay.com/v1").replace(/\/$/, "");

  let keyId = process.env.RAZORPAY_KEY_ID?.trim();
  let keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (env === "test") {
    keyId = process.env.RAZORPAY_TEST_KEY_ID?.trim() || keyId;
    keySecret = process.env.RAZORPAY_TEST_KEY_SECRET?.trim() || keySecret;
  }

  if (!keyId || !keySecret) return null;
  return { keyId, keySecret, env, apiBase };
}

export async function createRazorpayOrder(
  creds: { keyId: string; keySecret: string; apiBase?: string },
  amountPaise: number,
  receipt: string,
  notes: Record<string, string>
): Promise<{ id: string; amount: number; currency: string }> {
  const apiBase = (creds.apiBase || process.env.RAZORPAY_API_BASE || "https://api.razorpay.com/v1").replace(/\/$/, "");
  const res = await fetch(`${apiBase}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString("base64")}`,
    },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt: receipt.slice(0, 40), notes }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.id) {
    throw new Error(data?.error?.description || `Razorpay order creation failed (HTTP ${res.status})`);
  }
  return { id: data.id, amount: data.amount, currency: data.currency };
}

export async function refundRazorpayPayment(
  creds: RazorpayCredentials,
  paymentId: string,
  amountPaise: number,
  notes: Record<string, string>
): Promise<{ id: string; amount: number; status: string }> {
  const auth = `Basic ${Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString("base64")}`;
  const paymentsRes = await fetch(`${creds.apiBase}/payments/${encodeURIComponent(paymentId)}/refunds`, {
    headers: { Authorization: auth },
    cache: "no-store",
  });
  const paymentsData = await paymentsRes.json().catch(() => ({}));
  if (!paymentsRes.ok) throw new Error(paymentsData?.error?.description || "Could not check existing payment refunds.");
  const existingRefunds: any[] = Array.isArray(paymentsData.items) ? paymentsData.items : [];
  const successful = existingRefunds.filter((item) => ["processed", "pending"].includes(String(item.status).toLowerCase()));
  const alreadyRefunded = successful.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  if (alreadyRefunded >= amountPaise && successful.length) {
    const latest = successful[0];
    return { id: latest.id, amount: alreadyRefunded, status: latest.status || "pending" };
  }

  const refundRes = await fetch(`${creds.apiBase}/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: JSON.stringify({ amount: Math.max(0, amountPaise - alreadyRefunded), notes }),
  });
  const refund = await refundRes.json().catch(() => ({}));
  if (!refundRes.ok || !refund?.id) throw new Error(refund?.error?.description || `Refund request failed (HTTP ${refundRes.status}).`);
  return { id: refund.id, amount: Number(refund.amount || 0), status: refund.status || "pending" };
}

export function verifyRazorpaySignature(
  keySecret: string,
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const expected = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(signature), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
