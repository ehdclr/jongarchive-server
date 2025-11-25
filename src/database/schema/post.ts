import {
  pgTable,
  varchar,
  text,
  timestamp,
  bigint,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './user';

export const posts = pgTable('posts', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(), // 마크다운 콘텐츠
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }).default(''), // 썸네일 이미지 URL
  authorId: bigint('author_id', { mode: 'number' })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  isPublished: boolean('is_published').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));

export const usersPostsRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
