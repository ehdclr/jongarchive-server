/**
 * 관리자 계정 생성 스크립트
 *
 * 사용법:
 *   npx ts-node scripts/setup-admin.ts
 *
 * 환경변수 또는 인자로 설정 가능:
 *   ADMIN_EMAIL=admin@example.com
 *   ADMIN_PASSWORD=your_password
 *   ADMIN_NAME=관리자
 */

import * as dotenv from 'dotenv';
import * as readline from 'readline';
import * as bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '../src/database/schema/user';
import { eq } from 'drizzle-orm';

// 환경변수 로드
const nodeEnv = process.env.NODE_ENV || 'local';
dotenv.config({ path: `.env.${nodeEnv}` });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

function questionHidden(query: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(query);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = '';
    const onData = (char: string) => {
      if (char === '\n' || char === '\r' || char === '\u0004') {
        stdin.setRawMode(wasRaw);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(password);
      } else if (char === '\u0003') {
        process.exit();
      } else if (char === '\u007F' || char === '\b') {
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        password += char;
        process.stdout.write('*');
      }
    };

    stdin.on('data', onData);
  });
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

  // 관리자 정보 입력
  let email = process.env.ADMIN_EMAIL;
  let password = process.env.ADMIN_PASSWORD;
  let name = process.env.ADMIN_NAME;

  if (!email) {
    email = await question('관리자 이메일: ');
  } else {
    console.log(`관리자 이메일: ${email}`);
  }

  if (!password) {
    password = await questionHidden('관리자 비밀번호: ');
    const confirmPassword = await questionHidden('비밀번호 확인: ');
    if (password !== confirmPassword) {
      console.error('\n❌ 비밀번호가 일치하지 않습니다.');
      process.exit(1);
    }
  } else {
    console.log('관리자 비밀번호: ********');
  }

  if (!name) {
    name = await question('관리자 이름 (기본값: 관리자): ') || '관리자';
  } else {
    console.log(`관리자 이름: ${name}`);
  }

  rl.close();

  // 유효성 검사
  if (!email || !password) {
    console.error('\n❌ 이메일과 비밀번호는 필수입니다.');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('\n❌ 비밀번호는 8자 이상이어야 합니다.');
    process.exit(1);
  }

  // DB 연결
  console.log('\n데이터베이스 연결 중...');
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

        const update = await question('\n비밀번호를 업데이트하시겠습니까? (y/N): ');
        if (update.toLowerCase() === 'y') {
          const hashedPassword = await bcrypt.hash(password, 10);
          await db
            .update(users)
            .set({ password: hashedPassword, updatedAt: new Date() })
            .where(eq(users.id, existingUser.id));
          console.log('\n✅ 비밀번호가 업데이트되었습니다.');
        }
      } else {
        const upgrade = await question(
          `\n이메일 ${email}은 이미 '${existingUser.role}' 역할로 존재합니다.\n관리자로 승격하시겠습니까? (y/N): `,
        );
        if (upgrade.toLowerCase() === 'y') {
          const hashedPassword = await bcrypt.hash(password, 10);
          await db
            .update(users)
            .set({
              role: 'admin',
              password: hashedPassword,
              updatedAt: new Date(),
            })
            .where(eq(users.id, existingUser.id));
          console.log('\n✅ 관리자로 승격되었습니다.');
        }
      }
    } else {
      // 새 관리자 생성
      const hashedPassword = await bcrypt.hash(password, 10);
      const [newAdmin] = await db
        .insert(users)
        .values({
          email,
          password: hashedPassword,
          name,
          role: 'admin',
          provider: 'local',
        })
        .returning();

      console.log('\n✅ 관리자 계정이 생성되었습니다!');
      console.log(`   ID: ${newAdmin.id}`);
      console.log(`   이메일: ${newAdmin.email}`);
      console.log(`   이름: ${newAdmin.name}`);
      console.log(`   역할: ${newAdmin.role}`);
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
