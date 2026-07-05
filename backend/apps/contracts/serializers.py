from rest_framework import serializers

from .models import Contract


class ContractSerializer(serializers.ModelSerializer):
    contract_type_display = serializers.CharField(
        source="get_contract_type_display", read_only=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    client_name = serializers.CharField(source="client.name", read_only=True)

    class Meta:
        model = Contract
        fields = [
            "id", "number", "contract_type", "contract_type_display",
            "client", "client_name", "sercop_reference",
            "start_date", "end_date", "total_value", "value_per_visit", "payment_terms",
            "sla_response_hours", "preventive_visits_per_year",
            "status", "status_display", "document", "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ContractListSerializer(serializers.ModelSerializer):
    contract_type_display = serializers.CharField(
        source="get_contract_type_display", read_only=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    client_name = serializers.CharField(source="client.name", read_only=True)

    class Meta:
        model = Contract
        fields = [
            "id", "number", "contract_type", "contract_type_display",
            "client", "client_name", "start_date", "end_date",
            "status", "status_display",
        ]
