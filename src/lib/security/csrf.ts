import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// CSRF protection using the double-submit cookie pattern.
//
// A signed token is set as a cookie. The client must echo the same token
// back in a request header or body field. The server compares the two using
// constant-time comparison.
// ---------------------------------------------------------------------------

const CSRF_COOKIE_NAME = "__csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_BODY_FIELD = "_csrf";
const TOKEN_BYTE_LENGTH = 32;
const TOKEN_EXPIRY_SECONDS = 86400; // 24 hours

/**
 * Retrieve the CSRF signing secret from the environment.
 */
function getCsrfSecret(): string {
  const secret = process.env.CSRF_SECRET;
  if (!secret) {
    throw new Error("CSRF_SECRET environment variable is not set");
  }
  return secret;
}

/**
 * Sign a raw token with the CSRF secret using HMAC-SHA256.
 */
function signToken(rawToken: string): string {
  const secret = getCsrfSecret();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(rawToken)
    .digest("base64url");
  return `${rawToken}.${signature}`;
}

/**
 * Verify a signed token against the CSRF secret.
 */
function verifySignature(signedToken: string): boolean {
  const dotIndex = signedToken.lastIndexOf(".");
  if (dotIndex === -1) return false;

  const rawToken = signedToken.slice(0, dotIndex);
  const providedSig = signedToken.slice(dotIndex + 1);

  const secret = getCsrfSecret();
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(rawToken)
    .digest("base64url");

  if (providedSig.length !== expectedSig.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(providedSig),
    Buffer.from(expectedSig),
  );
}

/**
 * Generate a new signed CSRF token.
 *
 * @returns A signed token string in the format `<raw>.<signature>`
 */
export function generateCsrfToken(): string {
  const rawToken = crypto.randomBytes(TOKEN_BYTE_LENGTH).toString("base64url");
  return signToken(rawToken);
}

/**
 * Validate a CSRF token by comparing it against the cookie token.
 * Both must be valid signed tokens that match each other.
 *
 * @param token - The token from the request body or header
 * @param cookieToken - The token from the CSRF cookie
 * @returns true if both tokens are valid and match
 */
export function validateCsrfToken(
  token: string | null | undefined,
  cookieToken: string | null | undefined,
): boolean {
  if (!token || !cookieToken) return false;

  // Both tokens must have valid signatures.
  if (!verifySignature(token)) return false;
  if (!verifySignature(cookieToken)) return false;

  // Constant-time comparison of the two tokens.
  if (token.length !== cookieToken.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(cookieToken));
}

/**
 * Set the CSRF cookie on an HTTP response.
 *
 * @param response - The Next.js response or a headers-compatible object
 * @param token - The signed CSRF token to set. If omitted, a new one is generated.
 * @returns The token that was set (useful for rendering into forms)
 */
export function setCsrfCookie(
  response: { headers: { append: (name: string, value: string) => void } },
  token?: string,
): string {
  const csrfToken = token ?? generateCsrfToken();

  // Build a Set-Cookie header with secure attributes.
  const isProduction = process.env.NODE_ENV === "production";
  const cookieParts = [
    `${CSRF_COOKIE_NAME}=${csrfToken}`,
    "Path=/",
    "SameSite=Strict",
    `Max-Age=${TOKEN_EXPIRY_SECONDS}`,
  ];

  if (isProduction) {
    cookieParts.push("Secure");
  }

  response.headers.append("Set-Cookie", cookieParts.join("; "));

  return csrfToken;
}

/**
 * Extract the CSRF token from an incoming request.
 * Checks the header first, then falls back to the cookie.
 *
 * @param request - The incoming request with headers and cookies
 * @returns An object with the token from the header/body and the cookie
 */
export function getCsrfToken(request: {
  headers: { get?: (name: string) => string | null; [key: string]: unknown };
  cookies?:
    | (() => { get?: (name: string) => { value?: string } | null })
    | { get?: (name: string) => { value?: string } | null };
  json?: () => Promise<Record<string, unknown>>;
}): { headerToken: string | null; cookieToken: string | null } {
  // Extract from header.
  let headerToken: string | null = null;
  if (typeof request.headers.get === "function") {
    headerToken = request.headers.get(CSRF_HEADER_NAME);
  }

  // Extract from cookie. NextRequest exposes cookies as an object with .get();
  // the legacy helper interface calls cookies() as a function — support both.
  let cookieToken: string | null = null;
  if (typeof request.cookies === "function") {
    cookieToken = request.cookies().get?.(CSRF_COOKIE_NAME)?.value ?? null;
  } else if (request.cookies && typeof request.cookies.get === "function") {
    cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value ?? null;
  }

  return { headerToken, cookieToken };
}

/**
 * Full CSRF validation for an incoming request.
 * Extracts the token from the header or body and compares it to the cookie.
 *
 * @param request - The incoming request
 * @returns true if the CSRF token is valid
 */
export async function validateRequestCsrf(request: {
  headers: { get?: (name: string) => string | null };
  cookies?: () => { get?: (name: string) => { value?: string } | null };
  method?: string;
  json?: () => Promise<Record<string, unknown>>;
  text?: () => Promise<string>;
}): Promise<boolean> {
  // Skip validation for safe methods.
  const method = (request.method ?? "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  const { cookieToken } = getCsrfToken(request);
  if (!cookieToken) return false;

  // Try header first.
  let bodyToken: string | null = null;
  if (typeof request.headers.get === "function") {
    bodyToken = request.headers.get(CSRF_HEADER_NAME);
  }

  // Fall back to body (for form submissions).
  if (!bodyToken) {
    try {
      if (typeof request.json === "function") {
        const body = await request.json();
        if (typeof body._csrf === "string") {
          bodyToken = body._csrf;
        }
      }
    } catch {
      // Body might not be JSON; that's fine.
    }
  }

  return validateCsrfToken(bodyToken, cookieToken);
}

/** The name of the CSRF cookie. */
export { CSRF_COOKIE_NAME };
