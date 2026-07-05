from rest_framework import serializers

from .models import Quote, QuoteItem


class QuoteItemSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source="get_kind_display", read_only=True)
    total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = QuoteItem
        fields = [
            "id", "kind", "kind_display", "spare_part", "description",
            "code", "quantity", "unit_price", "total", "order",
        ]
        read_only_fields = ["id"]


class QuoteSerializer(serializers.ModelSerializer):
    items = QuoteItemSerializer(many=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    client_name = serializers.CharField(source="client.name", read_only=True)
    client_ruc = serializers.CharField(source="client.ruc", read_only=True)
    equipment_code = serializers.CharField(
        source="equipment.internal_code", read_only=True, default=None
    )
    ticket_number = serializers.CharField(
        source="ticket.number", read_only=True, default=None
    )
    work_order_number = serializers.CharField(
        source="work_order.number", read_only=True, default=None
    )
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    iva_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    advance_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    balance_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = Quote
        fields = [
            "id", "number", "title", "status", "status_display",
            "client", "client_name", "client_ruc",
            "equipment", "equipment_code", "ticket", "ticket_number",
            "valid_until", "iva_rate", "advance_percent",
            "payment_terms", "delivery_terms", "warranty_terms", "notes",
            "sent_at", "accepted_at", "accepted_by_name", "rejected_at",
            "advance_paid", "advance_paid_at",
            "work_order", "work_order_number", "pdf_document",
            "subtotal", "iva_amount", "total", "advance_amount", "balance_amount",
            "items", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "number", "status", "sent_at", "accepted_at", "accepted_by_name",
            "rejected_at", "advance_paid", "advance_paid_at", "work_order",
            "pdf_document", "created_at", "updated_at",
        ]

    def validate(self, data):
        # Content is frozen once the quote left DRAFT (only lifecycle actions apply)
        if self.instance and self.instance.status != Quote.Status.DRAFT:
            raise serializers.ValidationError(
                "Solo se puede editar una cotización en borrador."
            )
        return data

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        quote = Quote.objects.create(**validated_data)
        self._save_items(quote, items_data)
        return quote

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            self._save_items(instance, items_data)
        return instance

    def _save_items(self, quote, items_data):
        for index, item in enumerate(items_data):
            QuoteItem.objects.create(quote=quote, order=index, **{
                key: value for key, value in item.items() if key != "order"
            })


class QuoteListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    client_name = serializers.CharField(source="client.name", read_only=True)
    equipment_code = serializers.CharField(
        source="equipment.internal_code", read_only=True, default=None
    )
    total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Quote
        fields = [
            "id", "number", "title", "client", "client_name",
            "equipment", "equipment_code", "status", "status_display",
            "total", "advance_paid", "valid_until", "created_at",
        ]


class AcceptQuoteSerializer(serializers.Serializer):
    accepted_by_name = serializers.CharField(max_length=200)


class GenerateOtSerializer(serializers.Serializer):
    technician = serializers.UUIDField()
