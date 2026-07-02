# DimedService — Sistema de Servicio Técnico

Sistema de gestión de servicio técnico para equipos médicos de imagenología de
**Dimed Healthcare S.A.** (Ecuador). Gestiona clientes, equipos, contratos,
órdenes de trabajo (OT) con firma digital, mantenimientos preventivos y alertas.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Django 5.1 + Django REST Framework |
| Frontend | React 19 + TypeScript + Vite |
| Base de datos | PostgreSQL 16 |
| Cola / caché | Redis 7 |
| Tareas asíncronas | Celery + Celery Beat |
| Almacenamiento | MinIO (dev) / S3 (prod) |
| PDF | WeasyPrint |
| Correo | SendGrid (relay SMTP) |

## Arquitectura

Backend organizado en apps bajo `backend/apps/`:

- **accounts** — usuarios, roles (Admin, Coordinador, Técnico, Gerencia, Cliente), auditoría, JWT.
- **clients** — instituciones cliente y contactos (control de NDA).
- **equipment** — inventario de equipos + catálogo (fabricantes, modelos, series).
- **contracts** — contratos de servicio y SLA.
- **work_orders** — **la OT**, documento central: ciclo de vida, firma digital, PDF y correo.
- **scheduling** — mantenimientos preventivos y alertas automáticas.
- **spare_parts** — inventario de repuestos.
- **reports / templates_engine** — reportes y motor de plantillas (en desarrollo).

### Flujo de la Orden de Trabajo (OT)

```
ABIERTA → EN EJECUCIÓN → PENDIENTE DE FIRMA → FIRMADA → CERRADA (bloqueada)
```

1. Coordinador crea la OT y asigna técnico.
2. Técnico **inicia** y **finaliza** el trabajo (registra diagnóstico y trabajo realizado).
3. El cliente **firma** en el dispositivo → se genera el **PDF** y se **envía por correo**
   al cliente y a Dimed (vía Celery).
4. Admin/Coordinador **cierra** la OT: queda inmutable y con su PDF definitivo.

Una OT firmada por el cliente es el documento oficial que certifica el servicio.
La facturación y contabilidad se manejan en el sistema externo propio de Dimed.

## Requisitos

- Docker + Docker Compose
- (Frontend local) Node.js 20+

## Puesta en marcha (desarrollo)

```bash
cp .env.example .env          # ajusta los valores locales
docker compose up -d --build  # db, redis, minio, backend, celery, celery-beat

docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser   # usuario: admin
docker compose exec backend python load_data.py                # datos de prueba (opcional)

cd frontend && npm install && npm run dev                      # http://localhost:5173
```

- Backend/API: http://localhost:8001/api/v1/
- Admin Django: http://localhost:8001/admin/
- Consola MinIO: http://localhost:9001/

En desarrollo, los correos se imprimen en la consola del backend y las tareas
Celery corren de forma síncrona (no requiere worker aparte).

## Comandos útiles

```bash
# Migraciones
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate

# Pruebas backend (con settings de test)
docker compose exec -e DJANGO_SETTINGS_MODULE=config.settings.test backend python manage.py test

# Lint backend
docker compose exec backend ruff check .

# Frontend
cd frontend
npm run dev      # desarrollo
npm run build    # build de producción (type-check + bundle)
npm run lint     # ESLint
npm run test     # Vitest
```

## Estructura

```
SERVICIO/
├── backend/            # Django (config/ settings, apps/ módulos)
├── frontend/           # React + TypeScript (Vite)
├── manuales/           # Plantillas y manuales técnicos (PDF)
├── docker-compose.yml  # Infraestructura de desarrollo
├── docker-compose.prod.yml
├── .github/workflows/  # CI (GitHub Actions)
├── README.md
└── DEPLOYMENT.md       # Guía de despliegue a producción
```

## Despliegue

Ver **[DEPLOYMENT.md](DEPLOYMENT.md)** para la guía de producción, variables de
entorno obligatorias, manejo de secretos y checklist de go-live.
