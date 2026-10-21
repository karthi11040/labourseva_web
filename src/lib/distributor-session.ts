export const DISTRIBUTOR_SESSION_KEY = "labourseva-distributor-session-storage";
export const DISTRIBUTOR_COOKIE_NAME = "labourseva-distributor-session";

export interface DistributorSessionData {
  id: number;
  registrationNo?: string | null;
  name: string;
  email: string;
  phone: string;
  walletBalance?: number;
  totalCommissionEarned?: number;
  verificationStatus?: string;
  role: "DISTRIBUTOR";
  signedInAt: string;
}

export function getDistributorSession(): DistributorSessionData | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(DISTRIBUTOR_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DistributorSessionData;
  } catch {
    return null;
  }
}

export function saveDistributorSession(data: {
  id: number;
  registrationNo?: string | null;
  name: string;
  email: string;
  phone: string;
  walletBalance?: number;
  totalCommissionEarned?: number;
  verificationStatus?: string;
}) {
  if (typeof window === "undefined") return;
  const payload: DistributorSessionData = {
    id: data.id,
    registrationNo: data.registrationNo || null,
    name: data.name || "Distributor Partner",
    email: data.email,
    phone: data.phone,
    walletBalance: typeof data.walletBalance === "number" ? data.walletBalance : 0,
    totalCommissionEarned: typeof data.totalCommissionEarned === "number" ? data.totalCommissionEarned : 0,
    verificationStatus: data.verificationStatus || "Approved",
    role: "DISTRIBUTOR",
    signedInAt: new Date().toISOString(),
  };

  // 1. Save in localStorage
  window.localStorage.setItem(DISTRIBUTOR_SESSION_KEY, JSON.stringify(payload));

  // 2. Set authentication cookie for Next.js proxy route protection
  const cookieValue = encodeURIComponent(JSON.stringify(payload));
  document.cookie = `${DISTRIBUTOR_COOKIE_NAME}=${cookieValue}; path=/; max-age=604800; SameSite=Lax;`;
}

export function clearDistributorSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DISTRIBUTOR_SESSION_KEY);
  document.cookie = `${DISTRIBUTOR_COOKIE_NAME}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
}
