from rest_framework import serializers

from .models import Equipment


class EquipmentSerializer(serializers.ModelSerializer):
    modality_display = serializers.CharField(source="get_modality_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    client_name = serializers.CharField(source="client.name", read_only=True)
    is_under_factory_warranty = serializers.BooleanField(read_only=True)
    is_under_dimed_warranty = serializers.BooleanField(read_only=True)

    class Meta:
        model = Equipment
        fields = [
            "id", "internal_code", "serial_number", "hospital_asset_number",
            "arcsa_registration", "has_fda", "has_ce", "has_iso_13485",
            "modality", "modality_display", "brand", "model_name",
            "country_of_origin", "year_of_manufacture", "technical_specs",
            "client", "client_name", "area", "city", "province",
            "status", "status_display",
            "factory_warranty_start", "factory_warranty_end",
            "dimed_warranty_start", "dimed_warranty_end",
            "is_under_factory_warranty", "is_under_dimed_warranty",
            "contract", "maintenance_template", "photo",
            "created_at", "updated_at",
        ]
        # internal_code is assigned by Dimed in Equipment.save() and identifies
        # the asset on its physical label — it must not change afterwards.
        read_only_fields = ["id", "internal_code", "created_at", "updated_at"]


class EquipmentListSerializer(serializers.ModelSerializer):
    modality_display = serializers.CharField(source="get_modality_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    client_name = serializers.CharField(source="client.name", read_only=True)

    class Meta:
        model = Equipment
        fields = [
            "id", "internal_code", "serial_number", "modality", "modality_display",
            "brand", "model_name", "client", "client_name", "city",
            "status", "status_display",
        ]
