# Implementation Plan: Retailer Marketplace

## Overview

Build a product marketplace where approved retailers can publish products, promote listings, and receive orders from LabourSeva customers/users and other retailers. Product categories should support multiple kinds of goods. The current codebase has retailer account/profile and service-order flows, but no product catalog, marketplace orders, or retailer-controlled product promotions. This plan is intentionally limited to the marketplace; retailer profile verification already exists and will be reused as the seller eligibility gate.

## Architecture Decisions

- Reuse the existing retailer authentication and account approval status; only approved retailers can sell or promote products.
- Add marketplace-specific persistence and APIs rather than overloading `retail_orders`, which records assisted service applications.
- Keep product listing and promotion reviewable by staff/admin before publication until the promotion/moderation policy is decided.
- Use existing payment infrastructure only after confirming who collects payment and how delivery/fulfillment works.

## Task List

### Phase 1: Product catalog (implemented; runtime verification pending)
- [x] Task 1: Add marketplace product persistence for retailer listings, price, stock, photos, and review state. Orders remain a later schema slice.
- [x] Task 2: Add retailer product drafts, editing, photos, free-form categories, inventory, and review submission.
- [x] Task 3: Add staff/admin moderation for product listings with rejection feedback.
- [x] Task 4: Add public marketplace browsing, search, and category filters for approved products.

### Checkpoint: Seller catalog
- [x] Approved retailer can submit a product, staff can approve/reject it, and only approved listings from approved retailers are public.
- [x] Product changes and inventory are validated and persisted separately from service-order and wallet records.
- [ ] Apply the marketplace migration and verify the retailer-to-staff-to-public flow in the running app.

### Phase 2: Buyer orders
- [x] Buyer access: create a dedicated citizen marketplace with saved search/category preferences, keep the public marketplace independent, and add a homepage entry point.
- [x] Add a sign-in-gated direct call-to-order action for in-stock products on the citizen marketplace.
- [ ] Task 5: Add tracked product orders after deciding whether LabourSeva or retailers collect payment.
- [ ] Task 6: Add retailer order management and buyer order history/status visibility with an agreed order lifecycle.

### Checkpoint: Order lifecycle
- [ ] A buyer can place an order and the seller can process it through the agreed status lifecycle.
- [ ] Payment, stock, cancellation, and refund behavior are consistent and auditable.

### Phase 3: Product promotions
- [ ] Task 7: Add retailer product promotion requests/placements and staff review.
- [ ] Task 8: Display approved promoted products in the agreed marketplace placements and track views/clicks.

### Checkpoint: Promotion
- [ ] Retailer promotion requests follow the agreed pricing and approval rules; only eligible promotions display.

### Checkpoint: Complete
- [ ] All acceptance criteria are met, permissions are enforced by the APIs, and focused verification plus build checks pass.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Payment collection and delivery responsibility are undecided | Orders may be impossible to fulfill or reconcile | Confirm whether the platform handles payment/shipping or orders are booking/reservation requests before implementing checkout. |
| Unmoderated listings, prohibited items, or misleading promotions | User trust, policy, and legal exposure | Define category/listing rules and staff moderation before public launch. |
| Shared service-order tables could mix product purchases with welfare applications | Incorrect status, ledger, and reports | Use separate marketplace product/order records and keep service workflows isolated. |
| Product photos introduce storage and content risks | Unsafe uploads or excessive storage use | Reuse secure upload patterns with explicit size/type limits and ownership checks. |

## Open Questions

1. For tracked orders, should the first release support payment through LabourSeva, cash on delivery, or retailer-collected payment?
2. Who handles delivery, shipping charges, cancellations, and refunds: LabourSeva or each retailer?
3. Are product listings free, and are promoted ads paid, free, or staff-assigned? Should promotions require approval?
4. Customers/users are marketplace buyers; should retailers also be buyers, and can distributors/admin be sellers?
5. Which product categories or restricted-goods policy should be used initially? “Any category” still needs rules for prohibited goods.

## Current Context

- Existing retailer account/profile routes use `retail_users` and `getAuthRetailer`; account verification is represented by retailer status/approval fields.
- `retail_orders` is currently used for assisted service orders and should not be reused for physical products.
- Existing ad/promotion routes are admin-managed promotional banners, not retailer product ads.
- Existing wallet/Razorpay code applies to retailer wallet top-ups and service applications; it does not yet define marketplace checkout.
- Product categories are free text in this first catalog slice; moderation rules for restricted goods remain open.
- Customers/users can browse approved products and, when signed in, call the retailer directly to arrange a purchase. The marketplace does not collect payment or manage delivery.
- Product orders and retailer-paid/featured promotions are not implemented pending the open policy decisions above.
- The working tree contains extensive unrelated modifications. Marketplace work must preserve them and avoid broad resets.
