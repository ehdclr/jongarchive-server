import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
  Patch,
  Query,
} from '@nestjs/common';
import { PostsService, PostWithAuthor, PaginatedResult } from './posts.service';
import { CreatePostDto, UpdatePostDto } from './dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { Post as PostEntity } from '@/database/schema';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createPostDto: CreatePostDto,
    @Req() req: any,
  ): Promise<PostEntity> {
    return this.postsService.create(createPostDto, req.user.id);
  }

  @Get()
  async findAll(
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResult<PostWithAuthor>> {
    return this.postsService.findAllWithAuthor(pagination);
  }

  @Get('me/posts')
  @UseGuards(JwtAuthGuard)
  async findMyPosts(
    @Req() req: any,
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResult<PostWithAuthor>> {
    return this.postsService.findByAuthorIdWithPagination(
      req.user.id,
      pagination,
    );
  }

  @Get('author/:authorId')
  async findByAuthorId(
    @Param('authorId', ParseIntPipe) authorId: number,
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResult<PostWithAuthor>> {
    return this.postsService.findByAuthorIdWithPagination(authorId, pagination);
  }

  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PostWithAuthor> {
    return this.postsService.findByIdWithAuthor(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePostDto: UpdatePostDto,
    @Req() req: any,
  ): Promise<PostEntity> {
    return this.postsService.update(id, updatePostDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<PostEntity> {
    return this.postsService.delete(id, req.user.id);
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard)
  async publish(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<PostEntity> {
    return this.postsService.publish(id, req.user.id);
  }

  @Patch(':id/unpublish')
  @UseGuards(JwtAuthGuard)
  async unpublish(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<PostEntity> {
    return this.postsService.unpublish(id, req.user.id);
  }
}
