from rest_framework.generics import (ListCreateAPIView,
                                     RetrieveUpdateDestroyAPIView)
from .models import Product
from .serializers import ProductSerializer
from rest_framework.permissions import IsAuthenticated
from .permissions import ProductPermission

class ProductListCreateView(ListCreateAPIView):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated,ProductPermission]

    def get_queryset(self):
        user = self.request.user

        if user.role in ['manager','staff']:
            return Product.objects.all()
        return Product.objects.filter(is_active=True)
        


class ProductDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated,ProductPermission]

    def get_queryset(self):
            user = self.request.user
    
            if user.role in ['manager','staff']:
                return Product.objects.all()
            return Product.objects.filter(is_active=True)
