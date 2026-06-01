import { Controller, Get } from '@nestjs/common';
import { NavFixedService } from './nav-fixed.service';

@Controller('v1/nav-fixed')
export class NavFixedPublicController {
  constructor(private readonly navFixedService: NavFixedService) {}

  @Get()
  list() {
    return this.navFixedService.listPublic();
  }
}
