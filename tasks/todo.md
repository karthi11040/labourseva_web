# Retailer Marketplace Tasks

## Phase 1: Marketplace foundation

### Task 1: Add product listing persistence
- [x] Add marketplace product schema, migration, and retailer product/photo API.
- [x] Keep product data separate from assisted service orders and store prices as paise.
- [ ] Apply the migration and run focused schema/runtime checks.
- Dependencies: None for product catalog; order model waits for payment and fulfillment decisions.
- Files: `prisma/schema.prisma`, `prisma/migrations/20261021150000_retailer_marketplace_products/migration.sql`, `src/lib/retailer-marketplace.ts`, retailer APIs.
- Estimated scope: Medium.

### Task 2: Add retailer product listing management
- [x] Approved retailer can create/edit drafts with a free-form category, price, stock, description, and up to five photos.
- [x] API validates ownership, image content/size, approval, and listing state; drafts remain private.
- [ ] Verification: focused API checks for authorization, validation, ownership, and save/update paths.
- Dependencies: Task 1.
- Files likely touched: `src/app/retailer/marketplace/*`, `src/app/api/retailer/marketplace/*`, shared marketplace validation.
- Estimated scope: Large; split by listing UI/API if needed.

### Task 3: Add staff/admin product moderation
- [x] Staff/admin can view pending listings, inspect photos, approve, or reject with a reason.
- [x] Only approved listings from approved retailers appear in the public catalog.
- [ ] Verification: focused checks for role permissions and moderation status transitions.
- Dependencies: Tasks 1-2.
- Files likely touched: `src/app/admin/marketplace/*`, `src/app/api/admin/marketplace/*`, admin navigation.
- Estimated scope: Medium.

## Checkpoint: Seller catalog
- [x] Approved seller draft → staff decision → public visibility is implemented end-to-end.
- [ ] Verify the flow against the running development database.

## Phase 2: Buyer marketplace

### Task 4: Add marketplace discovery
- [x] Public visitors can browse, search, and filter approved products by category.
- [x] Product cards show price, stock availability, and seller shop name.
- [ ] Verification: focused UI/API checks for visibility and filtering.
- Dependencies: Tasks 1-3.
- Files likely touched: `src/app/(public)/marketplace/*` or buyer portal marketplace route, marketplace APIs/components.
- Estimated scope: Medium.

### Task 5: Add order placement and order records
- [ ] Buyer can place an order for an available product and see a stable order reference.
- [ ] Order placement handles stock consistency and duplicate submissions safely.
- [ ] Verification: focused checks for inventory, idempotency, buyer ownership, and status changes.
- Dependencies: Tasks 1 and 4; payment/fulfillment decisions from the open questions.
- Files likely touched: `src/app/api/marketplace/orders/*`, checkout UI, marketplace order service.
- Estimated scope: Large; payment integration may be a separate task.

### Task 6: Add retailer and buyer order views
- [ ] Retailer sees only their received orders and can update allowed fulfillment states.
- [ ] Buyer sees only their own purchases and status/history.
- [ ] Verification: focused role/ownership checks for both views.
- Dependencies: Task 5.
- Files likely touched: retailer marketplace orders pages/APIs and buyer order pages/APIs.
- Estimated scope: Medium.

## Checkpoint: Order lifecycle
- [ ] A complete order can be placed, managed, and viewed by the correct parties under the agreed payment and delivery policy.

## Phase 3: Product promotions

### Task 7: Add retailer product promotion requests
- [ ] Retailer can request promotion for an approved product using the agreed placement, duration, and price rules.
- [ ] Staff/admin can approve/reject, and promotion status/dates are auditable.
- [ ] Verification: focused checks for eligibility, permissions, and timing.
- Dependencies: Tasks 1-4 and promotion policy decision.
- Files likely touched: retailer promotion UI/API, admin review UI/API, promotion schema.
- Estimated scope: Medium.

### Task 8: Display approved product promotions
- [ ] Active approved promotions appear in agreed marketplace locations and link to product detail.
- [ ] Views/clicks are recorded without exposing private buyer data.
- [ ] Verification: focused checks for active date/status filters and link targets.
- Dependencies: Task 7.
- Files likely touched: marketplace discovery components/APIs and promotion tracking endpoint.
- Estimated scope: Small to medium.

## Final checkpoint
- [ ] Marketplace acceptance criteria pass and production build succeeds.
- [ ] No regressions to retailer wallet, Kendra service applications, or existing admin promotional banners.

## Verification recorded
- `npx prisma validate --schema prisma/schema.prisma`: passed.
- `npx tsc --noEmit --pretty false`: still fails only at pre-existing `phone` property errors in `src/app/api/retailer/wallet/failure/route.ts:63` and `src/app/api/retailer/wallet/verify/route.ts:90`; no marketplace errors reported.
- Tests and production build were not run. The migration has not been applied to the development database.
