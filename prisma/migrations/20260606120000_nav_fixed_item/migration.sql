-- CreateTable
CREATE TABLE "NavFixedItem" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "description" TEXT,
    "navImageUrl" TEXT,
    "navImageStorageKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NavFixedItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NavFixedItem_slug_key" ON "NavFixedItem"("slug");

-- Seed: Armador de PC (menú fijo)
INSERT INTO "NavFixedItem" ("id", "slug", "label", "href", "updatedAt")
VALUES (
    'clnavfixedarmadorpc3d00000001',
    'arma-tu-pc-3d',
    'Armador de PC',
    '/arma-tu-pc-3d',
    CURRENT_TIMESTAMP
);
