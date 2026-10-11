from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from stats.models import StatCounter
from stats.services import (
    DOWNLOAD_ORDER,
    STATUS_ORDER,
    ensure_stats_initialized,
    recalculate_stats,
)

DIMENSION_TOTAL = StatCounter.Dimension.TOTAL
DIMENSION_RATING = StatCounter.Dimension.RATING
DIMENSION_MY_STATUS = StatCounter.Dimension.MY_STATUS
DIMENSION_INFORMER = StatCounter.Dimension.INFORMER
DIMENSION_FAVORITE = StatCounter.Dimension.FAVORITE
DIMENSION_DOWNLOAD_STATUS = StatCounter.Dimension.DOWNLOAD_STATUS
DIMENSION_GENRE = StatCounter.Dimension.GENRE
DIMENSION_YEAR = StatCounter.Dimension.YEAR

DIMENSION_ORDER = [
    DIMENSION_RATING,
    DIMENSION_MY_STATUS,
    DIMENSION_INFORMER,
    DIMENSION_FAVORITE,
    DIMENSION_DOWNLOAD_STATUS,
    DIMENSION_GENRE,
    DIMENSION_YEAR,
]

SLICE_KEYS = {
    ("movie", True): "movie_anime",
    ("movie", False): "movie_not_anime",
    ("series", True): "series_anime",
    ("series", False): "series_not_anime",
}


def _empty_counts():
    return {
        "movie_anime": 0,
        "movie_not_anime": 0,
        "series_anime": 0,
        "series_not_anime": 0,
    }


def _num(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _order_index(value, order):
    try:
        return order.index(value)
    except ValueError:
        return len(order)


def _numeric_key(item):
    number = _num(item["bucket"])
    if number is None:
        return (1, 0)
    return (0, number)


def _sort_buckets(dimension, items):
    if dimension in (DIMENSION_RATING, DIMENSION_YEAR):
        return sorted(items, key=_numeric_key)
    if dimension == DIMENSION_MY_STATUS:
        return sorted(
            items,
            key=lambda item: _order_index(item["bucket"], STATUS_ORDER),
        )
    if dimension == DIMENSION_DOWNLOAD_STATUS:
        return sorted(
            items,
            key=lambda item: _order_index(item["bucket"], DOWNLOAD_ORDER),
        )
    if dimension == DIMENSION_FAVORITE:
        return sorted(items, key=lambda item: item["bucket"])
    return sorted(
        items,
        key=lambda item: (-item["total"], item["label"].lower()),
    )


def build_statistics(user):
    summary = {
        "movie": {"total": 0, "anime": 0, "not_anime": 0},
        "series": {"total": 0, "anime": 0, "not_anime": 0},
    }
    grouped = {}

    counters = StatCounter.objects.filter(user=user)
    for counter in counters:
        if counter.dimension == DIMENSION_TOTAL:
            slot = summary.get(counter.media_type)
            if slot is None:
                continue
            slot["total"] += counter.count
            if counter.is_anime:
                slot["anime"] += counter.count
            else:
                slot["not_anime"] += counter.count
            continue

        buckets = grouped.setdefault(counter.dimension, {})
        item = buckets.get(counter.bucket)
        if item is None:
            item = {
                "bucket": counter.bucket,
                "label": counter.label or counter.bucket,
                "counts": _empty_counts(),
                "total": 0,
            }
            buckets[counter.bucket] = item

        slice_key = SLICE_KEYS.get((counter.media_type, counter.is_anime))
        if slice_key:
            item["counts"][slice_key] += counter.count
        item["total"] += counter.count

    dimensions = {}
    for dimension in DIMENSION_ORDER:
        items = list(grouped.get(dimension, {}).values())
        dimensions[dimension] = _sort_buckets(dimension, items)

    return {"summary": summary, "dimensions": dimensions}


class StatisticsView(APIView):
    def get(self, request):
        ensure_stats_initialized(request.user)
        return Response(build_statistics(request.user))


class RecalculateStatisticsView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        created = recalculate_stats()
        return Response({"status": "ok", "counters": created})
