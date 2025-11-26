import { pgTable, bigint, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { users } from './user';

export const follows = pgTable(
  'follows',
  {
    followerId: bigint('follower_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    followingId: bigint('following_id', { mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.followerId, table.followingId] })],
);

export type Follow = typeof follows.$inferSelect;
export type NewFollow = typeof follows.$inferInsert;
