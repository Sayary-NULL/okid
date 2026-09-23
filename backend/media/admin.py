from django.contrib import admin
from media.models import Genre, Country, MediaEntry, MediaHistory, MediaInformer

admin.site.register(Genre)
admin.site.register(Country)
admin.site.register(MediaEntry)
admin.site.register(MediaHistory)
admin.site.register(MediaInformer)