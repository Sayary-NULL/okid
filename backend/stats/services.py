from collections import Counter

from django.contrib.auth.models import User
from django.db import transaction

from media.models import MediaEntry
from stats.models import MediaStatSnapshot, StatCounter

TOTAL = StatCounter.Dimension.TOTAL
RATING = StatCounter.Dimension.RATING
MY_STATUS = StatCounter.Dimension.MY_STATUS
INFORMER = StatCounter.Dimension.INFORMER
FAVORITE = StatCounter.Dimension.FAVORITE
DOWNLOAD_STATUS = StatCounter.Dimension.DOWNLOAD_STATUS
GENRE = StatCounter.Dimension.GENRE
YEAR = StatCounter.Dimension.YEAR

NO_RATING = "none"
UNKNOWN_YEAR = "unknown"

STATUS_ORDER = ["plan_to_watch", "watching", "dropped", "completed"]
DOWNLOAD_ORDER = ["none", "need_download", "downloaded"]


def compute_buckets(entry):
    """Return the list of counter buckets a media entry contributes to.

    Each bucket is a plain dict so it can be stored in a JSON snapshot:
    ``{"d": dimension, "b": bucket, "l": label, "t": media_type, "a": anime}``.
    """
    buckets = []
    media_type = entry.media_type
    is_anime = bool(entry.is_anime)

    def add(dimension, bucket, label=""):
        buckets.append(
            {
                "d": dimension,
                "b": str(bucket),
                "l": label or str(bucket),
                "t": media_type,
                "a": is_anime,
            }
        )

    add(TOTAL, "", "Всего")

    if entry.my_rating is not None:
        add(RATING, str(entry.my_rating), str(entry.my_rating))
    else:
        add(RATING, NO_RATING, "Без оценки")

    add(MY_STATUS, entry.my_status, entry.get_my_status_display())
    add(
        DOWNLOAD_STATUS,
        entry.download_status,
        entry.get_download_status_display(),
    )
    add(
        FAVORITE,
        "true" if entry.is_favorite else "false",
        "В избранном" if entry.is_favorite else "Не в избранном",
    )

    if entry.year_start:
        add(YEAR, str(entry.year_start), str(entry.year_start))
    else:
        add(YEAR, UNKNOWN_YEAR, "Неизвестно")

    for genre in entry.genres.all():
        add(GENRE, genre.slug, genre.name)

    for informer_link in entry.informers.all():
        add(
            INFORMER,
            str(informer_link.informer_id),
            informer_link.informer.name,
        )

    return buckets


def _key(bucket):
    return (bucket["d"], bucket["b"], bucket["t"], bucket["a"])


def apply_buckets_delta(user_id, removed, added):
    """Apply an incremental delta to :class:`StatCounter` rows."""
    counts = Counter()
    labels = {}

    for bucket in removed:
        counts[_key(bucket)] -= 1
    for bucket in added:
        key = _key(bucket)
        counts[key] += 1
        labels[key] = bucket["l"]

    if not counts:
        return

    for key, delta in counts.items():
        if delta == 0:
            continue
        dimension, bucket, media_type, is_anime = key
        row, created = StatCounter.objects.get_or_create(
            user_id=user_id,
            dimension=dimension,
            bucket=bucket,
            media_type=media_type,
            is_anime=is_anime,
            defaults={"label": labels.get(key, bucket), "count": 0},
        )
        if created or delta != 0:
            StatCounter.objects.filter(pk=row.pk).update(count=row.count + delta)
        if key in labels and row.label != labels[key]:
            StatCounter.objects.filter(pk=row.pk).update(label=labels[key])

    StatCounter.objects.filter(user_id=user_id, count__lte=0).delete()


def refresh_entry_stats(entry):
    """Recompute a single media entry contribution and store the snapshot."""
    snapshot = MediaStatSnapshot.objects.filter(media_entry=entry).first()
    old_buckets = snapshot.buckets if snapshot is not None else []
    new_buckets = compute_buckets(entry)
    apply_buckets_delta(entry.user_id, old_buckets, new_buckets)
    MediaStatSnapshot.objects.update_or_create(
        media_entry=entry, defaults={"buckets": new_buckets}
    )


def remove_entry_stats(entry):
    snapshot = MediaStatSnapshot.objects.filter(media_entry=entry).first()
    if snapshot is not None:
        apply_buckets_delta(entry.user_id, snapshot.buckets, [])
        snapshot.delete()


def recalculate_stats(user=None):
    """Wipe the statistics and rebuild them from scratch.

    When ``user`` is given only that user is recalculated, otherwise every
    user is processed. Returns the number of counter rows created.
    """
    users = User.objects.all()
    if user is not None:
        users = users.filter(pk=user.pk)

    created_total = 0
    for current in users.iterator():
        with transaction.atomic():
            StatCounter.objects.filter(user=current).delete()
            MediaStatSnapshot.objects.filter(
                media_entry__user=current
            ).delete()

        entries = (
            MediaEntry.objects.filter(user=current)
            .select_related("user")
            .prefetch_related("genres", "informers__informer")
        )

        counts = Counter()
        labels = {}
        snapshots = []
        for entry in entries:
            buckets = compute_buckets(entry)
            for bucket in buckets:
                key = _key(bucket)
                counts[key] += 1
                labels[key] = bucket["l"]
            snapshots.append(
                MediaStatSnapshot(media_entry=entry, buckets=buckets)
            )

        with transaction.atomic():
            if snapshots:
                MediaStatSnapshot.objects.bulk_create(snapshots)
            rows = [
                StatCounter(
                    user=current,
                    dimension=key[0],
                    bucket=key[1],
                    media_type=key[2],
                    is_anime=key[3],
                    label=labels[key],
                    count=count,
                )
                for key, count in counts.items()
            ]
            if rows:
                StatCounter.objects.bulk_create(rows)
        created_total += len(rows)

    return created_total


def ensure_stats_initialized(user):
    """Lazily build statistics for a user if they were never computed."""
    has_media = MediaEntry.objects.filter(user=user).exists()
    if not has_media:
        return
    has_snapshot = MediaStatSnapshot.objects.filter(
        media_entry__user=user
    ).exists()
    if not has_snapshot:
        recalculate_stats(user=user)
