ALTER TABLE "HomeTile" ADD COLUMN IF NOT EXISTS "eyebrow" TEXT;

UPDATE "HomeSection" SET "title" = NULL WHERE "type" = 'BANNER_GRID' AND "title" = 'Descubre nuevas categorías';
