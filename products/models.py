from django.db import models

# Create your models here.
class Product(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10,decimal_places=2)
    is_active = models.BooleanField(default=True)
    quantity = models.PositiveIntegerField(default=0)