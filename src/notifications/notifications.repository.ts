import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notifications.schema';
// import { Notification, NotificationDocument } from '../schemas/notification.schema';
import { CreateNotificationDto } from './dto/notifications.dto';
import { NotificationType } from 'src/common/enums/notification-type.enum';

@Injectable()
export class NotificationsRepository {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
  ) {}

  async create(createNotificationDto: CreateNotificationDto): Promise<NotificationDocument> {
    const newNotification = new this.notificationModel(createNotificationDto);
    return newNotification.save();
  }

  async findByUser(userId: string): Promise<NotificationDocument[]> {
    return this.notificationModel
      .find({ user: userId })
      .sort({ createdAt: -1 })
      .populate('task')
      .exec();
  }

  async findUnreadByUser(userId: string): Promise<NotificationDocument[]> {
    return this.notificationModel
      .find({ user: userId, isRead: false })
      .sort({ createdAt: -1 })
      .populate('task')
      .exec();
  }

  async markAsRead(id: string): Promise<NotificationDocument | any> {
    return this.notificationModel
      .findByIdAndUpdate(id, { isRead: true }, { new: true })
      .exec();
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel
      .updateMany(
        { user: userId, isRead: false },
        { isRead: true }
      )
      .exec();
  }

  async delete(id: string): Promise<NotificationDocument | any> {
    return this.notificationModel.findByIdAndDelete(id).exec();
  }

  async deleteAllByUser(userId: string): Promise<void> {
    await this.notificationModel.deleteMany({ user: userId }).exec();
  }
}