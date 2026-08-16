// 校验数据库连通性 + 展示表内容。
// 用法：npm run check
import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL 未配置。请在 backend/.env 中设置。');
  process.exit(1);
}

async function main() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const { rows } = await client.query(
      'SELECT period_date, report_type, currency, net_interest_income, total_revenue, net_profit FROM public.hsbc_income_statement ORDER BY period_date',
    );
    console.table(rows);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[check] 失败:', err.message);
  process.exit(1);
});
