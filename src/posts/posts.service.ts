import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { DrizzleClient } from '../database/database.module';
import {
  Post,
  posts as postsSchema,
  users as usersSchema,
} from '@/database/schema';
import { eq, and, desc } from 'drizzle-orm';
import { CreatePostWithFileDto, UpdatePostWithFileDto } from './dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AwsService } from '@/aws/aws.service';

export interface AuthorInfo {
  id: number;
  name: string;
  profileImageUrl: string | null;
}

export interface PostWithAuthor {
  post: Post;
  author: AuthorInfo;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

@Injectable()
export class PostsService {
  constructor(
    @Inject('DATABASE') private readonly db: DrizzleClient,
    private readonly awsService: AwsService,
  ) {}

  async create(
    createPostDto: CreatePostWithFileDto,
    authorId: number,
  ): Promise<Post> {
    let thumbnailUrl = '';

    if (createPostDto.thumbnail) {
      thumbnailUrl = await this.awsService.uploadFile(
        createPostDto.thumbnail,
        'posts/thumbnails',
      );
    }

    const [post] = await this.db
      .insert(postsSchema)
      .values({
        title: createPostDto.title,
        content: createPostDto.content,
        thumbnailUrl,
        authorId,
      })
      .returning();

    return post;
  }

  async findAll(): Promise<Post[]> {
    return this.db.select().from(postsSchema);
  }

  async findById(id: number): Promise<Post | null> {
    const [post] = await this.db
      .select()
      .from(postsSchema)
      .where(eq(postsSchema.id, id))
      .limit(1);

    return post || null;
  }

  async findByIdOrFail(id: number): Promise<Post> {
    const post = await this.findById(id);

    if (!post) {
      throw new NotFoundException('게시물을 찾을 수 없습니다.');
    }

    return post;
  }

  async findByAuthorId(authorId: number): Promise<Post[]> {
    return this.db
      .select()
      .from(postsSchema)
      .where(eq(postsSchema.authorId, authorId));
  }

  async update(
    id: number,
    updatePostDto: UpdatePostWithFileDto,
    authorId: number,
  ): Promise<Post> {
    const { thumbnail, ...updateData } = updatePostDto;

    if (thumbnail) {
      updateData.thumbnailUrl = await this.awsService.uploadFile(
        thumbnail,
        'posts/thumbnails',
      );
    }

    const [post] = await this.db
      .update(postsSchema)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(and(eq(postsSchema.id, id), eq(postsSchema.authorId, authorId)))
      .returning();

    if (!post) {
      throw new NotFoundException('게시물을 찾을 수 없습니다.');
    }

    return post;
  }

  async delete(id: number, authorId: number): Promise<Post> {
    const [post] = await this.db
      .delete(postsSchema)
      .where(and(eq(postsSchema.id, id), eq(postsSchema.authorId, authorId)))
      .returning();

    if (!post) {
      throw new NotFoundException('게시물을 찾을 수 없습니다.');
    }

    return post;
  }

  async publish(id: number, authorId: number): Promise<Post> {
    return this.update(id, { isPublished: true }, authorId);
  }

  async unpublish(id: number, authorId: number): Promise<Post> {
    return this.update(id, { isPublished: false }, authorId);
  }

  async findAllWithAuthor(
    pagination: PaginationDto,
  ): Promise<PaginatedResult<PostWithAuthor>> {
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;
    const offset = (page - 1) * limit;

    const results = await this.db
      .select({
        post: postsSchema,
        author: {
          id: usersSchema.id,
          name: usersSchema.name,
          profileImageUrl: usersSchema.profileImageUrl,
        },
      })
      .from(postsSchema)
      .innerJoin(usersSchema, eq(postsSchema.authorId, usersSchema.id))
      .orderBy(desc(postsSchema.createdAt))
      .offset(offset)
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;

    return {
      data,
      meta: {
        page,
        limit,
        hasMore,
      },
    };
  }

  async findByIdWithAuthor(id: number): Promise<PostWithAuthor> {
    const [result] = await this.db
      .select({
        post: postsSchema,
        author: {
          id: usersSchema.id,
          name: usersSchema.name,
          profileImageUrl: usersSchema.profileImageUrl,
        },
      })
      .from(postsSchema)
      .innerJoin(usersSchema, eq(postsSchema.authorId, usersSchema.id))
      .where(eq(postsSchema.id, id))
      .limit(1);

    if (!result) {
      throw new NotFoundException('게시물을 찾을 수 없습니다.');
    }

    return result;
  }

  async findByAuthorIdWithPagination(
    authorId: number,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<PostWithAuthor>> {
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;
    const offset = (page - 1) * limit;

    const results = await this.db
      .select({
        post: postsSchema,
        author: {
          id: usersSchema.id,
          name: usersSchema.name,
          profileImageUrl: usersSchema.profileImageUrl,
        },
      })
      .from(postsSchema)
      .innerJoin(usersSchema, eq(postsSchema.authorId, usersSchema.id))
      .where(eq(postsSchema.authorId, authorId))
      .orderBy(desc(postsSchema.createdAt))
      .offset(offset)
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;

    return {
      data,
      meta: {
        page,
        limit,
        hasMore,
      },
    };
  }
}
