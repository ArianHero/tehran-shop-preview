from django.contrib import admin
from django.utils.html import format_html
from .models import Installation, Product, ManagerContact, Notice

admin.site.site_header = "مدیریت مستر بیلیارد"


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "price", "published")
    fieldsets = (
        ("مشخصات میز یا محصول", {"fields": ("name", "category", "description", "price")}),
        ("عکس و نمای سه‌بعدی", {"fields": ("image", "preview", "model_file"), "description": "عکس اصلی را انتخاب کنید. اگر مدل قابل‌چرخش دارید، فایل GLB را نیز اضافه کنید."}),
        ("انتشار", {"fields": ("published",)}),
    )
    readonly_fields = ("preview",)

    @admin.display(description="پیش‌نمایش عکس ذخیره‌شده")
    def preview(self, obj):
        if obj and obj.image:
            return format_html('<img src="{}" width="150" alt="عکس محصول">', obj.image.url)
        return "پس از ذخیره نمایش داده می‌شود."

    list_filter = ("category", "published")
    search_fields = ("name",)


@admin.register(Installation)
class InstallationAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "topic", "dial", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("=id", "name", "city", "phone")
    readonly_fields = ("topic", "name", "city", "phone", "dial", "email", "details", "created_at")

    @admin.display(description="تماس با مشتری")
    def dial(self, obj):
        return format_html('<a href="tel:{}" dir="ltr">{}</a>', obj.phone, obj.phone)

    def has_add_permission(self, request):
        return False


@admin.register(ManagerContact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ("title", "phone", "public", "notify")


@admin.register(Notice)
class NoticeAdmin(admin.ModelAdmin):
    list_display = ("request", "channel", "recipient", "owner", "state")
    list_filter = ("state", "channel", "owner")
    readonly_fields = ("request", "channel", "recipient", "owner", "state", "error")
    actions = ("retry",)

    @admin.action(description="بازگرداندن اعلان‌های بررسی‌شده به صف")
    def retry(self, request, queryset):
        queryset.filter(state__in=["failed", "sending"]).update(state="new", error="")

    def has_add_permission(self, request):
        return False
