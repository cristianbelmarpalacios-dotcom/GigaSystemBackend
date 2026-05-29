import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminModule } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UpsertAdminRoleDto } from './dto/upsert-role.dto';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermission } from './require-permission.decorator';
import { RolesAdminService } from './roles.admin.service';

@Controller('v1/admin/roles')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'STAFF')
export class RolesAdminController {
  constructor(private readonly rolesService: RolesAdminService) {}

  @Get()
  @RequirePermission(AdminModule.ROLES, 'view')
  list() {
    return this.rolesService.list();
  }

  @Get(':id')
  @RequirePermission(AdminModule.ROLES, 'view')
  get(@Param('id') id: string) {
    return this.rolesService.get(id);
  }

  @Post()
  @RequirePermission(AdminModule.ROLES, 'edit')
  create(@Body() dto: UpsertAdminRoleDto) {
    return this.rolesService.create(dto);
  }

  @Patch(':id')
  @RequirePermission(AdminModule.ROLES, 'edit')
  update(@Param('id') id: string, @Body() dto: UpsertAdminRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission(AdminModule.ROLES, 'delete')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}
