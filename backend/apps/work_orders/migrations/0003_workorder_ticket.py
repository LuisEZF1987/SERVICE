import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("tickets", "0001_initial"),
        ("work_orders", "0002_remove_workorder_executing_company"),
    ]

    operations = [
        migrations.AddField(
            model_name="workorder",
            name="ticket",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="work_orders",
                to="tickets.ticket",
                verbose_name="Ticket de origen",
            ),
        ),
    ]
