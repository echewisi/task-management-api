import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AssignmentsRepository } from './assignments.repository';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { AssignmentDocument } from './schemas/assignments.schema';

@Injectable()
export class AssignmentsService {
  constructor(private readonly assignmentsRepository: AssignmentsRepository) {}

  async create(createAssignmentDto: CreateAssignmentDto): Promise<AssignmentDocument> {
    // Set creation time
    createAssignmentDto.assignedAt = new Date();
    
    return this.assignmentsRepository.create(createAssignmentDto);
  }

  async findAll(): Promise<AssignmentDocument[]> {
    return this.assignmentsRepository.findAll();
  }

  async findById(id: string): Promise<AssignmentDocument> {
    const assignment = await this.assignmentsRepository.findById(id);
    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${id} not found`);
    }
    return assignment;
  }

  async findByTask(taskId: string): Promise<AssignmentDocument[]> {
    return this.assignmentsRepository.findByTask(taskId);
  }

  async findByAssignedTo(userId: string): Promise<AssignmentDocument[]> {
    return this.assignmentsRepository.findByAssignedTo(userId);
  }

  async findByAssignedBy(userId: string): Promise<AssignmentDocument[]> {
    return this.assignmentsRepository.findByAssignedBy(userId);
  }

  async update(id: string, updateAssignmentDto: UpdateAssignmentDto): Promise<AssignmentDocument> {
    const assignment = await this.findById(id);
    
    // Update the modified timestamp
    updateAssignmentDto.updatedAt = new Date();
    
    return this.assignmentsRepository.update(id, updateAssignmentDto);
  }

  async acceptAssignment(id: string, userId: string): Promise<AssignmentDocument> {
    const assignment = await this.findById(id);
    
    // Check if the user is the assignee
    if (assignment.assignedTo._id !== userId) {
      throw new ForbiddenException('Only the assigned user can accept this assignment');
    }
    
    // Check if already accepted
    if (assignment.isAccepted) {
      return assignment; // Already accepted, just return the current state
    }
    
    return this.assignmentsRepository.acceptAssignment(id);
  }

  async delete(id: string): Promise<AssignmentDocument> {
    const assignment = await this.findById(id);
    return this.assignmentsRepository.delete(id);
  }
}