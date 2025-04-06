// src/tasks/tasks.service.ts
import {
    Injectable,
    NotFoundException,
    ForbiddenException,
  } from '@nestjs/common';
  import { TasksRepository } from './tasks.repository';
  import { CreateTaskDto } from './dto/create-task.dto';
  import { UpdateTaskDto } from './dto/update-task.dto';
  import { FilterTaskDto } from './dto/filter-task.dto';
  import { TaskStatus } from '../common/enums/task-status.enum';
  import { NotificationsService } from 'src/notifications/notifications.service';
  import { UsersRepository } from 'src/users/users.repository';
  import { RolesEnum } from '../common/enums/role.enum';
  import { UploadsService } from '../uploads/uploads.service';
  import { TaskDocument } from './schemas/tasks.schema';
  import { Types } from 'mongoose';
  
  @Injectable()
  export class TasksService {
    constructor(
      private tasksRepository: TasksRepository,
      private usersRepository: UsersRepository,
      private notificationsService: NotificationsService,
      private uploadsService: UploadsService,
    ) {}
  
    async create(
      createTaskDto: CreateTaskDto,
      userId: string,
      imageFile?: Express.Multer.File,
    ) {
      const user = await this.usersRepository.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }
  
      let imageUrl :  string | undefined;
      if (imageFile) {
        const filename = await this.uploadsService.saveFile(imageFile);
        imageUrl = this.uploadsService.getFileUrl(filename);
      }
  
      const task = await this.tasksRepository.create({
        ...createTaskDto,
        createdBy: userId,
        imageUrl,
      });
  
      // Update user stats
      await this.usersRepository.incrementTaskCount(userId);
  
      // If task is assigned to someone, create a notification
      if (createTaskDto.assignedTo && createTaskDto.assignedTo !== userId) {
        await this.notificationsService.createTaskAssignedNotification(
          createTaskDto.assignedTo,
          (task._id as unknown as Types.ObjectId).toString(),
          userId,
        );
      }
  
      return task;
    }
  
    async findAll(filterDto?: FilterTaskDto, userId?: string, role?: RolesEnum) {
      // If user is admin, return all tasks
      if (role === RolesEnum.Admin) {
        return this.tasksRepository.findAll(filterDto);
      }
  
      // For regular users, only return tasks they created or are assigned to
      if (userId) {
        const createdTasks = await this.tasksRepository.findByCreator(
          userId,
          filterDto,
        );
        const assignedTasks = await this.tasksRepository.findByAssignee(
          userId,
          filterDto,
        );
  
        // Combine and remove duplicates
        const combinedTasks: TaskDocument[] = [...createdTasks];
        assignedTasks.forEach((task: TaskDocument) => {
          if (
            !combinedTasks.some(
              (t) => 
                (t._id as unknown as Types.ObjectId).toString() === 
                (task._id as unknown as Types.ObjectId).toString()
            )
          ) {
            combinedTasks.push(task);
          }
        });
  
        return combinedTasks;
      }
  
      return [];
    }
  
    async findById(id: string, userId: string, role: RolesEnum) {
      const task = await this.tasksRepository.findById(id);
  
      if (!task) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }
  
      // Check if user has permission to view this task
      if (
        role !== RolesEnum.Admin &&
        (task.createdBy as unknown as Types.ObjectId).toString() !== userId &&
        (task.assignedTo ? (task.assignedTo as unknown as Types.ObjectId).toString() !== userId : true)
      ) {
        throw new ForbiddenException(
          'You do not have permission to view this task',
        );
      }
  
      return task;
    }
  
    async update(
      id: string,
      updateTaskDto: UpdateTaskDto,
      userId: string,
      role: RolesEnum,
      imageFile?: Express.Multer.File,
    ) {
      const task = await this.tasksRepository.findById(id);
  
      if (!task) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }
  
      // Check if user has permission to update this task
      if (role !== RolesEnum.Admin && (task.createdBy as unknown as Types.ObjectId).toString() !== userId) {
        throw new ForbiddenException(
          'You do not have permission to update this task',
        );
      }
  
      // Handle task status changes for completedTasks counting
      if (
        updateTaskDto.status === TaskStatus.COMPLETED &&
        task.status !== TaskStatus.COMPLETED
      ) {
        await this.usersRepository.incrementCompletedTaskCount(
          (task.createdBy as unknown as Types.ObjectId).toString(),
        );
      } else if (
        task.status === TaskStatus.COMPLETED &&
        updateTaskDto.status &&
        updateTaskDto.status !== TaskStatus.COMPLETED
      ) {
        await this.usersRepository.decrementCompletedTaskCount(
          (task.createdBy as unknown as Types.ObjectId).toString(),
        );
      }
  
      // Handle image upload if provided
      if (imageFile) {
        // Delete old image if it exists
        if (task.imageUrl) {
          const oldFilename = task.imageUrl.split('/').pop();
          await this.uploadsService.deleteFile(oldFilename);
        }
  
        const filename = await this.uploadsService.saveFile(imageFile);
        updateTaskDto.imageUrl = this.uploadsService.getFileUrl(filename);
      }
  
      // Handle assignment changes
      const previousAssignee = task.assignedTo
        ? (task.assignedTo as unknown as Types.ObjectId).toString()
        : null;
      if (
        updateTaskDto.assignedTo &&
        updateTaskDto.assignedTo !== previousAssignee
      ) {
        // Create notification for new assignee
        await this.notificationsService.createTaskAssignedNotification(
          updateTaskDto.assignedTo,
          (task._id as unknown as Types.ObjectId).toString(),
          userId,
        );
      }
  
      // Create notification for status change
      if (updateTaskDto.status && updateTaskDto.status !== task.status) {
        if (task.assignedTo) {
          await this.notificationsService.createTaskUpdatedNotification(
            (task.assignedTo as unknown as Types.ObjectId).toString(),
            (task._id as unknown as Types.ObjectId).toString(),
            userId,
          );
        }
  
        // If task is completed, notify the creator (if different from updater)
        if (
          updateTaskDto.status === TaskStatus.COMPLETED &&
          (task.createdBy as unknown as Types.ObjectId).toString() !== userId
        ) {
          await this.notificationsService.createTaskCompletedNotification(
            (task.createdBy as unknown as Types.ObjectId).toString(),
            (task._id as unknown as Types.ObjectId).toString(),
            userId,
          );
        }
      }
  
      return this.tasksRepository.update(id, updateTaskDto);
    }
  
    async remove(id: string, userId: string, role: RolesEnum) {
      const task = await this.tasksRepository.findById(id);
  
      if (!task) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }
  
      // Check if user has permission to delete this task
      if (role !== RolesEnum.Admin && (task.createdBy as unknown as Types.ObjectId).toString() !== userId) {
        throw new ForbiddenException(
          'You do not have permission to delete this task',
        );
      }
  
      // If task was completed, decrement completed count
      if (task.status === TaskStatus.COMPLETED) {
        await this.usersRepository.decrementCompletedTaskCount(
          (task.createdBy as unknown as Types.ObjectId).toString(),
        );
      }
  
      // Delete image if it exists
      if (task.imageUrl) {
        const filename = task.imageUrl.split('/').pop();
        await this.uploadsService.deleteFile(filename);
      }
  
      return this.tasksRepository.delete(id);
    }
  
    async updateStatus(
      id: string,
      status: TaskStatus,
      userId: string,
      role: RolesEnum,
    ) {
      const task = await this.tasksRepository.findById(id);
  
      if (!task) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }
  
      // Check if user has permission to update this task
      if (
        role !== RolesEnum.Admin &&
        (task.createdBy as unknown as Types.ObjectId).toString() !== userId &&
        (task.assignedTo ? (task.assignedTo as unknown as Types.ObjectId).toString() !== userId : true)
      ) {
        throw new ForbiddenException(
          'You do not have permission to update this task status',
        );
      }
  
      // Handle completedTasks counting
      if (
        status === TaskStatus.COMPLETED &&
        task.status !== TaskStatus.COMPLETED
      ) {
        await this.usersRepository.incrementCompletedTaskCount(
          (task.createdBy as unknown as Types.ObjectId).toString(),
        );
      } else if (
        task.status === TaskStatus.COMPLETED &&
        status !== TaskStatus.COMPLETED
      ) {
        await this.usersRepository.decrementCompletedTaskCount(
          (task.createdBy as unknown as Types.ObjectId).toString(),
        );
      }
  
      // Create notification for status change
      if (
        status !== task.status &&
        task.assignedTo &&
        (task.assignedTo as unknown as Types.ObjectId).toString() !== userId
      ) {
        await this.notificationsService.createTaskUpdatedNotification(
          (task.assignedTo as unknown as Types.ObjectId).toString(),
          (task._id as unknown as Types.ObjectId).toString(),
          userId,
        );
      }
  
      // If task is completed, notify the creator (if different from updater)
      if (
        status === TaskStatus.COMPLETED &&
        (task.createdBy as unknown as Types.ObjectId).toString() !== userId
      ) {
        await this.notificationsService.createTaskCompletedNotification(
          (task.createdBy as unknown as Types.ObjectId).toString(),
          (task._id as unknown as Types.ObjectId).toString(),
          userId,
        );
      }
  
      return this.tasksRepository.updateStatus(id, status);
    }
  }