import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Task, TaskDocument } from './schemas/tasks.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskStatus } from 'src/common/enums/task-status.enum';
import { FilterTaskDto } from './dto/filter-task.dto';
import { SortField } from 'src/common/enums/sort-field.enum';
import { SortDirection } from 'src/common/enums/sort-direction.enum';
@Injectable()
export class TasksRepository {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
  ) {}

  async create(createTaskDto: CreateTaskDto): Promise<TaskDocument> {
    const newTask = new this.taskModel(createTaskDto);
    return newTask.save();
  }

  async findAll(filterDto?: FilterTaskDto): Promise<TaskDocument[]> {
    const filter: FilterQuery<Task> = {};
    const sort: any = {};

    // Apply filters if provided
    if (filterDto) {
      if (filterDto.status) {
        filter.status = filterDto.status;
      }

      if (filterDto.priority) {
        filter.priority = filterDto.priority;
      }

      if (filterDto.dueDate) {
        const date = new Date(filterDto.dueDate);
        filter.dueDate = {
          $gte: new Date(date.setHours(0, 0, 0, 0)),
          $lt: new Date(date.setHours(23, 59, 59, 999)),
        };
      }

      if (filterDto.dueBefore) {
        filter.dueDate = { ...filter.dueDate, $lt: new Date(filterDto.dueBefore) };
      }

      if (filterDto.dueAfter) {
        filter.dueDate = { ...filter.dueDate, $gte: new Date(filterDto.dueAfter) };
      }

      // Apply sorting
      if (filterDto.sortBy) {
        const direction = filterDto.sortDirection === SortDirection.DESC ? -1 : 1;
        sort[filterDto.sortBy] = direction;
      }
    }

    return this.taskModel
      .find(filter)
      .sort(sort)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .exec();
  }

  async findById(id: string): Promise<TaskDocument | any> {
    return this.taskModel
      .findById(id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .exec();
  }

  async findByCreator(userId: string, filterDto?: FilterTaskDto): Promise<TaskDocument[]> {
    const filter: FilterQuery<Task> = { createdBy: userId };
    const sort: any = {};

    // Apply additional filters if provided
    if (filterDto) {
      if (filterDto.status) {
        filter.status = filterDto.status;
      }

      if (filterDto.priority) {
        filter.priority = filterDto.priority;
      }

      if (filterDto.dueDate) {
        const date = new Date(filterDto.dueDate);
        filter.dueDate = {
          $gte: new Date(date.setHours(0, 0, 0, 0)),
          $lt: new Date(date.setHours(23, 59, 59, 999)),
        };
      }

      // Apply sorting
      if (filterDto.sortBy) {
        const direction = filterDto.sortDirection === SortDirection.DESC ? -1 : 1;
        sort[filterDto.sortBy] = direction;
      }
    }

    return this.taskModel
      .find(filter)
      .sort(sort)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .exec();
  }

  async findByAssignee(userId: string, filterDto?: FilterTaskDto): Promise<TaskDocument[]> {
    const filter: FilterQuery<Task> = { assignedTo: userId };
    const sort: any = {};

    // Apply additional filters if provided
    if (filterDto) {
      if (filterDto.status) {
        filter.status = filterDto.status;
      }

      if (filterDto.priority) {
        filter.priority = filterDto.priority;
      }

      if (filterDto.dueDate) {
        const date = new Date(filterDto.dueDate);
        filter.dueDate = {
          $gte: new Date(date.setHours(0, 0, 0, 0)),
          $lt: new Date(date.setHours(23, 59, 59, 999)),
        };
      }

      // Apply sorting
      if (filterDto.sortBy) {
        const direction = filterDto.sortDirection === SortDirection.DESC ? -1 : 1;
        sort[filterDto.sortBy] = direction;
      }
    }

    return this.taskModel
      .find(filter)
      .sort(sort)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .exec();
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<TaskDocument | any> {
    return this.taskModel
      .findByIdAndUpdate(id, updateTaskDto, { new: true })
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .exec();
  }

  async updateStatus(id: string, status: TaskStatus): Promise<TaskDocument | any> {
    return this.taskModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .exec();
  }

  async delete(id: string): Promise<TaskDocument | any> {
    return this.taskModel.findByIdAndDelete(id).exec();
  }

  async countByUser(userId: string): Promise<number> {
    return this.taskModel.countDocuments({ createdBy: userId }).exec();
  }

  async countCompletedByUser(userId: string): Promise<number> {
    return this.taskModel
      .countDocuments({ 
        createdBy: userId,
        status: TaskStatus.COMPLETED
      })
      .exec();
  }

  async countAssignedCompletedByUser(userId: string): Promise<number> {
    return this.taskModel
      .countDocuments({ 
        assignedTo: userId,
        status: TaskStatus.COMPLETED
      })
      .exec();
  }
}
