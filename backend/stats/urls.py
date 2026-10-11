from django.urls import path

from stats.views import RecalculateStatisticsView, StatisticsView

urlpatterns = [
    path("stats/", StatisticsView.as_view(), name="stats"),
    path(
        "stats/recalculate/",
        RecalculateStatisticsView.as_view(),
        name="stats-recalculate",
    ),
]
