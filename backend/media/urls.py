from django.urls import path
from rest_framework.routers import DefaultRouter

from media.views import (
    CountryViewSet,
    GenreViewSet,
    ImportView,
    InformerViewSet,
    MediaEntryViewSet,
    SearchView,
)

router = DefaultRouter()
router.register(r"media", MediaEntryViewSet, basename="media")
router.register(r"genres", GenreViewSet, basename="genre")
router.register(r"countries", CountryViewSet, basename="country")
router.register(r"informers", InformerViewSet, basename="informer")

urlpatterns = [
    path("search/", SearchView.as_view(), name="search"),
    path("import/", ImportView.as_view(), name="import"),
]

urlpatterns += router.urls