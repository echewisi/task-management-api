import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Assignment, AssignmentDocument } from './schemas/assignments.schema';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

@Injectable()
export class AssignmentsRepository {
  constructor(
    @InjectModel(Assignment.name) private assignmentModel: Model<AssignmentDocument>,
  ) {}

  async create(createAssignmentDto: CreateAssignmentDto): Promise<AssignmentDocument> {
    const newAssignment = new this.assignmentModel(createAssignmentDto);
    return newAssignment.save();
  }

  async findAll(): Promise<AssignmentDocument[]> {
    return this.assignmentModel
      .find()
      .populate('task')
      .populate('assignedBy', 'name email')
      .populate('assignedTo', 'name email')
      .exec();
  }

  async findById(id: string): Promise<AssignmentDocument | any> {
    return this.assignmentModel
      .findById(id)
      .populate('task')
      .populate('assignedBy', 'name email')
      .populate('assignedTo', 'name email')
      .exec();
  }

  async findByTask(taskId: string): Promise<AssignmentDocument[]> {
    return this.assignmentModel
      .find({ task: taskId })
      .populate('task')
      .populate('assignedBy', 'name email')
      .populate('assignedTo', 'name email')
      .exec();
  }

  async findByAssignedTo(userId: string): Promise<AssignmentDocument[]> {
    return this.assignmentModel
      .find({ assignedTo: userId })
      .populate('task')
      .populate('assignedBy', 'name email')
      .populate('assignedTo', 'name email')
      .exec();
  }

  async findByAssignedBy(userId: string): Promise<AssignmentDocument[]> {
    return this.assignmentModel
      .find({ assignedBy: userId })
      .populate('task')
      .populate('assignedBy', 'name email')
      .populate('assignedTo', 'name email')
      .exec();
  }

  async update(id: string, updateAssignmentDto: UpdateAssignmentDto): Promise<AssignmentDocument | any> {
    return this.assignmentModel
      .findByIdAndUpdate(id, updateAssignmentDto, { new: true })
      .populate('task')
      .populate('assignedBy', 'name email')
      .populate('assignedTo', 'name email')
      .exec();
  }

  async acceptAssignment(id: string): Promise<AssignmentDocument | any> {
    return this.assignmentModel
      .findByIdAndUpdate(
        id, 
        { 
          isAccepted: true,
          acceptedAt: new Date()
        }, 
        { new: true }
      )
      .populate('task')
      .populate('assignedBy', 'name email')
      .populate('assignedTo', 'name email')
      .exec();
  }

  async delete(id: string): Promise<AssignmentDocument | any> {
    return this.assignmentModel.findByIdAndDelete(id).exec();
  }
}