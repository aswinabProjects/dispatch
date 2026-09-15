# Dispatch — Order & Fulfillment Management System

Dispatch is a backend-focused **Order & Fulfillment Management System** built with **Django REST Framework and PostgreSQL**, featuring JWT authentication, role-based authorization, transaction-safe inventory management, and concurrency protection, with **React used as the presentation layer**.

The application provides REST APIs for product management, order placement, stock reservation, controlled fulfillment workflows, order cancellation, and role-based operations.

## Key Features

- JWT-based authentication
- Customer, Staff, and Manager roles
- Role-based API permissions
- Product and inventory management
- Customer order placement
- Automatic stock reservation
- Stock restoration on cancellation
- Controlled order fulfillment workflow
- Backend-enforced status transitions
- Transaction-safe inventory operations
- Concurrency protection using database row locking
- Automated API testing
- Dockerized backend
- React-based presentation layer
- CI/CD workflow

## Technology Stack

### Backend
- Python
- Django
- Django REST Framework
- Simple JWT

### Database
- PostgreSQL

### Testing
- pytest
- pytest-django

### DevOps & Deployment
- Docker
- Gunicorn
- GitHub Actions
- Render
- Environment-based configuration

### Frontend / Presentation Layer
- React
- Vite
- JavaScript
- CSS

### Development Tools
- Git
- GitHub
- Postman

## User Roles

### Customer

Customers can:

- View available products
- Create orders
- View their own orders
- View individual order details
- Cancel eligible orders

Customers cannot directly control fulfillment status or access administrative operations.

### Staff

Staff users can:

- Access permitted order and fulfillment operations
- Process orders through the fulfillment workflow
- Perform authorized operational actions

### Manager

Managers have elevated access to:

- Product management
- Order management
- Fulfillment operations
- Administrative workflows

Authorization rules are enforced by the **Django REST Framework backend**, independently of frontend visibility.

## Order Fulfillment Workflow

Dispatch uses a controlled order lifecycle:

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

Orders may also transition to:

```text
Cancelled
```

Backend business rules determine whether a requested transition is valid.

Clients cannot arbitrarily modify fulfillment state.

## Inventory Management

Inventory operations are handled by backend business logic.

When an order is placed:

1. The backend validates the requested order data.
2. Product stock is checked.
3. Required inventory is reserved.
4. The order and its items are created.
5. Stock changes are committed only if the complete operation succeeds.

When an eligible order is cancelled, reserved stock is restored.

This keeps order state and inventory state synchronized.

## Transaction Safety & Concurrency

Critical order and inventory operations use Django database transaction management.

### `transaction.atomic()`

Related database operations are executed as a single transaction.

If one part of an operation fails, the transaction can be rolled back instead of leaving partial order or stock updates in the database.

### `select_for_update()`

Relevant database rows are locked during critical stock and order operations.

This helps protect against race conditions such as:

- Two customers attempting to purchase the same remaining stock
- Multiple cancellation requests affecting the same order
- Simultaneous fulfillment updates
- Conflicting inventory modifications

Together, `transaction.atomic()` and `select_for_update()` help maintain **data integrity and inventory consistency under concurrent requests**.

## Authentication & Authorization

Authentication is implemented using **JWT access and refresh tokens**.

```http
POST /api/token/
POST /api/token/refresh/
GET  /api/me/
```

Protected endpoints require a valid JWT access token.

Example:

```http
Authorization: Bearer <access_token>
```

Backend permissions determine which resources and operations are available to Customer, Staff, and Manager users.

## REST API Design

The backend exposes REST APIs for the application's major resources and workflows, including:

- Authentication
- User identity
- Products
- Orders
- Order details
- Order cancellation
- Fulfillment operations

The API layer handles:

- Authentication
- Authorization
- Request validation
- Business-rule enforcement
- Database operations
- Inventory consistency
- HTTP response handling

## Backend Validation

Business-critical rules are enforced on the backend rather than relying on the React interface.

Validation includes areas such as:

- Order data
- Product availability
- Stock quantity
- User permissions
- Order ownership
- Valid fulfillment transitions
- Cancellation eligibility

This ensures that direct API requests are subject to the same rules as requests originating from the presentation layer.

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/aswinabProjects/dispatch.git
cd dispatch
```

### 2. Create a virtual environment

```bash
python -m venv venv
```

### 3. Activate the environment

Windows:

```bash
venv\Scripts\activate
```

Linux/macOS:

```bash
source venv/bin/activate
```

### 4. Install backend dependencies

```bash
pip install -r requirements.txt
```

### 5. Configure environment variables

Create a `.env` file and configure the required Django and PostgreSQL environment variables.

Sensitive information such as secret keys and database credentials should not be committed to Git.

### 6. Apply migrations

```bash
python manage.py migrate
```

### 7. Start the Django development server

```bash
python manage.py runserver
```

## Frontend Setup

Move into the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

The React application acts as the **presentation layer** and communicates with the Django REST API.

## Testing

Run the backend automated test suite:

```bash
pytest
```

Frontend tests can be run from the frontend directory:

```bash
cd frontend
npm test
```

Run linting:

```bash
npm run lint
```

Create a production build:

```bash
npm run build
```

## Verification

The project was verified through:

- Automated backend testing with pytest
- **33 frontend tests**
- ESLint verification
- Production frontend build
- **21 live API integration checks**

Testing covers critical application behavior including authentication, authorization, order operations, fulfillment workflows, inventory handling, and API validation.

## Docker

The backend can be containerized using Docker.

Build the image:

```bash
docker build -t dispatch-backend .
```

Run the container with environment variables:

```bash
docker run --env-file .env -p 8000:8000 dispatch-backend
```

Gunicorn is used as the production WSGI server.

## CI/CD

The project includes a CI/CD workflow using **GitHub Actions**.

The pipeline supports automated verification of the application before deployment and forms part of the production-oriented development workflow.

## Backend Concepts Demonstrated

Dispatch demonstrates practical implementation of:

- Python backend development
- Django REST Framework
- REST API design
- PostgreSQL data modeling
- Django ORM
- JWT authentication
- Role-based authorization
- API permissions
- Backend validation
- Business-rule enforcement
- Order state management
- Inventory management
- Database transactions
- `transaction.atomic()`
- Row-level locking with `select_for_update()`
- Concurrency control
- Data integrity
- Automated API testing
- Docker containerization
- Gunicorn
- CI/CD
- Backend-to-frontend REST API integration

## Repository

GitHub: https://github.com/aswinabProjects/dispatch

---

**Dispatch** is a portfolio project focused primarily on demonstrating **Python/Django backend engineering, REST API architecture, authentication and authorization, transactional business logic, inventory consistency, concurrency handling, automated testing, and production-oriented deployment practices**.
