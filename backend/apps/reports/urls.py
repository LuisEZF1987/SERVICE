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
    path(
        "maintenance-schedule/equipment/<uuid:equipment_id>/",
        views.maintenance_schedule,
        name="report-maintenance-schedule",
    ),
    path(
        "maintenance-schedule/client/<uuid:client_id>/",
        views.client_maintenance_schedule,
        name="report-client-maintenance-schedule",
    ),
    path(
        "maintenance-schedule/equipment/<uuid:equipment_id>/ics/",
        views.maintenance_schedule_ics,
        name="report-maintenance-schedule-ics",
    ),
    path(
        "maintenance-schedule/client/<uuid:client_id>/ics/",
        views.client_maintenance_schedule_ics,
        name="report-client-maintenance-schedule-ics",
    ),
]
