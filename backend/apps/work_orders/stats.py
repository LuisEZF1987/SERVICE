from datetime import timedelta

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.clients.models import Client
from apps.contracts.models import Contract
from apps.equipment.models import Equipment
from apps.instruments.models import DUE_SOON_DAYS, MeasuringInstrument
from apps.qc_reports.models import QCReport
from apps.qc_reports.views import visible_reports
from apps.work_orders.models import WorkOrder

STAFF_ROLES = ("ADMIN", "COORDINATOR", "TECHNICIAN", "MANAGEMENT")


def staff_alerts(user):
    """Pending work the dashboard links to: QC reports to finish/sign and
    instruments whose calibration is expired or due within 3 months."""
    if user.role not in STAFF_ROLES:
        return {}
    today = timezone.localdate()
    instruments = MeasuringInstrument.objects.filter(
        requires_calibration=True,
    ).exclude(status=MeasuringInstrument.Status.RETIRED)
    reports = visible_reports(user)
    return {
        'qc_draft': reports.filter(status=QCReport.Status.DRAFT).count(),
        'qc_pending_signature': reports.filter(status=QCReport.Status.ISSUED).count(),
        'instruments_expired': instruments.filter(calibration_due_date__lt=today).count(),
        'instruments_due_soon': instruments.filter(
            calibration_due_date__gte=today,
            calibration_due_date__lte=today + timedelta(days=DUE_SOON_DAYS),
        ).count(),
        'instruments_no_record': instruments.filter(calibration_due_date__isnull=True).count(),
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    return Response({
        'ot_open': WorkOrder.objects.filter(status__in=['OPEN', 'IN_PROGRESS']).count(),
        'ot_pending_signature': WorkOrder.objects.filter(status='PENDING_SIGNATURE').count(),
        'equipment_active': Equipment.objects.filter(status='OPERATIONAL').count(),
        'contracts_active': Contract.objects.filter(status='ACTIVE').count(),
        'clients_total': Client.objects.count(),
        'ot_closed': WorkOrder.objects.filter(status='CLOSED').count(),
        'ot_total': WorkOrder.objects.count(),
        **staff_alerts(request.user),
    })
