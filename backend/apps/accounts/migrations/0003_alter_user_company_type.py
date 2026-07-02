from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="company_type",
            field=models.CharField(
                choices=[("DIMED", "Dimed Healthcare"), ("CLIENT", "Cliente")],
                default="DIMED",
                max_length=20,
            ),
        ),
    ]
