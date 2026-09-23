from rest_framework import serializers
from media.models import (
    Country,
    Genre,
    Informer,
    MediaEntry,
    MediaHistory,
    MediaInformer,
)


class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ("id", "name", "slug")


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ("id", "name")


class InformerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Informer
        fields = ("id", "name")


class MediaHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaHistory
        fields = ("id", "old_status", "new_status", "created_at")
        read_only_fields = ("created_at",)


class MediaHistoryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaHistory
        fields = ("old_status", "new_status")

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        media_entry = self.context["media_entry"]
        validated_data["media_entry"] = media_entry
        instance = super().create(validated_data)
        media_entry.my_status = instance.new_status
        media_entry.save(update_fields=["my_status", "updated_at"])
        return instance


class MediaInformerSerializer(serializers.ModelSerializer):
    informer = InformerSerializer(read_only=True)

    class Meta:
        model = MediaInformer
        fields = ("id", "informer", "created_at")
        read_only_fields = ("created_at",)


class MediaInformerCreateSerializer(serializers.Serializer):
    informer = serializers.PrimaryKeyRelatedField(
        queryset=Informer.objects.all(), required=False
    )
    informer_name = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if not attrs.get("informer") and not attrs.get("informer_name", "").strip():
            raise serializers.ValidationError(
                {"informer_name": "Укажите информатора."}
            )
        return attrs

    def create(self, validated_data):
        informer = validated_data.get("informer")
        if informer is None:
            name = validated_data["informer_name"].strip()
            informer, _ = Informer.objects.get_or_create(
                name__iexact=name, defaults={"name": name}
            )
        return MediaInformer.objects.create(
            user=self.context["request"].user,
            media_entry=self.context["media_entry"],
            informer=informer,
        )


class MediaEntryListSerializer(serializers.ModelSerializer):
    genres = GenreSerializer(many=True, read_only=True)
    countries = CountrySerializer(many=True, read_only=True)

    class Meta:
        model = MediaEntry
        fields = (
            "id",
            "title",
            "original_title",
            "media_type",
            "year_start",
            "year_end",
            "poster_url",
            "poster_local",
            "is_favorite",
            "is_anime",
            "my_status",
            "download_status",
            "my_rating",
            "rating_kp",
            "rating_imdb",
            "rating_tmdb",
            "rating_shikimori",
            "genres",
            "countries",
            "created_at",
            "updated_at",
        )


class MediaEntryDetailSerializer(serializers.ModelSerializer):
    genres = GenreSerializer(many=True, read_only=True)
    countries = CountrySerializer(many=True, read_only=True)

    class Meta:
        model = MediaEntry
        fields = "__all__"
        read_only_fields = ("user", "created_at", "updated_at")


class MediaEntryWriteSerializer(serializers.ModelSerializer):
    genres = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False
    )
    countries = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False
    )

    class Meta:
        model = MediaEntry
        exclude = ("user", "poster_local", "created_at", "updated_at")
        extra_kwargs = {
            "poster_url": {"required": False, "allow_blank": True},
            "title": {"required": True},
        }

    def create(self, validated_data):
        genres_data = validated_data.pop("genres", [])
        countries_data = validated_data.pop("countries", [])
        validated_data["user"] = self.context["request"].user
        entry = MediaEntry.objects.create(**validated_data)
        self._set_m2m(entry, genres_data, countries_data)
        return entry

    def update(self, instance, validated_data):
        genres_data = validated_data.pop("genres", None)
        countries_data = validated_data.pop("countries", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if genres_data is not None:
            self._set_m2m(instance, genres_data, countries_data or [])
        return instance

    def _set_m2m(self, entry, genres_data, countries_data):
        genres = []
        for name in genres_data:
            genre, _ = Genre.objects.get_or_create(
                slug=name.lower().replace(" ", "-"),
                defaults={"name": name},
            )
            genres.append(genre)
        entry.genres.set(genres)

        countries = []
        for name in countries_data:
            country, _ = Country.objects.get_or_create(name=name)
            countries.append(country)
        entry.countries.set(countries)