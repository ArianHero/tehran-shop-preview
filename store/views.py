import json
from django.http import Http404, JsonResponse
from django.shortcuts import render
from django.urls import reverse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods
from .catalog import asset_url, catalog, product_data
from .categories import CATEGORIES
from .models import Product

INSTAGRAM_URL = 'https://www.instagram.com/tehran.sporshop/'


def page_context(backend=True, page='home', category_slug=None):
    preview_root = None if backend else '../' * {'home': 0, 'shop': 1, 'category': 2}[page]
    products = catalog(preview_root)
    categories = []
    for index, (slug, details) in enumerate(CATEGORIES.items(), start=1):
        matches = [product for product in products if product['category'] == slug]
        url = reverse('category', args=[slug]) if backend else f'{preview_root}category/{slug}/index.html'
        categories.append({
            **details, 'slug': slug, 'number': f'{index:02d}', 'url': url,
            'cover': matches[0]['image'] if matches else None, 'count': len(matches),
        })

    category = next((row for row in categories if row['slug'] == category_slug), None)
    if category:
        visible = [product for product in products if product['category'] == category_slug]
    elif page == 'home':
        visible = products[:4]
    else:
        visible = products

    assets = {
        name: asset_url(path, preview_root)
        for name, path in {
            'css': 'style.css',
            'script': 'app.js',
            'font': 'assets/vazirmatn.woff2',
            'logo': 'assets/tehran-shop-logo.webp',
            'icon': 'assets/tehran-shop-icon.png',
            'hero': 'assets/basketball-sunset.webp',
            'court': 'assets/basketball-court.webp',
        }.items()
    }
    sizes = dict.fromkeys(size for product in visible for size in product['sizes'])
    size_order = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
    sizes = [size for size in size_order if size in sizes] + [
        size for size in sizes if size not in size_order
    ]
    title = category['name'] if category else ('پوشاک بسکتبال و تمرین' if page == 'home' else 'همه محصولات')
    visible_ids = [product['id'] for product in visible]
    return {
        'page': page, 'title': title, 'products': products, 'visible_ids': visible_ids,
        'categories': categories, 'category': category, 'sizes': sizes, 'assets': assets,
        'home_url': reverse('home') if backend else f'{preview_root}index.html',
        'shop_url': reverse('shop') if backend else f'{preview_root}shop/index.html',
        'instagram_url': INSTAGRAM_URL,
        'runtime': {
            'backend': backend, 'products': products, 'page': page,
            'category': category_slug, 'visible_ids': visible_ids,
            'cart_url': reverse('cart') if backend else None,
        },
    }


@ensure_csrf_cookie
def home(request):
    return render(request, 'store/home.html', page_context())


@ensure_csrf_cookie
def shop(request):
    return render(request, 'store/category.html', page_context(page='shop'))


@ensure_csrf_cookie
def category_view(request, slug):
    if slug not in CATEGORIES:
        raise Http404
    context = page_context(page='category', category_slug=slug)
    return render(request, 'store/category.html', context)


def products_api(request):
    return JsonResponse({'products': catalog()})

def cart_data(request):
    stored = request.session.get('cart', {})
    active = {p.pk: p for p in Product.objects.filter(active=True)}
    items = []
    clean = {}
    for key, line in stored.items():
        p = active.get(line.get('product_id'))
        if not p or line.get('size') not in p.sizes or line.get('color') not in [c['name'] for c in p.colors]:
            continue
        quantity = line.get('quantity', 0)
        if not isinstance(quantity, int) or isinstance(quantity, bool) or not 1 <= quantity <= 10:
            continue
        clean[key] = line
        items.append({'key': key, 'product': product_data(p), 'size': line['size'], 'color': line['color'], 'quantity': quantity, 'subtotal': p.price * quantity})
    if clean != stored:
        request.session['cart'] = clean
    return {'items': items, 'count': sum(i['quantity'] for i in items), 'total': sum(i['subtotal'] for i in items), 'demo': True}

@require_http_methods(['GET', 'POST', 'PATCH', 'DELETE'])
def cart_api(request):
    if request.method == 'GET':
        return JsonResponse(cart_data(request))
    try:
        data = json.loads(request.body)
        if not isinstance(data, dict):
            raise ValueError
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({'error': 'اطلاعات درخواست معتبر نیست.'}, status=400)
    cart_data(request)
    cart = request.session.get('cart', {}).copy()
    if request.method == 'DELETE':
        key = data.get('key')
        if not isinstance(key, str) or key not in cart:
            return JsonResponse({'error': 'این محصول در سبد نیست.'}, status=404)
        del cart[key]
    elif request.method == 'PATCH':
        key, qty = data.get('key'), data.get('quantity')
        if not isinstance(key, str) or key not in cart:
            return JsonResponse({'error': 'این محصول در سبد نیست.'}, status=404)
        if type(qty) is not int or not 1 <= qty <= 10:
            return JsonResponse({'error': 'تعداد باید از ۱ تا ۱۰ باشد.'}, status=400)
        cart[key] = {**cart[key], 'quantity': qty}
    else:
        pid, size, color, qty = data.get('product_id'), data.get('size'), data.get('color'), data.get('quantity', 1)
        if type(pid) is not int or type(qty) is not int or not 1 <= qty <= 10:
            return JsonResponse({'error': 'محصول یا تعداد معتبر نیست.'}, status=400)
        product = Product.objects.filter(pk=pid, active=True).first()
        if not product:
            return JsonResponse({'error': 'محصول پیدا نشد.'}, status=404)
        if size not in product.sizes or color not in [c['name'] for c in product.colors]:
            return JsonResponse({'error': 'سایز و رنگ معتبر انتخاب کن.'}, status=400)
        key = f'{pid}:{size}:{color}'
        total_qty = cart.get(key, {}).get('quantity', 0) + qty
        if total_qty > 10:
            return JsonResponse({'error': 'حداکثر تعداد هر مدل در سبد ۱۰ عدد است.'}, status=400)
        cart[key] = {'product_id': pid, 'size': size, 'color': color, 'quantity': total_qty}
    request.session['cart'] = cart
    return JsonResponse(cart_data(request))

@require_http_methods(['POST'])
def checkout_api(request):
    # Never claim to collect payment or send an order in the first design version.
    return JsonResponse({'error': 'این نسخه نمایشی است. ثبت سفارش و پرداخت پس از تأیید اطلاعات فروشگاه فعال می‌شود.', 'demo': True}, status=409)
