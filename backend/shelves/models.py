from django.db import models


class Collection(models.Model):
    user = models.ForeignKey(
        "auth.User", on_delete=models.CASCADE, related_name="collections"
    )
    name = models.CharField(max_length=300)
    description = models.TextField(blank=True, default="")
    poster = models.ImageField(
        upload_to="collection_posters/", null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return self.name


class CollectionItem(models.Model):
    collection = models.ForeignKey(
        Collection, on_delete=models.CASCADE, related_name="items"
    )
    media_entry = models.ForeignKey(
        "media.MediaEntry", on_delete=models.CASCADE, related_name="collection_items"
    )
    position = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("position",)
        constraints = [
            models.UniqueConstraint(
                fields=["collection", "media_entry"],
                name="unique_collection_media",
            )
        ]

    def __str__(self):
        return f"{self.collection} – {self.media_entry}"