import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { FollowsService } from './follows.service';
import { FollowByCodeDto } from './dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@Controller('follows')
@UseGuards(JwtAuthGuard)
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Post()
  async follow(@Req() req: any, @Body() dto: FollowByCodeDto) {
    await this.followsService.follow(req.user.id, dto.userCode);
    return { success: true, message: '팔로우했습니다.' };
  }

  @Delete(':userId')
  async unfollow(
    @Req() req: any,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    await this.followsService.unfollow(req.user.id, userId);
    return { success: true, message: '언팔로우했습니다.' };
  }

  @Get('following')
  async getFollowing(@Req() req: any) {
    const following = await this.followsService.getFollowing(req.user.id);
    return { success: true, payload: following };
  }

  @Get('followers')
  async getFollowers(@Req() req: any) {
    const followers = await this.followsService.getFollowers(req.user.id);
    return { success: true, payload: followers };
  }

  @Get('counts')
  async getCounts(@Req() req: any) {
    const [followingCount, followersCount] = await Promise.all([
      this.followsService.getFollowingCount(req.user.id),
      this.followsService.getFollowersCount(req.user.id),
    ]);
    return {
      success: true,
      payload: { followingCount, followersCount },
    };
  }

  @Get('check/:userId')
  async checkFollowing(
    @Req() req: any,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    const isFollowing = await this.followsService.isFollowing(
      req.user.id,
      userId,
    );
    return { success: true, payload: { isFollowing } };
  }
}
