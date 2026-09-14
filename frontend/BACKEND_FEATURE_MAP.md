# Backend contract and frontend coverage

Source of truth: `config/{urls,settings}.py`, `accounts/{urls,views,models}.py`, and `products/` and `orders/` URLs, views, serializers, permissions and models. Backend files and data were not changed. No backend tests, fixtures or live mutation scripts were run.

## Authentication and common responses

API authentication is SimpleJWT (`Authorization: Bearer <access>`), not Django session authentication. Existing `api.js` stores the token pair in session storage, refreshes on 401, retries once and ends rejected sessions. Identity and role come from `/api/me/`. The existing `VITE_API_BASE_URL` and Vite proxy settings are unchanged. No registration, profile update, user management, password reset or API logout endpoint exists. Sign out clears the local session.

Protected endpoints require authentication. Missing/expired JWTs return 401; denied roles return 403; missing or queryset-hidden objects return 404; serializer/business-rule errors return 400. Generic views also support HEAD/OPTIONS as framework metadata/read operations, subject to their permissions; these need no separate UI actions. No pagination, server-side search or filtering is configured; existing UI filtering is local.

| Endpoint | Method | Role/scope | Request | Success response | Frontend |
| --- | --- | --- | --- | --- | --- |
| `/api/token/` | POST | Public, valid active account credentials | `{username,password}` | 200 `{access,refresh}` | Sign in |
| `/api/token/refresh/` | POST | Valid refresh token | `{refresh}` | 200 `{access}` under default settings | Automatic refresh |
| `/api/me/` | GET | Any authenticated user | None | 200 `{id,username,role}` | Identity, navigation, guards |
| `/api/products/` | GET | Staff/Manager: all; Customer: active only | None | 200 product array | Inventory / customer catalog |
| `/api/products/` | POST | Staff, Manager | Product writable fields | 201 product | New product |
| `/api/products/:id/` | GET | Same visibility as list | None | 200 product | Linked product detail |
| `/api/products/:id/` | PUT, PATCH | Staff, Manager | Complete required fields for PUT; changed fields for PATCH | 200 product | Edit form uses PATCH |
| `/api/products/:id/` | DELETE | Manager only | None | 204 empty body | Confirmed deletion |
| `/api/orders/` | GET | Customer, own orders only | None | 200 order array | My orders |
| `/api/orders/` | POST | Customer only | `{order_items:[{product,quantity}]}` | 201 order | Catalog checkout |
| `/api/orders/:id/` | GET | Customer owning order | None | 200 order | Customer order detail |
| `/api/orders/:id/cancel/` | PATCH | Customer owning pending order | `{}` | 200 `{detail}` | Confirm cancellation; refetch detail |
| `/api/orders/manage/` | GET | Staff, Manager; all orders | None | 200 order array | Order Queue |
| `/api/orders/manage/:id/` | GET | Staff, Manager; any order | None | 200 order | Processing workspace |
| `/api/orders/manage/:id/status/` | PATCH | Staff, Manager | `{status: nextStage}` | 200 `{detail}` | Next-stage action; refetch detail |

## Product rules

Product response: `{id,name,price,is_active,quantity}`. ID is generated/read-only. Name is required, nonblank, up to 100 characters. Price is required, a decimal with at most 10 total digits and 2 decimal places (8 whole digits); it is returned as a decimal string. The backend has no nonnegative price validator, so the form allows negative prices as well as zero. Quantity is a nonnegative integer (PostgreSQL positive integer field range, up to 2147483647), default 0. Active defaults to true. Neither price nor name has a uniqueness requirement.

Staff and Managers can create, rename, reprice, change available stock and activate/deactivate products. Customers have no mutation controls; direct new-product navigation is guarded. Staff never see delete controls. PATCH sends only changed fields to avoid overwriting unrelated concurrent stock changes. Explicit stock edits set an absolute quantity; the backend has no version/conditional-update mechanism.

Deletion cascades to associated OrderItem rows, including existing order history, because the product foreign key uses CASCADE. The Manager confirmation states this and offers keeping the product; deactivation remains available in the editor. No deletion was performed during implementation or verification.

## Order rules and transitions

Order response: `{id,customer,status,created_at,updated_at,order_items}`. Each item includes `{id,order,product,quantity,price}`. Customer/status and generated IDs/timestamps are server-controlled. Item price is read-only and captured from the product at creation; totals use stored item prices, not current catalog prices. Product names are not embedded, so existing screens resolve them from the catalog and fall back to product IDs when unavailable.

Creation requires an existing active product and a positive integer quantity within available stock. Stock is checked during validation and again under a database lock; reservations and creation are atomic. The UI groups each product into one cart line. The serializer also accepts repeated product lines and an empty item list, but these do not require separate UI features: the existing nonempty grouped cart is preserved. Server validation remains authoritative, including stock changes after catalog loading.

Only an owning Customer can cancel, and only while pending; stock is restored atomically. Staff and Managers cannot use customer order endpoints or cancel orders. There is no order edit/delete endpoint.

Only these fulfillment transitions are permitted:

`pending → confirmed → processing → shipped → delivered`

Cancelled and delivered orders have no further action. The UI offers just the next transition. Failures preserve useful backend feedback and refetch the order to reconcile stale state. Checkout failures remain visible even if the catalog refresh removes every cart item.

## Coverage and boundaries

Added product detail, create, edit and Manager deletion; preserved existing JWT, customer ordering/history/cancellation and operational fulfillment flows. Product editing uses PATCH rather than duplicating the same capability with a separate PUT UI. Framework HEAD/OPTIONS do not need visible controls.

`/admin/` is a separate Django administration application governed by Django staff/superuser permissions, not the business `role` field. Its account/model administration has no corresponding DRF API and cannot be recreated through the current React API architecture. No admin capabilities or endpoints were invented.

Verification uses the existing isolated frontend test approach; test doubles are confined to tests. Application code makes real API calls. Live backend mutation checks are intentionally excluded to respect the no-data-changes requirement.
