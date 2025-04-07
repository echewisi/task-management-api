import {
    Controller,
    Get,
    Param,
    Post,
    UseGuards,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import { LeaderboardService } from './leaderboard.service';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { RolesGuard } from '../auth/guards/roles.guard';
  import { Roles } from '../common/decorators/roles.decorator';
  import { RolesEnum } from '../common/enums/role.enum';
  import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
  
  @ApiTags('leaderboard')
  @Controller('leaderboard')
  export class LeaderboardController {
    constructor(private readonly leaderboardService: LeaderboardService) {}
  
    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get the leaderboard' })
    @ApiResponse({ status: 200, description: 'Return the leaderboard' })
    async getLeaderboard() {
      return this.leaderboardService.getLeaderboard();
    }
  
    @Get('user/:userId/rank')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get a user\'s rank on the leaderboard' })
    @ApiResponse({ status: 200, description: 'Return the user\'s rank' })
    async getUserRank(@Param('userId') userId: string) {
      return this.leaderboardService.getUserRank(userId);
    }
  
    @Post('recalculate/user/:userId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(RolesEnum.Admin)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Recalculate stats for a specific user' })
    @ApiResponse({ status: 200, description: 'User stats recalculated' })
    async recalculateUserStats(@Param('userId') userId: string) {
      await this.leaderboardService.recalculateUserStats(userId);
      return { message: 'User stats recalculated successfully' };
    }
  
    @Post('recalculate/all')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(RolesEnum.Admin)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Recalculate stats for all users' })
    @ApiResponse({ status: 200, description: 'All user stats recalculated' })
    async recalculateAllUserStats() {
      await this.leaderboardService.recalculateAllUserStats();
      return { message: 'All user stats recalculated successfully' };
    }
  }