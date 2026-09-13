# Dispatch — Order & Fulfillment Management System

A full-stack **Order & Fulfillment Management System** built with Django REST Framework, PostgreSQL, React, and JWT authentication.

The project simulates the backend and operational workflow of an online ordering system after a customer places an order. It supports product management, order creation, inventory reservation, customer cancellation, role-based access control, and controlled fulfillment from order placement through delivery.

The frontend provides two distinct experiences:

- A customer-facing ordering portal
- A Staff/Manager fulfillment operations workspace

---

## Features

### Authentication

- JWT-based authentication
- Access and refresh tokens
- Automatic access-token refresh
- Authenticated current-user endpoint (`/api/me/`)
- Role-aware frontend navigation
- Protected API endpoints
- Session handling and logout

### User Roles

The system supports three roles:

#### Customer

Customers can:

- Browse active products
- Create orders
- View their own order history
- View individual orders
- Cancel their own pending orders
- Track order fulfillment progress

Customers cannot:

- Access another customer's orders
- Manage fulfillment
- Create or modify products
- Directly modify or delete orders

#### Staff

Staff members can:

- View all products
- Create and update products
- View all customer orders
- View individual order details
- Advance orders through the fulfillment workflow

Staff cannot delete products.

#### Manager

Managers can:

- View all products
- Create, update, and delete products
- View all orders
- View individual order details
- Manage the complete fulfillment workflow

---

## Order Fulfillment Workflow

Orders follow a controlled state transition:

```text
Pending
   ↓
Confirmed
   ↓
Processing
   ↓
Shipped
   ↓
Delivered
```

A pending order may also be:

```text
Pending → Cancelled
```

Invalid transitions are rejected by the backend.

For example:

```text
Pending → Shipped
```

is not permitted.

Delivered and cancelled orders are terminal states.

---

## Stock Management

Product stock is managed automatically during order operations.

### Order Creation

When an order is created:

1. The backend validates every requested product.
2. The product must be active.
3. The requested quantity must be greater than zero.
4. Sufficient stock must be available.
5. The current product price is captured by the backend.
6. Product stock is deducted.
7. The order and its items are created.

The client is not trusted to provide the final product price.

### Order Cancellation

Customers may cancel only their own **pending** orders.

When an order is cancelled:

- Its status changes to `cancelled`.
- The quantities reserved by the order are returned to product inventory.

Orders that have already entered fulfillment cannot be cancelled by the customer.

---

## Transaction Safety & Concurrency

Critical stock and order operations use PostgreSQL transaction protection.

### Atomic Transactions

Django's:

```python
transaction.atomic()
```

ensures multi-step database operations follow an **all-or-nothing** rule.

If one item in a multi-product order fails validation or stock verification, previous database changes within the transaction are rolled back.

### Row-Level Locking

Critical database rows are retrieved using:

```python
select_for_update()
```

This prevents concurrent requests from modifying the same stock or order state simultaneously.

It protects operations such as:

- Concurrent purchases of the last available product
- Duplicate order cancellations
- Concurrent fulfillment status changes

---

## Tech Stack

### Backend

- Python
- Django
- Django REST Framework
- PostgreSQL
- Simple JWT
- pytest
- pytest-django

### Frontend

- React 19
- Vite
- React Router
- JavaScript
- CSS
- Lucide Icons
- Vitest
- Testing Library
- ESLint

---

## Project Architecture

```text
order_ful_mgmt_sys/
│
├── accounts/
│   ├── models.py
│   └── ...
│
├── products/
│   ├── models.py
│   ├── serializers.py
│   ├── permissions.py
│   ├── views.py
│   ├── urls.py
│   └── ...
│
├── orders/
│   ├── models.py
│   ├── serializers.py
│   ├── permissions.py
│   ├── views.py
│   ├── urls.py
│   └── ...
│
├── config/
│   ├── settings.py
│   ├── urls.py
│   └── ...
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── manage.py
├── pytest.ini
└── README.md
```

The backend is separated into domain-specific Django applications:

- `accounts` — authentication and user roles
- `products` — product catalog and inventory
- `orders` — ordering and fulfillment workflow

---

## Data Model

### User

The custom User model extends Django's `AbstractUser`.

Important field:

```text
role
```

Supported values:

```text
customer
staff
manager
```

---

### Product

A Product contains:

