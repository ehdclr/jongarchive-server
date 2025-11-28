import {
  pgTable,
  varchar,
  text,
  timestamp,
  bigint,
  boolean,
} from 'drizzle-orm/pg-core';
import { users } from './user';

/**
 * 채팅방 테이블
 * 관리자가 생성한 오픈 채팅방만 관리
 */
export const chatRooms = pgTable('chat_rooms', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description').default(''),
  isActive: boolean('is_active').default(true).notNull(),
  createdBy: bigint('created_by', { mode: 'number' })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

/**
 * 채팅 메시지 테이블 (옵션)
 * Redis를 사용할 경우 이 테이블은 메시지 히스토리 저장용으로만 사용
 * 실시간 메시지는 Redis에서 관리
 */
export const chatMessages = pgTable('chat_messages', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  roomId: bigint('room_id', { mode: 'number' })
    .notNull()
    .references(() => chatRooms.id),
  userId: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => users.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export type ChatRoom = typeof chatRooms.$inferSelect;
export type NewChatRoom = typeof chatRooms.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
