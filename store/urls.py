from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('shop/', views.shop, name='shop'),
    path('category/<slug:slug>/', views.category_view, name='category'),
    path('api/products/', views.products_api, name='products'),
    path('api/cart/', views.cart_api, name='cart'),
    path('api/checkout/', views.checkout_api, name='checkout'),
]
