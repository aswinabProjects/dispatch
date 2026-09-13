# Dispatch redesign and hardened-backend verification

This is the earlier redesign report. See [the structural redesign report](STRUCTURAL_REDESIGN_REPORT.md) for the current frontend structure and latest validation results.

Verified 14 September 2026. All implementation changes are under `frontend/`. No backend source files were modified.

## 1. Backend integration verification

The expanded existing script, `scripts/live-api.mjs`, imports the production frontend API client (`src/api.js`) and sends real HTTP requests through Vite at `http://127.0.0.1:5173` to Django at `http://127.0.0.1:8000`, using the existing PostgreSQL database. These checks do not mock the backend or replace authentication.

Before redesign, 19 checks passed. After redesign, 21 checks passed, including two additional same-order concurrency checks. Timestamped evidence is in ignored `test-results/live-api-before-redesign.json` and `test-results/live-api.json`.

| Behavior                               | Verified result                                                               |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| JWT login and `/api/me/`               | Customer, Staff and Manager identities match their accounts                   |
| Access-token refresh                   | Invalid access token triggers a real refresh followed by a successful retry   |
| Unauthenticated access and logout      | 401; logout clears the frontend session                                       |
| Customer product permissions           | Product POST and PATCH denied with 403                                        |
| Product visibility                     | Customer excludes inactive products; Staff sees them                          |
| Customer order creation                | Pending order created with stored unit prices and stock reservation           |
| Customer list/detail                   | Own history and details returned                                              |
| Direct customer order PUT/PATCH/DELETE | All return 405; order contents remain unchanged                               |
| Dedicated cancellation                 | Pending order becomes cancelled; stock restored; `updated_at` advances        |
| Repeated cancellation                  | 400; stock is not restored twice                                              |
| Concurrent same-order cancellations    | One success and one 400; stock restored exactly once                          |
| Ownership                              | Other customer cannot find the order in their list, retrieve it, or cancel it |
| Role restrictions                      | Customer management requests denied; Staff cannot create customer orders      |
| Validation                             | Excess stock and inactive-product order requests return 400                   |
| Fulfillment                            | Pending → confirmed → processing → shipped → delivered succeeds               |
| Invalid transitions                    | Skipped and terminal-state transitions rejected with 400                      |
| Concurrent identical transitions       | One success and one 400; order advances once                                  |
| Customer after confirmation            | Cancellation denied; fulfillment changes denied                               |
| Timestamp updates                      | Cancellation and sequential status-change timestamps advance                  |

The first attempt encountered the old no-reload Django process retained from the earlier session. It was restarted against the updated source before recording successful results. A temporary QA product created while the stale code was active was identified precisely as ID 8 and removed. No existing product was modified by that cleanup.

Temporary fixture accounts, products and test orders remain available for manual testing. The live script now reads initial stock at the start of each run, so it can be rerun while fixture stock remains. Scoped cleanup instructions are in `README.md`.

Source inspection confirms the user's hardening: product permissions applied to list/create, retrieve-only customer detail, atomic transactions and order row locks for cancellation/status transitions, and saving both `status` and `updated_at`. Same-order concurrency tests are useful evidence, not a general proof of safety for every multi-order/product race.

## 2. Frontend redesign

The old navy/cobalt visual layer was replaced. No API-client rewrite or new backend endpoint was introduced.

**Staff/Manager operations console**

- Compact white application bar with account/role identity.
- Light neutral canvas, muted green operational accents, narrow desktop left rail.
- Rail links to fulfillment, inventory, each fulfillment stage, and cancellations.
- Semantic order table with customer ID, quantity, status chip, total and a next-action link.
- All orders, Needs fulfillment, Completed and Cancelled views; client-side filtering uses the full API collection.
- Stage filters are reflected in URL query parameters, so rail links and direct URLs load the correct view.
- Compact stage summaries and distinct status chips replace the dark oversized stage cards.
- Row links take the operator to the existing controlled next-step action. No new bulk, payment, shipping-label, analytics or tracking features.
- Order detail shows a compact action panel, stage progress and the backend's latest update timestamp. Terminal orders expose details only, without transition controls.

