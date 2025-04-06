// src/tasks/tests/tasks.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from 'src/tasks/tasks.service';
import { TasksRepository } from 'src/tasks/tasks.repository';
import { UsersRepository } from 'src/users/users.repository';
import { NotificationsService } from 'src/notifications/notifications.service';
import { UploadsService } from 'src/uploads/uploads.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateTaskDto } from 'src/tasks/dto/create-task.dto';
import { TaskPriority } from 'src/common/enums/task-priority.enum';
import { UpdateTaskDto } from 'src/tasks/dto/update-task.dto';
import { TaskStatus } from 'src/common/enums/task-status.enum';
import { RolesEnum } from 'src/common/enums/role.enum';
import { FilterTaskDto } from 'src/tasks/dto/filter-task.dto';

describe('TasksService', () => {
  let service: TasksService;
  let tasksRepository: jest.Mocked<TasksRepository>;
  let usersRepository: jest.Mocked<UsersRepository>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let uploadsService: jest.Mocked<UploadsService>;

  const mockTasksRepository = () => ({
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByCreator: jest.fn(),
    findByAssignee: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    delete: jest.fn(),
  });

  const mockUsersRepository = () => ({
    findById: jest.fn(),
    incrementTaskCount: jest.fn(),
    incrementCompletedTaskCount: jest.fn(),
    decrementCompletedTaskCount: jest.fn(),
  });

  const mockNotificationsService = () => ({
    createTaskAssignedNotification: jest.fn(),
    createTaskUpdatedNotification: jest.fn(),
    createTaskCompletedNotification: jest.fn(),
  });

  const mockUploadsService = () => ({
    saveFile: jest.fn(),
    getFileUrl: jest.fn(),
    deleteFile: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: TasksRepository, useFactory: mockTasksRepository },
        { provide: UsersRepository, useFactory: mockUsersRepository },
        { provide: NotificationsService, useFactory: mockNotificationsService },
        { provide: UploadsService, useFactory: mockUploadsService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    tasksRepository = module.get(TasksRepository) as jest.Mocked<TasksRepository>;
    usersRepository = module.get(UsersRepository) as jest.Mocked<UsersRepository>;
    notificationsService = module.get(NotificationsService) as jest.Mocked<NotificationsService>;
    uploadsService = module.get(UploadsService) as jest.Mocked<UploadsService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a task successfully', async () => {
      const userId = 'user123';
      const createTaskDto: CreateTaskDto = {
        title: 'Test Task',
        description: 'Test Description',
        dueDate: new Date(),
        priority: TaskPriority.MEDIUM,
        createdBy: userId,
      };
      const mockUser = { _id: userId, name: 'Test User' };
      const mockTask = {
        _id: 'task123',
        ...createTaskDto,
        createdBy: userId,
      };

      usersRepository.findById.mockResolvedValue(mockUser as any);
      tasksRepository.create.mockResolvedValue(mockTask as any);

      const result = await service.create(createTaskDto, userId);

      expect(usersRepository.findById).toHaveBeenCalledWith(userId);
      expect(tasksRepository.create).toHaveBeenCalledWith({
        ...createTaskDto,
        createdBy: userId,
        imageUrl: null,
      });
      expect(usersRepository.incrementTaskCount).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockTask);
    });

    it('should create a task with image', async () => {
      const userId = 'user123';
      const createTaskDto: CreateTaskDto = {
        title: 'Test Task',
        description: 'Test Description',
        dueDate: new Date(),
        priority: TaskPriority.MEDIUM,
        createdBy: userId,
      };
      const mockUser = { _id: userId, name: 'Test User' };
      const mockFile = { buffer: Buffer.from('test') } as Express.Multer.File;
      const fileName = 'test-image.jpg';
      const fileUrl = '/uploads/test-image.jpg';
      const mockTask = {
        _id: 'task123',
        ...createTaskDto,
        createdBy: userId,
        imageUrl: fileUrl,
      };

      usersRepository.findById.mockResolvedValue(mockUser as any);
      uploadsService.saveFile.mockResolvedValue(fileName);
      uploadsService.getFileUrl.mockReturnValue(fileUrl);
      tasksRepository.create.mockResolvedValue(mockTask as any);

      const result = await service.create(createTaskDto, userId, mockFile);

      expect(uploadsService.saveFile).toHaveBeenCalledWith(mockFile);
      expect(uploadsService.getFileUrl).toHaveBeenCalledWith(fileName);
      expect(tasksRepository.create).toHaveBeenCalledWith({
        ...createTaskDto,
        createdBy: userId,
        imageUrl: fileUrl,
      });
      expect(result).toEqual(mockTask);
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 'user123';
      const createTaskDto: CreateTaskDto = {
        title: 'Test Task',
        description: 'Test Description',
        dueDate: new Date(),
        priority: TaskPriority.MEDIUM,
        createdBy: userId,
      };

      usersRepository.findById.mockResolvedValue(null);

      await expect(service.create(createTaskDto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create a notification if task is assigned', async () => {
      const userId = 'user123';
      const assigneeId = 'user456';
      const createTaskDto: CreateTaskDto = {
        title: 'Test Task',
        description: 'Test Description',
        dueDate: new Date(),
        priority: TaskPriority.MEDIUM,
        assignedTo: assigneeId,
        createdBy: userId,
      };
      const mockUser = { _id: userId, name: 'Test User' };
      const mockTask = {
        _id: 'task123',
        ...createTaskDto,
        createdBy: userId,
      };

      usersRepository.findById.mockResolvedValue(mockUser as any);
      tasksRepository.create.mockResolvedValue(mockTask as any);
      notificationsService.createTaskAssignedNotification.mockResolvedValue(undefined);

      await service.create(createTaskDto, userId);

      expect(notificationsService.createTaskAssignedNotification).toHaveBeenCalledWith(
        assigneeId,
        'task123',
        userId,
      );
    });
  });

  describe('findAll', () => {
    it('should return all tasks for admin users', async () => {
      const mockTasks = [{ _id: 'task1' }, { _id: 'task2' }];
      const filterDto: FilterTaskDto = {};

      tasksRepository.findAll.mockResolvedValue(mockTasks as any);

      const result = await service.findAll(filterDto, 'user123', RolesEnum.Admin);

      expect(tasksRepository.findAll).toHaveBeenCalledWith(filterDto);
      expect(result).toEqual(mockTasks);
    });

    it('should return combined tasks for regular users', async () => {
      const userId = 'user123';
      const mockCreatedTasks = [{ _id: 'task1' }];
      const mockAssignedTasks = [{ _id: 'task2' }];
      const filterDto: FilterTaskDto = {};

      tasksRepository.findByCreator.mockResolvedValue(mockCreatedTasks as any);
      tasksRepository.findByAssignee.mockResolvedValue(mockAssignedTasks as any);

      const result = await service.findAll(filterDto, userId, RolesEnum.User);

      expect(tasksRepository.findByCreator).toHaveBeenCalledWith(userId, filterDto);
      expect(tasksRepository.findByAssignee).toHaveBeenCalledWith(userId, filterDto);
      expect(result).toEqual([...mockCreatedTasks, ...mockAssignedTasks]);
    });

    it('should handle duplicate tasks in created and assigned lists', async () => {
      const userId = 'user123';
      const mockCreatedTasks = [{ _id: 'task1' }, { _id: 'task2' }];
      const mockAssignedTasks = [{ _id: 'task2' }, { _id: 'task3' }];
      const filterDto: FilterTaskDto = {};

      tasksRepository.findByCreator.mockResolvedValue(mockCreatedTasks as any);
      tasksRepository.findByAssignee.mockResolvedValue(mockAssignedTasks as any);

      const result = await service.findAll(filterDto, userId, RolesEnum.User);

      // Should include task1, task2 (only once), and task3
      expect(result).toHaveLength(3);
      expect(result.map(t => t._id)).toEqual(['task1', 'task2', 'task3']);
    });
  });

});