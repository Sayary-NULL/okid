from rest_framework.routers import DefaultRouter
from shelves.views import CollectionViewSet

router = DefaultRouter()
router.register(r"collections", CollectionViewSet, basename="collection")

urlpatterns = router.urls