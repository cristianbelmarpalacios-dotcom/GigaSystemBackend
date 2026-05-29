# GigaSystem Backend

Backend e-commerce para venta de PCs, componentes y periféricos.

Este servicio está construido para producción con arquitectura modular, persistencia transaccional y soporte para automatización de catálogo, pagos y estados de pedido.

## 1) Qué se construyó

Se implementó un backend completo fuera del frontend `Giovanni`, en esta carpeta `GigaSystem-backend`, con:

- API REST en `NestJS`.
- Persistencia con `Prisma + PostgreSQL`.
- Almacenamiento de media en `S3-compatible` (MinIO en local).
- Colas de trabajo con `BullMQ + Redis`.
- Autenticación `JWT` y control de acceso por roles (`RBAC`).
- Documentación de API con `Swagger` (`/docs`).
- Health checks de dependencias (`/health`).

Además, se creó el modelo de negocio e-commerce completo: catálogo, variantes/SKU, inventario, carrito, órdenes, pagos, envíos, importación masiva y compras a proveedores.

## 2) Stack técnico

- `Node 20+`
- `NestJS 11`
- `Prisma 6`
- `PostgreSQL`
- `Redis`
- `BullMQ`
- `S3` (MinIO local / S3 real en producción)
- `JWT`
- `Swagger`

## 3) Estructura de módulos

- `auth`: registro/login, generación de tokens, guard JWT y roles.
- `catalog`: catálogo público y CRUD administrativo.
- `media`: generación de URLs firmadas y persistencia de assets.
- `inventory`: movimientos y reservas de stock.
- `orders`: carrito, líneas y checkout.
- `payments`: creación de pago, webhook idempotente y transición de estado.
- `import-jobs`: importación masiva asíncrona CSV.
- `health`: verificación de DB, Redis y S3.
- `database`: servicio Prisma global.

## 4) Arranque local

### 4.1 Variables de entorno

Copiar:

```bash
cp .env.example .env
```

Variables principales:

- `DATABASE_URL`: conexión a Postgres.
- `REDIS_URL`: conexión a Redis.
- `S3_*`: endpoint, credenciales y bucket de media.
- `JWT_*`: secretos y expiración de tokens.
- `PAYMENT_PROVIDER`: proveedor de pagos (`stripe` o `mock`).

### 4.2 Levantar infraestructura local

```bash
docker compose up -d
```

Incluye:

- `postgres`
- `redis`
- `minio`

### 4.3 Instalar dependencias y preparar base de datos

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 4.4 Ejecutar API

```bash
npm run start:dev
```

## 5) Endpoints principales

- `GET /health`
- `GET /docs`
- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `GET /v1/products`
- `GET /v1/products/:slug`
- `POST /v1/admin/products`
- `GET /v1/admin/products`
- `POST /v1/admin/media/upload-url`
- `POST /v1/admin/media/complete-image`
- `POST /v1/cart`
- `POST /v1/cart/:cartId/lines`
- `POST /v1/orders/checkout`
- `GET /v1/orders?orderNumber=...`
- `POST /v1/payments/create`
- `POST /v1/payments/webhook/stripe`
- `POST /v1/admin/import-jobs`
- `GET /v1/admin/import-jobs`

## 6) Flujo funcional (resumen)

### Catálogo

1. Admin crea productos/variantes.
2. Sube imágenes/modelos 3D usando URL firmada.
3. Se publica producto (`PUBLISHED`).
4. Front consume `GET /v1/products`.

### Compra

1. Cliente crea/recupera carrito.
2. Agrega líneas por `variantId`.
3. Checkout crea `Order` + `OrderLine`.
4. Se reserva stock (`Allocation` + `StockMovement`).
5. Se crea pago.
6. Webhook exitoso marca pago `SUCCEEDED`, orden `PAID` y consume reservas.

### Importación masiva

1. Admin dispara `ImportJob` con CSV.
2. Se encola en BullMQ.
3. Processor valida y crea productos.
4. Se registran filas OK/error en `ImportJobRow`.

## 7) Modelo Prisma: tabla por tabla

Esta sección explica para qué sirve cada tabla del `schema.prisma`.

### 7.1 Usuarios y seguridad

