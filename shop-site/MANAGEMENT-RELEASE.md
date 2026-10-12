# Shop management update

This release completes the next management phase: full order details, search and pagination, internal order/customer notes, quotation finalization, printable invoices, date-range sales and inventory reports with CSV export, editable/time-limited/automatic discounts, editable regional shipping, contact/SEO/policy settings, product draft copying/archive and stock history, and administrative event logging.

Checkout now validates the full basket and calculates prices, discounts, shipping and taxes on the server. Order, item, history and coupon usage writes are a single D1 batch. Optional idempotency keys make retries safe. Inventory status transitions use database triggers with revision gating to avoid double deduction and remain compatible with the previous Worker during migration-before-deploy.

Public catalog synchronization removes archived/hidden records and updates names/categories from current data. Category pages are dynamic. Storefront search, sorting, available-only filtering, discount display, and checkout financial previews are connected to server data.

## Validation

Run `node shop-site/tests/phase1.test.mjs` and `node shop-site/tests/management.test.mjs` on Node 24. Rebuild assets with the existing deployment patch sequence, ending with `patch-management.mjs`. Run both browser tests with `PLAYWRIGHT_MODULE` pointing to Playwright. All fixtures are isolated; no production customer/order records are created by these tests.

## Limits

- Reports show paid revenue; they are not accounting/tax filings. Test gateway orders are excluded.
- Returns remain administrative records. Marking a refund does not move funds through a gateway.
- Product variants are still catalog administration; customer checkout supports standalone products. Multi-admin identities/roles were explicitly deferred in the original roadmap.
- Gateway credentials remain in Cloudflare secrets. Real payment and bank settlement need a live transaction; automated QA does not spend money.
- Keep the revision-aware Worker when rolling back after using this release's inventory transitions. Do not blindly restore an older Worker after migration.
