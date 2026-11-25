# مستر بیلیارد | Mr. Biliard

Persian right-to-left Django storefront, with a filterable catalog and an installation inquiry inbox in Django admin.

## Run locally

Use Python 3.10 or newer. From this directory:

```sh
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
export DJANGO_DEBUG=1
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Open http://127.0.0.1:8000/ for the storefront and http://127.0.0.1:8000/admin/ for management. Use the credentials created by `createsuperuser`.

In Products (محصولات), add the shop's actual inventory and photos and select نمایش در سایت to publish. Leave price blank to show استعلام قیمت. The catalog starts empty. Installation requests appear in درخواست‌های نصب. The owner can call the submitted number and update the request status. The Instagram buttons use the supplied handle `mr.biliard`.

## Hosting

Deploy `shop.wsgi:application` on a Python/Django host. Use a persistent, writable directory for `DJANGO_DATA_DIR` so the SQLite database and media survive deployments. Set `DJANGO_SECRET_KEY` to a unique random secret and `DJANGO_ALLOWED_HOSTS` to your comma-separated domain names. With debug off, serve through HTTPS. Run migrations and `python manage.py collectstatic --noinput`, then configure your host to serve `staticfiles/` at `/static/` and the persistent data directory's `media/` at `/media/`.

Hero photograph: [Unsplash](https://unsplash.com/photos/a-green-pool-table-with-balls-and-cues-WyH3H9oHMZM). It illustrates billiards and is independent of the catalog. Vazirmatn is distributed under the included Open Font License.

Persian instructions for publishing photos and 3D GLB models, configuring phone contacts, and enabling transactional SMS/email with the scheduled delivery worker are in **GUIDE-FA.md**. Run migrations against the existing database when upgrading. The local 3D viewer is @google/model-viewer 4.1.0 (license included).
