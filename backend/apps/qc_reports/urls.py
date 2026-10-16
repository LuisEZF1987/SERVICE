from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"", views.QCReportViewSet, basename="qc-report")

urlpatterns = [
    path(
        "<uuid:report_pk>/photos/",
        views.QCReportPhotoViewSet.as_view({"get": "list", "post": "create"}),
        name="qc-report-photos-list",
    ),
    path(
        "<uuid:report_pk>/photos/<uuid:pk>/",
        views.QCReportPhotoViewSet.as_view({"get": "retrieve", "delete": "destroy"}),
        name="qc-report-photos-detail",
    ),
    path("", include(router.urls)),
]
