from django.core.management.base import BaseCommand

from store.models import Product


PRODUCTS = [
    dict(
        slug='court-jersey-07', name='جرزی بازی ۰۷', english_name='COURT 07 JERSEY',
        category='jerseys', price=1390000, demo_image='jersey-07.webp',
        sizes=['M', 'L', 'XL', 'XXL'], colors=[{'name': 'مشکی و مسی', 'hex': '#242321'}],
        description='جرزی مشکی شماره ۰۷ با یقه هفت و حاشیه مسی.',
    ),
    dict(
        slug='court-shorts', name='شلوارک بسکتبال کورت', english_name='COURT SHORTS',
        category='shorts', price=940000, demo_image='shorts-court.webp',
        sizes=['M', 'L', 'XL', 'XXL'], colors=[{'name': 'مشکی و نارنجی', 'hex': '#262525'}],
        description='شلوارک بسکتبال با کمر کشی و نوار نارنجی در دو طرف.',
    ),
    dict(
        slug='core-oversized-tee', name='تی‌شرت اورسایز کور', english_name='CORE OVERSIZED TEE',
        category='tops', price=890000, demo_image='product-tee.webp',
        sizes=['S', 'M', 'L', 'XL'], colors=[{'name': 'مشکی', 'hex': '#363537'}],
        description='تی‌شرت زغالی با برش آزاد، سرشانه افتاده و یقه گرد.',
    ),
    dict(
        slug='form-top-sand', name='تاپ تمرینی فرم شنی', english_name='FORM TOP · SAND',
        category='crop-tops', price=690000, demo_image='top-sand.webp',
        sizes=['S', 'M', 'L'], colors=[{'name': 'شنی', 'hex': '#b9a68a'}],
        description='تاپ کوتاه شنی با بند پهن و یقه چهارگوش.',
    ),
    dict(
        slug='form-top-black', name='تاپ تمرینی فرم مشکی', english_name='FORM TOP · BLACK',
        category='crop-tops', price=670000, demo_image='top-black.webp',
        sizes=['XS', 'S', 'M', 'L'], colors=[{'name': 'مشکی', 'hex': '#232324'}],
        description='تاپ کوتاه مشکی با بند پهن و برش جذب.',
    ),
    dict(
        slug='practice-tank-charcoal', name='رکابی تمرینی کور', english_name='CORE PRACTICE TANK',
        category='tanks', price=760000, demo_image='tank-charcoal.webp',
        sizes=['M', 'L', 'XL'], colors=[{'name': 'زغالی', 'hex': '#414142'}],
        description='رکابی ساده زغالی با یقه گرد و برش آزاد.',
    ),
    dict(
        slug='practice-tank-petrol', name='رکابی تمرینی پیس', english_name='PACE PRACTICE TANK',
        category='tanks', price=790000, demo_image='tank-petrol.webp',
        sizes=['S', 'M', 'L', 'XL'], colors=[{'name': 'آبی نفتی', 'hex': '#263c47'}],
        description='رکابی آبی نفتی با یقه گرد و قد بلندتر.',
    ),
    dict(
        slug='court-jersey-12', name='جرزی بازی ۱۲', english_name='COURT 12 JERSEY',
        category='jerseys', price=1450000, demo_image='jersey-12.webp',
        sizes=['S', 'M', 'L', 'XL'], colors=[{'name': 'شیری و زرشکی', 'hex': '#dcd1ba'}],
        description='جرزی شیری شماره ۱۲ با یقه هفت و لبه زرشکی.',
    ),
    dict(
        slug='court-jersey-21', name='جرزی بازی ۲۱', english_name='COURT 21 JERSEY',
        category='jerseys', price=1490000, demo_image='jersey-21.webp',
        sizes=['M', 'L', 'XL'], colors=[{'name': 'سبز تیره', 'hex': '#263f32'}],
        description='جرزی سبز تیره شماره ۲۱ با یقه گرد و نوار شیری.',
    ),
    dict(
        slug='line-shorts', name='شلوارک بسکتبال لاین', english_name='LINE COURT SHORTS',
        category='shorts', price=980000, demo_image='shorts-line.webp',
        sizes=['S', 'M', 'L', 'XL'], colors=[{'name': 'شیری و زغالی', 'hex': '#e2d9c6'}],
        description='شلوارک شیری با نوار زغالی، کمر کشی و برش آزاد.',
    ),
    dict(
        slug='wine-shorts', name='شلوارک تمرینی واین', english_name='WINE PRACTICE SHORTS',
        category='shorts', price=920000, demo_image='shorts-wine.webp',
        sizes=['M', 'L', 'XL'], colors=[{'name': 'زرشکی', 'hex': '#662c36'}],
        description='شلوارک زرشکی با نوار باریک شیری دور لبه.',
    ),
    dict(
        slug='sand-oversized-tee', name='تی‌شرت اورسایز شیری', english_name='BONE OVERSIZED TEE',
        category='tops', price=910000, demo_image='tee-bone.webp',
        sizes=['M', 'L', 'XL', 'XXL'], colors=[{'name': 'شیری', 'hex': '#e2d8c3'}],
        description='تی‌شرت شیری با آستین کوتاه، سرشانه افتاده و برش آزاد.',
    ),
]


class Command(BaseCommand):
    help = 'Add 12 sample products while preserving existing catalog edits.'

    def handle(self, *args, **options):
        added = 0
        for position, row in enumerate(PRODUCTS):
            _, created = Product.objects.get_or_create(
                slug=row['slug'],
                defaults={**row, 'position': position, 'is_demo': True},
            )
            added += created
        self.stdout.write(self.style.SUCCESS(f'{added} samples added. Existing products were preserved.'))
