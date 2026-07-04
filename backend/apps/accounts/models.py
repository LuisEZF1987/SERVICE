import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model for DimedService with role-based access control."""

    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Administrador"
        COORDINATOR = "COORDINATOR", "Coordinador"
        TECHNICIAN = "TECHNICIAN", "Técnico"
        MANAGEMENT = "MANAGEMENT", "Gerencia"
        CLIENT = "CLIENT", "Cliente"

    class CompanyType(models.TextChoices):
        DIMED = "DIMED", "Dimed Healthcare"
        CLIENT = "CLIENT", "Cliente"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.TECHNICIAN)
    company_type = models.CharField(max_length=20, choices=CompanyType.choices, default=CompanyType.DIMED)
    phone = models.CharField("Teléfono", max_length=20, blank=True)
    position = models.CharField("Cargo", max_length=100, blank=True)
    is_2fa_enabled = models.BooleanField("2FA habilitado", default=False)
    privacy_policy_accepted_at = models.DateTimeField(
        "Política de privacidad aceptada", null=True, blank=True
    )

    # For CLIENT role: link to which client organization they belong
    client_organization = models.ForeignKey(
        "clients.Client",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="portal_users",
        verbose_name="Organización cliente",
    )

    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.get_full_name()} ({self.get_role_display()})"

    @property
    def is_dimed_staff(self):
        return self.company_type == self.CompanyType.DIMED

    @property
    def is_technician(self):
        return self.role == self.Role.TECHNICIAN

    @property
    def is_client_portal(self):
        return self.role == self.Role.CLIENT

    @property
    def can_view_financials(self):
        """Only Admin and Management can see full financial data."""
        return self.role in (self.Role.ADMIN, self.Role.MANAGEMENT)


class AuditLog(models.Model):
    """Immutable audit trail for all system actions."""

    class Action(models.TextChoices):
        CREATE = "CREATE", "Crear"
        UPDATE = "UPDATE", "Actualizar"
        DELETE = "DELETE", "Eliminar"
        LOGIN = "LOGIN", "Inicio de sesión"
        LOGOUT = "LOGOUT", "Cierre de sesión"
        LOGIN_FAILED = "LOGIN_FAILED", "Inicio de sesión fallido"
        EXPORT = "EXPORT", "Exportar"
        SIGN = "SIGN", "Firmar"
        APPROVE = "APPROVE", "Aprobar"
        REJECT = "REJECT", "Rechazar"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    model_name = models.CharField("Modelo", max_length=100, blank=True)
    object_id = models.CharField("ID del objeto", max_length=100, blank=True)
    details = models.JSONField("Detalles", default=dict, blank=True)
    ip_address = models.GenericIPAddressField("Dirección IP", null=True, blank=True)
    user_agent = models.TextField("User Agent", blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Registro de auditoría"
        verbose_name_plural = "Registros de auditoría"
        ordering = ["-timestamp"]
        # Audit logs are immutable — no update/delete permissions
        default_permissions = ("add", "view")

    def __str__(self):
        return f"{self.timestamp} | {self.user} | {self.get_action_display()} | {self.model_name}"
