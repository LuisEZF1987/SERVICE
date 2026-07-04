import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("clients", "0001_initial"),
        ("contracts", "0001_initial"),
        ("equipment", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Ticket",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("number", models.CharField(editable=False, max_length=20, unique=True, verbose_name="Número de ticket")),
                ("subject", models.CharField(max_length=300, verbose_name="Asunto")),
                ("description", models.TextField(verbose_name="Descripción de la falla")),
                ("channel", models.CharField(choices=[("PHONE", "Teléfono"), ("EMAIL", "Email"), ("WHATSAPP", "WhatsApp"), ("PORTAL", "Portal cliente"), ("IN_PERSON", "Presencial")], default="PHONE", max_length=15, verbose_name="Canal de reporte")),
                ("priority", models.CharField(choices=[("CRITICAL", "Crítica (equipo parado)"), ("HIGH", "Alta"), ("NORMAL", "Normal"), ("LOW", "Baja")], default="NORMAL", max_length=10, verbose_name="Prioridad")),
                ("status", models.CharField(choices=[("OPEN", "Abierto"), ("IN_PROGRESS", "En atención"), ("ESCALATED", "Escalado"), ("RESOLVED", "Resuelto"), ("CLOSED", "Cerrado")], default="OPEN", max_length=15, verbose_name="Estado")),
                ("reported_by_name", models.CharField(blank=True, max_length=200, verbose_name="Reportado por")),
                ("reported_by_email", models.EmailField(blank=True, max_length=254, verbose_name="Email de quien reporta")),
                ("sla_due_at", models.DateTimeField(blank=True, null=True, verbose_name="Vencimiento SLA")),
                ("resolution_notes", models.TextField(blank=True, verbose_name="Notas de resolución")),
                ("resolved_at", models.DateTimeField(blank=True, null=True, verbose_name="Fecha de resolución")),
                ("closed_at", models.DateTimeField(blank=True, null=True, verbose_name="Fecha de cierre")),
                ("assigned_to", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assigned_tickets", to=settings.AUTH_USER_MODEL, verbose_name="Responsable")),
                ("client", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="tickets", to="clients.client", verbose_name="Cliente")),
                ("contract", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="tickets", to="contracts.contract", verbose_name="Contrato (SLA)")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(class)s_created", to=settings.AUTH_USER_MODEL)),
                ("equipment", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="tickets", to="equipment.equipment", verbose_name="Equipo")),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(class)s_updated", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "Ticket",
                "verbose_name_plural": "Tickets",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="TicketComment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("body", models.TextField(verbose_name="Comentario")),
                ("is_internal", models.BooleanField(default=False, verbose_name="Nota interna (solo Dimed)")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(class)s_created", to=settings.AUTH_USER_MODEL)),
                ("ticket", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="comments", to="tickets.ticket")),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(class)s_updated", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "Comentario de ticket",
                "verbose_name_plural": "Comentarios de ticket",
                "ordering": ["created_at"],
            },
        ),
    ]
