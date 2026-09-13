from rest_framework.permissions import BasePermission,SAFE_METHODS

class ProductPermission(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user

        if request.method in SAFE_METHODS:
            return True
        if user.role == 'staff' and request.method == 'DELETE':
            return False

        return user.role in ['manager','staff']
        
    def has_permission(self, request, view):
        user = request.user
        
        if request.method in SAFE_METHODS:
            return True
        if user.role == 'customer':
            return False
        
        return user.role in ['manager','staff']
