from django.db import models
from .validators import normalize_phone, validate_model, validate_phone


class Product(models.Model):
    class Category(models.TextChoices):
        POOL = "pool", "میز بیلیارد"
        SNOOKER = "snooker", "میز اسنوکر"
        ACCESSORIES = "accessories", "لوازم بازی"

    name = models.CharField("نام محصول", max_length=120)
    category = models.CharField("دسته‌بندی", max_length=16, choices=Category.choices)
    description = models.TextField("توضیحات", blank=True)
    price = models.PositiveBigIntegerField("قیمت به تومان", null=True, blank=True)
    image = models.ImageField("عکس محصول", upload_to="products/%Y/%m/", blank=True)
    model_file = models.FileField("مدل سه‌بعدی میز", blank=True, upload_to="models/%Y/%m/", validators=[validate_model], help_text="فایل GLB با بافت‌های داخلی، حداکثر ۲۰ مگابایت")
    published = models.BooleanField("نمایش در سایت", default=False)

    class Meta:
        ordering = ["-id"]
        verbose_name = "محصول"
        verbose_name_plural = "محصولات"

    def __str__(self):
        return self.name


class Installation(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "جدید"
        CONTACTED = "contacted", "تماس گرفته شد"
        CLOSED = "closed", "بسته شد"

    class Topic(models.TextChoices):
        INSTALL = "install", "نصب و فروش میز"
        PRICE = "price", "استعلام قیمت"
        REPAIR = "repair", "تعمیرات"
        SUPPORT = "support", "پشتیبانی"

    topic = models.CharField("موضوع درخواست", max_length=10, choices=Topic.choices, default=Topic.INSTALL)
    email = models.EmailField("ایمیل (اختیاری)", blank=True)
    name = models.CharField("نام و نام خانوادگی", max_length=100)
    phone = models.CharField("شماره تماس", max_length=16)
    city = models.CharField("شهر (اختیاری)", max_length=80, blank=True)
    details = models.TextField("پیام شما (اختیاری)", max_length=1500, blank=True)
    created_at = models.DateTimeField("زمان ثبت", auto_now_add=True)
    status = models.CharField("وضعیت", max_length=16, choices=Status.choices, default=Status.NEW)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "درخواست نصب"
        verbose_name_plural = "درخواست‌های تماس"

    def __str__(self):
        return f"{self.name} — {self.city}"


class ManagerContact(models.Model):
    title = models.CharField("عنوان مسئول", max_length=60)
    phone = models.CharField("شماره تماس عمومی", max_length=22, blank=True, validators=[validate_phone])
    telegram = models.URLField("لینک تلگرام", blank=True)
    instagram = models.URLField("لینک Instagram", blank=True, help_text="اولین لینک اینستاگرام عمومی در سربرگ نمایش داده می‌شود.")
    email = models.EmailField("ایمیل دریافت اعلان (خصوصی)", blank=True)
    notify = models.BooleanField("دریافت اعلان درخواست جدید", default=True)
    public = models.BooleanField("نمایش راه‌های ارتباطی در سایت", default=True)

    @property
    def dial(self):
        return normalize_phone(self.phone)

    class Meta:
        verbose_name = "راه تماس مدیر"
        verbose_name_plural = "راه‌های تماس مدیران"

    def __str__(self):
        return self.title


class Notice(models.Model):
    request = models.ForeignKey(Installation, on_delete=models.CASCADE, verbose_name="درخواست")
    channel = models.CharField("کانال", max_length=5, choices=[("sms", "پیامک"), ("email", "ایمیل")])
    recipient = models.CharField("گیرنده", max_length=254)
    owner = models.BooleanField("اعلان مدیر", default=False)
    state = models.CharField("وضعیت ارسال", max_length=10, default="new", choices=[
        ("new", "در صف"), ("sending", "در حال ارسال"), ("sent", "پذیرفته‌شده توسط سرویس"),
        ("failed", "نیازمند بررسی"),
    ])
    error = models.CharField("توضیح", max_length=200, blank=True)

    class Meta:
        verbose_name = "اعلان"
        verbose_name_plural = "اعلان‌های پیامکی و ایمیلی"
