import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { LeaderboardModule } from '../src/leaderboard/leaderboard.module';
import { User } from '../src/users/schemas/user.schema';
import { Task } from '../src/tasks/schemas/tasks.schema';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { RolesEnum } from '../src/common/enums/role.enum';
import { TaskStatus } from '../src/common/enums/task-status.enum';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, Model, Types } from 'mongoose';

describe('LeaderboardController (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let mongoConnection: Connection;
  let userModel: Model<User>;
  let taskModel: Model<Task>;
  let adminToken: string;
  let userToken: string;
  let adminId: string;
  let userId: string;

  // Mocked JWT token verification
  const mockJwtGuard = {
    canActivate: (context) => {
      const req = context.switchToHttp().getRequest();
      const token = req.headers.authorization?.split(' ')[1];
      
      if (token === adminToken) {
        req.user = { id: adminId, email: 'admin@example.com', role: RolesEnum.Admin };
        return true;
      } else if (token === userToken) {
        req.user = { id: userId, email: 'user@example.com', role: RolesEnum.User };
        return true;
      }
      
      return false;
    },
  };

  beforeAll(async () => {
    // Set up MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    mongoConnection = (await connect(mongoUri)).connection;
    
    userModel = mongoConnection.model(User.name, getModelToken(User.name));
    taskModel = mongoConnection.model(Task.name, getModelToken(Task.name));

    const module: TestingModule = await Test.createTestingModule({
      imports: [LeaderboardModule],
    })
      .overrideProvider(getModelToken(User.name))
      .useValue(userModel)
      .overrideProvider(getModelToken(Task.name))
      .useValue(taskModel)
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: (context) => {
          const req = context.switchToHttp().getRequest();
          const { role } = req.user;
          const requiredRoles = context.getHandler().roles || [];
          
          if (!requiredRoles.length) return true;
          
          return requiredRoles.includes(role);
        },
      })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Create test users and generate mock tokens
    adminId = new Types.ObjectId().toString();
    userId = new Types.ObjectId().toString();
    adminToken = 'admin-mock-token';
    userToken = 'user-mock-token';

    // Create admin user
    await userModel.create({
      _id: adminId,
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'hashed_password',
      role: RolesEnum.Admin,
      totalTasks: 10,
      completedTasks: 8
    });

    // Create regular user
    await userModel.create({
      _id: userId,
      name: 'Test User',
      email: 'user@example.com',
      password: 'hashed_password',
      role: RolesEnum.User,
      totalTasks: 5,
      completedTasks: 3
    });

    // Create some tasks for the admin
    for (let i = 0; i < 10; i++) {
      await taskModel.create({
        title: `Admin Task ${i}`,
        description: `Description for task ${i}`,
        createdBy: adminId,
        status: i < 8 ? TaskStatus.COMPLETED : TaskStatus.IN_PROGRESS,
      });
    }

    // Create some tasks for the user
    for (let i = 0; i < 5; i++) {
      await taskModel.create({
        title: `User Task ${i}`,
        description: `Description for task ${i}`,
        createdBy: userId,
        status: i < 3 ? TaskStatus.COMPLETED : TaskStatus.IN_PROGRESS,
      });
    }
  });

  afterAll(async () => {
    if (mongoConnection) {
      await mongoConnection.dropDatabase();
      await mongoConnection.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
    await app.close();
  });

  describe('GET /leaderboard', () => {
    it('should return the leaderboard', () => {
      return request(app.getHttpServer())
        .get('/leaderboard')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect(res => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(2);
          
          // Check that the leaderboard is sorted correctly
          const firstEntry = res.body[0];
          const secondEntry = res.body[1];
          
          // Admin should be first (higher ratio)
          expect(firstEntry.completionRatio).toBeGreaterThanOrEqual(secondEntry.completionRatio);
          
          // Check structure of entries
          res.body.forEach(entry => {
            expect(entry).toHaveProperty('userId');
            expect(entry).toHaveProperty('name');
            expect(entry).toHaveProperty('email');
            expect(entry).toHaveProperty('totalTasks');
            expect(entry).toHaveProperty('completedTasks');
            expect(entry).toHaveProperty('completionRatio');
          });
        });
    });
  });

  describe('GET /leaderboard/user/:userId/rank', () => {
    it('should return the user rank', () => {
      return request(app.getHttpServer())
        .get(`/leaderboard/user/${userId}/rank`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('rank');
          expect(res.body).toHaveProperty('totalUsers');
          expect(res.body.rank).toBe(2); // User should be ranked second
          expect(res.body.totalUsers).toBe(2);
        });
    });

    it('should return -1 for non-existent user', () => {
      const nonExistentId = new Types.ObjectId().toString();
      return request(app.getHttpServer())
        .get(`/leaderboard/user/${nonExistentId}/rank`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('rank', -1);
        });
    });
  });

  describe('POST /leaderboard/recalculate/user/:userId', () => {
    it('should deny access for regular users', () => {
      return request(app.getHttpServer())
        .post(`/leaderboard/recalculate/user/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should allow admin to recalculate user stats', () => {
      return request(app.getHttpServer())
        .post(`/leaderboard/recalculate/user/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('message', 'User stats recalculated successfully');
        });
    });
  });

  describe('POST /leaderboard/recalculate/all', () => {
    it('should deny access for regular users', () => {
      return request(app.getHttpServer())
        .post('/leaderboard/recalculate/all')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should allow admin to recalculate all user stats', () => {
      return request(app.getHttpServer())
        .post('/leaderboard/recalculate/all')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('message', 'All user stats recalculated successfully');
        });
    });
  });
});