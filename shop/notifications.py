import json
from urllib.parse import urlencode, quote
from urllib.request import urlopen

from django.conf import settings
from django.core.mail import send_mail

from .models import ManagerContact, Notice


def enqueue(inquiry):
    recipients = {("sms", inquiry.phone, False)}
    if inquiry.email:
        recipients.add(("email", inquiry.email, False))
    for contact in ManagerContact.objects.filter(notify=True):
        if contact.phone:
            recipients.add(("sms", contact.dial, True))
        if contact.email:
            recipients.add(("email", contact.email, True))
    Notice.objects.bulk_create([
        Notice(request=inquiry, channel=channel, recipient=address, owner=owner)
        for channel, address, owner in recipients
    ])


def dispatch(notice):
    inquiry = notice.request
    title = f"مستر بیلیارد | درخواست شماره {inquiry.pk}"
    body = (f"درخواست جدید {inquiry.get_topic_display()}، کد {inquiry.pk}. شماره مشتری: {inquiry.phone}"
            if notice.owner else f"درخواست شما در مستر بیلیارد ثبت شد. کد پیگیری: {inquiry.pk}")
    if notice.channel == "email":
        if not settings.EMAIL_HOST or not settings.DEFAULT_FROM_EMAIL:
            raise ValueError("missing configuration")
        if send_mail(title, body, settings.DEFAULT_FROM_EMAIL, [notice.recipient]) != 1:
            raise OSError("mail rejected")
    else:
        if not settings.KAVENEGAR_KEY or not settings.KAVENEGAR_SENDER:
            raise ValueError("missing configuration")
        endpoint = "https://api.kavenegar.com/v1/" + quote(settings.KAVENEGAR_KEY, safe="") + "/sms/send.json"
        data = urlencode({"sender": settings.KAVENEGAR_SENDER, "receptor": notice.recipient, "message": body})
        with urlopen(endpoint, data=data.encode(), timeout=10) as response:
            if json.load(response)["return"]["status"] != 200:
                raise OSError("SMS rejected")
