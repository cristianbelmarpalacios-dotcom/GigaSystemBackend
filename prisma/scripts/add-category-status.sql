-- Ejecutar ANTES de `npx prisma db push` si falla al añadir status a Category.
-- Las categorías existentes quedan vigentes; las nuevas entran como no vigente (default del schema).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CategoryStatus') THEN
    CREATE TYPE "CategoryStatus" AS ENUM ('PUBLISHED', 'ARCHIVED');
  END IF;
END $$;

ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "status" "CategoryStatus";

UPDATE "Category" SET "status" = 'PUBLISHED' WHERE "status" IS NULL;

ALTER TABLE "Category" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "Category" ALTER COLUMN "status" SET DEFAULT 'ARCHIVED';
