import {
  Body,
  Controller,
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
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermission } from './require-permission.decorator';
import { UsersAdminService } from './users.admin.service';

@Controller('v1/admin/users')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'STAFF')
export class UsersAdminController {
  constructor(private readonly usersService: UsersAdminService) {}

  @Get()
  @RequirePermission(AdminModule.USERS, 'view')
  list() {
    return this.usersService.listStaff();
  }

  @Post()
  @RequirePermission(AdminModule.USERS, 'edit')
  create(@Body() dto: CreateAdminUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @RequirePermission(AdminModule.USERS, 'edit')
  update(@Param('id') id: string, @Body() dto: UpdateAdminUserDto) {
    return this.usersService.update(id, dto);
  }
}
