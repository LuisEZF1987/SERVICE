from rest_framework import serializers

from .models import Client, ClientContact


class ClientContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientContact
        fields = [
            "id", "client", "name", "position", "email", "phone",
            "is_primary", "is_signer", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ClientSerializer(serializers.ModelSerializer):
    contacts = ClientContactSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    type_display = serializers.CharField(source="get_client_type_display", read_only=True)
    equipment_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Client
        fields = [
            "id", "name", "ruc", "client_type", "type_display", "address",
            "city", "province", "phone", "email", "status", "status_display",
            "notes", "nda_signed", "nda_document", "nda_signed_date",
            "ruc_document", "contract_document", "contacts",
            "equipment_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "status", "created_at", "updated_at"]

    def validate_ruc(self, value):
        if len(value) != 13:
            raise serializers.ValidationError("El RUC debe tener 13 dígitos.")
        if not value.isdigit():
            raise serializers.ValidationError("El RUC debe contener solo números.")
        return value


class ClientListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views."""
    type_display = serializers.CharField(source="get_client_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Client
        fields = [
            "id", "name", "ruc", "client_type", "type_display",
            "city", "status", "status_display", "nda_signed",
        ]
