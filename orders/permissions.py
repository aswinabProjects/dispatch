from rest_framework.permissions import BasePermission

class OrderPermission(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'customer'

    def has_object_permission(self, request, view, obj):
        return obj.customer == request.user

class StaffManagerOrderPermission(BasePermission):
    def has_permission(self, request, view):
        return request.user.role in ['manager','staff']

    def has_object_permission(self, request, view, obj):
        return request.user.role in ['manager','staff']
