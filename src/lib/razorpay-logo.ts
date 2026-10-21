/**
 * Resolves a reliable logo image for Razorpay Checkout modal.
 *
 * Problem:
 * Razorpay Checkout runs in an HTTPS iframe (https://api.razorpay.com).
 * When running on localhost or over HTTP, passing an http:// URL causes the
 * browser to block the logo due to Mixed Content restrictions, falling back
 * to a generic letter placeholder (e.g. "[L]").
 *
 * Solution:
 * On localhost/HTTP, convert /images/Logo.png to a compact base64 Data URI
 * via an offscreen canvas. Razorpay embeds this data URI directly into its
 * header image, displaying the official LabourSeva logo cleanly on all
 * environments.
 */
export async function getRazorpayCheckoutLogo(): Promise<string> {
  if (typeof window === "undefined") {
    return "/images/Logo.png";
  }

  // Prefer a 128x128 retina-ready PNG Data URI.
  // This renders instantly inside Razorpay's iframe without cross-origin issues,
  // network roundtrips, or Mixed Content blocks on localhost/HTTP.
  try {
    const dataUri = await new Promise<string>((resolve) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const size = 128;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, size, size);
            const dataUrl = canvas.toDataURL("image/png");
            if (dataUrl && dataUrl.startsWith("data:image/png;base64,")) {
              resolve(dataUrl);
              return;
            }
          }
        } catch {
          // Canvas rendering failed, fall through to URL
        }
        resolve("");
      };
      img.onerror = () => resolve("");
      img.src = "/images/Logo.png";
    });

    if (dataUri) {
      return dataUri;
    }
  } catch {
    // Fall through to absolute URL
  }

  return `${window.location.origin}/images/Logo.png`;
}
