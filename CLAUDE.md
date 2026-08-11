# DimedService - Sistema de Servicio Técnico

## Project Overview
Sistema de gestión de servicio técnico para equipos médicos de imagenología.
Empresa: Dimed Healthcare S.A. (Ecuador)

## Tech Stack
- Backend: Django 5.1 + Django REST Framework
- Frontend: React + TypeScript (Vite)
- Database: PostgreSQL 16
- Cache/Queue: Redis 7
- Storage: MinIO (dev) / S3 (prod)
- Tasks: Celery + Celery Beat
- PDF: WeasyPrint
- AI: Claude API (Anthropic)
- Mobile: React Native + Expo (future)

## Project Structure
- `backend/` — Django project (config/ for settings, apps/ for modules)
- `frontend/` — React + TypeScript (Vite)
- `manuales/` — Technical manuals library (PDFs)
- `docker-compose.yml` — Dev infrastructure

## Commands
- Start services: `docker compose up -d`
- Backend shell: `docker compose exec backend python manage.py shell`
- Migrations: `docker compose exec backend python manage.py makemigrations && docker compose exec backend python manage.py migrate`
- Create superuser: `docker compose exec backend python manage.py createsuperuser`
- Run tests: `docker compose exec backend python manage.py test`
- Frontend dev: `cd frontend && npm run dev`

## Conventions
- Language: Spanish (Ecuador) for UI, English for code (variable names, comments)
- Timezone: America/Guayaquil (UTC-5)
- All Django apps in backend/apps/
- Custom user model: apps.accounts.User
- Base model with audit fields: common.models.BaseModel
- API prefix: /api/v1/
- JWT authentication for API
- All monetary values use DecimalField(max_digits=12, decimal_places=2)

## Key Business Rules
- Todo el servicio técnico lo ejecuta Dimed Healthcare directamente (no hay subcontratistas).
- El ticket (TKT-YYYY-NNNN) es el historial del caso reportado por el cliente; una falla puede generar varias OTs vinculadas. El SLA del ticket se hereda del contrato (sla_response_hours). Las notas internas de tickets nunca se muestran ni envían al cliente.
- OT firmada por cliente = documento oficial que certifica el servicio realizado; es la base para facturar al cliente.
- El NDA se registra y se vigila, pero NO bloquea la operación: un cliente sin NDA firmado puede tener equipos y OT. Bloquearlo no evitaría el acceso del técnico a la información, solo dejaría la visita fuera del sistema. El NDA pendiente se muestra como alerta en la ficha del cliente para seguimiento comercial.
- El contrato de mantenimiento es por equipo, no por cliente: un mismo cliente puede tener equipos bajo contrato y equipos sin contrato (Equipment.contract es opcional).
- Una OT cerrada queda bloqueada e inmutable.
- La facturación y la contabilidad se manejan en un sistema externo propio de Dimed; este sistema NO factura.
