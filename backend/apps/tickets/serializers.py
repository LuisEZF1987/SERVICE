from rest_framework import serializers

from .models import Ticket, TicketComment


class TicketCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = TicketComment
        fields = ["id", "body", "is_internal", "author_name", "created_at"]
        read_only_fields = ["id", "author_name", "created_at"]

    def get_author_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return "Sistema"


class LinkedWorkOrderSerializer(serializers.Serializer):
    """Light view of the OTs generated from a ticket."""

    id = serializers.UUIDField(read_only=True)
    number = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    ot_type = serializers.CharField(read_only=True)
    type_display = serializers.CharField(source="get_ot_type_display", read_only=True)


class TicketSerializer(serializers.ModelSerializer):
    channel_display = serializers.CharField(source="get_channel_display", read_only=True)
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    client_name = serializers.CharField(source="client.name", read_only=True)
    equipment_code = serializers.CharField(
        source="equipment.internal_code", read_only=True, default=None
    )
    contract_number = serializers.CharField(
        source="contract.number", read_only=True, default=None
    )
    assigned_to_name = serializers.SerializerMethodField()
    is_sla_breached = serializers.BooleanField(read_only=True)
    comments = serializers.SerializerMethodField()
    work_orders = LinkedWorkOrderSerializer(many=True, read_only=True)

    class Meta:
        model = Ticket
        fields = [
            "id", "number", "subject", "description",
            "client", "client_name", "equipment", "equipment_code",
            "contract", "contract_number",
            "channel", "channel_display", "priority", "priority_display",
            "status", "status_display",
            "reported_by_name", "reported_by_email",
            "assigned_to", "assigned_to_name",
            "sla_due_at", "is_sla_breached",
            "resolution_notes", "resolved_at", "closed_at",
            "comments", "work_orders",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "number", "status", "sla_due_at",
            "resolved_at", "closed_at", "created_at", "updated_at",
        ]

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name() or obj.assigned_to.username
        return None

    def get_comments(self, obj):
        qs = obj.comments.all()
        request = self.context.get("request")
        # Client portal users never see internal notes
        if request and getattr(request.user, "role", None) == "CLIENT":
            qs = qs.filter(is_internal=False)
        return TicketCommentSerializer(qs, many=True).data


class TicketListSerializer(serializers.ModelSerializer):
    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    client_name = serializers.CharField(source="client.name", read_only=True)
    equipment_code = serializers.CharField(
        source="equipment.internal_code", read_only=True, default=None
    )
    assigned_to_name = serializers.SerializerMethodField()
    is_sla_breached = serializers.BooleanField(read_only=True)

    class Meta:
        model = Ticket
        fields = [
            "id", "number", "subject", "client", "client_name",
            "equipment", "equipment_code",
            "priority", "priority_display", "status", "status_display",
            "assigned_to", "assigned_to_name",
            "sla_due_at", "is_sla_breached", "created_at",
        ]

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name() or obj.assigned_to.username
        return None


class ResolveTicketSerializer(serializers.Serializer):
    resolution_notes = serializers.CharField(required=False, allow_blank=True)
