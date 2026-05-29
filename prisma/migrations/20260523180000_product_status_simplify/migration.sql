-- Unificar borrador + archivado en un solo estado: ARCHIVED (no vigente)
UPDATE "Product" SET "status" = 'ARCHIVED' WHERE "status" = 'DRAFT';

-- Recrear enum sin DRAFT (PostgreSQL)
ALTER TYPE "ProductStatus" RENAME TO "ProductStatus_old";
CREATE TYPE "ProductStatus" AS ENUM ('PUBLISHED', 'ARCHIVED');
ALTER TABLE "Product" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Product" ALTER COLUMN "status" TYPE "ProductStatus" USING ("status"::text::"ProductStatus");
ALTER TABLE "Product" ALTER COLUMN "status" SET DEFAULT 'ARCHIVED';
DROP TYPE "ProductStatus_old";
