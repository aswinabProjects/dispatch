import pytest
from rest_framework.test import APIClient

from accounts.models import User
from products.models import Product
from orders.models import Order, OrderItem


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def customer(db):
    return User.objects.create_user(
        username='customer1',
        password='testpass123',
        role='customer'
    )


@pytest.fixture
def staff_user(db):
    return User.objects.create_user(
        username='staff1',
        password='testpass123',
        role='staff'
    )


@pytest.fixture
def manager(db):
    return User.objects.create_user(
        username='manager1',
        password='testpass123',
        role='manager'
    )


@pytest.fixture
def product(db):
    return Product.objects.create(
        name='Laptop',
        price=50000.00,
        quantity=10,
        is_active=True
    )


@pytest.fixture
def second_product(db):
    return Product.objects.create(
        name='Keyboard',
        price=2000.00,
        quantity=5,
        is_active=True
    )


@pytest.fixture
def customer_client(api_client, customer):
    api_client.force_authenticate(user=customer)
    return api_client


@pytest.fixture
def staff_client(api_client, staff_user):
    api_client.force_authenticate(user=staff_user)
    return api_client


@pytest.fixture
def manager_client(api_client, manager):
    api_client.force_authenticate(user=manager)
    return api_client


@pytest.mark.django_db
def test_customer_can_create_order(
    customer_client,
    product
):
    data = {
        "order_items": [
            {
                "product": product.id,
                "quantity": 2
            }
        ]
    }

    response = customer_client.post(
        "/api/orders/",
        data,
        format="json"
    )

    assert response.status_code == 201
    assert Order.objects.count() == 1
    assert OrderItem.objects.count() == 1

    product.refresh_from_db()
    assert product.quantity == 8


@pytest.mark.django_db
def test_insufficient_stock(customer_client,product):
    data = {
    "order_items": [
        {
            "product": product.id,
            "quantity": 20
        }
    ]
}
    response = customer_client.post('/api/orders/',data,format='json')

    assert response.status_code == 400
    assert Order.objects.count() == 0
    assert OrderItem.objects.count() == 0

    product.refresh_from_db()
    assert product.quantity == 10


@pytest.mark.django_db
def test_customer_create_inactive_products(customer_client,product):
    product.is_active = False
    product.save()

    data = {
            "order_items": [
                {
                    "product": product.id,
                    "quantity": 2
                }
            ]
        }

    response = customer_client.post('/api/orders/',data,format='json')

    assert response.status_code == 400
    assert Order.objects.count() == 0
    assert OrderItem.objects.count() == 0

    product.refresh_from_db()
    assert product.quantity == 10


@pytest.mark.django_db
def test_customer_cancel_order(customer_client,product,customer):
    product.quantity = 5
    product.save()
    order = Order.objects.create(
        customer=customer,
        status='pending',
    )
    order_item = OrderItem.objects.create(
        order=order,
        product=product,
        quantity=5,
        price=product.price
    )

    
    response = customer_client.patch(f"/api/orders/{order.pk}/cancel/")

    assert response.status_code == 200

    order.refresh_from_db()
    product.refresh_from_db()

    assert order.status == 'cancelled'
    assert product.quantity == 10

@pytest.mark.django_db
def test_fullfillment_status(staff_client,customer):
    order = Order.objects.create(
            customer=customer,
            status='pending',
        )
    data = {
    "status": "confirmed"
}
    response = staff_client.patch(
        f"/api/orders/manage/{order.pk}/status/",
        data,
        format='json'
    )

    assert response.status_code == 200

    order.refresh_from_db()
    assert order.status == "confirmed"

@pytest.mark.django_db
def test_invalid_fulfillment_status(staff_client,customer):
    order = Order.objects.create(
                customer=customer,
                status='pending',
            )
    data = {
        "status": "shipped"
    }
    response = staff_client.patch(
            f"/api/orders/manage/{order.pk}/status/",
            data,
            format='json'
        )

    assert response.status_code == 400

    order.refresh_from_db()
    assert order.status == "pending"

@pytest.mark.django_db
def test_customer_cannot_manage_fulfillment(customer_client,customer):
    order = Order.objects.create(
                customer=customer,
                status='pending',
            )
    data = {
        "status": "confirmed"
    }
    response = customer_client.patch(
            f"/api/orders/manage/{order.pk}/status/",
            data,
            format='json'
        )
    assert response.status_code == 403

    order.refresh_from_db()
    assert order.status == "pending"

def test_unauthenticated_request(api_client):
    response = api_client.get('/api/orders/')
    assert response.status_code == 401

@pytest.mark.django_db
def test_customer_cannot_cancel_non_pending_order(customer_client,
                                                  customer):
    order = Order.objects.create(
                    customer=customer,
                    status='confirmed',
                )
    response = customer_client.patch(f"/api/orders/{order.pk}/cancel/")
    assert response.status_code == 400

    order.refresh_from_db()
    assert order.status == 'confirmed'