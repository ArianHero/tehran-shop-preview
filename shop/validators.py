import json
import re
import struct

from django.core.exceptions import ValidationError


def normalize_phone(value):
    digits = value.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789"))
    return re.sub(r"[\s()-]", "", digits)


def validate_phone(value):
    if not re.fullmatch(r"\+?[0-9]{8,15}", normalize_phone(value)):
        raise ValidationError("شماره تماس معتبر وارد کنید.")


def validate_model(file):
    error = ValidationError("یک مدل GLB نسخهٔ ۲ با بافت‌های داخلی و حجم حداکثر ۲۰ مگابایت انتخاب کنید.")
    try:
        if file.size > 20 * 1024 * 1024 or not file.name.lower().endswith(".glb"):
            raise error
        magic, version, size, length, kind = struct.unpack("<4sIII4s", file.read(20))
        if (magic, version, size, kind) != (b"glTF", 2, file.size, b"JSON") or length > file.size - 20:
            raise error
        scene = json.loads(file.read(length))
        if scene.get("asset", {}).get("version") != "2.0" or not scene.get("meshes"):
            raise error
        if any("uri" in item for key in ("buffers", "images") for item in scene.get(key, [])):
            raise error
    except (ValueError, AttributeError, TypeError, struct.error) as exc:
        raise error from exc
    finally:
        file.seek(0)
