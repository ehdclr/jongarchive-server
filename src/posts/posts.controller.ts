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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
  @UseInterceptors(FileInterceptor('thumbnail'))
  async create(
    @Body() createPostDto: CreatePostDto,
    @UploadedFile() thumbnail: Express.Multer.File | null,
    @Req() req: any,
  ): Promise<PostEntity> {
    return this.postsService.create({ ...createPostDto, thumbnail }, req.user.id);
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

  @Get('category/:categoryId')
  async findByCategoryId(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Query() pagination: PaginationDto,
  ): Promise<PaginatedResult<PostWithAuthor>> {
    return this.postsService.findByCategoryIdWithPagination(
      categoryId,
      pagination,
    );
  }

  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PostWithAuthor> {
    return this.postsService.findByIdWithAuthor(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('thumbnail'))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePostDto: UpdatePostDto,
    @UploadedFile() thumbnail: Express.Multer.File | null,
    @Req() req: any,
  ): Promise<PostEntity> {
    return this.postsService.update(id, { ...updatePostDto, thumbnail }, req.user.id);
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
