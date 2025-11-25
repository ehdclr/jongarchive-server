import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@/database/schema';
import { sql } from 'drizzle-orm';

let pool: Pool;
let db: NodePgDatabase<typeof schema>;

export const getTestDatabase = () => db;

export const setupTestDatabase = async () => {
  pool = new Pool({
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5433'),
    user: process.env.TEST_DB_USER || 'test',
    password: process.env.TEST_DB_PASSWORD || 'test',
    database: process.env.TEST_DB_NAME || 'notes_test',
  });

  db = drizzle(pool, { schema });

  // 테이블 생성 (스키마 동기화)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      password VARCHAR(255),
      provider VARCHAR(50) NOT NULL,
      social_id VARCHAR(255),
      phone_number VARCHAR(255),
      bio TEXT,
      profile_image_url VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  return db;
};

export const teardownTestDatabase = async () => {
  if (pool) {
    await pool.end();
  }
};

export const cleanupTestDatabase = async () => {
  if (db) {
    await db.execute(sql`TRUNCATE TABLE users RESTART IDENTITY CASCADE`);
  }
};
