from django.contrib import admin
from media.models import (
    Country,
    Genre,
    Informer,
    MediaEntry,
    MediaHistory,
    MediaInformer,
)

admin.site.register(Genre)
admin.site.register(Country)
admin.site.register(Informer)
admin.site.register(MediaEntry)
admin.site.register(MediaHistory)
admin.site.register(MediaInformer)