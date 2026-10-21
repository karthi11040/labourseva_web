// ---------------------------------------------------------------------------
// Centralized session/secret resolution.
//
// Rules of engagement (live-site safe):
//   1. Env var set            -> use it (existing behavior, zero change).
//   2. Env var missing, dev   -> warn once, use built-in fallback (dev parity).
//   3. Env var missing, prod  -> log CRITICAL once, use fallback so that
//                                 existing signed sessions keep validating and
//                                 users are never locked out mid-rollout.
//      Opt in STRICT_SECRETS=true once the env vars are configured on the
//      server; then missing secrets throw loudly instead.
//
// This keeps a hardened rollout from becoming an outage. The preflight script
// (scripts/audit_security_env.mjs) reports exactly which vars must be set.
// ---------------------------------------------------------------------------

const warned = new Set<string>();

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function warnMissing(name: string, fallbackHint: string): void {
  if (warned.has(name)) return;
  warned.add(name);
  const message = `[security] ${name} is not set — falling back to a known development constant. ` +
    `Sessions signed with it are forgeable by anyone with the source. Set it before shipping: ` +
    `${fallbackHint}`;
  if (isProduction()) {
    console.error("[CRITICAL] " + message);
  } else {
    console.warn(message);
  }
}

/**
 * Resolve a named secret. Never returns an empty string.
 * @param name      Environment variable name
 * @param fallback  The historical constant used when unset (identity of
 *                  previously-issued tokens depends on it — do not change).
 * @param hint      How to generate the value, shown in warnings.
 */
export function getSecret(name: string, fallback: string, hint: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;

  if (isProduction() && process.env.STRICT_SECRETS === "true") {
    throw new Error(
      `STRICT_SECRETS mode: required secret "${name}" is not set. ` +
        `Generate with: ${hint}`
    );
  }

  warnMissing(name, hint);
  return fallback;
}

/** True when any requested secret name is missing from the environment. */
export function missingSecrets(names: string[]): string[] {
  return names.filter((n) => !process.env[n]?.trim());
}

/**
 * Resolve the first non-empty secret among an ordered candidate list.
 * Mirrors legacy `a || b || c` chains exactly (so previously issued tokens
 * keep verifying), with the same missing-secret warning policy as getSecret.
 */
export function resolveSecretChain(names: string[], legacyFallback: string, hint: string): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }

  if (isProduction() && process.env.STRICT_SECRETS === "true") {
    throw new Error(
      `STRICT_SECRETS mode: none of the required secrets (${names.join(", ")}) are set. ` +
        `Generate with: ${hint}`
    );
  }

  warnMissing(names[0], hint);
  return legacyFallback;
}
