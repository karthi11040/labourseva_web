# Admin Marketplace: Add Product Draft

## Intent

The admin marketplace screen shows the five existing drafts, but it has no control for adding a product. This change adds a staff-only way to create a new draft under a retailer.

## Scope

- Add an **Add product** action and accessible form dialog to `/admin/marketplace-products`.
- Let staff select an existing retailer and enter product name, category, description, price, and stock.
- Add server-side validation and create the listing with `DRAFT` status and no photos.
- Return retailer choices with their account approval state so staff can see which drafts cannot yet be submitted.
- Keep approval and publication rules intact: adding a draft does not approve the retailer, submit the listing, or make it public.

## Files / Interfaces

- `src/app/admin/marketplace-products/page.tsx`: add form, state, loading/error feedback, and retailer selector.
- `src/app/api/admin/marketplace-products/route.ts`: include retailer options in GET and support authorized draft creation in POST.
- `src/lib/retailer-marketplace.ts`: reuse the existing price parser and table helper; avoid new dependencies.

## Verification

- Confirm the admin can add a draft for either test retailer.
- Confirm invalid price, missing fields, invalid retailer, and invalid stock are rejected.
- Confirm the created row is `DRAFT`, appears under Draft listings, and is absent from the public product feed.
- Run TypeScript checks and review the changed files.

## Limits

- This form will not upload photos. Retailers add photos and submit their drafts after account approval.
- Staff cannot publish directly from this form; product review remains a separate step.
