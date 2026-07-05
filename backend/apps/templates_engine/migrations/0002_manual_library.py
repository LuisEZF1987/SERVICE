import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("equipment", "0002_catalog"),
        ("templates_engine", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="technicalmanual",
            name="title",
            field=models.CharField(blank=True, max_length=300, verbose_name="Título"),
        ),
        migrations.AddField(
            model_name="technicalmanual",
            name="document_type",
            field=models.CharField(
                choices=[
                    ("SERVICE_MANUAL", "Manual de servicio"),
                    ("USER_MANUAL", "Manual de usuario"),
                    ("PRE_INSTALL_FORM", "Formulario de pre-instalación"),
                    ("PRE_INSTALL_MANUAL", "Manual de pre-instalación"),
                    ("TRAINING", "Plan de capacitación"),
                    ("BROCHURE", "Catálogo / Brochure"),
                    ("DATASHEET", "Datasheet"),
                    ("OTHER", "Otro"),
                ],
                default="SERVICE_MANUAL",
                max_length=20,
                verbose_name="Tipo de documento",
            ),
        ),
        migrations.AddField(
            model_name="technicalmanual",
            name="equipment_model",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="manuals",
                to="equipment.equipmentmodel",
                verbose_name="Modelo del catálogo",
            ),
        ),
        migrations.AddField(
            model_name="technicalmanual",
            name="equipment_series",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="manuals",
                to="equipment.equipmentseries",
                verbose_name="Serie del catálogo",
            ),
        ),
        migrations.AlterField(
            model_name="technicalmanual",
            name="language",
            field=models.CharField(
                blank=True, default="Español", max_length=50, verbose_name="Idioma"
            ),
        ),
        migrations.AlterModelOptions(
            name="technicalmanual",
            options={
                "ordering": ["brand", "model_name", "document_type"],
                "verbose_name": "Manual Técnico",
                "verbose_name_plural": "Manuales Técnicos",
            },
        ),
    ]
