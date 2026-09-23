from django.db import models


class Genre(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, max_length=200)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name


class Country(models.Model):
    name = models.CharField(max_length=200)

    class Meta:
        ordering = ("name",)
        verbose_name_plural = "countries"

    def __str__(self):
        return self.name


class MediaEntry(models.Model):
    class MediaType(models.TextChoices):
        MOVIE = "movie", "Фильм"
        SERIES = "series", "Сериал"

    class MyStatus(models.TextChoices):
        PLAN_TO_WATCH = "plan_to_watch", "Планирую"
        WATCHING = "watching", "Смотрю"
        DROPPED = "dropped", "Бросил"
        COMPLETED = "completed", "Просмотрено"

    class DownloadStatus(models.TextChoices):
        NONE = "none", "Нет"
        NEED_DOWNLOAD = "need_download", "Нужно скачать"
        DOWNLOADED = "downloaded", "Скачано"

    user = models.ForeignKey(
        "auth.User", on_delete=models.CASCADE, related_name="media_entries"
    )
    title = models.CharField(max_length=500)
    original_title = models.CharField(max_length=500, blank=True, default="")
    description = models.TextField(blank=True, default="")
    short_description = models.TextField(blank=True, default="")
    media_type = models.CharField(
        max_length=10, choices=MediaType.choices, default=MediaType.MOVIE
    )
    year_start = models.IntegerField(null=True, blank=True)
    year_end = models.IntegerField(null=True, blank=True)
    poster_url = models.URLField(max_length=1000, blank=True, default="")
    poster_local = models.ImageField(upload_to="posters/", null=True, blank=True)
    is_favorite = models.BooleanField(default=False)
    is_anime = models.BooleanField(default=False)
    my_status = models.CharField(
        max_length=20, choices=MyStatus.choices, default=MyStatus.PLAN_TO_WATCH
    )
    download_status = models.CharField(
        max_length=20, choices=DownloadStatus.choices, default=DownloadStatus.NONE
    )
    my_rating = models.IntegerField(null=True, blank=True)
    movie_length = models.IntegerField(null=True, blank=True)
    is_series = models.BooleanField(default=False)
    total_series_length = models.IntegerField(null=True, blank=True)
    series_length = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=50, blank=True, default="")

    external_kp_id = models.CharField(max_length=50, blank=True, default="")
    external_imdb_id = models.CharField(max_length=50, blank=True, default="")
    external_tmdb_id = models.CharField(max_length=50, blank=True, default="")
    external_shikimori_id = models.CharField(max_length=50, blank=True, default="")

    rating_kp = models.FloatField(null=True, blank=True)
    rating_imdb = models.FloatField(null=True, blank=True)
    rating_tmdb = models.FloatField(null=True, blank=True)
    rating_shikimori = models.FloatField(null=True, blank=True)

    genres = models.ManyToManyField(Genre, blank=True)
    countries = models.ManyToManyField(Country, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "media entries"
        ordering = ("-created_at",)

    def __str__(self):
        return self.title


class MediaHistory(models.Model):
    media_entry = models.ForeignKey(
        MediaEntry, on_delete=models.CASCADE, related_name="history"
    )
    user = models.ForeignKey("auth.User", on_delete=models.CASCADE)
    old_status = models.CharField(
        max_length=20,
        choices=MediaEntry.MyStatus.choices,
        blank=True,
        default="",
    )
    new_status = models.CharField(
        max_length=20, choices=MediaEntry.MyStatus.choices
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "media histories"
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.media_entry} → {self.new_status}"


class MediaInformer(models.Model):
    media_entry = models.ForeignKey(
        MediaEntry, on_delete=models.CASCADE, related_name="informers"
    )
    user = models.ForeignKey("auth.User", on_delete=models.CASCADE)
    informer_name = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.media_entry} — {self.informer_name}"