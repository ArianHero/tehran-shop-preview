from django.db import models
from django.core.exceptions import ValidationError
from .categories import CATEGORIES

class Product(models.Model):
    CATEGORY_CHOICES = [
        (slug, category['name']) for slug, category in CATEGORIES.items()
    ] + [('layers', 'هودی و سویشرت')]
    name = models.CharField('نام محصول', max_length=160)
    slug = models.SlugField(unique=True)
    english_name = models.CharField('نام انگلیسی', max_length=100, blank=True)
    category = models.CharField('دسته‌بندی', max_length=20, choices=CATEGORY_CHOICES)
    description = models.TextField('توضیحات')
    price = models.PositiveIntegerField('قیمت به تومان')
    image = models.ImageField('عکس واقعی محصول', upload_to='products/', blank=True)
    demo_image = models.CharField('مسیر عکس نمونه', max_length=160, blank=True)
    sizes = models.JSONField('سایزها', default=list)
    colors = models.JSONField('رنگ‌ها', default=list)
    active = models.BooleanField('فعال', default=True)
    is_demo = models.BooleanField('محصول نمونه', default=True)
    position = models.PositiveIntegerField('ترتیب نمایش', default=0)

    class Meta:
        ordering = ['position', 'id']
        verbose_name = 'محصول'
        verbose_name_plural = 'محصولات'

    def clean(self):
        if not isinstance(self.sizes, list) or not self.sizes or any(not isinstance(s, str) or not s or len(s) > 12 for s in self.sizes):
            raise ValidationError({'sizes': 'سایزها باید فهرستی از متن‌ها باشند؛ مانند ["S", "M", "L"].'})
        if not isinstance(self.colors, list) or not self.colors or any(not isinstance(c, dict) or not c.get('name') or not isinstance(c.get('hex'), str) or len(c['hex']) != 7 or not c['hex'].startswith('#') or any(ch not in '0123456789abcdefABCDEF' for ch in c['hex'][1:]) for c in self.colors):
            raise ValidationError({'colors': 'هر رنگ باید name و hex معتبر داشته باشد.'})

    def __str__(self):
        return self.name
