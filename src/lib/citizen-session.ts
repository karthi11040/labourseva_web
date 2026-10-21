export const CITIZEN_SESSION_KEY = "labourseva-citizen-session";
export const CITIZEN_COOKIE_NAME = "labourseva-user-session";

// ---------------------------------------------------------------------------
// SECURITY NOTE (2026-10): This module no longer writes the session cookie.
// The old flow let the browser mint its own `labourseva-user-session` cookie —
// anyone could call saveCitizenSession() with any phone number and bypass auth.
// Sessions are now issued strictly server-side by /api/auth/login and
// /api/auth/otp/verify using HMAC-signed HttpOnly cookies. This module only
// stores a UI hint (last phone used on this device) in localStorage.
// ---------------------------------------------------------------------------

export interface CitizenSessionHint {
  phone: string;
  name?: string;
  signedInAt: string;
}

/** Read the "remembered number" hint for this device. Not an auth source. */
export function getCitizenSession(): CitizenSessionHint | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(CITIZEN_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CitizenSessionHint;
    return typeof parsed?.phone === "string" ? parsed : null;
  } catch {
    return null;
  }
}

/** Store a UI hint for the last phone used on this device. */
export function saveCitizenSession(data: { phone: string; name?: string }) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CITIZEN_SESSION_KEY,
      JSON.stringify({
        phone: data.phone,
        name: data.name || "Citizen Beneficiary",
        signedInAt: new Date().toISOString(),
      })
    );
  } catch {}
}

/** Clear the hint AND any legacy client-issued cookie still in the browser. */
export function clearCitizenSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CITIZEN_SESSION_KEY);
  // Best-effort removal of the legacy client-writable cookie.
  document.cookie = `${CITIZEN_COOKIE_NAME}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
}
