from django.db.models.signals import m2m_changed, post_delete, post_save, pre_delete
from django.dispatch import receiver

from media.models import MediaEntry, MediaInformer
from stats.services import refresh_entry_stats, remove_entry_stats


@receiver(post_save, sender=MediaEntry)
def on_media_saved(sender, instance, **kwargs):
    refresh_entry_stats(instance)


@receiver(pre_delete, sender=MediaEntry)
def on_media_deleting(sender, instance, **kwargs):
    remove_entry_stats(instance)


@receiver(m2m_changed, sender=MediaEntry.genres.through)
def on_genres_changed(sender, instance, action, **kwargs):
    if action in ("post_add", "post_remove", "post_clear"):
        refresh_entry_stats(instance)


@receiver(post_save, sender=MediaInformer)
def on_informer_saved(sender, instance, **kwargs):
    entry = MediaEntry.objects.filter(pk=instance.media_entry_id).first()
    if entry is not None:
        refresh_entry_stats(entry)


@receiver(post_delete, sender=MediaInformer)
def on_informer_deleted(sender, instance, **kwargs):
    entry = MediaEntry.objects.filter(pk=instance.media_entry_id).first()
    if entry is not None:
        refresh_entry_stats(entry)
