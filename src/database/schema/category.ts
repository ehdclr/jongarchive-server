import {
  pgTable,
  varchar,
  timestamp,
  bigint,
  text,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { posts } from './post';

export const categories = pgTable('categories', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  slug: varchar('slug', { length: 100 }).notNull().unique(), // URL용 slug (예: tech, life, etc.)
  description: text('description').default(''),
  color: varchar('color', { length: 7 }).default('#6366f1'), // HEX 색상 코드
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  posts: many(posts),
}));

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
