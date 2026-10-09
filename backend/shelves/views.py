from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from shelves.models import Collection, CollectionItem
from shelves.services import link_media, move_item, unlink_media

MAX_POSTER_BYTES = 10 * 1024 * 1024
ALLOWED_POSTER_TYPES = (
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
)
from shelves.serializers import (
    CollectionDetailSerializer,
    CollectionItemSerializer,
    CollectionItemWriteSerializer,
    CollectionListSerializer,
)


class CollectionViewSet(ModelViewSet):
    def get_queryset(self):
        queryset = Collection.objects.filter(user=self.request.user)
        if self.action == "list":
            universe = self.request.query_params.get("universe")
            if universe and universe.lower() in ("1", "true"):
                return queryset.filter(is_universe=True)
            return queryset.filter(is_universe=False)
        return queryset

    def get_serializer_class(self):
        if self.action == "list":
            return CollectionListSerializer
        return CollectionDetailSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post", "delete"], url_path="poster")
    def poster(self, request, pk=None):
        collection = self.get_object()
        if request.method == "DELETE":
            if collection.poster:
                collection.poster.delete(save=False)
            collection.poster = None
            collection.save(update_fields=["poster"])
            return Response(status=status.HTTP_204_NO_CONTENT)

        upload = request.FILES.get("poster")
        if upload is None:
            return Response(
                {"error": "No poster file provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if upload.size > MAX_POSTER_BYTES:
            return Response(
                {"error": "Poster is too large."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )
        if upload.content_type not in ALLOWED_POSTER_TYPES:
            return Response(
                {"error": "Unsupported image type."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        collection.poster = upload
        collection.save(update_fields=["poster"])
        return Response(CollectionDetailSerializer(collection).data)

    @action(detail=True, methods=["post"])
    def items(self, request, pk=None):
        collection = self.get_object()
        serializer = CollectionItemWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        media_entry = serializer.validated_data["media_entry"]
        existing = CollectionItem.objects.filter(
            collection=collection,
            media_entry=media_entry,
        )
        if existing.exists():
            return Response(
                {"error": "Item already in collection."},
                status=status.HTTP_409_CONFLICT,
            )
        if collection.is_universe:
            anchor = (
                CollectionItem.objects.filter(collection=collection)
                .select_related("media_entry")
                .order_by("position")
                .first()
            )
            if anchor is None:
                return Response(
                    {"error": "Franchise has no anchor media."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                link_media(anchor.media_entry, media_entry)
            except ValidationError as exc:
                return Response(
                    {"error": exc.messages[0]},
                    status=status.HTTP_409_CONFLICT,
                )
            item = CollectionItem.objects.filter(
                collection=collection, media_entry=media_entry
            ).first()
            out = CollectionItemSerializer(item)
            return Response(out.data, status=status.HTTP_201_CREATED)
        max_pos = (
            CollectionItem.objects.filter(collection=collection)
            .order_by("-position")
            .first()
        )
        position = (max_pos.position + 1) if max_pos else 0
        item = CollectionItem.objects.create(
            collection=collection,
            media_entry=media_entry,
            position=position,
        )
        out = CollectionItemSerializer(item)
        return Response(out.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path="items/(?P<item_id>[^/.]+)",
    )
    def item_detail(self, request, pk=None, item_id=None):
        collection = self.get_object()
        item = get_object_or_404(
            CollectionItem, id=item_id, collection=collection
        )
        if request.method == "DELETE":
            if collection.is_universe:
                unlink_media(collection, item.media_entry)
            else:
                item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = CollectionItemWriteSerializer(
            item, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        new_position = serializer.validated_data.get("position")
        serializer.save()
        if new_position is not None:
            move_item(collection, item, new_position)
        out = CollectionItemSerializer(item)
        return Response(out.data)
