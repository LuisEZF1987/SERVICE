import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("equipment", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Manufacturer",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "name",
                    models.CharField(
                        max_length=200, unique=True, verbose_name="Nombre"
                    ),
                ),
                (
                    "country",
                    models.CharField(
                        blank=True, max_length=100, verbose_name="País"
                    ),
                ),
                (
                    "is_active",
                    models.BooleanField(default=True, verbose_name="Activo"),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(class)s_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(class)s_updated",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Fabricante",
                "verbose_name_plural": "Fabricantes",
                "ordering": ["name"],
                "abstract": False,
            },
        ),
        migrations.CreateModel(
            name="EquipmentModel",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "modality",
                    models.CharField(
                        choices=[
                            ("XRAY_FIXED", "Rayos X Fijo"),
                            ("XRAY_PORTABLE", "Rayos X Port\u00e1til"),
                            ("CT", "Tom\u00f3grafo (TAC)"),
                            ("MRI", "Resonancia Magn\u00e9tica"),
                            ("ULTRASOUND", "Ultrasonido"),
                            ("MAMMOGRAPH", "Mam\u00f3grafo"),
                            ("FLUOROSCOPE", "Fluoroscopio"),
                            ("DENSITOMETER", "Densit\u00f3metro"),
                            ("OTHER", "Otro"),
                        ],
                        max_length=20,
                        verbose_name="Modalidad",
                    ),
                ),
                (
                    "name",
                    models.CharField(
                        max_length=200, verbose_name="Nombre del modelo"
                    ),
                ),
                (
                    "is_active",
                    models.BooleanField(default=True, verbose_name="Activo"),
                ),
                (
                    "manufacturer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="models",
                        to="equipment.manufacturer",
                        verbose_name="Fabricante",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(class)s_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(class)s_updated",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Modelo de Equipo",
                "verbose_name_plural": "Modelos de Equipo",
                "ordering": ["manufacturer__name", "name"],
                "unique_together": {("manufacturer", "name")},
                "abstract": False,
            },
        ),
        migrations.CreateModel(
            name="EquipmentSeries",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "name",
                    models.CharField(
                        max_length=200, verbose_name="Nombre de la serie"
                    ),
                ),
                (
                    "description",
                    models.TextField(
                        blank=True, verbose_name="Descripci\u00f3n"
                    ),
                ),
                (
                    "is_active",
                    models.BooleanField(default=True, verbose_name="Activo"),
                ),
                (
                    "equipment_model",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="series",
                        to="equipment.equipmentmodel",
                        verbose_name="Modelo",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(class)s_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="%(class)s_updated",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Serie de Equipo",
                "verbose_name_plural": "Series de Equipo",
                "ordering": ["equipment_model__name", "name"],
                "unique_together": {("equipment_model", "name")},
                "abstract": False,
            },
        ),
    ]
