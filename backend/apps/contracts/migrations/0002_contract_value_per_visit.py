from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("contracts", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="contract",
            name="value_per_visit",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Monto del cargo a CAJA por cada mantenimiento preventivo del cronograma",
                max_digits=12,
                null=True,
                verbose_name="Valor por visita preventiva",
            ),
        ),
    ]
