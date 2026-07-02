import csv
import io

from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.permissions import IsAdminOrCoordinator

from .catalog_models import EquipmentModel, EquipmentSeries, Manufacturer
from .catalog_serializers import (
    EquipmentModelSerializer,
    EquipmentSeriesSerializer,
    ManufacturerSerializer,
)

# ---------------------------------------------------------------------------
# ViewSets
# ---------------------------------------------------------------------------

class ManufacturerViewSet(viewsets.ModelViewSet):
    """CRUD for equipment manufacturers."""

    queryset = Manufacturer.objects.annotate(models_count=Count("models")).all()
    serializer_class = ManufacturerSerializer
    search_fields = ["name"]
    filterset_fields = ["is_active"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdminOrCoordinator()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class EquipmentModelViewSet(viewsets.ModelViewSet):
    """CRUD for equipment models."""

    queryset = (
        EquipmentModel.objects
        .select_related("manufacturer")
        .annotate(series_count=Count("series"))
        .all()
    )
    serializer_class = EquipmentModelSerializer
    filterset_fields = ["manufacturer", "modality", "is_active"]
    search_fields = ["name", "manufacturer__name"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdminOrCoordinator()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class EquipmentSeriesViewSet(viewsets.ModelViewSet):
    """CRUD for equipment series."""

    queryset = (
        EquipmentSeries.objects
        .select_related("equipment_model", "equipment_model__manufacturer")
        .all()
    )
    serializer_class = EquipmentSeriesSerializer
    filterset_fields = [
        "equipment_model",
        "equipment_model__manufacturer",
        "equipment_model__modality",
        "is_active",
    ]
    search_fields = ["name"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdminOrCoordinator()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


# ---------------------------------------------------------------------------
# CSV Import
# ---------------------------------------------------------------------------

MODALITY_MAP = {
    "rayos x fijo": "XRAY_FIXED", "xray_fixed": "XRAY_FIXED", "rx fijo": "XRAY_FIXED",
    "rayos x portatil": "XRAY_PORTABLE", "xray_portable": "XRAY_PORTABLE", "rx portatil": "XRAY_PORTABLE",
    "tomografo": "CT", "tac": "CT", "ct": "CT",
    "resonancia magnetica": "MRI", "mri": "MRI", "rmn": "MRI",
    "ultrasonido": "ULTRASOUND", "ultrasound": "ULTRASOUND", "ecografo": "ULTRASOUND",
    "mamografo": "MAMMOGRAPH", "mammograph": "MAMMOGRAPH",
    "fluoroscopio": "FLUOROSCOPE", "fluoroscope": "FLUOROSCOPE", "arco en c": "FLUOROSCOPE",
    "densitometro": "DENSITOMETER", "densitometer": "DENSITOMETER",
    "otro": "OTHER", "other": "OTHER",
}


@api_view(["POST"])
@permission_classes([IsAdminOrCoordinator])
@parser_classes([MultiPartParser])
def catalog_import(request):
    """Import catalog data from a CSV file.

    Expected CSV columns: modalidad, fabricante, modelo, serie
    """
    file = request.FILES.get("file")
    if not file:
        return Response(
            {"detail": "No se envió archivo."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        content = file.read().decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(content))
    except Exception as e:
        return Response(
            {"detail": f"Error leyendo archivo: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    created = {"manufacturers": 0, "models": 0, "series": 0}
    errors = []

    for i, row in enumerate(reader, start=2):
        modalidad = row.get("modalidad", "").strip()
        fabricante = row.get("fabricante", "").strip()
        modelo = row.get("modelo", "").strip()
        serie = row.get("serie", "").strip()

        if not fabricante or not modelo:
            errors.append(f"Fila {i}: fabricante y modelo son obligatorios")
            continue

        modality_code = MODALITY_MAP.get(modalidad.lower(), modalidad.upper())
        valid_modalities = [c[0] for c in EquipmentModel.Modality.choices]
        if modality_code not in valid_modalities:
            errors.append(f"Fila {i}: modalidad '{modalidad}' no reconocida")
            continue

        mfr, c = Manufacturer.objects.get_or_create(
            name=fabricante, defaults={"created_by": request.user}
        )
        if c:
            created["manufacturers"] += 1

        mdl, c = EquipmentModel.objects.get_or_create(
            manufacturer=mfr,
            name=modelo,
            defaults={"modality": modality_code, "created_by": request.user},
        )
        if c:
            created["models"] += 1

        if serie:
            _, c = EquipmentSeries.objects.get_or_create(
                equipment_model=mdl,
                name=serie,
                defaults={"created_by": request.user},
            )
            if c:
                created["series"] += 1

    return Response({
        "created": created,
        "errors": errors,
        "detail": (
            f"Importación completada: {created['manufacturers']} fabricantes, "
            f"{created['models']} modelos, {created['series']} series creados."
        ),
    })
