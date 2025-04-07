import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Put,
    Delete,
    UseGuards,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import { UsersService } from './users.service';
  import { CreateUserDto } from './dto/create-user.dto';
  import { UpdateUserDto } from './dto/update-user.dto';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { RolesGuard } from '../auth/guards/roles.guard';
  import { Roles } from '../common/decorators/roles.decorator';
  import { RolesEnum } from '../common/enums/role.enum';
  import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
  
  @ApiTags('users')
  @Controller('users')
  export class UsersController {
    constructor(private readonly usersService: UsersService) {}
  
    @Post()
    @ApiOperation({ summary: 'Create a new user' })
    @ApiResponse({ status: 201, description: 'User successfully created' })
    @ApiResponse({ status: 409, description: 'User with this email already exists' })
    async create(@Body() createUserDto: CreateUserDto) {
      const user = await this.usersService.create(createUserDto);
      // Remove password from response
      const { password, ...result } = user.toObject();
      return result;
    }
  
    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(RolesEnum.Admin)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all users' })
    @ApiResponse({ status: 200, description: 'Return all users' })
    async findAll() {
      const users = await this.usersService.findAll();
      // Remove passwords from response
      return users.map(user => {
        const { password, ...result } = user.toObject();
        return result;
      });
    }
  
    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get a user by ID' })
    @ApiResponse({ status: 200, description: 'Return the user' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async findById(@Param('id') id: string) {
      const user = await this.usersService.findById(id);
      // Remove password from response
      const { password, ...result } = user.toObject();
      return result;
    }
  
    @Put(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a user' })
    @ApiResponse({ status: 200, description: 'User successfully updated' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiResponse({ status: 409, description: 'Email already in use' })
    async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
      const user = await this.usersService.update(id, updateUserDto);
      // Remove password from response
      const { password, ...result } = user.toObject();
      return result;
    }
  
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(RolesEnum.Admin)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a user' })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiResponse({ status: 204, description: 'User successfully deleted' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async delete(@Param('id') id: string) {
      await this.usersService.delete(id);
    }
  
    @Get(':id/stats')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user task statistics' })
    @ApiResponse({ status: 200, description: 'Return user task statistics' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async getUserTaskStats(@Param('id') id: string) {
      return this.usersService.getUserTaskStats(id);
    }
  }