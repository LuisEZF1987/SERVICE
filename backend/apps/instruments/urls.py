from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"", views.MeasuringInstrumentViewSet, basename="instrument")

urlpatterns = [
    path(
        "<uuid:instrument_pk>/calibrations/",
        views.InstrumentCalibrationViewSet.as_view({"get": "list", "post": "create"}),
        name="instrument-calibrations-list",
    ),
    path(
        "<uuid:instrument_pk>/calibrations/<uuid:pk>/",
        views.InstrumentCalibrationViewSet.as_view({"get": "retrieve", "delete": "destroy"}),
        name="instrument-calibrations-detail",
    ),
    path("", include(router.urls)),
]
