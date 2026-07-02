# Guía de Despliegue — DimedService

Guía para poner DimedService en **producción**. El objetivo es un despliegue con
Docker detrás de un reverse proxy con TLS.

## 1. Prerrequisitos

- Servidor Linux con Docker + Docker Compose.
- Un dominio y certificados TLS (recomendado: Caddy, Traefik o Nginx como reverse
  proxy con Let's Encrypt frente a los contenedores).
- Base de datos PostgreSQL 16 (el `docker-compose.prod.yml` incluye una; en
  producción se recomienda un servicio gestionado con backups).
- Almacenamiento S3 (AWS S3 o MinIO propio) para archivos y PDFs.
- Cuenta de SendGrid para correo saliente.

## 2. Variables de entorno

Copia `.env.example` a `.env` y define **todos** los valores. En producción los
siguientes son **obligatorios** (la app no arranca sin ellos):

| Variable | Descripción |
|----------|-------------|
| `DJANGO_SECRET_KEY` | Clave secreta única. Genera una nueva (ver abajo). |
| `DJANGO_SETTINGS_MODULE` | `config.settings.production` |
| `DJANGO_ALLOWED_HOSTS` | Dominio(s) reales, separados por coma. |
| `CORS_ALLOWED_ORIGINS` | URL del frontend en producción. |
| `POSTGRES_PASSWORD` | Contraseña fuerte de la base de datos. |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | Credenciales de S3/MinIO. |
| `MINIO_BUCKET_NAME` / `MINIO_ENDPOINT` | Bucket y endpoint de almacenamiento. |
| `SENDGRID_API_KEY` | API key de SendGrid (se usa como contraseña SMTP). |
| `DEFAULT_FROM_EMAIL` | Remitente de los correos. |

Genera una `DJANGO_SECRET_KEY`:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

> **Nunca** commitees `.env`. Rota las credenciales periódicamente y ante cualquier
> sospecha de fuga.

## 3. Correo (SendGrid)

`config/settings/production.py` usa el relay SMTP de SendGrid. Basta con definir
`SENDGRID_API_KEY`; el host (`smtp.sendgrid.net`), puerto (587) y usuario
(`apikey`) ya vienen configurados en `base.py`. Verifica el dominio remitente en
SendGrid para mejorar la entregabilidad.

## 4. Almacenamiento (S3 / MinIO)

En producción los archivos (PDFs de OT, firmas, fotos) se guardan vía
`S3Boto3Storage`. Configura `MINIO_*`/AWS con las credenciales y el bucket. Si usas
AWS S3, apunta `MINIO_ENDPOINT` al endpoint de S3 y `MINIO_USE_SSL=True`.

## 5. Despliegue con Docker

```bash
# Construir e iniciar
docker compose -f docker-compose.prod.yml up -d --build

# El servicio backend ejecuta migrate + collectstatic + gunicorn al arrancar.
# Crea el superusuario la primera vez:
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

Servicios:
- **backend** — gunicorn (`config.wsgi`), 3 workers.
- **celery** — worker de tareas (PDF, correos).
- **celery-beat** — tareas periódicas (alertas de mantenimiento 30/15/7/1 días).
- **frontend** — build estático servido por Nginx; hace proxy de `/api`, `/static`
  y `/media` al backend.

Coloca un reverse proxy con TLS frente al servicio `frontend` (puerto 80).

## 6. Checklist de go-live

- [ ] `.env` con secretos reales y `DJANGO_SETTINGS_MODULE=config.settings.production`.
- [ ] `DJANGO_SECRET_KEY` nueva y única; `DEBUG=False` (implícito en production).
- [ ] `DJANGO_ALLOWED_HOSTS` y `CORS_ALLOWED_ORIGINS` con el dominio real.
- [ ] TLS/HTTPS activo (la config de producción fuerza HSTS y cookies seguras).
- [ ] PostgreSQL con backups automáticos.
- [ ] S3/MinIO accesible y bucket creado.
- [ ] SendGrid verificado; envío de correo probado (firmar una OT de prueba).
- [ ] `celery` y `celery-beat` corriendo (revisar logs).
- [ ] Superusuario creado; usuarios del equipo dados de alta con sus roles.
- [ ] Clientes con NDA firmado (regla: sin NDA el cliente queda inactivo).
- [ ] Prueba de humo: crear OT → iniciar → finalizar → firmar → verificar PDF y correo → cerrar.

## 7. Mantenimiento

- **Logs**: `docker compose -f docker-compose.prod.yml logs -f backend celery`.
- **Migraciones** tras un release:
  `docker compose -f docker-compose.prod.yml exec backend python manage.py migrate`.
- **CI**: cada push/PR a `main` ejecuta lint + pruebas (ver `.github/workflows/ci.yml`).

## 8. Pendientes de seguridad recomendados

- **2FA**: la infraestructura (`django-otp`) está instalada y el campo
  `is_2fa_enabled` existe, pero el flujo de doble factor en el login aún no está
  activado. Se recomienda implementarlo para cuentas de administración antes de
  exponer el sistema a internet.
- **Rotación de secretos** documentada y programada.
