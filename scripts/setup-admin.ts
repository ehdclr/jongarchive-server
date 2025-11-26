/**
 * 관리자 계정 생성 스크립트
 *
 * 사용법 (환경변수 필수):
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=your_password ADMIN_NAME=관리자 npm run setup:admin
 *
 * .env.local 또는 .env.production에 설정해도 됨:
 *   ADMIN_EMAIL=admin@example.com
 *   ADMIN_PASSWORD=your_password
 *   ADMIN_NAME=관리자
 */

import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '../src/database/schema/user';
import { eq } from 'drizzle-orm';

// 환경변수 로드
const nodeEnv = process.env.NODE_ENV || 'local';
dotenv.config({ path: `.env.${nodeEnv}` });

function generateUserCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function main() {
  console.log('========================================');
  console.log('  관리자 계정 생성 스크립트');
  console.log('========================================\n');

  // DB 연결 정보 확인
  const dbHost = process.env.POSTGRES_HOST;
  const dbName = process.env.POSTGRES_DB;
  console.log(`환경: ${nodeEnv}`);
  console.log(`DB: ${dbHost}/${dbName}\n`);

  // 환경변수에서 관리자 정보 가져오기
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || '관리자';

  // 필수 환경변수 검사
  if (!email || !password) {
    console.error('❌ 환경변수가 설정되지 않았습니다.');
    console.error('');
    console.error('사용법:');
    console.error(
      '  ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=password123 ADMIN_NAME=관리자 npm run setup:admin',
    );
    console.error('');
    console.error('또는 .env.local 파일에 다음을 추가하세요:');
    console.error('  ADMIN_EMAIL=admin@example.com');
    console.error('  ADMIN_PASSWORD=password123');
    console.error('  ADMIN_NAME=관리자');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ 비밀번호는 8자 이상이어야 합니다.');
    process.exit(1);
  }

  console.log(`이메일: ${email}`);
  console.log(`이름: ${name}`);
  console.log('비밀번호: ********\n');

  // DB 연결
  console.log('데이터베이스 연결 중...');
  const connectionString = `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;
  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    // 이미 존재하는지 확인
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      const existingUser = existing[0];
      if (existingUser.role === 'admin') {
        console.log('\n⚠️  이미 관리자 계정이 존재합니다.');
        console.log(`   이메일: ${existingUser.email}`);
        console.log(`   이름: ${existingUser.name}`);
        console.log(`   userCode: ${existingUser.userCode}`);
        console.log('\n비밀번호를 업데이트합니다...');

        const hashedPassword = await bcrypt.hash(password, 10);
        await db
          .update(users)
          .set({ password: hashedPassword, updatedAt: new Date() })
          .where(eq(users.id, existingUser.id));
        console.log('✅ 비밀번호가 업데이트되었습니다.');
      } else {
        console.log(
          `\n⚠️  이메일 ${email}은 이미 '${existingUser.role}' 역할로 존재합니다.`,
        );
        console.log('관리자로 승격합니다...');

        const hashedPassword = await bcrypt.hash(password, 10);
        await db
          .update(users)
          .set({
            role: 'admin',
            password: hashedPassword,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id));
        console.log('✅ 관리자로 승격되었습니다.');
      }
    } else {
      // 새 관리자 생성
      const hashedPassword = await bcrypt.hash(password, 10);
      const userCode = generateUserCode();

      const [newAdmin] = await db
        .insert(users)
        .values({
          email,
          password: hashedPassword,
          name,
          role: 'admin',
          provider: 'local',
          userCode,
        })
        .returning();

      console.log('\n✅ 관리자 계정이 생성되었습니다!');
      console.log(`   ID: ${newAdmin.id}`);
      console.log(`   이메일: ${newAdmin.email}`);
      console.log(`   이름: ${newAdmin.name}`);
      console.log(`   역할: ${newAdmin.role}`);
      console.log(`   userCode: ${newAdmin.userCode}`);
    }
  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  } finally {
    await client.end();
  }

  process.exit(0);
}

main();
