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
- OT firmada por cliente = único documento que habilita pago a Viat
- Cliente sin NDA firmado = inactivo (no puede tener equipos ni OT)
- Técnicos Viat NO ven información financiera de Dimed-Cliente
- Dos flujos financieros separados: Dimed↔Cliente (cobro) y Dimed↔Viat (pago)
