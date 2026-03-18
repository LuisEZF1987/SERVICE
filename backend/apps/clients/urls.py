from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"", views.ClientViewSet)

urlpatterns = [
    path(
        "<uuid:client_pk>/contacts/",
        views.ClientContactViewSet.as_view({"get": "list", "post": "create"}),
        name="client-contacts-list",
    ),
    path(
        "<uuid:client_pk>/contacts/<uuid:pk>/",
        views.ClientContactViewSet.as_view(
            {"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}
        ),
        name="client-contacts-detail",
    ),
    path("", include(router.urls)),
]
