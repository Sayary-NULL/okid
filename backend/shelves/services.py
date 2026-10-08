from django.core.exceptions import ValidationError
from django.db import transaction

from shelves.models import Collection, CollectionItem

UNIVERSE_ALREADY_LINKED = "Эти медиа уже связаны."
UNIVERSE_SELF_LINK = "Нельзя связать медиа с самим собой."
UNIVERSE_CONFLICT = (
    "Медиа принадлежат разным франшизам, связать их невозможно."
)


def _next_position(collection):
    last = collection.items.order_by("-position").first()
    return (last.position + 1) if last else 0


def _add_member(collection, entry, position=None):
    if position is None:
        position = _next_position(collection)
    item, _ = CollectionItem.objects.get_or_create(
        collection=collection,
        media_entry=entry,
        defaults={"position": position},
    )
    if entry.universe_collection_id != collection.id:
        entry.universe_collection = collection
        entry.save(update_fields=["universe_collection", "updated_at"])
    return item


@transaction.atomic
def link_media(entry, linked):
    """Link two media entries, creating or extending their universe/franchise."""
    if entry.pk == linked.pk:
        raise ValidationError(UNIVERSE_SELF_LINK)

    entry_universe = entry.universe_collection_id
    linked_universe = linked.universe_collection_id

    if entry_universe and linked_universe:
        if entry_universe != linked_universe:
            raise ValidationError(UNIVERSE_CONFLICT)
        _add_member(entry.universe_collection, entry)
        _add_member(entry.universe_collection, linked)
        return entry.universe_collection

    if not entry_universe and not linked_universe:
        collection = Collection.objects.create(
            user=entry.user,
            name=entry.title,
            description=entry.description or entry.short_description,
            is_universe=True,
        )
        _add_member(collection, entry, 0)
        _add_member(collection, linked, 1)
        return collection

    if entry_universe:
        collection = entry.universe_collection
        _add_member(collection, linked)
        return collection

    collection = linked.universe_collection
    _add_member(collection, entry)
    return collection


def _clear_universe(collection):
    for member in collection.universe_media.all():
        if member.universe_collection_id == collection.id:
            member.universe_collection = None
            member.save(update_fields=["universe_collection", "updated_at"])


@transaction.atomic
def unlink_media(collection, entry):
    """Remove an entry from a universe/franchise collection."""
    CollectionItem.objects.filter(
        collection=collection, media_entry=entry
    ).delete()
    if entry.universe_collection_id == collection.id:
        entry.universe_collection = None
        entry.save(update_fields=["universe_collection", "updated_at"])

    if collection.is_universe and collection.items.count() < 2:
        _clear_universe(collection)
        collection.delete()


@transaction.atomic
def delete_universe(collection):
    _clear_universe(collection)
    collection.delete()
