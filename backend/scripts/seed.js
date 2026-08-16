// 直连 Supabase PostgreSQL，执行 data/init.sql 建表 + 灌入示例数据。
// 用法：npm run seed   （需在 backend/.env 或环境变量中配置 DATABASE_URL）
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL 未配置。请在 backend/.env 中设置。');
  process.exit(1);
}

const sqlPath = fileURLToPath(new URL('../../data/init.sql', import.meta.url));

async function main() {
  const sql = await readFile(sqlPath, 'utf8');
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query(sql);
    const { rows } = await client.query(
      'SELECT count(*)::int AS n FROM public.hsbc_income_statement',
    );
    console.log(`[seed] 完成。hsbc_income_statement 现有 ${rows[0].n} 行。`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[seed] 失败:', err.message);
  process.exit(1);
});
