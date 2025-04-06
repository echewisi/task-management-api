// src/tasks/tasks.controller.ts
import { 
    Controller, 
    Get, 
    Post, 
    Body, 
    Patch, 
    Param, 
    Delete, 
    UseGuards,
    Query,
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator 
  } from '@nestjs/common';
  import { TasksService } from './tasks.service';
  import { CreateTaskDto } from './dto/create-task.dto';
  import { UpdateTaskDto } from './dto/update-task.dto';
  import { FilterTaskDto } from './dto/filter-task.dto';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { RolesGuard } from '../auth/guards/roles.guard';
  import { Roles } from '../common/decorators/roles.decorator';
  import { RolesEnum } from '../common/enums/role.enum';
  import { CurrentUser } from 'src/common/decorators/current-user.decorator';
  import { UserPayload } from 'src/common/interfaces/user-payload.interface';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { TaskStatus } from '../common/enums/task-status.enum';
  import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
  
  @ApiTags('tasks')
  @Controller('tasks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  export class TasksController {
    constructor(private readonly tasksService: TasksService) {}
  
    @Post()
    @ApiOperation({ summary: 'Create a new task' })
    @ApiResponse({ status: 201, description: 'The task has been successfully created.' })
    @ApiResponse({ status: 400, description: 'Bad Request.' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('image'))
    async create(
      @Body() createTaskDto: CreateTaskDto,
      @CurrentUser() user: UserPayload,
      @UploadedFile(
        new ParseFilePipe({
          validators: [
            new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
            new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif)$/ }),
          ],
          fileIsRequired: false,
        }),
      ) 
      image?: Express.Multer.File,
    ) {
      return this.tasksService.create(createTaskDto, user.id, image);
    }
  
    @Get()
    @ApiOperation({ summary: 'Get all tasks' })
    @ApiResponse({ status: 200, description: 'Return all tasks.' })
    @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
    @ApiQuery({ name: 'priority', required: false })
    @ApiQuery({ name: 'dueDate', required: false })
    async findAll(
      @Query() filterDto: FilterTaskDto,
      @CurrentUser() user: UserPayload,
    ) {
      return this.tasksService.findAll(filterDto, user.id, user.role);
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get a task by id' })
    @ApiResponse({ status: 200, description: 'Return the task.' })
    @ApiResponse({ status: 404, description: 'Task not found.' })
    @ApiParam({ name: 'id', description: 'Task id' })
    async findOne(
      @Param('id') id: string,
      @CurrentUser() user: UserPayload,
    ) {
      return this.tasksService.findById(id, user.id, user.role);
    }
  
    @Patch(':id')
    @ApiOperation({ summary: 'Update a task' })
    @ApiResponse({ status: 200, description: 'The task has been successfully updated.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    @ApiResponse({ status: 404, description: 'Task not found.' })
    @ApiParam({ name: 'id', description: 'Task id' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('image'))
    async update(
      @Param('id') id: string,
      @Body() updateTaskDto: UpdateTaskDto,
      @CurrentUser() user: UserPayload,
      @UploadedFile(
        new ParseFilePipe({
          validators: [
            new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
            new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif)$/ }),
          ],
          fileIsRequired: false,
        }),
      ) 
      image?: Express.Multer.File,
    ) {
      return this.tasksService.update(id, updateTaskDto, user.id, user.role, image);
    }
  
    @Patch(':id/status')
    @ApiOperation({ summary: 'Update task status' })
    @ApiResponse({ status: 200, description: 'The task status has been successfully updated.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    @ApiResponse({ status: 404, description: 'Task not found.' })
    @ApiParam({ name: 'id', description: 'Task id' })
    @ApiBody({ schema: { properties: { status: { type: 'string', enum: Object.values(TaskStatus) } } } })
    async updateStatus(
      @Param('id') id: string,
      @Body('status') status: TaskStatus,
      @CurrentUser() user: UserPayload,
    ) {
      return this.tasksService.updateStatus(id, status, user.id, user.role);
    }
  
    @Delete(':id')
    @ApiOperation({ summary: 'Delete a task' })
    @ApiResponse({ status: 200, description: 'The task has been successfully deleted.' })
    @ApiResponse({ status: 403, description: 'Forbidden.' })
    @ApiResponse({ status: 404, description: 'Task not found.' })
    @ApiParam({ name: 'id', description: 'Task id' })
    async remove(
      @Param('id') id: string,
      @CurrentUser() user: UserPayload,
    ) {
      return this.tasksService.remove(id, user.id, user.role);
    }
  
    @Get('admin/all')
    @ApiOperation({ summary: 'Admin: Get all tasks' })
    @ApiResponse({ status: 200, description: 'Return all tasks.' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin only.' })
    @Roles(RolesEnum.Admin)
    async adminFindAll(@Query() filterDto: FilterTaskDto) {
      return this.tasksService.findAll(filterDto);
    }
  }