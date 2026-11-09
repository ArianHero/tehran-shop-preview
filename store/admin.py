from django.contrib import admin
from .models import Product

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'price', 'active', 'is_demo', 'position']
    list_filter = ['category', 'active', 'is_demo']
    list_editable = ['price', 'active', 'position']
    search_fields = ['name', 'english_name', 'slug']
    prepopulated_fields = {'slug': ('english_name',)}
