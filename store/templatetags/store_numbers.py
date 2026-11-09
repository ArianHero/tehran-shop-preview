from django import template

register = template.Library()
PERSIAN_DIGITS = str.maketrans('0123456789,', '۰۱۲۳۴۵۶۷۸۹٬')


@register.filter
def fa_number(value):
    return format(int(value), ',').translate(PERSIAN_DIGITS)
