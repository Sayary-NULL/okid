from django.db import models


class StatCounter(models.Model):
    """Aggregate counter table used for fast statistics rendering.

    Every row stores how many media entries of a given ``media_type`` and
    ``is_anime`` belong to a ``bucket`` of a ``dimension`` (rating, status,
    genre, ...). Rows are kept in sync with media cards by the signal
    handlers in :mod:`stats.signals`.
    """

    class Dimension(models.TextChoices):
        TOTAL = "total", "Всего"
        RATING = "rating", "Оценка"
        MY_STATUS = "my_status", "Статус просмотра"
        INFORMER = "informer", "Рекомендация"
        FAVORITE = "favorite", "Избранное"
        DOWNLOAD_STATUS = "download_status", "Статус загрузки"
        GENRE = "genre", "Жанр"
        YEAR = "year", "Год выхода"

    user = models.ForeignKey(
        "auth.User", on_delete=models.CASCADE, related_name="stat_counters"
    )
    dimension = models.CharField(max_length=20, choices=Dimension.choices)
    bucket = models.CharField(max_length=200, blank=True, default="")
    label = models.CharField(max_length=200, blank=True, default="")
    media_type = models.CharField(max_length=10)
    is_anime = models.BooleanField(default=False)
    count = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("dimension", "-count")
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "user",
                    "dimension",
                    "bucket",
                    "media_type",
                    "is_anime",
                ],
                name="unique_stat_counter",
            )
        ]
        indexes = [
            models.Index(fields=["user", "dimension"]),
        ]

    def __str__(self):
        return f"{self.dimension}:{self.bucket} ({self.count})"


class MediaStatSnapshot(models.Model):
    """Stores the buckets a single media entry currently contributes to.

    Keeping the previous contribution lets the signal handlers apply an
    incremental delta to :class:`StatCounter` instead of recomputing all
    statistics.
    """

    media_entry = models.OneToOneField(
        "media.MediaEntry",
        on_delete=models.CASCADE,
        related_name="stat_snapshot",
    )
    buckets = models.JSONField(default=list)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"snapshot for media {self.media_entry_id}"
