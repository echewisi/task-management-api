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
import { UsersRepository } from 'src/users/users.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { RolesEnum } from '../common/enums/role.enum';
import { UploadsService } from '../uploads/uploads.service';

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

    let imageUrl = null;
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
        task._id,
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
      const combinedTasks = [...createdTasks];
      assignedTasks.forEach((task) => {
        if (
          !combinedTasks.some((t) => t._id.toString() === task._id.toString())
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
      task.createdBy.toString() !== userId &&
      (task.assignedTo ? task.assignedTo.toString() !== userId : true)
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
    if (role !== RolesEnum.Admin && task.createdBy.toString() !== userId) {
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
        task.createdBy.toString(),
      );
    } else if (
      task.status === TaskStatus.COMPLETED &&
      updateTaskDto.status &&
      updateTaskDto.status !== TaskStatus.COMPLETED
    ) {
      await this.usersRepository.decrementCompletedTaskCount(
        task.createdBy.toString(),
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
      ? task.assignedTo.toString()
      : null;
    if (
      updateTaskDto.assignedTo &&
      updateTaskDto.assignedTo !== previousAssignee
    ) {
      // Create notification for new assignee
      await this.notificationsService.createTaskAssignedNotification(
        updateTaskDto.assignedTo,
        task._id,
        userId,
      );
    }

    // Create notification for status change
    if (updateTaskDto.status && updateTaskDto.status !== task.status) {
      if (task.assignedTo) {
        await this.notificationsService.createTaskUpdatedNotification(
          task.assignedTo.toString(),
          task._id,
          userId,
          `Task status changed to ${updateTaskDto.status}`,
        );
      }

      // If task is completed, notify the creator (if different from updater)
      if (
        updateTaskDto.status === TaskStatus.COMPLETED &&
        task.createdBy.toString() !== userId
      ) {
        await this.notificationsService.createTaskCompletedNotification(
          task.createdBy.toString(),
          task._id,
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
    if (role !== RolesEnum.Admin && task.createdBy.toString() !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this task',
      );
    }

    // If task was completed, decrement completed count
    if (task.status === TaskStatus.COMPLETED) {
      await this.usersRepository.decrementCompletedTaskCount(
        task.createdBy.toString(),
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
      task.createdBy.toString() !== userId &&
      (task.assignedTo ? task.assignedTo.toString() !== userId : true)
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
        task.createdBy.toString(),
      );
    } else if (
      task.status === TaskStatus.COMPLETED &&
      status !== TaskStatus.COMPLETED
    ) {
      await this.usersRepository.decrementCompletedTaskCount(
        task.createdBy.toString(),
      );
    }

    // Create notification for status change
    if (
      status !== task.status &&
      task.assignedTo &&
      task.assignedTo.toString() !== userId
    ) {
      await this.notificationsService.createTaskUpdatedNotification(
        task.assignedTo.toString(),
        task._id,
        userId,
        `Task status changed to ${status}`,
      );
    }

    // If task is completed, notify the creator (if different from updater)
    if (
      status === TaskStatus.COMPLETED &&
      task.createdBy.toString() !== userId
    ) {
      await this.notificationsService.createTaskCompletedNotification(
        task.createdBy.toString(),
        task._id,
        userId,
      );
    }

    return this.tasksRepository.updateStatus(id, status);
  }
}
