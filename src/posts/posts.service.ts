import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { DrizzleClient } from '../database/database.module';
import {
  Post,
  posts as postsSchema,
  users as usersSchema,
  categories as categoriesSchema,
} from '@/database/schema';
import { eq, and, desc, or, isNull } from 'drizzle-orm';
import { CreatePostWithFileDto, UpdatePostWithFileDto } from './dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AwsService } from '@/aws/aws.service';

export interface AuthorInfo {
  id: number;
  name: string;
  profileImageUrl: string | null;
  userCode: string;
}

export interface CategoryInfo {
  id: number;
  name: string;
  slug: string;
  color: string | null;
}

export interface PostWithAuthor {
  post: Post;
  author: AuthorInfo;
  category: CategoryInfo | null;
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
        categoryId: createPostDto.categoryId || null,
        isPublished: createPostDto.isPublished ?? false,
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
      .where(and(eq(postsSchema.id, id), isNull(postsSchema.deletedAt)))
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
    // 먼저 게시물이 존재하고 삭제되지 않았는지 확인
    const existingPost = await this.findById(id);
    if (!existingPost || existingPost.authorId !== authorId) {
      throw new NotFoundException('게시물을 찾을 수 없습니다.');
    }

    // Soft delete - deletedAt 설정
    const [post] = await this.db
      .update(postsSchema)
      .set({ deletedAt: new Date() })
      .where(and(eq(postsSchema.id, id), eq(postsSchema.authorId, authorId)))
      .returning();

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
    currentUserId: number,
  ): Promise<PaginatedResult<PostWithAuthor>> {
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;
    const offset = (page - 1) * limit;

    // 공개 게시물 OR 본인의 비공개 게시물만 조회 (삭제되지 않은 것만)
    const results = await this.db
      .select({
        post: postsSchema,
        author: {
          id: usersSchema.id,
          name: usersSchema.name,
          profileImageUrl: usersSchema.profileImageUrl,
          userCode: usersSchema.userCode,
        },
        category: {
          id: categoriesSchema.id,
          name: categoriesSchema.name,
          slug: categoriesSchema.slug,
          color: categoriesSchema.color,
        },
      })
      .from(postsSchema)
      .innerJoin(usersSchema, eq(postsSchema.authorId, usersSchema.id))
      .leftJoin(categoriesSchema, eq(postsSchema.categoryId, categoriesSchema.id))
      .where(
        and(
          isNull(postsSchema.deletedAt),
          or(
            eq(postsSchema.isPublished, true),
            eq(postsSchema.authorId, currentUserId),
          ),
        ),
      )
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

  async findByIdWithAuthor(
    id: number,
    currentUserId: number,
  ): Promise<PostWithAuthor> {
    const [result] = await this.db
      .select({
        post: postsSchema,
        author: {
          id: usersSchema.id,
          name: usersSchema.name,
          profileImageUrl: usersSchema.profileImageUrl,
          userCode: usersSchema.userCode,
        },
        category: {
          id: categoriesSchema.id,
          name: categoriesSchema.name,
          slug: categoriesSchema.slug,
          color: categoriesSchema.color,
        },
      })
      .from(postsSchema)
      .innerJoin(usersSchema, eq(postsSchema.authorId, usersSchema.id))
      .leftJoin(
        categoriesSchema,
        eq(postsSchema.categoryId, categoriesSchema.id),
      )
      .where(and(eq(postsSchema.id, id), isNull(postsSchema.deletedAt)))
      .limit(1);

    if (!result) {
      throw new NotFoundException('게시물을 찾을 수 없습니다.');
    }

    // 비공개 게시물은 작성자만 조회 가능
    if (!result.post.isPublished && result.post.authorId !== currentUserId) {
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
          userCode: usersSchema.userCode,
        },
        category: {
          id: categoriesSchema.id,
          name: categoriesSchema.name,
          slug: categoriesSchema.slug,
          color: categoriesSchema.color,
        },
      })
      .from(postsSchema)
      .innerJoin(usersSchema, eq(postsSchema.authorId, usersSchema.id))
      .leftJoin(
        categoriesSchema,
        eq(postsSchema.categoryId, categoriesSchema.id),
      )
      .where(
        and(eq(postsSchema.authorId, authorId), isNull(postsSchema.deletedAt)),
      )
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

  async findByCategoryIdWithPagination(
    categoryId: number,
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
          userCode: usersSchema.userCode,
        },
        category: {
          id: categoriesSchema.id,
          name: categoriesSchema.name,
          slug: categoriesSchema.slug,
          color: categoriesSchema.color,
        },
      })
      .from(postsSchema)
      .innerJoin(usersSchema, eq(postsSchema.authorId, usersSchema.id))
      .leftJoin(
        categoriesSchema,
        eq(postsSchema.categoryId, categoriesSchema.id),
      )
      .where(
        and(
          eq(postsSchema.categoryId, categoryId),
          isNull(postsSchema.deletedAt),
        ),
      )
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

  async findMyPrivatePosts(
    currentUserId: number,
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
          userCode: usersSchema.userCode,
        },
        category: {
          id: categoriesSchema.id,
          name: categoriesSchema.name,
          slug: categoriesSchema.slug,
          color: categoriesSchema.color,
        },
      })
      .from(postsSchema)
      .innerJoin(usersSchema, eq(postsSchema.authorId, usersSchema.id))
      .leftJoin(
        categoriesSchema,
        eq(postsSchema.categoryId, categoriesSchema.id),
      )
      .where(
        and(
          eq(postsSchema.authorId, currentUserId),
          eq(postsSchema.isPublished, false),
          isNull(postsSchema.deletedAt),
        ),
      )
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