**Customer shopping/account portal**

- Separate shell styling, warm neutral surfaces and brown accents.
- Horizontal shop/account navigation on larger screens instead of the operations rail.
- Product browsing with product tiles, quantity controls and a sticky draft on wide screens.
- Order-history cards show placed date, status, item count, total and a compact progress bar.
- Customer detail retains historical prices, order progress and explicit cancellation confirmation.
- No operator stage-summary dashboard or management table appears in the customer area.

**Shared visual changes**

- Compact centered sign-in panel replaces the large split-screen hero.
- New typography, spacing, borders, surface treatments, buttons and progress visuals.
- Local system fonts replace external font requests.
- Loading, empty, validation, 403/404, retry and session-expiry behavior remain available.
- Authentication continues to use centralized JWT requests, session storage, shared refresh and authoritative `/api/me/` role identity.

The design takes organizational inspiration from status-based work views described by [Shopify's order-status documentation](https://help.shopify.com/en/manual/fulfillment/managing-orders/order-status) and [ShipStation's order-grid documentation](https://help.shipstation.com/hc/en-us/articles/360025869052-View-Search-and-Sort-Orders). The layout, styling and customer/operations split are original to this project; neither product's interface or additional capabilities were copied.

## 3. Responsive behavior

| Target width | Implemented adaptation                                                                                                   | Browser verification |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| 1440px       | Desktop operations rail/table; multi-column products and side action/draft panels                                        | Pending              |
| 1024px       | Narrower rail, compressed spacing, wrapping toolbars, compact table                                                      | Pending              |
| 768px        | Operations navigation collapses into a menu; customer navigation stays horizontal; reduced grids                         | Pending              |
| 390px        | Both shells use mobile navigation; table becomes labeled order summaries; draft/actions stack; progress becomes vertical | Pending              |
| 320px        | Single product column, simplified identity metadata and two-column stage summary                                         | Pending              |

Main controls have at least 44px touch targets. Grid columns use `minmax(0, 1fr)`, form inputs can shrink, long product text wraps, and mobile layouts stack content instead of introducing horizontal table scrolling. Mobile navigation uses an in-flow disclosure rather than a modal overlay. Escape closes navigation and returns focus to its toggle; choosing a link closes the menu. Semantic table headers, form labels, focus outlines, skip navigation, status/error announcements and reduced-motion preferences are preserved.

Browser tooling returned no connected apps or browsers. Actual screenshots, viewport overflow measurements and visual checks at these sizes were therefore not performed. jsdom tests verify interaction/state behavior, not rendered geometry.

## 4. Tests and production build

- `npm.cmd test`: 27 tests across three files (authentication client, domain contract and React interactions).
- `npm.cmd run lint`: ESLint passes.
- `npm.cmd run build`: Vite production build passes.
- `node scripts/live-api.mjs`: 21 live checks pass after redesign.
- Source hashes for all 37 backend Python files match the beginning-of-task snapshot: zero backend files changed.

The redesign tests cover customer cards versus operations tables, open/completed work separation, stage deep links, menu disclosure/Escape focus return, and no transition controls for terminal orders. The previous tests still cover login identity, refresh concurrency and rejection, logout races, 403 errors, cancellation confirmation, role routes, order draft submission and quantity validation.

## 5. Remaining limitations

- Manual browser checks remain for all five requested sizes, keyboard traversal, 200% text enlargement and visual comparison with the previous CRM, which was not available as a reference.
- Live API checks successfully exercise the actual client and backend but do not substitute for clicking every rendered browser flow.
- No deployment was performed. Production serving needs a same-origin `/api/` proxy and React route fallback; setup is documented in `README.md`.
- Currency is still not defined by the backend. Configure `VITE_CURRENCY` only after confirming it.
- There is no customer-name, product-image or historical fulfillment-event API. Customer IDs and unavailable-product ID fallbacks remain; only the current `updated_at` is shown.
- API responses currently contain the full collection. Server pagination would require extending loading/count behavior.
- Staff and Manager order capabilities remain identical, matching Django's permissions.

**Backend files changed: none.** The existing backend changes supplied by the user were preserved.
