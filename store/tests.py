import json
from django.core.management import call_command
from django.test import Client, TestCase
from django.urls import reverse
from .categories import CATEGORIES
from .models import Product

class ShopTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('seed_demo', verbosity=0)
        cls.product = Product.objects.get(slug='core-oversized-tee')

    def add(self, client=None, **extra):
        payload = {'product_id': self.product.pk, 'size': 'M', 'color': 'مشکی', 'quantity': 1}
        payload.update(extra)
        return (client or self.client).post('/api/cart/', payload, content_type='application/json')

    def test_home_and_catalog(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'lang="fa" dir="rtl"')
        self.assertTrue(response.context['runtime']['backend'])
        self.assertEqual(len(self.client.get('/api/products/').json()['products']), 12)
        self.assertContains(response, 'https://www.instagram.com/tehran.sporshop/')

    def test_each_category_has_its_own_catalog(self):
        for slug, category in CATEGORIES.items():
            with self.subTest(category=slug):
                response = self.client.get(reverse('category', args=[slug]))
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.context['title'], category['name'])
                visible = response.context['runtime']['visible_ids']
                expected = list(Product.objects.filter(category=slug, active=True).values_list('id', flat=True))
                self.assertGreaterEqual(len(visible), 2)
                self.assertEqual(visible, expected)
        self.assertEqual(self.client.get('/category/unknown/').status_code, 404)

    def test_cart_persists_in_session_and_uses_server_price(self):
        response = self.add(price=1)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['total'], self.product.price)
        persisted = self.client.get('/api/cart/').json()
        self.assertEqual(persisted['count'], 1)
        self.assertEqual(persisted['items'][0]['size'], 'M')

    def test_sessions_are_isolated(self):
        self.add()
        self.assertEqual(Client().get('/api/cart/').json()['count'], 0)

    def test_variants_stay_separate(self):
        self.add(size='M')
        self.add(size='L')
        self.assertEqual(len(self.client.get('/api/cart/').json()['items']), 2)

    def test_bad_options_are_rejected(self):
        for payload in [{'size': 'XXXS'}, {'color': 'red'}, {'product_id': 99999}, {'product_id': []}]:
            self.assertIn(self.add(**payload).status_code, [400, 404])
        self.assertEqual(self.client.get('/api/cart/').json()['count'], 0)

    def test_bad_quantities_are_rejected(self):
        for quantity in [-1, 0, 11, '2', True, 1.5]:
            self.assertEqual(self.add(quantity=quantity).status_code, 400)
        self.assertEqual(self.add(quantity=10).status_code, 200)
        self.assertEqual(self.add().status_code, 400)

    def test_quantity_and_removal(self):
        item = self.add().json()['items'][0]
        update = self.client.patch('/api/cart/', json.dumps({'key': item['key'], 'quantity': 3}), content_type='application/json')
        self.assertEqual(update.json()['total'], self.product.price * 3)
        removal = self.client.delete('/api/cart/', json.dumps({'key': item['key']}), content_type='application/json')
        self.assertEqual(removal.json()['count'], 0)

    def test_inactive_products_are_removed_from_cart(self):
        self.add()
        Product.objects.filter(pk=self.product.pk).update(active=False)
        self.assertEqual(self.client.get('/api/cart/').json()['count'], 0)
        self.assertEqual(self.add().status_code, 404)

    def test_csrf_is_required_and_supported(self):
        browser = Client(enforce_csrf_checks=True)
        browser.get('/')
        self.assertEqual(self.add(client=browser).status_code, 403)
        response = browser.post('/api/cart/', {'product_id': self.product.pk, 'size': 'M', 'color': 'مشکی', 'quantity': 1}, content_type='application/json', HTTP_X_CSRFTOKEN=browser.cookies['csrftoken'].value)
        self.assertEqual(response.status_code, 200)

    def test_malformed_requests_and_unknown_lines(self):
        for body in ['{', '[]', 'null']:
            self.assertEqual(self.client.post('/api/cart/', body, content_type='application/json').status_code, 400)
        self.assertEqual(self.client.patch('/api/cart/', {'key': [], 'quantity': 2}, content_type='application/json').status_code, 404)
        self.assertEqual(self.client.delete('/api/cart/', {'key': 'missing'}, content_type='application/json').status_code, 404)

    def test_checkout_never_claims_to_place_order(self):
        response = self.client.post('/api/checkout/')
        self.assertEqual(response.status_code, 409)
        self.assertTrue(response.json()['demo'])

    def test_seed_preserves_admin_edits(self):
        Product.objects.filter(pk=self.product.pk).update(price=123456)
        call_command('seed_demo', verbosity=0)
        self.product.refresh_from_db()
        self.assertEqual(self.product.price, 123456)
        self.assertEqual(Product.objects.count(), 12)

    def test_admin_requires_login(self):
        response = self.client.get('/admin/')
        self.assertEqual(response.status_code, 302)
        self.assertIn('/admin/login/', response.url)
