export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const runtime = globalThis as typeof globalThis & { __marketplaceSubscriptionNoticesStarted?: boolean };
  if (runtime.__marketplaceSubscriptionNoticesStarted) return;
  runtime.__marketplaceSubscriptionNoticesStarted = true;

  const run = async () => {
    try {
      const { processMarketplaceSubscriptionNotices } = await import("@/lib/marketplace-subscription-notifications");
      await processMarketplaceSubscriptionNotices();
    } catch (error) {
      console.error("Marketplace subscription reminder run failed:", error);
    }
  };

  setTimeout(() => void run(), 15_000).unref();
  setInterval(() => void run(), 60 * 60 * 1000).unref();
}
