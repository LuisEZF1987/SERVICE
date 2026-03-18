import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="SparePart",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("modality", models.CharField(choices=[
                    ("XRAY_FIXED", "Rayos X Fijo"),
                    ("XRAY_PORTABLE", "Rayos X Portátil"),
                    ("CT", "Tomógrafo (TAC)"),
                    ("MRI", "Resonancia Magnética"),
                    ("ULTRASOUND", "Ultrasonido"),
                    ("MAMMOGRAPH", "Mamógrafo"),
                    ("FLUOROSCOPE", "Fluoroscopio"),
                    ("DENSITOMETER", "Densitómetro"),
                    ("OTHER", "Otro"),
                ], max_length=20, verbose_name="Modalidad")),
                ("manufacturer", models.CharField(max_length=100, verbose_name="Fabricante")),
                ("equipment_model", models.CharField(blank=True, max_length=100, verbose_name="Modelo del equipo")),
                ("equipment_serial", models.CharField(blank=True, max_length=100, verbose_name="Serie del equipo")),
                ("part_number", models.CharField(max_length=100, unique=True, verbose_name="Part #")),
                ("description", models.TextField(verbose_name="Descripción")),
                ("unit_cost", models.DecimalField(decimal_places=2, default=0, max_digits=12, verbose_name="Costo unitario")),
                ("stock_quantity", models.PositiveIntegerField(default=0, verbose_name="Cantidad en stock")),
                ("minimum_stock", models.PositiveIntegerField(default=1, verbose_name="Stock mínimo")),
                ("location", models.CharField(blank=True, max_length=200, verbose_name="Ubicación")),
                ("supplier", models.CharField(blank=True, max_length=200, verbose_name="Proveedor")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(class)s_created", to=settings.AUTH_USER_MODEL)),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="%(class)s_updated", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name": "Repuesto",
                "verbose_name_plural": "Repuestos",
                "ordering": ["manufacturer", "part_number"],
                "abstract": False,
            },
        ),
    ]
