from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("scheduling", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="scheduledmaintenance",
            name="alerts_sent",
            field=models.JSONField(
                blank=True, default=list, verbose_name="Hitos de alerta enviados"
            ),
        ),
    ]
