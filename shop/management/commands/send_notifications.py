from django.core.management.base import BaseCommand
from shop.models import Notice
from shop.notifications import dispatch


class Command(BaseCommand):
    help = "ارسال اعلان‌های در صف، حداکثر ۱۰۰ اعلان در هر اجرا"

    def handle(self, *args, **options):
        notices = Notice.objects.filter(state="new").select_related("request").order_by("pk")[:100]
        for notice in list(notices):
            if not Notice.objects.filter(pk=notice.pk, state="new").update(state="sending"):
                continue
            try:
                dispatch(notice)
            except Exception as exc:
                # Provider exceptions can contain keys or addresses. Keep only their type.
                state, error = "failed", "تنظیمات و گزارش سرویس را بررسی کنید. " + type(exc).__name__
            else:
                state, error = "sent", ""
            Notice.objects.filter(pk=notice.pk).update(state=state, error=error)
