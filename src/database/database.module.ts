import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { Logger } from '@nestjs/common';


export const DrizzleClient = drizzle({
  connection: {
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  },
});

export const DATABASE = Symbol('DATABASE');

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'DATABASE',
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        Logger.log('DATABASE 연결 시작');
        //주입
        const pool = new Pool({
          host: configService.get('POSTGRES_HOST'),
          port: parseInt(configService.get('POSTGRES_PORT', '5432')),
          user: configService.get('POSTGRES_USER'),
          password: configService.get('POSTGRES_PASSWORD'),
          database: configService.get('POSTGRES_DB'),
          max: parseInt(configService.get('POSTGRES_MAX_CONNECTIONS', '100')),
          idleTimeoutMillis: parseInt(
            configService.get('POSTGRES_IDLE_TIMEOUT', '30000'),
          ),
          connectionTimeoutMillis: 2000,
        });

        try {
          const client = await pool.connect();
          client.release(); // 연결 해제
          Logger.log('DATABASE 연결 성공');
        } catch (error) {
          Logger.error('DATABASE 연결 실패: ', error);
          throw error;
        }
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: ['DATABASE'], // 외부에서 사용할 수 있도록 내보내기
})
export class DatabaseModule {}
