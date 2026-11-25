from .models import ManagerContact


def shop_links(request):
    profiles = ManagerContact.objects.filter(public=True).exclude(instagram="").order_by("pk")
    return {"shop_instagram": profiles.values_list("instagram", flat=True).first()}
