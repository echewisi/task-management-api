import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { UsersModule } from 'src/users/users.module';
import { User } from '../src/users/schemas/user.schema';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { RolesEnum } from '../src/common/enums/role.enum';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let mongoConnection: Connection;
  let userModel: Model<User>;
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

    const module: TestingModule = await Test.createTestingModule({
      imports: [UsersModule],
    })
      .overrideProvider(getModelToken(User.name))
      .useValue(userModel)
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
    adminId = 'admin123';
    userId = 'user123';
    adminToken = 'admin-mock-token';
    userToken = 'user-mock-token';

    // Create admin user
    await userModel.create({
      _id: adminId,
      name: 'Admin User',
      email: 'admin@example.com',
      password: await bcrypt.hash('password123', 10),
      role: RolesEnum.Admin,
    });

    // Create regular user
    await userModel.create({
      _id: userId,
      name: 'Test User',
      email: 'user@example.com',
      password: await bcrypt.hash('password123', 10),
      role: RolesEnum.User,
    });
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

  describe('POST /users', () => {
    it('should create a new user', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'password123',
        })
        .expect(201)
        .expect(res => {
          expect(res.body).toHaveProperty('name', 'New User');
          expect(res.body).toHaveProperty('email', 'newuser@example.com');
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should return 409 when email already exists', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Duplicate User',
          email: 'user@example.com', // Already exists
          password: 'password123',
        })
        .expect(409);
    });
  });

  describe('GET /users', () => {
    it('should return all users for admin', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect(res => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(2);
          res.body.forEach(user => {
            expect(user).not.toHaveProperty('password');
          });
        });
    });

    it('should deny access for regular users', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('GET /users/:id', () => {
    it('should return a user by ID', () => {
      return request(app.getHttpServer())
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('name', 'Test User');
          expect(res.body).toHaveProperty('email', 'user@example.com');
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should return 404 for non-existent user', () => {
      return request(app.getHttpServer())
        .get('/users/nonexistentid')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('PUT /users/:id', () => {
    it('should update a user', () => {
      return request(app.getHttpServer())
        .put(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated User',
        })
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('name', 'Updated User');
          expect(res.body).toHaveProperty('email', 'user@example.com');
        });
    });

    it('should return 409 when updating to an existing email', () => {
      return request(app.getHttpServer())
        .put(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: 'admin@example.com', // Already exists
        })
        .expect(409);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should deny deletion for regular users', () => {
      return request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should allow admin to delete a user', () => {
      return request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });
  });

  describe('GET /users/:id/stats', () => {
    it('should return user task statistics', () => {
      return request(app.getHttpServer())
        .get(`/users/${adminId}/stats`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('totalTasks');
          expect(res.body).toHaveProperty('completedTasks');
        });
    });
  });
});