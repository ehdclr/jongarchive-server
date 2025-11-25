import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { Category } from '@/database/schema';

// TODO: Admin Guard 추가 필요 (나중에 Admin 기능 구현 시)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  // @UseGuards(AdminGuard) // TODO: Admin만 생성 가능
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  async findAll(): Promise<Category[]> {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Category> {
    return this.categoriesService.findByIdOrFail(id);
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string): Promise<Category | null> {
    return this.categoriesService.findBySlug(slug);
  }

  @Put(':id')
  // @UseGuards(AdminGuard) // TODO: Admin만 수정 가능
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  // @UseGuards(AdminGuard) // TODO: Admin만 삭제 가능
  async delete(@Param('id', ParseIntPipe) id: number): Promise<Category> {
    return this.categoriesService.delete(id);
  }
}
