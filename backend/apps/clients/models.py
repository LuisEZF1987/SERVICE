from django.db import models

from common.models import BaseModel


class Client(BaseModel):
    """Hospital, clinic, or institution that receives technical service."""

    class ClientType(models.TextChoices):
        PUBLIC = "PUBLIC", "Público"
        PRIVATE = "PRIVATE", "Privado"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Activo"
        INACTIVE = "INACTIVE", "Inactivo"

    name = models.CharField("Nombre de la institución", max_length=300)
    ruc = models.CharField("RUC", max_length=13, unique=True)
    client_type = models.CharField(
        "Tipo de cliente", max_length=10, choices=ClientType.choices
    )
    address = models.TextField("Dirección")
    city = models.CharField("Ciudad", max_length=100)
    province = models.CharField("Provincia", max_length=100)
    phone = models.CharField("Teléfono", max_length=20, blank=True)
    email = models.EmailField("Email institucional", blank=True)
    status = models.CharField(
        "Estado", max_length=10, choices=Status.choices, default=Status.INACTIVE
    )
    notes = models.TextField("Observaciones", blank=True)

    # NDA control — client cannot be activated without signed NDA
    nda_signed = models.BooleanField("NDA firmado", default=False)
    nda_document = models.FileField(
        "Documento NDA", upload_to="clients/nda/", blank=True
    )
    nda_signed_date = models.DateField("Fecha firma NDA", null=True, blank=True)

    # Additional documents
    ruc_document = models.FileField(
        "Documento RUC", upload_to="clients/ruc/", blank=True
    )
    contract_document = models.FileField(
        "Contrato", upload_to="clients/contracts/", blank=True
    )

    class Meta:
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.ruc})"

    def save(self, *args, **kwargs):
        # Business rule: client without signed NDA must be inactive
        if not self.nda_signed:
            self.status = self.Status.INACTIVE
        super().save(*args, **kwargs)


class ClientContact(BaseModel):
    """Work contacts at a client institution."""

    client = models.ForeignKey(
        Client, on_delete=models.CASCADE, related_name="contacts"
    )
    name = models.CharField("Nombre completo", max_length=200)
    position = models.CharField("Cargo", max_length=100)
    email = models.EmailField("Email institucional")
    phone = models.CharField("Teléfono", max_length=20)
    is_primary = models.BooleanField("Contacto principal", default=False)
    is_signer = models.BooleanField(
        "Autorizado para firmar OT", default=False
    )

    class Meta:
        verbose_name = "Contacto"
        verbose_name_plural = "Contactos"
        ordering = ["-is_primary", "name"]

    def __str__(self):
        return f"{self.name} — {self.position} ({self.client.name})"
