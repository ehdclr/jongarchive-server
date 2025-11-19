import { pgTable, varchar, text, timestamp, bigserial } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: bigserial('id', { mode: 'number' }).primaryKey(), // unsigned biginteger 사용
  socialId: varchar('social_id', { length: 255 }).default(''),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phoneNumber: varchar('phone_number', { length: 255 }).default(''),
  name: varchar('name', { length: 255 }).notNull(),
  profileImageUrl: varchar('profile_image_url', { length: 255 }).default(''),
  password: varchar('password', { length: 255 }),
  provider: varchar('provider', { length: 50 }).notNull(),
  bio: text('bio').default(''),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
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
