import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('v1/categories')
export class CategoriesPublicController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  listTree() {
    return this.catalogService.listPublicCategoryTree();
  }

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.catalogService.getPublicCategoryBySlug(slug);
  }
}
