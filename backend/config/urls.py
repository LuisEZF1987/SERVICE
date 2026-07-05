from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from apps.work_orders.stats import dashboard_stats

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/dashboard/stats/", dashboard_stats, name="dashboard-stats"),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/clients/", include("apps.clients.urls")),
    path("api/v1/equipment/", include("apps.equipment.urls")),
    path("api/v1/quotes/", include("apps.quotes.urls")),
    path("api/v1/tickets/", include("apps.tickets.urls")),
    path("api/v1/work-orders/", include("apps.work_orders.urls")),
    path("api/v1/contracts/", include("apps.contracts.urls")),
    path("api/v1/spare-parts/", include("apps.spare_parts.urls")),
    path("api/v1/scheduling/", include("apps.scheduling.urls")),
    path("api/v1/reports/", include("apps.reports.urls")),
    path("api/v1/templates/", include("apps.templates_engine.urls")),
    path("api/v1/catalog/", include("apps.equipment.catalog_urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    try:
        import debug_toolbar
        urlpatterns += [path("__debug__/", include(debug_toolbar.urls))]
    except ImportError:
        pass

# Admin site customization
admin.site.site_header = "DimedService — Administración"
admin.site.site_title = "DimedService"
admin.site.index_title = "Panel de Administración"
