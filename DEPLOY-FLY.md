# Despliegue backend en Fly.io

Repositorio: [GigaSystemBackend](https://github.com/cristianbelmarpalacios-dotcom/GigaSystemBackend)

## Requisitos previos

1. [Fly CLI](https://fly.io/docs/flyctl/install/) instalado y sesión iniciada: `fly auth login`
2. Base de datos PostgreSQL (Supabase recomendado — ya usada en desarrollo)
3. Redis (Upstash gratis o `fly redis create`)
4. Bucket Supabase Storage público para imágenes

## 1. Crear la app (solo la primera vez)

```bash
cd GigaSystem-backend
fly apps create gigasystem-backend
```

Si el nombre está ocupado, cambia `app` en `fly.toml` y vuelve a crear.

## 2. Configurar secretos

Copia valores reales (nunca subas `.env` al repo):

```bash
fly secrets set \
  DATABASE_URL="postgresql://..." \
  DIRECT_URL="postgresql://..." \
  JWT_ACCESS_SECRET="..." \
  JWT_REFRESH_SECRET="..." \
  JWT_ACCESS_EXPIRES_IN="15m" \
  JWT_REFRESH_EXPIRES_IN="30d" \
  STORAGE_PROVIDER="supabase" \
  SUPABASE_URL="https://xxxx.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
  SUPABASE_STORAGE_BUCKET="gigasystem-assets" \
  REDIS_URL="rediss://..." \
  PAYMENT_PROVIDER="mock" \
  CORS_ORIGIN="https://tu-front.vercel.app"
```

## 3. Desplegar

```bash
fly deploy
```

## 4. Verificar

```bash
fly status
fly logs
curl https://gigasystem-backend.fly.dev/health
```

## 5. Migraciones

Se ejecutan automáticamente en cada deploy (`release_command` en `fly.toml`).

## Región

Por defecto `gru` (São Paulo), cercana a Chile. Cambia `primary_region` en `fly.toml` si prefieres otra.
