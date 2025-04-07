import { Injectable } from '@nestjs/common';
import { LeaderboardRepository } from './leaderboard.repository';

@Injectable()
export class LeaderboardService {
  constructor(private readonly leaderboardRepository: LeaderboardRepository) {}

  async getLeaderboard() {
    return this.leaderboardRepository.getLeaderboard();
  }

  async recalculateUserStats(userId: string) {
    return this.leaderboardRepository.recalculateUserStats(userId);
  }

  async recalculateAllUserStats() {
    return this.leaderboardRepository.recalculateAllUserStats();
  }

  async getUserRank(userId: string): Promise<{ rank: number; totalUsers: number }> {
    const leaderboard = await this.leaderboardRepository.getLeaderboard();
    
    const userIndex = leaderboard.findIndex(entry => entry.userId.toString() === userId);
    
    if (userIndex === -1) {
      return { rank: -1, totalUsers: leaderboard.length };
    }
    
    // Adding 1 because array indices start at 0, but ranks start at 1
    return { 
      rank: userIndex + 1, 
      totalUsers: leaderboard.length 
    };
  }
}