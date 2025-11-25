import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { DrizzleClient } from '../database/database.module';
import { Category, categories as categoriesSchema } from '@/database/schema';
import { eq } from 'drizzle-orm';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Injectable()
export class CategoriesService {
  constructor(@Inject('DATABASE') private readonly db: DrizzleClient) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    // slug 중복 체크
    const existing = await this.findBySlug(createCategoryDto.slug);
    if (existing) {
      throw new BadRequestException('이미 존재하는 slug입니다.');
    }

    const [category] = await this.db
      .insert(categoriesSchema)
      .values({
        name: createCategoryDto.name,
        slug: createCategoryDto.slug,
        description: createCategoryDto.description || '',
        color: createCategoryDto.color || '#6366f1',
      })
      .returning();

    return category;
  }

  async findAll(): Promise<Category[]> {
    return this.db.select().from(categoriesSchema).orderBy(categoriesSchema.name);
  }

  async findById(id: number): Promise<Category | null> {
    const [category] = await this.db
      .select()
      .from(categoriesSchema)
      .where(eq(categoriesSchema.id, id))
      .limit(1);

    return category || null;
  }

  async findByIdOrFail(id: number): Promise<Category> {
    const category = await this.findById(id);

    if (!category) {
      throw new NotFoundException('카테고리를 찾을 수 없습니다.');
    }

    return category;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const [category] = await this.db
      .select()
      .from(categoriesSchema)
      .where(eq(categoriesSchema.slug, slug))
      .limit(1);

    return category || null;
  }

  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const [category] = await this.db
      .update(categoriesSchema)
      .set({
        ...updateCategoryDto,
        updatedAt: new Date(),
      })
      .where(eq(categoriesSchema.id, id))
      .returning();

    if (!category) {
      throw new NotFoundException('카테고리를 찾을 수 없습니다.');
    }

    return category;
  }

  async delete(id: number): Promise<Category> {
    const [category] = await this.db
      .delete(categoriesSchema)
      .where(eq(categoriesSchema.id, id))
      .returning();

    if (!category) {
      throw new NotFoundException('카테고리를 찾을 수 없습니다.');
    }

    return category;
  }
}
