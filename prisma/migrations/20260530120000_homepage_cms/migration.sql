-- AlterEnum
ALTER TYPE "AdminModule" ADD VALUE 'HOMEPAGE';

-- CreateEnum
CREATE TYPE "HomeSectionType" AS ENUM ('HERO_BANNER', 'DEALS_CAROUSEL', 'BANNER_GRID');
CREATE TYPE "HomeTileLayout" AS ENUM ('VERTICAL', 'HORIZONTAL');

-- CreateTable
CREATE TABLE "HomeSection" (
    "id" TEXT NOT NULL,
    "type" "HomeSectionType" NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HomeSlide" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "linkUrl" TEXT NOT NULL,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeSlide_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HomePromo" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "linkUrl" TEXT NOT NULL,
    "heading" TEXT,
    "subheading" TEXT,
    "ctaLabel" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomePromo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HomeTile" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "layout" "HomeTileLayout" NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "linkUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "priceLabel" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeTile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HomeSection_type_key" ON "HomeSection"("type");
CREATE UNIQUE INDEX "HomePromo_sectionId_key" ON "HomePromo"("sectionId");

ALTER TABLE "HomeSlide" ADD CONSTRAINT "HomeSlide_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "HomeSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HomePromo" ADD CONSTRAINT "HomePromo_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "HomeSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HomeTile" ADD CONSTRAINT "HomeTile_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "HomeSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
