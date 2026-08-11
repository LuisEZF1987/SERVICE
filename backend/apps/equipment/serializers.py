from rest_framework import serializers

from apps.clients.models import Client

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
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_internal_code(self, value):
        if not value.startswith("DIM-"):
            raise serializers.ValidationError(
                "El código interno debe comenzar con 'DIM-'."
            )
        return value

    def validate_client(self, value):
        # Business rule: a client without a signed NDA is inactive and cannot
        # hold equipment. Only checked when assigning a new client, so existing
        # equipment stays editable if the client is deactivated later.
        assigning_new_client = self.instance is None or self.instance.client_id != value.id
        if assigning_new_client and value.status != Client.Status.ACTIVE:
            raise serializers.ValidationError(
                f"El cliente «{value.name}» está inactivo porque no tiene el NDA "
                f"firmado. Registre el NDA antes de asignarle equipos."
            )
        return value


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
