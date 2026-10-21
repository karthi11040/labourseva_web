export const RETAILER_SESSION_KEY = "labourseva-retailer-session-storage";
export const RETAILER_COOKIE_NAME = "labourseva-retailer-session";

export interface RetailerSessionData {
  id: number;
  registrationNo?: string | null;
  name: string;
  shopName?: string | null;
  email: string;
  phone: string;
  distributorId?: string | null;
  walletBalance?: number;
  role: "RETAILER";
  signedInAt: string;
}

export function getRetailerSession(): RetailerSessionData | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(RETAILER_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RetailerSessionData;
  } catch {
    return null;
  }
}

export function saveRetailerSession(data: {
  id: number;
  registrationNo?: string | null;
  name: string;
  shopName?: string | null;
  email: string;
  phone: string;
  distributorId?: string | null;
  walletBalance?: number;
}) {
  if (typeof window === "undefined") return;
  const payload: RetailerSessionData = {
    id: data.id,
    registrationNo: data.registrationNo || null,
    name: data.name || "Kendra Operator",
    shopName: data.shopName || null,
    email: data.email,
    phone: data.phone,
    distributorId: data.distributorId || null,
    walletBalance: typeof data.walletBalance === "number" ? data.walletBalance : 0,
    role: "RETAILER",
    signedInAt: new Date().toISOString(),
  };

  // 1. Save in localStorage
  window.localStorage.setItem(RETAILER_SESSION_KEY, JSON.stringify(payload));

  // 2. Set authentication cookie for Next.js proxy route protection
  const cookieValue = encodeURIComponent(JSON.stringify(payload));
  document.cookie = `${RETAILER_COOKIE_NAME}=${cookieValue}; path=/; max-age=604800; SameSite=Lax;`;
}

export function clearRetailerSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(RETAILER_SESSION_KEY);
  document.cookie = `${RETAILER_COOKIE_NAME}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
}
