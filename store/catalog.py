from django.templatetags.static import static
from .models import Product


def asset_url(path, preview_root=None):
    if preview_root is not None:
        return f'{preview_root}static/store/{path}'
    return static(f'store/{path}')


def product_data(product, preview_root=None):
    if product.image:
        image = product.image.url
        if preview_root is not None and image.startswith('/'):
            image = preview_root + image.lstrip('/')
    else:
        image = asset_url('assets/' + (product.demo_image or 'product-tee.webp'), preview_root)
    return {
        'id': product.pk, 'name': product.name, 'slug': product.slug,
        'english': product.english_name, 'category': product.category,
        'category_name': product.get_category_display(),
        'description': product.description, 'price': product.price,
        'image': image,
        'sizes': product.sizes, 'colors': product.colors, 'demo': product.is_demo,
    }


def catalog(preview_root=None):
    return [
        product_data(product, preview_root)
        for product in Product.objects.filter(active=True)
    ]
