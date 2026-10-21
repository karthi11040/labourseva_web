/**
 * Cap CAPTCHA Types & Interfaces
 * Official Cap repository: https://github.com/tiagozip/cap
 */

export type CapErrorCode =
  | "missing_endpoint"
  | "network_error"
  | "challenge_parse_error"
  | "challenge_unsupported"
  | "solve_failed"
  | "instr_timeout"
  | "instr_blocked"
  | "redeem_failed"
  | "invalid_solution"
  | "invalid_expires"
  | "wasm_load_failed"
  | "worker_spawn_failed"
  | "unknown";

export type CapVerificationErrorCode =
  | "MISSING_TOKEN"
  | "MALFORMED_TOKEN"
  | "INVALID_TOKEN"
  | "EXPIRED_TOKEN"
  | "REPLAYED_TOKEN"
  | "SERVICE_UNAVAILABLE"
  | "NOT_CONFIGURED"
  | "RATE_LIMITED";

export interface CapVerificationResult {
  success: boolean;
  error?: string;
  errorTa?: string;
  errorCode?: CapVerificationErrorCode;
  timestamp?: number;
  challengeTs?: string;
  action?: string;
}

export interface CapVerificationOptions {
  ip?: string;
  action?: string;
  bypassInTest?: boolean;
}

export interface CapWidgetProps {
  onVerified: (token: string) => void;
  onExpired?: () => void;
  onError?: (errorMessage: string) => void;
  onReset?: () => void;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
  action?: string;
}

export interface CapSolveDetail {
  token: string;
}

export interface CapErrorDetail {
  isCap: boolean;
  code: CapErrorCode;
  message: string;
}
