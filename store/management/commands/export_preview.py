import shutil
from pathlib import Path
from django.conf import settings
from django.core.management.base import BaseCommand
from django.template.loader import render_to_string
from store.categories import CATEGORIES
from store.views import page_context


class Command(BaseCommand):
    help = 'Export the storefront and category pages for GitHub Pages or another static host.'

    def add_arguments(self, parser):
        parser.add_argument('destination')

    def handle(self, *args, **options):
        output = Path(options['destination']).resolve()
        output.mkdir(parents=True, exist_ok=True)
        pages = [
            ('index.html', 'home', None),
            ('shop/index.html', 'shop', None),
            *[(f'category/{slug}/index.html', 'category', slug) for slug in CATEGORIES],
        ]
        for path, page, slug in pages:
            target = output / path
            target.parent.mkdir(parents=True, exist_ok=True)
            template = 'store/home.html' if page == 'home' else 'store/category.html'
            context = page_context(backend=False, page=page, category_slug=slug)
            target.write_text(render_to_string(template, context), encoding='utf-8')
        shutil.copytree(settings.BASE_DIR / 'store' / 'static', output / 'static', dirs_exist_ok=True)
        if settings.MEDIA_ROOT.exists():
            shutil.copytree(settings.MEDIA_ROOT, output / 'media', dirs_exist_ok=True)
        (output / '.nojekyll').touch()
        self.stdout.write(self.style.SUCCESS(f'Exported {len(pages)} preview pages to {output}'))
