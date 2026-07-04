from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("work_orders", "0001_initial"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="workorder",
            name="executing_company",
        ),
    ]
