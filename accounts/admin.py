from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

"""This lets us manage CRM users through Django admin 
using the standard user-management interface.

("CRM Information", {"fields": ("role",)})=>tells Django 
admin to display our custom role field.


"""
@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("OFMSYS Information", {"fields": ("role",)}),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        ("OFMSYS Information", {"fields": ("role",)}),
    )
