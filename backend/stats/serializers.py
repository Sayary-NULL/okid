from rest_framework import serializers

from stats.models import StatCounter


class StatCounterSerializer(serializers.ModelSerializer):
    class Meta:
        model = StatCounter
        fields = (
            "id",
            "dimension",
            "bucket",
            "label",
            "media_type",
            "is_anime",
            "count",
            "updated_at",
        )
