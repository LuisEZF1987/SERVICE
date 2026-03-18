from rest_framework import serializers

from .catalog_models import EquipmentModel, EquipmentSeries, Manufacturer


class ManufacturerSerializer(serializers.ModelSerializer):
    models_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Manufacturer
        fields = [
            "id", "name", "country", "is_active", "models_count",
        ]
        read_only_fields = ["id"]


class EquipmentModelSerializer(serializers.ModelSerializer):
    manufacturer_name = serializers.CharField(source="manufacturer.name", read_only=True)
    modality_display = serializers.CharField(source="get_modality_display", read_only=True)
    series_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = EquipmentModel
        fields = [
            "id", "manufacturer", "manufacturer_name",
            "modality", "modality_display", "name",
            "is_active", "series_count",
        ]
        read_only_fields = ["id"]


class EquipmentSeriesSerializer(serializers.ModelSerializer):
    model_name = serializers.CharField(source="equipment_model.name", read_only=True)
    manufacturer_name = serializers.CharField(
        source="equipment_model.manufacturer.name", read_only=True
    )
    modality = serializers.CharField(source="equipment_model.modality", read_only=True)

    class Meta:
        model = EquipmentSeries
        fields = [
            "id", "equipment_model", "model_name", "manufacturer_name",
            "modality", "name", "description", "is_active",
        ]
        read_only_fields = ["id"]


class CatalogImportSerializer(serializers.Serializer):
    file = serializers.FileField()
