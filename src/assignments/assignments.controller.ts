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
    Req,
  } from '@nestjs/common';
  import { AssignmentsService } from './assignements.service';
  import { CreateAssignmentDto } from './dto/create-assignment.dto';
  import { UpdateAssignmentDto } from './dto/update-assignment.dto';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
  import { Request } from 'express';
  
  @ApiTags('assignments')
  @Controller('assignments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  export class AssignmentsController {
    constructor(private readonly assignmentsService: AssignmentsService) {}
  
    @Post()
    @ApiOperation({ summary: 'Create a new assignment' })
    @ApiResponse({ status: 201, description: 'Assignment successfully created' })
    async create(@Body() createAssignmentDto: CreateAssignmentDto, @Req() req: Request) {
      // Set the assignedBy field to the current user if not provided
      if (!createAssignmentDto.assignedBy) {
        createAssignmentDto.assignedBy = req.user['id'];
      }
      
      return this.assignmentsService.create(createAssignmentDto);
    }
  
    @Get()
    @ApiOperation({ summary: 'Get all assignments' })
    @ApiResponse({ status: 200, description: 'Return all assignments' })
    async findAll() {
      return this.assignmentsService.findAll();
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get an assignment by ID' })
    @ApiResponse({ status: 200, description: 'Return the assignment' })
    @ApiResponse({ status: 404, description: 'Assignment not found' })
    async findById(@Param('id') id: string) {
      return this.assignmentsService.findById(id);
    }
  
    @Get('task/:taskId')
    @ApiOperation({ summary: 'Get assignments by task ID' })
    @ApiResponse({ status: 200, description: 'Return assignments for the specified task' })
    async findByTask(@Param('taskId') taskId: string) {
      return this.assignmentsService.findByTask(taskId);
    }
  
    @Get('assigned-to/:userId')
    @ApiOperation({ summary: 'Get assignments assigned to a user' })
    @ApiResponse({ status: 200, description: 'Return assignments assigned to the specified user' })
    async findByAssignedTo(@Param('userId') userId: string) {
      return this.assignmentsService.findByAssignedTo(userId);
    }
  
    @Get('assigned-by/:userId')
    @ApiOperation({ summary: 'Get assignments created by a user' })
    @ApiResponse({ status: 200, description: 'Return assignments created by the specified user' })
    async findByAssignedBy(@Param('userId') userId: string) {
      return this.assignmentsService.findByAssignedBy(userId);
    }
  
    @Put(':id')
    @ApiOperation({ summary: 'Update an assignment' })
    @ApiResponse({ status: 200, description: 'Assignment successfully updated' })
    @ApiResponse({ status: 404, description: 'Assignment not found' })
    async update(@Param('id') id: string, @Body() updateAssignmentDto: UpdateAssignmentDto) {
      return this.assignmentsService.update(id, updateAssignmentDto);
    }
  
    @Post(':id/accept')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Accept an assignment' })
    @ApiResponse({ status: 200, description: 'Assignment successfully accepted' })
    @ApiResponse({ status: 404, description: 'Assignment not found' })
    @ApiResponse({ status: 403, description: 'User not authorized to accept this assignment' })
    async acceptAssignment(@Param('id') id: string, @Req() req: Request) {
      return this.assignmentsService.acceptAssignment(id, req.user['id']);
    }
  
    @Delete(':id')
    @ApiOperation({ summary: 'Delete an assignment' })
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiResponse({ status: 204, description: 'Assignment successfully deleted' })
    @ApiResponse({ status: 404, description: 'Assignment not found' })
    async delete(@Param('id') id: string) {
      await this.assignmentsService.delete(id);
    }
  }