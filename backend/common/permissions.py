from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Only Dimed administrators."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "ADMIN"


class IsCoordinator(BasePermission):
    """Dimed coordinators."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ("ADMIN", "COORDINATOR")


class IsTechnician(BasePermission):
    """Viat or Dimed technicians."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "TECHNICIAN"


class IsManagement(BasePermission):
    """Dimed management (read-only dashboards)."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ("ADMIN", "MANAGEMENT")


class IsClientPortal(BasePermission):
    """Client portal access."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "CLIENT"


class IsAdminOrCoordinator(BasePermission):
    """Admin or Coordinator access."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ("ADMIN", "COORDINATOR")


class IsDimedStaff(BasePermission):
    """Any Dimed employee (Admin, Coordinator, Management)."""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.company_type == "DIMED"
        )