- `User`: cuenta principal del sistema (cliente o staff/admin), email, password hash, rol y estado.
- `Address`: direcciones de usuario para facturación/envío.

### 7.2 Catálogo y contenido

- `Brand`: marca comercial de productos.
- `Category`: categorías jerárquicas (padre/hijo).
- `Product`: entidad principal del catálogo (nombre, slug, tipo, estado, SEO, specs JSON).
- `ProductVariant`: variante vendible (SKU, precio, stock, atributos).
- `ProductCategory`: relación N:N entre producto y categorías.
- `ProductImage`: imágenes por producto con rol (`MAIN`, `GALLERY`, `THUMB`).
- `ProductAsset3D`: modelos 3D (GLB) y transformaciones para render (scale/position/rotation).
- `Tag`: etiquetas transversales (ej. destacado, oferta).
- `ProductTag`: relación N:N entre producto y tags.

### 7.3 Inventario

- `Warehouse`: almacenes físicos/lógicos.
- `InventoryItem`: stock por variante y almacén.
- `StockMovement`: trazabilidad de movimientos (`IN`, `OUT`, `RESERVE`, etc).
- `Allocation`: reservas de stock asociadas a una orden (`RESERVED`, `CONSUMED`, `RELEASED`).

### 7.4 Carrito, orden y postventa

- `Cart`: carrito activo de usuario o invitado (token).
- `CartLine`: líneas del carrito con snapshot de precio unitario.
- `Order`: pedido confirmado (totales, moneda, direcciones serializadas).
- `OrderLine`: ítems del pedido con snapshot de nombre/SKU/precio.
- `OrderStatusHistory`: auditoría del cambio de estados.
- `Shipment`: estado logístico, carrier, tracking y costo.

### 7.5 Pagos

- `Payment`: transacción de pago asociada a una orden, con idempotency key, estado y metadata.

### 7.6 Compras a proveedor (backoffice)

- `Supplier`: proveedor de inventario.
- `SupplierOrder`: orden de compra emitida a proveedor.
- `SupplierOrderLine`: detalle de SKUs y costos comprados.

### 7.7 Automatización de carga

- `ImportJob`: ejecución de importación masiva.
- `ImportJobRow`: resultado por fila (éxito/error) para auditoría y corrección.

## 8) Enumeraciones de negocio (clave)

- `ProductType`: `PC_COMPONENT`, `PERIPHERAL`, `PREBUILT_PC`, `ACCESSORY`.
- `ProductStatus`: `DRAFT`, `PUBLISHED`, `ARCHIVED`.
- `OrderStatus`: ciclo de vida del pedido (`CREATED` a `REFUNDED`).
- `PaymentStatus`: `PENDING`, `SUCCEEDED`, `FAILED`, `REFUNDED`.
- `UserRole`: `CUSTOMER`, `STAFF`, `ADMIN`.

## 9) Diseño y decisiones importantes

- **SKU único** en `ProductVariant` para trazabilidad.
- **Snapshots** en `OrderLine` para evitar inconsistencias históricas si cambia el catálogo.
- **Idempotencia** en pagos mediante `idempotencyKey`.
- **JSON flexible** (`specsJson`, `metadata`) para evolucionar sin romper el esquema.
- **Separación público/admin** en rutas para seguridad y escalabilidad.

## 10) Testing y calidad

Comandos:

```bash
npm run lint
npm run test
npm run test:e2e
npm run build
```

CI en `.github/workflows/ci.yml` ejecuta lint, tests, migraciones y build.

## 11) Estado actual y próximos pasos recomendados

Estado actual:

- Base de backend funcional y compilando.
- Esquema Prisma amplio para e-commerce real.
- Endpoints y flujos críticos implementados.

Próximos pasos recomendados:

1. Integrar frontend `Giovanni` contra `v1/products`, `cart`, `orders`, `payments`.
2. Endurecer webhook Stripe con verificación criptográfica de firma.
3. Añadir tests e2e con DB real efímera (no mocks de servicio).
4. Implementar promociones/cupones y cálculo fiscal por región.

## 12) Archivos clave

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `src/app.module.ts`
- `src/main.ts`
- `src/catalog/*`
- `src/orders/*`
- `src/payments/*`
- `src/import-jobs/*`
- `docker-compose.yml`
- `.env.example`
