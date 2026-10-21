/**
 * Client-Side Cap CAPTCHA Loader and Utilities
 * Official Cap repository: https://github.com/tiagozip/cap
 */

let isScriptLoading = false;
let isScriptLoaded = false;

/**
 * Returns the public endpoint for the Cap widget to communicate with.
 * Falls back to localhost in development if NEXT_PUBLIC_CAP_ENDPOINT is unset.
 */
export function getCapPublicEndpoint(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_CAP_ENDPOINT) {
    return process.env.NEXT_PUBLIC_CAP_ENDPOINT;
  }
  return "http://127.0.0.1:3002/cap_site_labourseva_local/";
}

/**
 * Ensures the `<cap-widget>` custom element is registered in the browser.
 * Uses dynamic import of `@cap.js/widget` or script loading without duplicate executions.
 */
export async function loadCapWidgetScript(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  // Already registered in window.customElements
  if (window.customElements && window.customElements.get("cap-widget")) {
    isScriptLoaded = true;
    return true;
  }

  if (isScriptLoaded) return true;

  if (isScriptLoading) {
    // Wait for in-flight load to complete
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (window.customElements && window.customElements.get("cap-widget")) {
          clearInterval(check);
          resolve(true);
        }
      }, 50);
      setTimeout(() => {
        clearInterval(check);
        resolve(Boolean(window.customElements?.get("cap-widget")));
      }, 4000);
    });
  }

  isScriptLoading = true;

  try {
    // Dynamically import client module from installed package
    await import("@cap.js/widget");
    isScriptLoaded = true;
    isScriptLoading = false;
    return true;
  } catch (err) {
    console.warn("Dynamic import of @cap.js/widget failed, falling back to script injection:", err);

    // Fallback: load script element from CDN or local bundle
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@cap.js/widget@0.1.58/cap.min.js";
      script.async = true;
      script.onload = () => {
        isScriptLoaded = true;
        isScriptLoading = false;
        resolve(true);
      };
      script.onerror = () => {
        isScriptLoading = false;
        resolve(false);
      };
      document.head.appendChild(script);
    });
  }
}
