import re

from rest_framework import viewsets

from common.permissions import IsAdminOrCoordinator, IsDimedStaff

from .models import TechnicalManual
from .serializers import TechnicalManualSerializer


def _norm(value):
    """Normalize names for fuzzy matching: 'HF59R (Digiscan V-30)' -> 'hf59rdigiscanv30'."""
    return re.sub(r"[\s\-_+().]", "", value or "").lower()


def _models_with_one_series():
    """Catalog models whose series is unique, so it need not be spelled out."""
    from django.db.models import Count

    from apps.equipment.catalog_models import EquipmentModel

    return set(
        EquipmentModel.objects.annotate(n=Count("series"))
        .filter(n=1)
        .values_list("id", flat=True)
    )


class TechnicalManualViewSet(viewsets.ModelViewSet):
    """Technical documentation library.

    Any Dimed staff member (including field technicians) can browse and open
    manuals; only admins/coordinators manage them. Client portal users have
    no access — this is internal documentation.
    """

    queryset = TechnicalManual.objects.select_related(
        "equipment_model", "equipment_model__manufacturer", "equipment_series"
    )
    serializer_class = TechnicalManualSerializer
    filterset_fields = [
        "document_type", "modality", "brand", "equipment_model", "equipment_series",
    ]
    search_fields = ["title", "brand", "model_name", "notes"]
    ordering_fields = ["brand", "model_name", "document_type", "created_at"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdminOrCoordinator()]
        return [IsDimedStaff()]

    def get_queryset(self):
        qs = super().get_queryset()
        equipment_id = self.request.query_params.get("for_equipment")
        if not equipment_id:
            return qs

        # Only the manuals that apply to THIS equipment: brand must match and,
        # when the manual is linked to a catalog model/series, the equipment's
        # model description must contain them (normalized comparison).
        from django.core.exceptions import ValidationError

        from apps.equipment.models import Equipment

        try:
            equipment = Equipment.objects.get(pk=equipment_id)
        except (Equipment.DoesNotExist, ValidationError, ValueError):
            return qs.none()

        target = _norm(f"{equipment.brand} {equipment.model_name}")
        single_series_models = _models_with_one_series()
        matching_ids = []
        for manual in qs:
            if _norm(manual.brand) not in target:
                continue
            if manual.equipment_model and _norm(manual.equipment_model.name) not in target:
                continue
            if manual.equipment_series and _norm(manual.equipment_series.name) not in target:
                # When the model has a single series there is nothing to
                # disambiguate: naming the model already identifies the
                # equipment, so the series is not required in its description.
                if manual.equipment_model_id not in single_series_models:
                    continue
            matching_ids.append(manual.id)
        return qs.filter(id__in=matching_ids)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
