from django.apps import AppConfig


class CommonConfig(AppConfig):
    name = "common"
    verbose_name = "Común"

    def ready(self):
        from rest_framework.fields import FileField

        # Serve uploaded files as site-relative URLs ("/media/..."). The app is
        # reached through several origins (LAN IP, Tailscale HTTPS on :8081)
        # and the proxies drop the port/scheme, so absolute URLs built from the
        # request pointed at another service on the same host.
        def to_representation(self, value):
            if not value:
                return None
            if not getattr(self, "use_url", True):
                return value.name
            try:
                return value.url
            except AttributeError:
                return None

        FileField.to_representation = to_representation
