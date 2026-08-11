from django.utils import timezone
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


class NDAUploadSerializer(serializers.Serializer):
    """Registers the signed NDA: file + signature date. Activates the client."""

    nda_document = serializers.FileField()
    nda_signed_date = serializers.DateField()

    ALLOWED_EXTENSIONS = (".pdf", ".jpg", ".jpeg", ".png")
    MAX_SIZE_MB = 20

    def validate_nda_document(self, value):
        name = value.name.lower()
        if not name.endswith(self.ALLOWED_EXTENSIONS):
            raise serializers.ValidationError(
                "El documento debe ser PDF o una imagen (JPG/PNG)."
            )
        if value.size > self.MAX_SIZE_MB * 1024 * 1024:
            raise serializers.ValidationError(
                f"El documento no puede superar {self.MAX_SIZE_MB} MB."
            )
        return value

    def validate_nda_signed_date(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError(
                "La fecha de firma no puede ser futura."
            )
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
