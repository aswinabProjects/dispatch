from rest_framework.generics import (ListCreateAPIView,
                                     RetrieveUpdateDestroyAPIView,
                                     ListAPIView,RetrieveAPIView)
from .serializers import OrderSerializer
from rest_framework.permissions import IsAuthenticated
from .models import Order
from .permissions import OrderPermission,StaffManagerOrderPermission
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction


class OrderListCreateView(ListCreateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated,OrderPermission]

    def get_queryset(self):
        user = self.request.user
        return Order.objects.filter(customer=user)



class OrderDetailView(RetrieveAPIView):
        serializer_class = OrderSerializer
        permission_classes = [IsAuthenticated,OrderPermission]
        def get_queryset(self):
                user = self.request.user
                return Order.objects.filter(customer=user)

class StaffOrderListView(ListAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated, StaffManagerOrderPermission]


class StaffOrderDetailView(RetrieveAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated, StaffManagerOrderPermission]

    

class CancelOrderView(APIView):
        permission_classes = [IsAuthenticated,OrderPermission]
        def patch(self,request,pk):
            with transaction.atomic():    
                order = get_object_or_404(Order.objects.select_for_update(),pk=pk,customer=request.user)
                if order.status != 'pending':
                        return Response({"detail":"This order cannot be cancelled"},status=status.HTTP_400_BAD_REQUEST)
                
                for order_item in order.order_items.all():
                        product = order_item.product
                        quantity = order_item.quantity
                        product.quantity += quantity
                        product.save()
                        
                order.status = 'cancelled'
                order.save(update_fields=['status','updated_at'])

            return Response({"detail":"Order successfully Cancelled"},status=status.HTTP_200_OK)
     

class UpdateOrderStatusView(APIView):
      permission_classes = [IsAuthenticated,StaffManagerOrderPermission]

      def patch(self,request,pk):
        with transaction.atomic():    
            order = get_object_or_404(Order.objects.select_for_update(),pk=pk)
            new_status = request.data.get('status')
            current_status = order.status
            valid_transitions = {
                'pending': 'confirmed',
                'confirmed': 'processing',
                'processing': 'shipped',
                'shipped': 'delivered',
                }
            if valid_transitions.get(current_status) != new_status:
                  return Response({"detail":"This transaction not allowed"}
                                  ,status=status.HTTP_400_BAD_REQUEST)

            order.status = new_status
            order.save(update_fields=['status','updated_at'])

        return Response({"detail":"Status Changed Successfully"}
                            ,status=status.HTTP_200_OK)



    



    

