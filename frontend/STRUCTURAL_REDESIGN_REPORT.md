# Structural redesign — Dispatch

Completed 14 September 2026. Frontend served locally at http://127.0.0.1:5173.

## 1. Structural patterns removed

Inspection found that the previous version preserved its initial page composition even after restyling:

- A large page introduction followed by a row of stage-summary cards before the actual queue.
- Multiple competing layers of status controls in the rail, summary strip and work tabs.
- The same product-card composition for customer browsing and operator inventory.
- A full-width horizontal progress card above the same item-card/action-card layout for both roles.
- A two-column grid of repeated customer order cards.

The admin summary strip and duplicate stage navigation were removed from the React render tree, not merely hidden with CSS. The old admin table/summary/rail-stage and old customer-card CSS was pruned. Dedicated operations components now render instead of the shared page composition.

## 2. Fulfillment-platform structures added

### Order Queue

The default admin route opens `/orders?status=open`, emphasizing orders still requiring fulfillment. There is no KPI dashboard.

The queue fills the operational content area. It begins with a compact title/refresh row, followed directly by seven status filters with counts: All, Pending, Confirmed, Processing, Shipped, Delivered and Cancelled. A smaller active-work toggle, search and visible-record count sit immediately above the records.

The semantic table contains Order ID, Customer, Items, Current status, Created, Updated and Next action. Both the ID and contextual action link open the order-processing page. Selecting another status updates the URL; direct filtered links work. Terminal rows offer details rather than a transition.

### Order Processing

Operators open a dedicated two-column workspace, separate from customer detail rendering:

| Main processing column                                                | Right action rail                                 |
| --------------------------------------------------------------------- | ------------------------------------------------- |
| Order header and placed/customer context                              | Current status                                    |
| Item table with product, reserved quantity, unit price and line total | Next permitted action                             |
| Order total                                                           | One primary fulfillment action                    |
| Customer ID, created/updated time and total units                     | Terminal-state explanation when no action remains |
| Vertical fulfillment timeline                                         | Return to Order Queue                             |

The right rail is sticky on desktop. Sections are divided with rules rather than repeated rounded cards. Actions call the existing status endpoint and reload the order from Django.

The new vertical fulfillment ledger differentiates completed, current and future stages using checkmarks, a current-stage marker and explicit Complete / Current stage / Upcoming labels. It uses the existing five-step sequence. It does not invent historical event timestamps. Cancelled orders show a closure message.

### Inventory

Staff/Manager inventory is now a compact table with Product, Product ID, Unit price, Available stock and Availability. Search operates on the returned full catalog. There are no operator product cards, cart controls, editing features or new endpoints.

### Navigation

Operators have a persistent desktop rail containing Order Queue and Inventory, plus a compact utility bar for identity and sign-out. Stage selection lives in the queue rather than being repeated in the rail.

These are commerce-oriented record-processing patterns, informed by the order-grid and status-view references reviewed earlier. No product interface, logo, shipping-label workflow, payment flow or analytics module was copied.

## 3. Staff/Manager versus Customer

Staff and Managers share the operational components because their backend order permissions are identical. They browse all permitted inventory and orders, process the next fulfillment step, and see terminal states explicitly.

Customers land on products and use simple top account navigation. They keep the visual product grid, order draft, creation, ownership-scoped history/detail and cancellation confirmation. My Orders is now a vertical purchase list with metadata, item count, total, delivery progress and a details link. It has neither the operator sidebar nor the operational table.

The component boundary is explicit: `Operations.jsx` contains OrderQueue, Inventory, OrderProcessing and FulfillmentTimeline; `CustomerHistory.jsx` contains customer history. `App.jsx` selects the appropriate surface while retaining existing data fetching and actions. `operations.css` owns the operational composition; `styles.css` contains shared controls and customer presentation.

## 4. Unchanged functionality

- Centralized `src/api.js` is byte-for-byte unchanged, verified by SHA-256 comparison.
- JWT login, tab-scoped session storage, shared refresh/retry handling and logout remain intact.
- `/api/me/` remains the source of current identity and role.
- Customer creation, history, detail and dedicated pending cancellation remain intact.
- Staff/Manager list/detail and controlled sequential status updates remain intact.
- Backend authorization remains the security boundary; UI checks control affordances only.
- Loading, errors, retry, 401, 403 and 404 handling remain available.
- No payments, coupons, notifications, analytics, advanced tracking or new endpoints were added.

All 37 backend Python source files match the beginning-of-task SHA-256 snapshot. **Backend files changed: none.**

## 5. Tests, build and integration

| Check                            | Result                                                     |
| -------------------------------- | ---------------------------------------------------------- |
| Frontend tests                   | 33 passed across 3 files                                   |
| ESLint                           | Passed                                                     |
| Production build                 | Passed; Vite compiled 1,596 modules                        |
| Existing expanded live API suite | 21 checks passed against Django through the frontend proxy |
| Frontend URL                     | HTTP 200                                                   |
| Backend source hashes            | 37 compared, 0 changed                                     |
| API client hash                  | Unchanged                                                  |

Existing functional tests were retained; assertions referring to old visible headings were updated to the new Order Queue / My Orders / Fulfillment timeline labels. New tests verify table-only operator inventory, customer grid separation, dedicated processing sections and action region, active admin landing, product-first customer landing, and all seven counted filters.

The live checks use the actual centralized API client and real JWT-authenticated requests. They passed for login/identity/refresh/logout, active/inactive visibility, product write restrictions, order creation/stock reservation, own history/detail, PUT/PATCH/DELETE rejection, cancellation/restoration, duplicate/concurrent cancellation, ownership isolation, role restrictions, validation errors, sequential fulfillment, invalid/terminal transitions and concurrent identical transitions. Timestamped results remain in ignored `test-results/live-api.json`.

## Responsive structure and limits

Conceptual review of the implemented breakpoint rules:

| Width  | Intended structure                                                                                                            |
| ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| 1440px | Persistent 172px rail, full queue columns, main processing column and 292px action rail                                       |
| 1024px | 144px rail, compact table spacing, 245px processing action rail                                                               |
| 768px  | 68px icon rail, Created column hidden, Updated retained, compact two-column processing                                        |
| 390px  | Menu navigation; queue/inventory/item tables become labeled records; action panel precedes detail; timeline stacks vertically |
| 320px  | Three-column wrapping status filters, single-column customer products/order facts, compact record rows                        |

Controls retain 44px minimum primary touch targets. Navigation supports Escape dismissal and focus return. Mobile records are structurally arranged with CSS grid rather than horizontally scrolling desktop tables. Flexible columns, wrapping product names and shrinking search fields address narrow widths.

This was a conceptual/source-level responsive review, as requested. No real-browser screenshots or measured overflow checks were performed; actual visual QA, keyboard traversal and 200% text enlargement remain manual. Exact comparison to the previous CRM remains subjective because that project's source/screenshots were not supplied.

Temporary test data remains available for manual testing; scoped cleanup and startup instructions are in `README.md`. No deployment was performed.
