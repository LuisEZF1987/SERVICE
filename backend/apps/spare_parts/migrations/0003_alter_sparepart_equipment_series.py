from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("spare_parts", "0002_rename_serial_to_series"),
    ]

    operations = [
        migrations.AlterField(
            model_name="sparepart",
            name="equipment_series",
            field=models.CharField(
                blank=True,
                help_text="Variante o línea del modelo (ej: Digiscan V-30)",
                max_length=100,
                verbose_name="Serie del equipo",
            ),
        ),
    ]
