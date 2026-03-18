from rest_framework import serializers

from .models import ChecklistExecution, WorkOrder, WorkOrderPhoto, WorkOrderSparePart


class WorkOrderPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkOrderPhoto
        fields = ["id", "work_order", "photo", "photo_type", "caption", "created_at"]
        read_only_fields = ["id", "created_at"]


class WorkOrderSparePartSerializer(serializers.ModelSerializer):
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = WorkOrderSparePart
        fields = [
            "id", "work_order", "spare_part", "description",
            "code", "quantity", "unit_cost", "total_cost",
        ]
        read_only_fields = ["id"]


class ChecklistExecutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistExecution
        fields = [
            "id", "work_order", "task_name", "frequency", "completed",
            "measured_value", "reference_value", "tolerance",
            "is_within_tolerance", "notes", "photo", "order",
        ]
        read_only_fields = ["id"]


class WorkOrderSerializer(serializers.ModelSerializer):
    photos = WorkOrderPhotoSerializer(many=True, read_only=True)
    spare_parts_used = WorkOrderSparePartSerializer(many=True, read_only=True)
    checklist_items = ChecklistExecutionSerializer(many=True, read_only=True)

    type_display = serializers.CharField(source="get_ot_type_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    result_display = serializers.CharField(source="get_result_display", read_only=True)
    equipment_code = serializers.CharField(source="equipment.internal_code", read_only=True)
    equipment_description = serializers.SerializerMethodField()
    client_name = serializers.CharField(source="client.name", read_only=True)
    technician_name = serializers.CharField(source="technician.get_full_name", read_only=True)
    is_signed_by_client = serializers.BooleanField(read_only=True)
    total_spare_parts_cost = serializers.SerializerMethodField()

    class Meta:
        model = WorkOrder
        fields = [
            "id", "number", "ot_type", "type_display", "priority", "priority_display",
            "status", "status_display", "executing_company",
            "equipment", "equipment_code", "equipment_description",
            "client", "client_name", "contract", "technician", "technician_name",
            "template_version",
            "opened_at", "arrival_at", "started_at", "finished_at", "closed_at",
            "total_hours",
            "reported_problem", "diagnosis", "work_performed",
            "result", "result_display", "follow_up_notes",
            "travel_cost",
            "client_signature", "client_signer_name", "client_signer_position",
            "signed_at", "technician_signature", "technician_signed_at",
            "pdf_document", "signature_email_sent", "electronic_signature_document",
            "is_signed_by_client", "total_spare_parts_cost",
            "photos", "spare_parts_used", "checklist_items",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "number", "opened_at", "closed_at", "total_hours",
            "pdf_document", "created_at", "updated_at",
        ]

    def get_equipment_description(self, obj):
        eq = obj.equipment
        return f"{eq.brand} {eq.model_name} — {eq.get_modality_display()}"

    def get_total_spare_parts_cost(self, obj):
        return sum(sp.total_cost for sp in obj.spare_parts_used.all())

    def validate(self, data):
        # Cannot modify closed OTs
        if self.instance and self.instance.status == WorkOrder.Status.CLOSED:
            raise serializers.ValidationError(
                "Una OT cerrada y firmada no puede ser modificada."
            )
        return data


class WorkOrderListSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source="get_ot_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    equipment_code = serializers.CharField(source="equipment.internal_code", read_only=True)
    client_name = serializers.CharField(source="client.name", read_only=True)
    technician_name = serializers.CharField(source="technician.get_full_name", read_only=True)

    class Meta:
        model = WorkOrder
        fields = [
            "id", "number", "ot_type", "type_display", "priority", "priority_display",
            "status", "status_display", "equipment_code", "client_name",
            "technician_name", "opened_at", "result",
        ]


class SignWorkOrderSerializer(serializers.Serializer):
    """Serializer for client signature on a work order."""
    client_signature = serializers.ImageField()
    client_signer_name = serializers.CharField(max_length=200)
    client_signer_position = serializers.CharField(max_length=100)
