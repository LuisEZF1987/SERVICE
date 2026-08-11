from django.test import TestCase

from apps.clients.models import Client
from apps.equipment.models import Equipment
from apps.equipment.serializers import EquipmentSerializer


class InternalCodeGenerationTests(TestCase):
    """The internal code is assigned by Dimed, never typed in."""

    @classmethod
    def setUpTestData(cls):
        cls.client_org = Client.objects.create(
            name="Hospital de Prueba", ruc="1790012345030",
            client_type=Client.ClientType.PUBLIC, address="Av. A",
            city="Quito", province="Pichincha",
            nda_signed=True, status=Client.Status.ACTIVE,
        )

    def _equipment(self, **overrides):
        defaults = dict(
            serial_number="SN-GEN-001",
            modality=Equipment.Modality.FLUOROSCOPE,
            brand="Allengers", model_name="HF59",
            client=self.client_org, city="Quito", province="Pichincha",
        )
        defaults.update(overrides)
        return Equipment.objects.create(**defaults)

    def test_code_generated_when_missing(self):
        self.assertEqual(self._equipment().internal_code, "DIM-FLUORO-001")

    def test_code_generated_when_only_prefix_given(self):
        equipment = self._equipment(internal_code="DIM-")
        self.assertEqual(equipment.internal_code, "DIM-FLUORO-001")

    def test_sequence_is_per_modality(self):
        self._equipment(serial_number="SN-A")
        second = self._equipment(serial_number="SN-B")
        mammo = self._equipment(
            serial_number="SN-C", modality=Equipment.Modality.MAMMOGRAPH
        )
        self.assertEqual(second.internal_code, "DIM-FLUORO-002")
        self.assertEqual(mammo.internal_code, "DIM-MAMO-001")

    def test_sequence_continues_after_existing_codes(self):
        self._equipment(serial_number="SN-A", internal_code="DIM-FLUORO-007")
        self.assertEqual(
            self._equipment(serial_number="SN-B").internal_code, "DIM-FLUORO-008"
        )

    def test_non_numeric_legacy_codes_are_skipped(self):
        self._equipment(serial_number="SN-A", internal_code="DIM-FLUORO-ANTIGUO")
        self.assertEqual(
            self._equipment(serial_number="SN-B").internal_code, "DIM-FLUORO-001"
        )

    def test_unknown_modality_falls_back_to_generic_prefix(self):
        equipment = self._equipment(modality=Equipment.Modality.OTHER)
        self.assertEqual(equipment.internal_code, "DIM-GEN-001")

    def test_code_survives_later_saves(self):
        equipment = self._equipment()
        equipment.area = "Emergencias"
        equipment.save()
        self.assertEqual(equipment.internal_code, "DIM-FLUORO-001")

    def test_serializer_ignores_client_supplied_code(self):
        serializer = EquipmentSerializer(data={
            "internal_code": "DIM-INVENTADO-999",
            "serial_number": "SN-API-001",
            "modality": Equipment.Modality.CT,
            "brand": "ACME", "model_name": "T1",
            "client": str(self.client_org.id),
            "city": "Quito", "province": "Pichincha",
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)
        equipment = serializer.save()
        self.assertEqual(equipment.internal_code, "DIM-TAC-001")

    def test_code_is_not_editable_through_the_api(self):
        equipment = self._equipment()
        serializer = EquipmentSerializer(
            equipment, data={"internal_code": "DIM-OTRO-001"}, partial=True
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        equipment.refresh_from_db()
        self.assertEqual(equipment.internal_code, "DIM-FLUORO-001")
