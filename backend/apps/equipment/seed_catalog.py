"""Seed initial catalog data."""
import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from apps.accounts.models import User
from apps.equipment.catalog_models import EquipmentModel, EquipmentSeries, Manufacturer

admin = User.objects.get(username="admin")

# Allengers
mfr, _ = Manufacturer.objects.get_or_create(
    name="Allengers", defaults={"country": "India", "created_by": admin}
)
mdl, _ = EquipmentModel.objects.get_or_create(
    manufacturer=mfr,
    name="HF 59R",
    defaults={"modality": "FLUOROSCOPE", "created_by": admin},
)
for s in ["Digiscan S-20", "Digiscan S-30", "Digiscan V-20", "Digiscan V-30"]:
    EquipmentSeries.objects.get_or_create(
        equipment_model=mdl, name=s, defaults={"created_by": admin}
    )

# Common manufacturers (empty models, to be filled later)
for name, country in [
    ("Siemens Healthineers", "Alemania"),
    ("Philips Healthcare", "Países Bajos"),
    ("GE Healthcare", "Estados Unidos"),
    ("Samsung Medison", "Corea del Sur"),
    ("Mindray", "China"),
    ("Shimadzu", "Japón"),
    ("Fujifilm", "Japón"),
    ("Canon Medical", "Japón"),
    ("Hologic", "Estados Unidos"),
]:
    Manufacturer.objects.get_or_create(
        name=name, defaults={"country": country, "created_by": admin}
    )

print(f"Fabricantes: {Manufacturer.objects.count()}")
print(f"Modelos: {EquipmentModel.objects.count()}")
print(f"Series: {EquipmentSeries.objects.count()}")
