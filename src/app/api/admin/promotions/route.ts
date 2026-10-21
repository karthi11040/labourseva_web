// AdBlocker-Safe Proxy Route for Admin Ads/Promotions
// Re-exports all handlers from /api/admin/ads so browsers with uBlock/AdBlock extensions don't block requests
export const dynamic = "force-dynamic";
export { GET, POST, PATCH, DELETE } from "../ads/route";
