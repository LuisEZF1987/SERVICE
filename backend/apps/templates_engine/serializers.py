from rest_framework import serializers

from .models import TechnicalManual


class TechnicalManualSerializer(serializers.ModelSerializer):
    modality_display = serializers.CharField(source="get_modality_display", read_only=True)
    document_type_display = serializers.CharField(
        source="get_document_type_display", read_only=True
    )
    equipment_model_name = serializers.CharField(
        source="equipment_model.name", read_only=True, default=None
    )
    equipment_series_name = serializers.CharField(
        source="equipment_series.name", read_only=True, default=None
    )

    class Meta:
        model = TechnicalManual
        fields = [
            "id", "title", "document_type", "document_type_display",
            "brand", "modality", "modality_display", "model_name", "language",
            "equipment_model", "equipment_model_name",
            "equipment_series", "equipment_series_name",
            "file", "notes", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, data):
        # Give every manual a usable display title
        if not data.get("title") and not (self.instance and self.instance.title):
            brand = data.get("brand", getattr(self.instance, "brand", ""))
            model_name = data.get("model_name", getattr(self.instance, "model_name", ""))
            data["title"] = f"{brand} {model_name}".strip()
        return data
