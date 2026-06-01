-- Imagen personalizada del mega menú por categoría raíz
ALTER TABLE "Category" ADD COLUMN "navImageUrl" TEXT;
ALTER TABLE "Category" ADD COLUMN "navImageStorageKey" TEXT;
