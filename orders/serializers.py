from rest_framework import serializers
from .models import Order,OrderItem
from products.models import Product
from django.db import transaction

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = '__all__'
        read_only_fields = ['order','price']

    def validate_quantity(self,value):
        if value <= 0:
            raise serializers.ValidationError("It should be greater than zero")

        return value

    def validate_product(self,value):
            if not value.is_active:
                raise serializers.ValidationError("This product is currently inactive")
            return value

    def validate(self, attrs):
         product = attrs['product']
         quantity = attrs['quantity']

         if quantity > product.quantity:
              raise serializers.ValidationError('Stock Insufficient')

         return attrs



class OrderSerializer(serializers.ModelSerializer):
    order_items = OrderItemSerializer(many=True)
    class Meta:
        model = Order
        fields = ['id','customer','status','created_at','updated_at','order_items']
        read_only_fields = ['customer','status']

    def create(self, validated_data):
        items_data = validated_data.pop('order_items')
        user = self.context['request'].user

        with transaction.atomic():
            order = Order.objects.create(
                customer=user,
                **validated_data
            )

            for item_data in items_data:
                product = Product.objects.select_for_update().get(
                    pk = item_data['product'].pk
                )
                quantity = item_data['quantity']

                if product.quantity < quantity :
                    raise serializers.ValidationError('Insufficient Stock')

                OrderItem.objects.create(
                    order=order,
                    product=product,
                    quantity=quantity,
                    price=product.price
                )

                product.quantity -= quantity
                product.save()

        return order
    