import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task, TaskDocument } from 'src/tasks/schemas/tasks.schema';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { TaskStatus } from 'src/common/enums/task-status.enum';

@Injectable()
export class LeaderboardRepository {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
  ) {}

  async getLeaderboard(): Promise<any[]> {
    // First get all users with their task counts
    const users = await this.userModel
      .find({}, 'name email totalTasks completedTasks')
      .exec();

    // Calculate completion ratio and map to leaderboard entries
    const leaderboard = users.map(user => {
      const completionRatio = user.totalTasks > 0
        ? user.completedTasks / user.totalTasks
        : 0;
        
      return {
        userId: user._id,
        name: user.name,
        email: user.email,
        totalTasks: user.totalTasks,
        completedTasks: user.completedTasks,
        completionRatio: parseFloat(completionRatio.toFixed(2)),
      };
    });

    // Sort by completion ratio (higher first), then by completed tasks (higher first)
    return leaderboard.sort((a, b) => {
      if (b.completionRatio !== a.completionRatio) {
        return b.completionRatio - a.completionRatio;
      }
      return b.completedTasks - a.completedTasks;
    });
  }

  async recalculateUserStats(userId: string | any): Promise<void> {
    // Count total tasks created by user
    const totalTasks = await this.taskModel
      .countDocuments({ createdBy: userId })
      .exec();

    // Count completed tasks created by user
    const completedTasks = await this.taskModel
      .countDocuments({ 
        createdBy: userId,
        status: TaskStatus.COMPLETED
      })
      .exec();

    // Update user stats
    await this.userModel
      .findByIdAndUpdate(
        userId,
        { 
          totalTasks,
          completedTasks
        },
        { new: true }
      )
      .exec();
  }

  async recalculateAllUserStats(): Promise<void> {
    const users: UserDocument[] = await this.userModel.find().exec();
  
    for (const user of users) {
      await this.recalculateUserStats(user._id);
    }
  }  
}