import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { AssignmentsModule } from '../src/assignments/assignments.module';
import { Assignment } from '../src/assignments/schemas/assignments.schema';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, Model, Types } from 'mongoose';

describe('AssignmentsController (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let mongoConnection: Connection;
  let assignmentModel: Model<Assignment>;
  let userToken: string;
  let adminToken: string;
  let userId: string;
  let adminId: string;
  let taskId: string;
  let assignmentId: string;

  // Mocked JWT token verification
  const mockJwtGuard = {
    canActivate: (context) => {
      const req = context.switchToHttp().getRequest();
      const token = req.headers.authorization?.split(' ')[1];
      
      if (token === adminToken) {
        req.user = { id: adminId, email: 'admin@example.com', role: 'admin' };
        return true;
      } else if (token === userToken) {
        req.user = { id: userId, email: 'user@example.com', role: 'user' };
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
    assignmentModel = mongoConnection.model(Assignment.name, getModelToken(Assignment.name));

    const module: TestingModule = await Test.createTestingModule({
      imports: [AssignmentsModule],
    })
      .overrideProvider(getModelToken(Assignment.name))
      .useValue(assignmentModel)
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Set up test ids
    userId = new Types.ObjectId().toString();
    adminId = new Types.ObjectId().toString();
    taskId = new Types.ObjectId().toString();
    userToken = 'user-mock-token';
    adminToken = 'admin-mock-token';

    // Create test assignment
    const assignment = await assignmentModel.create({
      task: taskId,
      assignedTo: userId,
      assignedBy: adminId,
      isAccepted: false,
    });
    assignmentId = assignment._id.toString();
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

  describe('POST /assignments', () => {
    it('should create a new assignment', () => {
      const newTaskId = new Types.ObjectId().toString();
      return request(app.getHttpServer())
        .post('/assignments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          task: newTaskId,
          assignedTo: userId,
        })
        .expect(201)
        .expect(res => {
          expect(res.body).toHaveProperty('task', newTaskId);
          expect(res.body).toHaveProperty('assignedTo', userId);
          expect(res.body).toHaveProperty('assignedBy', adminId);
          expect(res.body).toHaveProperty('isAccepted', false);
        });
    });
  });

  describe('GET /assignments', () => {
    it('should return all assignments', () => {
      return request(app.getHttpServer())
        .get('/assignments')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect(res => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(1);
        });
    });
  });

  describe('GET /assignments/:id', () => {
    it('should return an assignment by ID', () => {
      return request(app.getHttpServer())
        .get(`/assignments/${assignmentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('_id', assignmentId);
          expect(res.body).toHaveProperty('task');
          expect(res.body).toHaveProperty('assignedTo');
          expect(res.body).toHaveProperty('assignedBy');
        });
    });

    it('should return 404 for non-existent assignment', () => {
      const nonExistentId = new Types.ObjectId().toString();
      return request(app.getHttpServer())
        .get(`/assignments/${nonExistentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('GET /assignments/task/:taskId', () => {
    it('should return assignments by task ID', () => {
      return request(app.getHttpServer())
        .get(`/assignments/task/${taskId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect(res => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach(assignment => {
            expect(assignment.task._id).toBe(taskId);
          });
        });
    });
  });

  describe('GET /assignments/assigned-to/:userId', () => {
    it('should return assignments assigned to a user', () => {
      return request(app.getHttpServer())
        .get(`/assignments/assigned-to/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect(res => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach(assignment => {
            expect(assignment.assignedTo._id).toBe(userId);
          });
        });
    });
  });

  describe('GET /assignments/assigned-by/:userId', () => {
    it('should return assignments created by a user', () => {
      return request(app.getHttpServer())
        .get(`/assignments/assigned-by/${adminId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect(res => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach(assignment => {
            expect(assignment.assignedBy._id).toBe(adminId);
          });
        });
    });
  });

  describe('PUT /assignments/:id', () => {
    it('should update an assignment', () => {
      return request(app.getHttpServer())
        .put(`/assignments/${assignmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isAccepted: true,
        })
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('_id', assignmentId);
          expect(res.body).toHaveProperty('isAccepted', true);
        });
    });
  });

  describe('POST /assignments/:id/accept', () => {
    it('should accept an assignment', () => {
      // First reset the assignment to not accepted
      return assignmentModel.findByIdAndUpdate(assignmentId, { isAccepted: false })
        .then(() => {
          return request(app.getHttpServer())
            .post(`/assignments/${assignmentId}/accept`)
            .set('Authorization', `Bearer ${userToken}`)
            .expect(200)
            .expect(res => {
              expect(res.body).toHaveProperty('_id', assignmentId);
              expect(res.body).toHaveProperty('isAccepted', true);
              expect(res.body).toHaveProperty('acceptedAt');
            });
        });
    });
  });

  describe('DELETE /assignments/:id', () => {
    it('should delete an assignment', () => {
      return request(app.getHttpServer())
        .delete(`/assignments/${assignmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });
  });
});