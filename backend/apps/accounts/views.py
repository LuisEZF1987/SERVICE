from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken

from common.permissions import IsAdmin, IsAdminOrCoordinator
from .models import AuditLog, User
from .serializers import (
    AcceptPrivacyPolicySerializer,
    AuditLogSerializer,
    ChangePasswordSerializer,
    LoginSerializer,
    UserCreateSerializer,
    UserSerializer,
)
from .utils import create_audit_log


class LoginView(generics.GenericAPIView):
    """Login endpoint that returns JWT tokens."""

    permission_classes = [permissions.AllowAny]
    serializer_class = LoginSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            create_audit_log(
                user=None,
                action=AuditLog.Action.LOGIN_FAILED,
                request=request,
                details={"username": request.data.get("username", "")},
            )
            raise
        user = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(user)

        create_audit_log(
            user=user,
            action=AuditLog.Action.LOGIN,
            request=request,
        )

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
        })


class LogoutView(generics.GenericAPIView):
    """Logout by blacklisting the refresh token."""

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()

            create_audit_log(
                user=request.user,
                action=AuditLog.Action.LOGOUT,
                request=request,
            )
        except Exception:
            pass

        return Response(status=status.HTTP_205_RESET_CONTENT)


class MeView(generics.RetrieveUpdateAPIView):
    """Current user profile."""

    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class AcceptPrivacyPolicyView(generics.GenericAPIView):
    """Accept privacy policy (required on first login)."""

    serializer_class = AcceptPrivacyPolicySerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        request.user.privacy_policy_accepted_at = timezone.now()
        request.user.save(update_fields=["privacy_policy_accepted_at"])

        return Response({"detail": "Política de privacidad aceptada."})


class ChangePasswordView(generics.GenericAPIView):
    """Change password for the current user."""

    serializer_class = ChangePasswordSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])

        return Response({"detail": "Contraseña actualizada correctamente."})


class UserViewSet(viewsets.ModelViewSet):
    """CRUD for users (Admin only for create/update/delete)."""

    queryset = User.objects.all()
    filterset_fields = ["role", "company_type", "is_active"]
    search_fields = ["first_name", "last_name", "email", "username"]
    ordering_fields = ["last_name", "date_joined", "role"]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdmin()]
        return [IsAdminOrCoordinator()]

    def perform_create(self, serializer):
        user = serializer.save()
        create_audit_log(
            user=self.request.user,
            action=AuditLog.Action.CREATE,
            model_name="User",
            object_id=str(user.id),
            details={"username": user.username, "role": user.role},
            request=self.request,
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def toggle_active(self, request, pk=None):
        """Activate/deactivate a user."""
        user = self.get_object()
        user.is_active = not user.is_active
        user.save(update_fields=["is_active"])
        action_detail = "activado" if user.is_active else "desactivado"
        return Response({"detail": f"Usuario {action_detail}."})


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only access to audit logs (Admin only)."""

    queryset = AuditLog.objects.select_related("user").all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ["action", "model_name", "user"]
    search_fields = ["details", "model_name"]
    ordering_fields = ["timestamp"]
