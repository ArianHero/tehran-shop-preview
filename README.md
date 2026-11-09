# Tehran Shop

A Persian storefront for basketball and training apparel. The starter has five category pages, 12 sample products, search, size filters, favourites, and a demo cart. Its navy and orange colours come from the supplied Tehran Shop logo. The sun icon switches to light mode, and the mobile menu has the same option. Product images, prices, and sizes are illustrative.

Instagram is [@tehran.sporshop](https://www.instagram.com/tehran.sporshop/).

## Show the starter

Open **docs/index.html** after extracting the ZIP. For the full preview on your computer, serve the folder and open http://127.0.0.1:8080.

```sh
python -m http.server 8080 --bind 127.0.0.1 --directory docs
```

### Publish the preview on GitHub Pages

1. Create a GitHub repository and upload the extracted project files at the repository root. Keep the **docs** folder intact.
2. In **Settings → Pages**, choose **Deploy from a branch**.
3. Select **main** and **/docs**, then click **Save**.
4. Copy the Pages URL from the same settings screen and send that link to your coach.

The Pages preview serves the included HTML and assets. Its cart is stored in the visitor's browser. See the [GitHub Pages publishing guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Run the Django shop

Install Python 3.12 or later. On Windows, double-click **start_windows.bat**. On macOS or Linux, run **bash start_mac_linux.sh**. Open http://127.0.0.1:8000.

The launcher creates a virtual environment, installs dependencies, migrates the database, and adds the sample products. Seeding preserves edits to existing products.

### Manage the catalog

Activate the project's virtual environment, then create an admin account.

```sh
python manage.py createsuperuser
```

Open http://127.0.0.1:8000/admin/. Edit products, upload photos, and set prices in toman. Sizes use a JSON list such as `["S", "M", "L"]`. Colours use a list such as `[{"name": "مشکی", "hex": "#242524"}]`.

The Django shop uses SQLite and validates cart quantities, variants, and prices on the server. The preview and Django shop both label orders and payments as demos. Real checkout requires the final catalog, delivery and return rules, and a payment integration.

### Rebuild the preview

After editing the catalog, export the current storefront to **docs** and commit that folder to GitHub.

```sh
python manage.py export_preview docs
python manage.py test
```

The export includes uploaded product photos so your coach can see them. Use photos you have permission to publish.

### Python hosting

Install the dependencies and set the environment variables described in **.env.example**. Use a persistent database and media directory, migrate, collect static files, and run Gunicorn behind HTTPS. The included Procfile uses the host's PORT variable.

```sh
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
gunicorn config.wsgi:application --bind 0.0.0.0:8000
```

## Design credits

The catalog structure draws on the [Manel Sánchez apparel catalog](https://www.manelsanchez.com/ropa-de-baloncesto/). The product images are generated samples. The bundled Vazirmatn typeface includes its SIL Open Font License in the assets folder.

- The homepage hoop photo is by StuSeeger. It was converted to WebP and is displayed with a crop. [Basketball goal – sunset](https://commons.wikimedia.org/wiki/File:Basketball_goal_-_sunset.jpg) · [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/)
- The outdoor court photo is by Matteo Paganelli. [Outdoor basketball with sunset](https://commons.wikimedia.org/wiki/File:Outdoor_basketball_with_sunset_(Unsplash).jpg) · [CC0](https://creativecommons.org/publicdomain/zero/1.0/)
