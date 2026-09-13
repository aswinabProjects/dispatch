# Dispatch — Order & Fulfillment frontend

A React frontend for the existing Django REST Framework application. Backend models, serializers, role permissions, routes, and fulfillment actions are the API contract. No Django source changes are needed for local integration.

## Run locally

Start the existing Django backend from `order_ful_mgmt_sys`:

```powershell
.\venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

In another terminal:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open http://127.0.0.1:5173 and use an existing Django account. There is no public registration endpoint. On shells that support it, `npm` works in place of `npm.cmd`.

The Vite server proxies `/api/*` to `http://127.0.0.1:8000`. This avoids browser CORS changes to the backend. Copy `.env.example` to `.env.local` to change `API_PROXY_TARGET`. The API supplies decimal prices but no currency; prices intentionally have no currency symbol unless `VITE_CURRENCY` is configured with an ISO currency code. Restart Vite after changing environment variables.

## Architecture

- `src/api.js`: central fetch client, JWT session storage, single-flight refresh, bounded retry, error normalization, logout notification, endpoint helpers.
- `src/App.jsx`: auth context and bootstrap, protected application shell, URL routing, product catalog/order draft, role-aware order lists and details, action feedback.
- `src/Operations.jsx`: separate Order Queue, table-only Inventory, Order Processing workspace, and fulfillment ledger.
- `src/CustomerHistory.jsx`: customer purchase history with account-style records; no administrative queue/table.
- `src/domain.js`: status sequence, UI role/cancellation checks, decimal totals, date/price formatting.
- `src/styles.css`: shared controls and customer portal styles.
- `src/operations.css`: dedicated full-width operations composition, fixed rail, queue/inventory tables, processing action rail, vertical fulfillment ledger, and responsive record layouts.
- `src/*.test.*`: API/authentication, domain, and React interaction tests.
- `scripts/fixtures.py`: opt-in temporary local integration fixtures and scoped cleanup.
- `scripts/live-api.mjs`: live tests through the Vite proxy using `src/api.js`, not a duplicate request implementation.

The small shared components include brand/navigation, page headings, status badges, loading/empty/error states, product cards, draft lines, order rows, fulfillment progress, and action panels. There are no mock data fallbacks in the application.

## Routes and role behavior

| Route         | Customer                                     | Staff / Manager                                    |
| ------------- | -------------------------------------------- | -------------------------------------------------- |
| `/`           | Redirect to order history                    | Redirect to fulfillment queue                      |
| `/orders`     | Own order history                            | All orders from management API                     |
| `/products`   | Active product browsing and order draft      | All visible inventory, including inactive products |
| `/orders/new` | Create order from product IDs and quantities | Access-restricted message                          |
| `/orders/:id` | Own details and pending cancellation         | Management detail and next fulfillment action      |

The backend grants Staff and Manager the same order-management powers. Both receive the same fulfillment tools with distinct role labels. No invented Manager-only dashboard or customer-order capability is added. Product modification is outside this frontend's requested scope.

Frontend role checks control navigation and affordances only. Django still decides whether each request is permitted. Unknown roles receive an explicit unsupported-role screen. Direct links still use the appropriate role-specific API; API 403/404 responses display errors rather than pretending a record exists.

## API contract

| Method    | Endpoint                         | Usage                                             |
| --------- | -------------------------------- | ------------------------------------------------- |
| POST      | `/api/token/`                    | Username/password login                           |
| POST      | `/api/token/refresh/`            | Refresh rejected/expired access token             |
| GET       | `/api/me/`                       | Authoritative current user `{id, username, role}` |
| GET       | `/api/products/`                 | Product catalog and current stock                 |
| GET, POST | `/api/orders/`                   | Customer history / create order                   |
| GET       | `/api/orders/:id/`               | Customer-owned detail                             |
| PATCH     | `/api/orders/:id/cancel/`        | Cancel pending customer-owned order               |
| GET       | `/api/orders/manage/`            | Staff/Manager queue                               |
| GET       | `/api/orders/manage/:id/`        | Staff/Manager detail                              |
| PATCH     | `/api/orders/manage/:id/status/` | Send `{status: nextStatus}`                       |

Order creation sends only `{order_items: [{product, quantity}]}`. Django assigns customer, status, reserved quantities, and historical unit prices. Display totals use the saved order-item prices. UI drafts disallow empty orders, inactive/out-of-stock products, fractional quantities, and quantities exceeding the last stock response. The backend revalidates stock at submission; DRF errors are displayed and the catalog is refreshed on failure.

Fulfillment is exactly `pending → confirmed → processing → shipped → delivered`. The UI offers only the next step. Delivered and cancelled orders have no further transition control. Customers must confirm cancellation, and it appears only for their own pending orders. Order details reload after actions instead of assuming a response includes an updated order.

## JWT and identity

1. Login sends credentials to `/api/token/`; the password is not retained.
2. Tokens live in memory and tab-scoped `sessionStorage`, surviving reloads but not ordinary tab closure. Storage failure falls back to in-memory operation. Browser JavaScript can access these tokens; an HttpOnly cookie design would require a separate backend integration, which is not introduced here.
3. `/api/me/` runs after login and when restoring a session. Its response determines identity, supported role, navigation, and endpoint selection. JWT payload claims are not treated as the source of user-role truth.
4. Protected requests attach `Authorization: Bearer <access>`. A 401 triggers one shared refresh request, then retries the original request once. Concurrent requests reuse refreshed credentials.
5. Invalid refresh credentials or a repeated 401 clear the session and return to sign-in. Refresh network/server failures remain retryable without discarding valid stored refresh credentials. A 403 never triggers refresh.
6. A session-generation guard prevents a late login/refresh response from restoring a logged-out session. Logout clears local tokens; there is no server logout/blacklist endpoint in this backend.

## Responsive and accessibility behavior

- Desktop (1440px): compact application bar and left rail for operations, structured order table and stage filters; customers get horizontal shop/account navigation and order cards.
- Laptop (1024px): narrower rail, reduced spacing, wrapping toolbars and compact table columns.
- Tablet (768px): the operations rail compresses to an icon rail and the queue hides its Created column; Updated remains available. Customers retain horizontal account navigation.
- Mobile (390px): below 700px, navigation uses a menu toggle, operational table rows become labeled summaries, customer cards use one column, drafts/actions stack, and progress becomes vertical.
- Small mobile (320px): below 360px, products use one column, account metadata simplifies, and status tabs wrap into three columns. Mobile processing actions appear before the item details.
- Semantic navigation, forms and labels, visible focus outlines, skip link, status/error announcements, accessible icon-button labels, reduced-motion support, and minimum 44px main controls.
- Fonts use local system fallbacks, without external font requests. Product imagery is not fabricated; the API has no images or descriptions.

## Validation and live test fixtures

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

For explicitly authorized temporary integration data, run from the Django project root:

```powershell
.\venv\Scripts\python.exe frontend/scripts/fixtures.py
```

Credentials and exact fixture IDs are written to ignored `frontend/test-results/fixtures.json`. With both servers running, from `frontend`:

```powershell
node scripts/live-api.mjs
```

The script creates test orders and writes ignored `test-results/live-api.json`. It measures the fixture product's stock at the start of each run, so it can be repeated while stock remains available. It checks direct order-detail write rejection, timestamps, ownership, product restrictions, and concurrent same-order cancellation/status transitions. Do not point these checks at production. Cleanup from the Django root:

```powershell
.\venv\Scripts\python.exe frontend/scripts/fixtures.py cleanup
```

Cleanup matches the recorded IDs and exact generated names, deletes test users/their orders and the generated products, and removes the credentials file. It does not delete unrelated records. The database may retain gaps in auto-increment IDs.

## Production serving

`npm.cmd run build` creates `dist/`. `npm.cmd run preview` serves that output locally on port 4173 with the API proxy for checking; it is not a production server.

Production must serve the static build and reverse-proxy `/api/` to Django under the same HTTPS origin. Configure history fallback for React routes. For example, an existing Nginx deployment can use this routing pattern, adapted to its paths and upstream:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
location / {
    root /srv/dispatch/dist;
    try_files $uri $uri/ /index.html;
}
```

The backend's existing production settings (allowed hosts, secret management, debug, HTTPS) remain the deployment owner's responsibility. A separately hosted cross-origin frontend would need backend CORS or another same-origin proxy. This work does not deploy or change Django configuration.

## Backend observations and scope limits

- Product list/create and detail views apply `ProductPermission`; customers are denied product writes.
- Customer order detail is retrieve-only. Direct PUT/PATCH/DELETE return 405; cancellation uses its dedicated endpoint.
- Cancellation and fulfillment transitions use atomic transactions and lock the order row. Same-order concurrent duplicate requests are included in live verification; this is not a comprehensive concurrency audit across multiple orders/products.
- Status changes update `updated_at`. The operator detail panel shows this timestamp; no intermediate event history is invented.
- Orders expose customer IDs, not names. Historical item names may be unavailable when products are inactive or absent from a customer's catalog; the detail page falls back to product IDs.
- No API pagination is configured. Filtering and counts operate on the returned collection; enabling server pagination later requires pagination-aware loading before aggregate counts can represent the complete dataset.
- The redesign replaces the former navy/cobalt composition with a light, compact operations console and a distinct customer portal. Exact comparison to the separate CRM project still requires its visual reference.

The default admin route opens the active Order Queue (`/orders?status=open`); customers land on `/products`. All seven queue status filters carry counts. Operators browse inventory in a table and process orders in a dedicated two-column workspace.

See `STRUCTURAL_REDESIGN_REPORT.md` for the latest checks and structural changes. `IMPLEMENTATION_REPORT.md` records the earlier redesign.
