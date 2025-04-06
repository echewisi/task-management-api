import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { NotificationType } from 'src/common/enums/notification-type.enum';
// export enum NotificationType {
//   TASK_ASSIGNED = 'TASK_ASSIGNED',
//   TASK_UPDATED = 'TASK_UPDATED',
//   TASK_COMPLETED = 'TASK_COMPLETED',
// }

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ 
    type: MongooseSchema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  })
  user: User;

  @Prop({ required: true })
  message: string;

  @Prop({ 
    type: String, 
    enum: NotificationType, 
    required: true 
  })
  type: NotificationType;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ 
    type: MongooseSchema.Types.ObjectId, 
    ref: 'Task'
  })
  task: MongooseSchema.Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);