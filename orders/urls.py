from django.urls import path
from .views import (OrderListCreateView,OrderDetailView,CancelOrderView
                    ,StaffOrderListView,StaffOrderDetailView,UpdateOrderStatusView)


urlpatterns = [
    path('',OrderListCreateView.as_view(),name='order-list-create'),
    path('<int:pk>/',OrderDetailView.as_view(),name='order-detail'),
    path('<int:pk>/cancel/',CancelOrderView.as_view(),name='order-cancel'),
    path('manage/',StaffOrderListView.as_view(),name='staff-order-list'),
    path('manage/<int:pk>/',StaffOrderDetailView.as_view(),name='staff-order-detail'),
    path('manage/<int:pk>/status/',UpdateOrderStatusView.as_view(),name='order-status-update')
]