```text
name
price
quantity
is_active
```

`quantity` represents currently available stock.

Inactive products are hidden from customers.

---

### Order

An Order contains:

```text
customer
status
created_at
updated_at
```

Each order belongs to one customer.

---

### OrderItem

`OrderItem` acts as the intermediate relationship between an Order and a Product.

It stores:

```text
order
product
quantity
price
```

The price is captured when the order is created so the order retains its original purchase price even if the Product price changes later.

Relationship:

```text
User
  │
  └── Order
        │
        └── OrderItem
              │
              └── Product
```

---

## REST API

### Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/token/` | Obtain access and refresh tokens |
| POST | `/api/token/refresh/` | Refresh access token |
| GET | `/api/me/` | Retrieve authenticated user's identity and role |

---

## Product API

| Method | Endpoint | Customer | Staff | Manager |
|---|---|---:|---:|---:|
| GET | `/api/products/` | ✅ Active only | ✅ | ✅ |
| POST | `/api/products/` | ❌ | ✅ | ✅ |
| GET | `/api/products/<id>/` | ✅ Active only | ✅ | ✅ |
| PUT/PATCH | `/api/products/<id>/` | ❌ | ✅ | ✅ |
| DELETE | `/api/products/<id>/` | ❌ | ❌ | ✅ |

Product permissions are enforced by the backend rather than relying on frontend visibility.

---

## Customer Order API

### List/Create Orders

```http
GET /api/orders/
POST /api/orders/
```

Customers can retrieve only their own orders.

Example order creation request:

```json
{
  "order_items": [
    {
      "product": 1,
      "quantity": 2
    },
    {
      "product": 3,
      "quantity": 1
    }
  ]
}
```

The backend determines:

- Customer
- Product price
- Initial order status
- Stock changes

---

### Order Detail

```http
GET /api/orders/<id>/
```

The customer detail endpoint is retrieve-only.

Direct:

```http
PUT
PATCH
DELETE
```

operations are not permitted.

---

### Cancel Order

```http
PATCH /api/orders/<id>/cancel/
```

Cancellation is permitted only when:

```text
order.customer == request.user
```

and:

```text
order.status == "pending"
```

Successful cancellation restores reserved product stock.

---

## Staff & Manager Order API

### Fulfillment Queue

```http
GET /api/orders/manage/
```

Returns orders available to Staff and Managers for fulfillment management.

### Management Detail

```http
GET /api/orders/manage/<id>/
```

### Update Fulfillment Status

```http
PATCH /api/orders/manage/<id>/status/
```

Example:

```json
{
  "status": "confirmed"
}
```

The backend validates that the requested transition is the next permitted state.

---

## Permissions & Security

Authorization is enforced by Django REST Framework.

The frontend uses role information to provide an appropriate interface, but frontend checks are **not treated as security controls**.

Important backend protections include:

- Authentication required for protected resources
- Customer order ownership
- Customer product restrictions
- Staff/Manager fulfillment restrictions
- Product modification permissions
- Server-controlled prices
- Server-controlled order status
- Controlled fulfillment transitions
- Transaction-safe stock updates
- Row locking for concurrency-sensitive operations

---

## Frontend

The React frontend communicates directly with the Django REST API through a centralized API client.

### Authentication Flow

```text
Login
  ↓
POST /api/token/
  ↓
Store JWT session
  ↓
GET /api/me/
  ↓
Determine user role
  ↓
Load appropriate interface
```

When an access token expires, the frontend attempts to obtain a new access token using the refresh token and retries the original request.

---

## Customer Interface

The customer experience is designed as an ordering/account portal.

It includes:

- Product browsing
- Order draft
- Order creation
- My Orders
- Order details
- Fulfillment progress
- Pending-order cancellation

---

## Staff / Manager Fulfillment Workspace

Staff and Managers use a separate operational interface centered around an **Order Queue**.

It includes:

- Fulfillment navigation rail
- Active order queue
- Status filters
- Order counts
- Inventory table
- Order processing workspace
- Order item information
- Customer information
- Fulfillment timeline
- Next-action controls
- Completed/cancelled terminal states

The interface is intentionally structured as an operations workspace rather than a generic CRM dashboard.

---

## Responsive Design

The frontend adapts across:

- Desktop
- Laptop
- Tablet
- Mobile

Responsive behavior includes:

