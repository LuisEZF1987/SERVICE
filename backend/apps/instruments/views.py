from datetime import timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import SAFE_METHODS, BasePermission, IsAuthenticated

from .models import DUE_SOON_DAYS, InstrumentCalibration, MeasuringInstrument
from .serializers import InstrumentCalibrationSerializer, MeasuringInstrumentSerializer

STAFF_ROLES = ("ADMIN", "COORDINATOR", "TECHNICIAN", "MANAGEMENT")


class InstrumentPermission(BasePermission):
    """Dimed staff read the inventory (technicians pick instruments for their
    reports); admins/coordinators change it and only admins delete."""

    def has_permission(self, request, view):
        role = getattr(request.user, "role", None)
        if request.method in SAFE_METHODS:
            return role in STAFF_ROLES
        if request.method == "DELETE":
            return role == "ADMIN" or request.user.is_superuser
        return role in ("ADMIN", "COORDINATOR")


class MeasuringInstrumentViewSet(viewsets.ModelViewSet):
    serializer_class = MeasuringInstrumentSerializer
    permission_classes = [IsAuthenticated, InstrumentPermission]
    filterset_fields = ["instrument_type", "status", "requires_calibration"]
    search_fields = ["name", "brand", "model_name", "serial_number", "assigned_to"]
    ordering_fields = ["calibration_due_date", "name", "serial_number"]

    def get_queryset(self):
        qs = MeasuringInstrument.objects.prefetch_related("calibrations")
        # ?calibration=expired|due_soon|valid|no_record
        wanted = self.request.query_params.get("calibration")
        today = timezone.localdate()
        soon = today + timedelta(days=DUE_SOON_DAYS)
        if wanted == "expired":
            qs = qs.filter(requires_calibration=True, calibration_due_date__lt=today)
        elif wanted == "due_soon":
            qs = qs.filter(requires_calibration=True, calibration_due_date__range=(today, soon))
        elif wanted == "valid":
            qs = qs.filter(requires_calibration=True, calibration_due_date__gt=soon)
        elif wanted == "no_record":
            qs = qs.filter(requires_calibration=True, calibration_due_date__isnull=True)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class InstrumentCalibrationViewSet(viewsets.ModelViewSet):
    serializer_class = InstrumentCalibrationSerializer
    permission_classes = [IsAuthenticated, InstrumentPermission]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def _instrument(self):
        return get_object_or_404(MeasuringInstrument, pk=self.kwargs["instrument_pk"])

    def get_queryset(self):
        return InstrumentCalibration.objects.filter(instrument=self._instrument())

    def perform_create(self, serializer):
        serializer.save(instrument=self._instrument(), created_by=self.request.user)
