ALTER TABLE "HomeTile" ADD COLUMN IF NOT EXISTS "productId" TEXT;

ALTER TABLE "HomeTile" DROP CONSTRAINT IF EXISTS "HomeTile_productId_fkey";
ALTER TABLE "HomeTile" ADD CONSTRAINT "HomeTile_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "HomeSection" SET "title" = 'Nuevos productos'
WHERE "type" = 'BANNER_GRID' AND ("title" IS NULL OR "title" = 'Descubre nuevas categorías');
