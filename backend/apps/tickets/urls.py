from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"", views.TicketViewSet)

urlpatterns = [
    path(
        "<uuid:ticket_pk>/comments/",
        views.TicketCommentViewSet.as_view({"get": "list", "post": "create"}),
        name="ticket-comments-list",
    ),
    path("", include(router.urls)),
]
