import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { CreateNotificationDto } from './dto/notifications.dto';
import { NotificationDocument } from './schemas/notifications.schema';
import { NotificationType } from 'src/common/enums/notification-type.enum';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

  async createNotification(createNotificationDto: CreateNotificationDto): Promise<NotificationDocument> {
    return this.notificationsRepository.create(createNotificationDto);
  }

  async createTaskAssignedNotification(userId: string, taskId: string, assignerName: string): Promise<NotificationDocument | any> {
    const notification: CreateNotificationDto = {
      user: userId,
      message: `${assignerName} assigned you a new task`,
      type: NotificationType.TASK_ASSIGNED,
      task: taskId,
    };
    return this.createNotification(notification);
  }

  async createTaskUpdatedNotification(userId: string, taskId: string, updaterName: string): Promise<NotificationDocument> {
    const notification: CreateNotificationDto = {
      user: userId,
      message: `${updaterName} updated a task assigned to you`,
      type: NotificationType.TASK_UPDATED,
      task: taskId,
    };
    return this.createNotification(notification);
  }

  async createTaskCompletedNotification(userId: string, taskId: string, completerName: string): Promise<NotificationDocument> {
    const notification: CreateNotificationDto = {
      user: userId,
      message: `${completerName} completed a task you created`,
      type: NotificationType.TASK_COMPLETED,
      task: taskId,
    };
    return this.createNotification(notification);
  }

  async getUserNotifications(userId: string): Promise<NotificationDocument[]> {
    return this.notificationsRepository.findByUser(userId);
  }

  async getUnreadNotifications(userId: string): Promise<NotificationDocument[]> {
    return this.notificationsRepository.findUnreadByUser(userId);
  }

  async markAsRead(id: string): Promise<NotificationDocument> {
    return this.notificationsRepository.markAsRead(id);
  }

  async markAllAsRead(userId: string): Promise<void> {
    return this.notificationsRepository.markAllAsRead(userId);
  }

  async deleteNotification(id: string): Promise<NotificationDocument> {
    return this.notificationsRepository.delete(id);
  }

  async deleteAllUserNotifications(userId: string): Promise<void> {
    return this.notificationsRepository.deleteAllByUser(userId);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const unreadNotifications = await this.notificationsRepository.findUnreadByUser(userId);
    return unreadNotifications.length;
  }
}