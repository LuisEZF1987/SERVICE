from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"", views.WorkOrderViewSet)

urlpatterns = [
    # Nested resources under work orders
    path(
        "<uuid:ot_pk>/photos/",
        views.WorkOrderPhotoViewSet.as_view({"get": "list", "post": "create"}),
        name="ot-photos-list",
    ),
    path(
        "<uuid:ot_pk>/photos/<uuid:pk>/",
        views.WorkOrderPhotoViewSet.as_view({"get": "retrieve", "delete": "destroy"}),
        name="ot-photos-detail",
    ),
    path(
        "<uuid:ot_pk>/spare-parts/",
        views.WorkOrderSparePartViewSet.as_view({"get": "list", "post": "create"}),
        name="ot-spare-parts-list",
    ),
    path(
        "<uuid:ot_pk>/spare-parts/<uuid:pk>/",
        views.WorkOrderSparePartViewSet.as_view(
            {"get": "retrieve", "put": "update", "delete": "destroy"}
        ),
        name="ot-spare-parts-detail",
    ),
    path(
        "<uuid:ot_pk>/checklist/",
        views.ChecklistExecutionViewSet.as_view({"get": "list", "post": "create"}),
        name="ot-checklist-list",
    ),
    path(
        "<uuid:ot_pk>/checklist/<uuid:pk>/",
        views.ChecklistExecutionViewSet.as_view(
            {"get": "retrieve", "put": "update", "patch": "partial_update"}
        ),
        name="ot-checklist-detail",
    ),
    path("", include(router.urls)),
]
