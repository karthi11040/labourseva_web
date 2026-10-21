"use client";

import { useState, useCallback } from "react";

export type CaptchaStatus = "idle" | "loading" | "solved" | "error" | "expired";

export interface UseCapCaptchaReturn {
  captchaToken: string;
  captchaStatus: CaptchaStatus;
  captchaError: string | null;
  isCaptchaSolved: boolean;
  resetCaptcha: () => void;
  handleVerified: (token: string) => void;
  handleExpired: () => void;
  handleError: (errorMessage: string) => void;
  handleReset: () => void;
}

/**
 * Reusable hook managing the Cap CAPTCHA lifecycle across authentication forms.
 */
export function useCapCaptcha(): UseCapCaptchaReturn {
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const [captchaStatus, setCaptchaStatus] = useState<CaptchaStatus>("idle");
  const [captchaError, setCaptchaError] = useState<string | null>(null);

  const resetCaptcha = useCallback(() => {
    setCaptchaToken("");
    setCaptchaStatus("idle");
    setCaptchaError(null);
  }, []);

  const handleVerified = useCallback((token: string) => {
    setCaptchaToken(token);
    setCaptchaStatus("solved");
    setCaptchaError(null);
  }, []);

  const handleExpired = useCallback(() => {
    setCaptchaToken("");
    setCaptchaStatus("expired");
    setCaptchaError("Security verification has expired. Please verify again.");
  }, []);

  const handleError = useCallback((errorMessage: string) => {
    setCaptchaToken("");
    setCaptchaStatus("error");
    setCaptchaError(errorMessage || "Security challenge failed. Please retry.");
  }, []);

  const handleReset = useCallback(() => {
    setCaptchaToken("");
    setCaptchaStatus("idle");
    setCaptchaError(null);
  }, []);

  return {
    captchaToken,
    captchaStatus,
    captchaError,
    isCaptchaSolved: Boolean(captchaToken && captchaStatus === "solved"),
    resetCaptcha,
    handleVerified,
    handleExpired,
    handleError,
    handleReset,
  };
}
