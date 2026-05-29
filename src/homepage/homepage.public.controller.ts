import { Controller, Get } from '@nestjs/common';
import { HomepageService } from './homepage.service';

@Controller('v1/homepage')
export class HomepagePublicController {
  constructor(private readonly homepageService: HomepageService) {}

  @Get()
  getHomepage() {
    return this.homepageService.getPublicHomepage();
  }
}
