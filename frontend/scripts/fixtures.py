"""Explicitly invoked local integration fixtures; never changes backend source."""
import json
import os
from pathlib import Path
import secrets
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()
from accounts.models import User
from products.models import Product
from django.db import transaction

output = ROOT / 'frontend' / 'test-results' / 'fixtures.json'
if sys.argv[1:] == ['cleanup']:
    data = json.loads(output.read_text())
    with transaction.atomic():
        for account in data['users']:
            User.objects.filter(pk=account['id'], username=account['username']).delete()
        for product in data['products']:
            Product.objects.filter(pk=product['id'], name=product['name']).delete()
    output.unlink()
    print('Removed only the recorded temporary test accounts, their orders, and products.')
else:
    if output.exists():
        raise SystemExit('Fixture file already exists. Reuse or clean up first.')
    suffix = secrets.token_hex(4)
    password = secrets.token_urlsafe(18)
    data = {'users': [], 'products': []}
    with transaction.atomic():
        for role in ['customer', 'staff', 'manager', 'customer']:
            username = f'dispatch_qa_{role}_{suffix}_{len(data["users"])}'
            user = User.objects.create_user(username=username, password=password, role=role)
            data['users'].append({'id': user.id, 'username': username, 'password': password, 'role': role})
        for name, price, quantity, active in [('Studio keyboard', '89.00', 40, True), ('Travel dock', '129.50', 20, True), ('Desk light', '64.00', 0, True), ('Archive adapter', '19.00', 10, False)]:
            product = Product.objects.create(name=f'{name} · QA {suffix}', price=price, quantity=quantity, is_active=active)
            data['products'].append({'id': product.id, 'name': product.name, 'quantity': quantity, 'is_active': active})
    output.parent.mkdir(exist_ok=True)
    output.write_text(json.dumps(data, indent=2))
    print('Created four temporary accounts and four products; credentials saved in ignored test-results/fixtures.json.')
