from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('spare_parts', '0001_initial'),
    ]

    operations = [
        migrations.RenameField(
            model_name='sparepart',
            old_name='equipment_serial',
            new_name='equipment_series',
        ),
    ]
