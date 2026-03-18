from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from apps.work_orders.models import WorkOrder
from apps.equipment.models import Equipment
from apps.contracts.models import Contract
from apps.clients.models import Client


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
    })
