from rest_framework import serializers

from .models import ScheduledMaintenance


class ScheduledMaintenanceSerializer(serializers.ModelSerializer):
    frequency_display = serializers.CharField(source="get_frequency_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    equipment_code = serializers.CharField(source="equipment.internal_code", read_only=True)
    equipment_description = serializers.SerializerMethodField()
    client_name = serializers.CharField(source="equipment.client.name", read_only=True)
    work_order_number = serializers.CharField(
        source="work_order.number", read_only=True, default=None
    )

    class Meta:
        model = ScheduledMaintenance
        fields = [
            "id", "equipment", "equipment_code", "equipment_description", "client_name",
            "contract", "scheduled_date", "frequency", "frequency_display",
            "work_order", "work_order_number", "status", "status_display",
            "alert_sent", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_equipment_description(self, obj):
        eq = obj.equipment
        return f"{eq.brand} {eq.model_name}"


class ScheduledMaintenanceListSerializer(serializers.ModelSerializer):
    frequency_display = serializers.CharField(source="get_frequency_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    equipment_code = serializers.CharField(source="equipment.internal_code", read_only=True)
    equipment_description = serializers.SerializerMethodField()
    client_name = serializers.CharField(source="equipment.client.name", read_only=True)
    work_order_number = serializers.CharField(
        source="work_order.number", read_only=True, default=None
    )

    class Meta:
        model = ScheduledMaintenance
        fields = [
            "id", "equipment", "equipment_code", "equipment_description", "client_name",
            "scheduled_date", "frequency", "frequency_display",
            "work_order", "work_order_number", "status", "status_display",
        ]

    def get_equipment_description(self, obj):
        eq = obj.equipment
        return f"{eq.brand} {eq.model_name}"
