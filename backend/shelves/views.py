from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from shelves.models import Collection, CollectionItem
from shelves.serializers import (
    CollectionDetailSerializer,
    CollectionItemSerializer,
    CollectionItemWriteSerializer,
    CollectionListSerializer,
)


class CollectionViewSet(ModelViewSet):
    def get_queryset(self):
        return Collection.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == "list":
            return CollectionListSerializer
        return CollectionDetailSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def items(self, request, pk=None):
        collection = self.get_object()
        serializer = CollectionItemWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        existing = CollectionItem.objects.filter(
            collection=collection,
            media_entry=serializer.validated_data["media_entry"],
        )
        if existing.exists():
            return Response(
                {"error": "Item already in collection."},
                status=status.HTTP_409_CONFLICT,
            )
        max_pos = (
            CollectionItem.objects.filter(collection=collection)
            .order_by("-position")
            .first()
        )
        position = (max_pos.position + 1) if max_pos else 0
        item = CollectionItem.objects.create(
            collection=collection,
            media_entry=serializer.validated_data["media_entry"],
            position=position,
        )
        out = CollectionItemSerializer(item)
        return Response(out.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path="items/(?P<item_id>[^/.]+)")
    def delete_item(self, request, pk=None, item_id=None):
        collection = self.get_object()
        item = get_object_or_404(
            CollectionItem, id=item_id, collection=collection
        )
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(
        detail=True,
        methods=["patch"],
        url_path="items/(?P<item_id>[^/.]+)",
    )
    def update_item(self, request, pk=None, item_id=None):
        collection = self.get_object()
        item = get_object_or_404(
            CollectionItem, id=item_id, collection=collection
        )
        serializer = CollectionItemWriteSerializer(
            item, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        out = CollectionItemSerializer(item)
        return Response(out.data)