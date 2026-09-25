from rest_framework import serializers
from shelves.models import Collection, CollectionItem


class CollectionItemSerializer(serializers.ModelSerializer):
    media_entry = serializers.PrimaryKeyRelatedField(read_only=True)
    media_entry_detail = serializers.SerializerMethodField()

    class Meta:
        model = CollectionItem
        fields = ("id", "media_entry", "media_entry_detail", "position", "created_at")
        read_only_fields = ("created_at",)

    def get_media_entry_detail(self, obj):
        from media.serializers import MediaEntryListSerializer
        return MediaEntryListSerializer(obj.media_entry).data


class CollectionItemWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CollectionItem
        fields = ("media_entry", "position")


class CollectionListSerializer(serializers.ModelSerializer):
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Collection
        fields = (
            "id",
            "name",
            "description",
            "poster",
            "item_count",
            "created_at",
        )

    def get_item_count(self, obj):
        return obj.items.count()


class CollectionDetailSerializer(serializers.ModelSerializer):
    items = CollectionItemSerializer(many=True, read_only=True)

    class Meta:
        model = Collection
        fields = ("id", "name", "description", "poster", "items", "created_at")