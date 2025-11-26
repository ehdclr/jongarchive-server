import {
  pgTable,
  varchar,
  text,
  timestamp,
  bigint,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('user_role', ['admin', 'moderator', 'user']);

export const users = pgTable('users', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  socialId: varchar('social_id', { length: 255 }).default(''),
  email: varchar('email', { length: 255 }).notNull().unique(),
  userCode: varchar('user_code', { length: 8 }).notNull().unique(),
  phoneNumber: varchar('phone_number', { length: 255 }).default(''),
  name: varchar('name', { length: 255 }).notNull(),
  profileImageUrl: varchar('profile_image_url', { length: 255 }).default(''),
  password: varchar('password', { length: 255 }),
  provider: varchar('provider', { length: 50 }).notNull(),
  role: roleEnum('role').default('user').notNull(),
  bio: text('bio').default(''),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'), // soft delete
});

//TODO: 관계 설정
/**
 * user 테이블과 타 테이블 관계 설정
 *
 */
// export const userRelations = relations(users, ({one}) =>({
//   predict: one(predicts, {
//     fields: [users.id], // users.id 참조
//     // references: [users.id], // predicts.userId 참조
//   }),
// }))

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
