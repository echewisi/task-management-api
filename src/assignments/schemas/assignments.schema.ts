import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Task } from '../../tasks/schemas/tasks.schema';

export type AssignmentDocument = Assignment & Document;

@Schema({ timestamps: true })
export class Assignment {
  @Prop({ 
    type: MongooseSchema.Types.ObjectId, 
    ref: 'Task', 
    required: true 
  })
  task: Task;

  @Prop({ 
    type: MongooseSchema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  })
  assignedBy: User;

  @Prop({ 
    type: MongooseSchema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  })
  assignedTo: User;

  @Prop({ default: false })
  isAccepted: boolean;

  @Prop({ type: Date, default: Date.now })
  assignedAt: Date;

  @Prop({ type: Date })
  acceptedAt: Date;
}

export const AssignmentSchema = SchemaFactory.createForClass(Assignment);