- Collapsible operational navigation
- Responsive product layouts
- Order tables converted to mobile-friendly summaries
- Stacked actions on smaller screens
- Vertical fulfillment progress on mobile
- Touch-friendly controls

Layouts were designed for common widths including:

```text
1440px
1024px
768px
390px
320px
```

---

## Backend Testing

Backend testing uses:

```bash
pytest
```

Tests cover critical business behavior including:

- Successful order creation
- Stock deduction
- Insufficient stock rejection
- Inactive product rejection
- Cancellation
- Stock restoration
- Valid fulfillment transitions
- Invalid fulfillment transitions
- Customer fulfillment restrictions
- Authentication requirements
- Non-pending cancellation restrictions
- Role and ownership behavior

Run the backend test suite:

```bash
pytest -v
```

---

## Frontend Testing

The React application uses Vitest and Testing Library.

The completed frontend verification includes:

```text
33 frontend tests passed
ESLint passed
Production build passed
21 live API integration checks passed
```

Tests cover areas such as:

- Authentication
- JWT refresh behavior
- Role-aware navigation
- API request handling
- Order creation
- Cancellation
- Fulfillment actions
- Permission errors
- Validation errors
- UI workflow rules

---

## Live Integration Verification

The frontend was tested against the real Django REST API using JWT-authenticated HTTP requests.

Verified scenarios include:

- JWT login
- `/api/me/`
- Token refresh
- Product visibility
- Order creation
- Price snapshotting
- Stock reservation
- Stock restoration
- Customer ownership restrictions
- Staff restrictions
- Manager access
- Valid fulfillment transitions
- Invalid fulfillment transitions
- Customer cancellation rules
- Customer fulfillment restrictions
- Direct order modification restrictions
- Concurrent cancellation protection
- Concurrent fulfillment-transition protection
- `updated_at` changes

The frontend does not rely on a mock backend for these integration checks.

---

## Local Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd order_ful_mgmt_sys
```

---

### 2. Create Virtual Environment

Windows:

```bash
python -m venv venv
venv\Scripts\activate
```

Linux/macOS:

```bash
python3 -m venv venv
source venv/bin/activate
```

---

### 3. Install Backend Dependencies

```bash
pip install -r requirements.txt
```

---

### 4. Configure PostgreSQL

Create a PostgreSQL database and configure the Django database settings/environment variables for your local environment.

Example configuration:

```text
ENGINE=django.db.backends.postgresql
NAME=<database-name>
USER=<database-user>
PASSWORD=<database-password>
HOST=localhost
PORT=5432
```

Do not commit real database passwords or secrets to the repository.

---

### 5. Apply Migrations

```bash
python manage.py migrate
```

---

### 6. Create Admin User

```bash
python manage.py createsuperuser
```

---

### 7. Start Django

```bash
python manage.py runserver
```

Backend:

```text
http://127.0.0.1:8000/
```

---

## Frontend Setup

Move into the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start Vite:

```bash
npm run dev
```

Frontend:

```text
http://127.0.0.1:5173/
```

---

## Production Frontend Build

```bash
npm run build
```

The production bundle is generated in:

```text
frontend/dist/
```

---

## Development Principles Demonstrated

This project demonstrates practical backend-development concepts including:

- Requirement-to-feature implementation
- Django application architecture
- Custom User models
- Relational database modeling
- Intermediate relationship models
- REST API development
- Serializer validation
- Role-based authorization
- Object-level ownership
- Business-rule enforcement
- JWT authentication
- PostgreSQL transactions
- Atomicity
- Row-level locking
- Race-condition prevention
- Inventory consistency
- Controlled state transitions
- Backend unit/integration testing
- React ↔ REST API integration

---

## Future Enhancements

The current scope intentionally focuses on the core order and fulfillment workflow.

Potential future additions could include:

- Payment integration
- Shipment-provider integration
- Notifications
- Coupons and promotions
- Server-side pagination/filtering for large datasets
- Product images
- Fulfillment event history
- Reporting and analytics

These features are intentionally outside the current project scope.

---

## Project Status

**Completed**

The core Django/DRF backend, PostgreSQL integration, authentication, permissions, order workflow, stock management, concurrency protection, automated testing, React frontend, and live API integration are implemented and verified.

---

## Author

**Aswin A B**

Python / Django Backend Developer