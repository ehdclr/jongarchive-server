import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';

// 환경 변수 로드
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: '.env.production' });
} else if (process.env.NODE_ENV === 'development') {
  dotenv.config({ path: '.env.development' });
} else {
  dotenv.config({ path: '.env.local' });
}

const logger = new Logger('DatabaseMigration');

async function main() {
  logger.log('Starting database migration...');

  // 환경 변수 검증
  const requiredEnvVars = [
    'POSTGRES_HOST',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB',
  ];
  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar],
  );

  if (missingEnvVars.length > 0) {
    logger.error(
      `Missing required environment variables: ${missingEnvVars.join(', ')}`,
    );
    process.exit(1);
  }

  const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  });

  const db = drizzle(pool);

  try {
    await migrate(db, {
      migrationsFolder: './drizzle/migrations',
      migrationsTable: 'migrations',
    });
    logger.log('Migration completed successfully');
  } catch (error) {
    // 테이블이 이미 존재하는 경우 (42P07) 무시
    if (error.code === '42P07') {
      logger.warn('Some tables already exist, continuing...');
    } else {
      logger.error('Migration failed:', error);
      throw error;
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
