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
    path(
        "service-report/<uuid:ot_id>/",
        views.service_report,
        name="report-service-report",
    ),
    path(
        "nda/<uuid:client_id>/",
        views.nda_agreement,
        name="report-nda",
    ),
]
