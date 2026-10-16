from rest_framework import serializers

from .models import QCReport, QCReportPhoto
from .protocols import PROTOCOLS, photo_slots

JSON_LIST_FIELDS = ("instruments", "tests")
JSON_DICT_FIELDS = (
    "institution", "practice_info", "equipment_data", "tube_data",
    "hvl", "mammo_score", "radiation_levels",
)


class QCReportPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = QCReportPhoto
        fields = ["id", "report", "slot", "image", "caption", "created_at"]
        # report comes from the nested URL, not the payload
        read_only_fields = ["id", "report", "created_at"]


class QCReportListSerializer(serializers.ModelSerializer):
    practice_display = serializers.CharField(source="get_practice_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    work_order_number = serializers.CharField(source="work_order.number", read_only=True)

    class Meta:
        model = QCReport
        fields = [
            "id", "number", "work_order", "work_order_number", "practice",
            "practice_display", "status", "status_display", "overall_result",
            "issued_at", "signed_at", "created_at",
        ]


class QCReportSerializer(serializers.ModelSerializer):
    photos = QCReportPhotoSerializer(many=True, read_only=True)
    practice_display = serializers.CharField(source="get_practice_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    work_order_number = serializers.CharField(source="work_order.number", read_only=True)
    equipment_code = serializers.CharField(source="work_order.equipment.internal_code", read_only=True)
    client_name = serializers.CharField(source="work_order.client.name", read_only=True)
    technician_name = serializers.CharField(
        source="work_order.technician.get_full_name", read_only=True
    )
    format_code = serializers.SerializerMethodField()
    techniques = serializers.SerializerMethodField()
    photo_slots = serializers.SerializerMethodField()

    class Meta:
        model = QCReport
        fields = [
            "id", "number", "work_order", "work_order_number", "equipment_code",
            "client_name", "technician_name", "practice", "practice_display",
            "format_code", "techniques", "photo_slots", "status", "status_display",
            "service_type", "institution", "practice_info", "equipment_data",
            "tube_data", "instruments", "tests", "hvl", "mammo_score",
            "radiation_levels", "overall_result", "observations", "recommendations",
            "technician_id_number", "technician_license", "photos", "pdf_document", "signed_document", "issued_at", "signed_at",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "number", "work_order", "practice", "status", "pdf_document",
            "signed_document", "issued_at", "signed_at", "created_at", "updated_at",
        ]

    def get_format_code(self, obj):
        return PROTOCOLS[obj.practice]["format"]

    def get_techniques(self, obj):
        return PROTOCOLS[obj.practice]["techniques"]

    def get_photo_slots(self, obj):
        return [{"slot": s, "label": label} for s, label in photo_slots(obj.practice)]

    def validate(self, attrs):
        for name in JSON_LIST_FIELDS:
            if name in attrs and not isinstance(attrs[name], list):
                raise serializers.ValidationError({name: "Debe ser una lista."})
        for name in JSON_DICT_FIELDS:
            if name in attrs and not isinstance(attrs[name], dict):
                raise serializers.ValidationError({name: "Debe ser un objeto."})
        return attrs


class QCReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = QCReport
        fields = ["id", "work_order", "practice", "service_type"]
        read_only_fields = ["id"]


class UploadSignedReportSerializer(serializers.Serializer):
    signed_document = serializers.FileField()

    def validate_signed_document(self, value):
        if not value.name.lower().endswith(".pdf"):
            raise serializers.ValidationError("El informe firmado debe ser un PDF.")
        if value.size > 20 * 1024 * 1024:
            raise serializers.ValidationError("El documento no puede superar 20 MB.")
        return value
