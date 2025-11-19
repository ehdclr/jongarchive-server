import { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: '.env.production' });
} else if (process.env.NODE_ENV === 'development') {
  dotenv.config({ path: '.env.development' });
} else {
  dotenv.config({ path: '.env.local' });
}

export default {
  schema: './src/database/schema/*',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT) || 5432,
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '12341234',
    database: process.env.POSTGRES_DB || 'notes_db',
    ssl: false,
  },
  strict: true, // 데이터베이스 스키마와 매핑되지 않는 경우 오류 발생
} satisfies Config;