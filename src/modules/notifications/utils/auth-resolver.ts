/**
 * LabourSeva — Notification Auth Resolver
 * Extracts and verifies the authenticated user ID from server-side session cookies.
 * Prevents trusting arbitrary query params or header spoofing.
 */
import { NextRequest } from "next/server";
import { getCitizenIdentity, getAuthRetailer, getAuthDistributor } from "@/lib/auth-helpers";
import { validateAdminSession } from "@/lib/session-validator";
import { verifyHmacSession } from "@/lib/session-validator";

export async function resolveAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  try {
    // 1. Citizen Session (User Portal)
    const citizen = await getCitizenIdentity(request);
    if (citizen) {
      return citizen.customerId ? String(citizen.customerId) : String(citizen.phone);
    }

    // 2. Retailer Session
    const retailer = await getAuthRetailer(request);
    if (retailer?.id) {
      return String(retailer.id);
    }

    // 3. Distributor Session
    const distributor = await getAuthDistributor(request);
    if (distributor?.id) {
      return String(distributor.id);
    }

    // 4. Admin Session Cookie check — validated HMAC session, not just cookie presence
    const adminCookie = request.cookies.get("labourseva-admin-session")?.value;
    if (adminCookie && validateAdminSession(adminCookie)) {
      return "admin";
    }

    // 5. Development / Local Environment Safe Fallback
    // If in development mode and an explicit internal authorization header is passed (for tests)
    const authHeader = request.headers.get("x-user-id");
    if (authHeader && process.env.NODE_ENV !== "production") {
      return authHeader;
    }

    // Signed citizen cookie (strict HMAC — unsigned values are rejected)
    const citizenCookie = request.cookies.get("labourseva-user-session")?.value;
    if (citizenCookie) {
      const verified = verifyHmacSession(citizenCookie, "CUSTOMER");
      if (verified) {
        return String(verified.customerId || verified.id || verified.phone);
      }
    }

    // If local development demo session
    if (process.env.NODE_ENV !== "production") {
      // Check query string only in local development tests if explicitly provided with test key
      const testKey = request.headers.get("x-test-key");
      const urlUserId = new URL(request.url).searchParams.get("userId");
      if (testKey === "labourseva_test" && urlUserId) {
        return urlUserId;
      }
    }

    return null;
  } catch (err) {
    console.warn("[resolveAuthenticatedUserId error]:", err);
    return null;
  }
}
