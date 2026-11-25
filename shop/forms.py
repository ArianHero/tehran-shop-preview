from django import forms
from .models import Installation
from .validators import normalize_phone, validate_phone


class InstallationForm(forms.ModelForm):
    class Meta:
        model = Installation
        fields = ("topic", "name", "phone", "email", "city", "details")
        widgets = {
            "name": forms.TextInput(attrs={"autocomplete": "name"}),
            "phone": forms.TextInput(attrs={"autocomplete": "tel", "inputmode": "tel", "dir": "ltr"}),
            "email": forms.EmailInput(attrs={"autocomplete": "email", "dir": "ltr"}),
            "city": forms.TextInput(attrs={"autocomplete": "address-level2"}),
            "details": forms.Textarea(attrs={"rows": 3}),
        }

    def clean_phone(self):
        phone = normalize_phone(self.cleaned_data["phone"])
        validate_phone(phone)
        return phone
