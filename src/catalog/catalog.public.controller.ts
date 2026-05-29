import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('v1/products')
export class CatalogPublicController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  list(@Query('search') search?: string, @Query('category') category?: string) {
    return this.catalogService.listPublishedProducts({
      search,
      categorySlug: category,
    });
  }

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.catalogService.getPublicProductBySlug(slug);
  }
}
