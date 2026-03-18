from rest_framework import serializers

from .models import SparePart


class SparePartSerializer(serializers.ModelSerializer):
    modality_display = serializers.CharField(source="get_modality_display", read_only=True)
    is_below_minimum_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = SparePart
        fields = [
            "id", "modality", "modality_display", "manufacturer", "equipment_model",
            "equipment_series", "part_number", "description", "unit_cost",
            "stock_quantity", "minimum_stock", "location", "supplier",
            "is_below_minimum_stock", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SparePartListSerializer(serializers.ModelSerializer):
    modality_display = serializers.CharField(source="get_modality_display", read_only=True)
    is_below_minimum_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = SparePart
        fields = [
            "id", "modality", "modality_display", "manufacturer", "equipment_model",
            "part_number", "description", "unit_cost", "stock_quantity",
            "minimum_stock", "is_below_minimum_stock",
        ]
