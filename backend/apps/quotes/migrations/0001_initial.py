import uuid
from decimal import Decimal

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("clients", "0001_initial"),
        ("equipment", "0001_initial"),
        ("spare_parts", "0001_initial"),
        ("tickets", "0001_initial"),
        ("work_orders", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Quote",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("number", models.CharField(editable=False, max_length=20, unique=True, verbose_name="Número de cotización")),
                ("title", models.CharField(max_length=300, verbose_name="Título / objeto")),
                ("status", models.CharField(choices=[("DRAFT", "Borrador"), ("SENT", "Enviada"), ("ACCEPTED", "Aceptada"), ("REJECTED", "Rechazada"), ("EXPIRED", "Vencida")], default="DRAFT", max_length=10, verbose_name="Estado")),
                ("valid_until", models.DateField(blank=True, null=True, verbose_name="Válida hasta")),
                ("iva_rate", models.DecimalField(decimal_places=2, default=Decimal("15"), max_digits=5, verbose_name="IVA %")),
                ("advance_percent", models.DecimalField(decimal_places=2, default=Decimal("50"), max_digits=5, verbose_name="Anticipo %")),
                ("payment_terms", models.TextField(default="50% de anticipo para iniciar el trabajo; 50% contra entrega e instalación.", verbose_name="Forma de pago")),
                ("delivery_terms", models.CharField(blank=True, default="30 días contados desde la confirmación del pedido.", max_length=300, verbose_name="Plazo de entrega")),
                ("warranty_terms", models.CharField(blank=True, default="Los repuestos cuentan con garantía de fábrica de 6 meses desde la entrega.", max_length=300, verbose_name="Garantía")),
                ("notes", models.TextField(blank=True, verbose_name="Observaciones")),
                ("sent_at", models.DateTimeField(blank=True, null=True, verbose_name="Enviada el")),
                ("accepted_at", models.DateTimeField(blank=True, null=True, verbose_name="Aceptada el")),
                ("accepted_by_name", models.CharField(blank=True, max_length=200, verbose_name="Aceptada por (nombre)")),
                ("rejected_at", models.DateTimeField(blank=True, null=True, verbose_name="Rechazada el")),
                ("advance_paid", models.BooleanField(default=False, verbose_name="Anticipo recibido")),
                ("advance_paid_at", models.DateTimeField(blank=True, null=True, verbose_name="Anticipo recibido el")),
                ("pdf_document", models.FileField(blank=True, upload_to="quotes/pdfs/", verbose_name="PDF generado")),
                ("client", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="quotes", to="clients.client", verbose_name="Cliente")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(class)s_created", to=settings.AUTH_USER_MODEL)),
                ("equipment", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="quotes", to="equipment.equipment", verbose_name="Equipo")),
                ("ticket", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="quotes", to="tickets.ticket", verbose_name="Ticket de origen")),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(class)s_updated", to=settings.AUTH_USER_MODEL)),
                ("work_order", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="quotes", to="work_orders.workorder", verbose_name="Orden de trabajo generada")),
            ],
            options={
                "verbose_name": "Cotización",
                "verbose_name_plural": "Cotizaciones",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="QuoteItem",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("kind", models.CharField(choices=[("LABOR", "Mano de obra"), ("PART", "Repuesto"), ("TRAVEL", "Traslado / viáticos"), ("OTHER", "Otro")], default="LABOR", max_length=10, verbose_name="Tipo")),
                ("description", models.CharField(max_length=300, verbose_name="Descripción")),
                ("code", models.CharField(blank=True, max_length=50, verbose_name="Código")),
                ("quantity", models.DecimalField(decimal_places=2, default=Decimal("1"), max_digits=8, verbose_name="Cantidad")),
                ("unit_price", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=12, verbose_name="Precio unitario")),
                ("order", models.PositiveIntegerField(default=0, verbose_name="Orden")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(class)s_created", to=settings.AUTH_USER_MODEL)),
                ("quote", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="quotes.quote")),
                ("spare_part", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="quote_items", to="spare_parts.sparepart", verbose_name="Repuesto del inventario")),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(class)s_updated", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "Ítem de cotización",
                "verbose_name_plural": "Ítems de cotización",
                "ordering": ["order", "created_at"],
            },
        ),
    ]
