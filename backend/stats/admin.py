from django.contrib import admin, messages
from django.http import HttpResponseRedirect
from django.urls import path, reverse

from stats.models import MediaStatSnapshot, StatCounter
from stats.tasks import recalculate_stats_async


@admin.register(StatCounter)
class StatCounterAdmin(admin.ModelAdmin):
    change_list_template = "admin/stats/statcounter/change_list.html"
    list_display = (
        "dimension",
        "bucket",
        "label",
        "media_type",
        "is_anime",
        "count",
        "user",
        "updated_at",
    )
    list_filter = ("dimension", "media_type", "is_anime")
    search_fields = ("bucket", "label", "user__username")
    ordering = ("dimension", "-count", "bucket")
    date_hierarchy = "updated_at"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "recalculate/",
                self.admin_site.admin_view(self.recalculate_view),
                name="stats_recalculate",
            ),
        ]
        return custom_urls + urls

    def recalculate_view(self, request):
        changelist_url = reverse("admin:stats_statcounter_changelist")
        if request.method != "POST":
            return HttpResponseRedirect(changelist_url)
        recalculate_stats_async()
        self.message_user(
            request,
            "Пересчёт статистики запущен в фоне. Обновите страницу через минуту.",
            messages.SUCCESS,
        )
        return HttpResponseRedirect(changelist_url)


@admin.register(MediaStatSnapshot)
class MediaStatSnapshotAdmin(admin.ModelAdmin):
    list_display = ("media_entry", "updated_at")
    readonly_fields = ("media_entry", "buckets", "updated_at")
    search_fields = ("media_entry__title",)

    def has_add_permission(self, request):
        return False
