from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import catalog_views

router = DefaultRouter()
router.register(r"manufacturers", catalog_views.ManufacturerViewSet)
router.register(r"models", catalog_views.EquipmentModelViewSet)
router.register(r"series", catalog_views.EquipmentSeriesViewSet)

urlpatterns = [
    path("import/", catalog_views.catalog_import, name="catalog-import"),
    path("", include(router.urls)),
]
