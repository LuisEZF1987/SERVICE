from django.core.files.base import ContentFile
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import SAFE_METHODS, IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import AuditLog
from apps.accounts.utils import create_audit_log
from apps.work_orders.models import WorkOrder

from .models import QCReport, QCReportPhoto
from .protocols import initial_report_data, photo_slots, practices_payload
from .serializers import (
    QCReportCreateSerializer,
    QCReportListSerializer,
    QCReportPhotoSerializer,
    QCReportSerializer,
    UploadSignedReportSerializer,
)
from .services.pdf import render_qc_report_pdf

EDITOR_ROLES = ("ADMIN", "COORDINATOR", "TECHNICIAN")

OT_TYPE_TO_SERVICE = {
    WorkOrder.Type.PREVENTIVE: QCReport.ServiceType.PREVENTIVE,
    WorkOrder.Type.CALIBRATION: QCReport.ServiceType.PREVENTIVE,
    WorkOrder.Type.CORRECTIVE: QCReport.ServiceType.CORRECTIVE,
    WorkOrder.Type.WARRANTY: QCReport.ServiceType.CORRECTIVE,
    WorkOrder.Type.INSTALLATION: QCReport.ServiceType.INSTALLATION,
}


def can_edit(user, work_order):
    """Dimed staff edit any report; a technician only those of their own OTs."""
    if user.role not in EDITOR_ROLES:
        return False
    if user.role == "TECHNICIAN":
        return work_order.technician_id == user.id
    return True


def visible_reports(user):
    """Reports the user may see: technicians their own OTs', clients only signed ones."""
    qs = QCReport.objects.select_related(
        "work_order", "work_order__equipment", "work_order__client", "work_order__technician"
    ).prefetch_related("photos")
    if user.role == "TECHNICIAN":
        qs = qs.filter(work_order__technician=user)
    elif user.role == "CLIENT":
        # The client receives the signed PDF by email; the portal only
        # lists reports once they are signed.
        qs = qs.filter(
            work_order__client=user.client_organization, status=QCReport.Status.SIGNED
        )
    return qs


class QCReportViewSet(viewsets.ModelViewSet):
    """
    Quality-control reports (formats 9.1.1–9.1.6). One OT may carry several
    reports, e.g. when a room has more than one X-ray unit to test.
    """

    queryset = QCReport.objects.none()
    permission_classes = [IsAuthenticated]
    filterset_fields = ["work_order", "practice", "status"]
    search_fields = ["number", "work_order__number", "work_order__client__name"]
    ordering_fields = ["created_at", "number", "status"]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_serializer_class(self):
        if self.action == "list":
            return QCReportListSerializer
        if self.action == "create":
            return QCReportCreateSerializer
        return QCReportSerializer

    def get_queryset(self):
        return visible_reports(self.request.user)

    def _require_editable(self, report):
        if not can_edit(self.request.user, report.work_order):
            raise PermissionDenied("No tiene permiso para modificar este informe.")
        if report.is_locked:
            raise PermissionDenied("Un informe firmado no puede modificarse.")

    @action(detail=False, methods=["get"])
    def practices(self, request):
        """Practice catalogue (formats 9.1.1–9.1.6) for the 'new report' dialog."""
        return Response(practices_payload())

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        work_order = serializer.validated_data["work_order"]
        practice = serializer.validated_data["practice"]

        if not can_edit(request.user, work_order):
            raise PermissionDenied("No tiene permiso para crear informes en esta OT.")
        if work_order.status == WorkOrder.Status.CLOSED:
            return Response(
                {"detail": "No se pueden crear informes en una OT cerrada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        report = QCReport.objects.create(
            work_order=work_order,
            practice=practice,
            service_type=serializer.validated_data.get("service_type")
            or OT_TYPE_TO_SERVICE.get(work_order.ot_type, ""),
            created_by=request.user,
            **initial_report_data(work_order, practice),
        )
        create_audit_log(
            user=request.user,
            action=AuditLog.Action.CREATE,
            model_name="QCReport",
            object_id=str(report.id),
            details={"number": report.number, "work_order": work_order.number, "practice": practice},
            request=request,
        )
        return Response(QCReportSerializer(report, context={"request": request}).data,
                         status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        report = serializer.instance
        self._require_editable(report)
        # Any change invalidates a generated PDF: it must be issued again.
        serializer.save(
            updated_by=self.request.user,
            status=QCReport.Status.DRAFT,
            issued_at=None,
        )

    def perform_destroy(self, instance):
        self._require_editable(instance)
        instance.delete()

    @action(detail=True, methods=["post"], url_path="generate-pdf")
    def generate_pdf(self, request, pk=None):
        """Render the report to PDF; it is then ready for the technician's e-signature."""
        report = self.get_object()
        self._require_editable(report)
        if not report.overall_result:
            return Response(
                {"detail": "Indique el resultado general antes de emitir el informe."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pdf_bytes = render_qc_report_pdf(report)
        report.pdf_document.save(f"{report.number}.pdf", ContentFile(pdf_bytes), save=False)
        report.status = QCReport.Status.ISSUED
        report.issued_at = timezone.now()
        report.save(update_fields=["pdf_document", "status", "issued_at", "updated_at"])
        return Response(QCReportSerializer(report, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="upload-signed")
    def upload_signed(self, request, pk=None):
        """Register the PDF signed electronically (FirmaEC) by the technician.

        From here on the report is locked: the signed PDF is the official
        record delivered to the user institution.
        """
        report = self.get_object()
        self._require_editable(report)
        if report.status != QCReport.Status.ISSUED:
            return Response(
                {"detail": "Genere el PDF del informe antes de subir la versión firmada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = UploadSignedReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report.signed_document = serializer.validated_data["signed_document"]
        report.status = QCReport.Status.SIGNED
        report.signed_at = timezone.now()
        report.save(update_fields=["signed_document", "status", "signed_at", "updated_at"])

        create_audit_log(
            user=request.user,
            action=AuditLog.Action.SIGN,
            model_name="QCReport",
            object_id=str(report.id),
            details={"number": report.number, "medio": "firma electrónica del técnico"},
            request=request,
        )
        return Response(QCReportSerializer(report, context={"request": request}).data)


class QCReportPhotoViewSet(viewsets.ModelViewSet):
    """Images placed in the report's photo slots."""

    serializer_class = QCReportPhotoSerializer
    permission_classes = [IsAuthenticated]

    def _report(self):
        return get_object_or_404(visible_reports(self.request.user), pk=self.kwargs["report_pk"])

    def get_queryset(self):
        return QCReportPhoto.objects.filter(report=self._report())

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.method not in SAFE_METHODS:
            report = self._report()
            if not can_edit(request.user, report.work_order):
                raise PermissionDenied("No tiene permiso para modificar este informe.")
            if report.is_locked:
                raise PermissionDenied("Las imágenes de un informe firmado no pueden modificarse.")

    def perform_create(self, serializer):
        report = self._report()
        valid_slots = {s for s, _ in photo_slots(report.practice)}
        if serializer.validated_data["slot"] not in valid_slots:
            raise ValidationError({"slot": "Espacio de imagen no válido para esta práctica."})
        serializer.save(report=report, created_by=self.request.user)
        # New evidence invalidates a generated PDF.
        QCReport.objects.filter(pk=report.pk).update(status=QCReport.Status.DRAFT, issued_at=None)

    def perform_destroy(self, instance):
        instance.delete()
        QCReport.objects.filter(pk=instance.report_id).update(
            status=QCReport.Status.DRAFT, issued_at=None
        )

