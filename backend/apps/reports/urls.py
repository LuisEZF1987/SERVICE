from django.urls import path

from . import views

urlpatterns = [
    path(
        "maintenance-certificate/<uuid:ot_id>/",
        views.maintenance_certificate,
        name="report-maintenance-certificate",
    ),
    path(
        "equipment-history/<uuid:equipment_id>/",
        views.equipment_history,
        name="report-equipment-history",
    ),
]
