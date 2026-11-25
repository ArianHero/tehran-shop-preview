from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin, messages
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import path, reverse
from django.views.decorators.http import require_GET, require_http_methods

from .forms import InstallationForm
from django.core.cache import cache
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta

from .models import Installation, ManagerContact, Product
from .notifications import enqueue


@require_http_methods(["GET", "POST"])
def storefront(request):
    selected = request.GET.get("topic", Installation.Topic.INSTALL)
    if selected not in Installation.Topic.values:
        selected = Installation.Topic.INSTALL
    form = InstallationForm(request.POST if request.method == "POST" else None, initial={"topic": selected})
    if request.method == "POST" and form.is_valid():
        since = timezone.now() - timedelta(minutes=15)
        same_contact = Q(phone=form.cleaned_data["phone"])
        if form.cleaned_data["email"]:
            same_contact |= Q(email__iexact=form.cleaned_data["email"])
        key = "contact-limit:" + str(request.META.get("REMOTE_ADDR", "local"))
        if Installation.objects.filter(same_contact, created_at__gte=since).count() >= 3:
            form.add_error(None, "چند درخواست برای این شماره یا ایمیل ثبت شده است. لطفاً بعداً تلاش کنید.")
        elif cache.get(key, 0) >= 12:
            form.add_error(None, "تعداد درخواست‌ها زیاد است. لطفاً کمی بعد دوباره تلاش کنید.")
        else:
            with transaction.atomic():
                inquiry = form.save()
                enqueue(inquiry)
            cache.add(key, 0, 900)
            cache.incr(key)
            messages.success(request, f"درخواست شما ثبت شد. کد پیگیری: {inquiry.pk}")
            return redirect(reverse("storefront") + "#installation")
    category = request.GET.get("category", "")
    products = Product.objects.filter(published=True)
    if category in Product.Category.values:
        products = products.filter(category=category)
    return render(request, "shop/index.html", {
        "form": form, "products": products, "categories": Product.Category.choices,
        "contacts": ManagerContact.objects.filter(public=True), "category": category, "invalid": request.method == "POST",
    }, status=400 if request.method == "POST" else 200)


@require_GET
def product_detail(request, pk):
    product = get_object_or_404(Product, pk=pk, published=True)
    return render(request, "shop/product.html", {"product": product, "contact_topic": "install"})


@require_GET
def catalog(request, tables):
    products = Product.objects.filter(published=True)
    products = (products.exclude(category="accessories") if tables else products.filter(category="accessories"))
    return render(request, "shop/catalog.html", {
        "products": products, "contact_topic": "install", "title": "میزهای بیلیارد و اسنوکر" if tables else "سایر محصولات",
    })


@require_GET
def repairs(request):
    return render(request, "shop/repairs.html", {"contact_topic": "repair"})


urlpatterns = [
    path("repairs/", repairs, name="repairs"),
    path("tables/", catalog, {"tables": True}, name="tables"),
    path("accessories/", catalog, {"tables": False}, name="accessories"),
    path("", storefront, name="storefront"),
    path("product/<int:pk>/", product_detail, name="product"),
    path("admin/", admin.site.urls),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
