-- HSBC 利润表（演示用近似数据，非真实财报数字）
-- 幂等：可重复执行（UPSERT）
CREATE TABLE IF NOT EXISTS public.hsbc_income_statement (
  id BIGSERIAL PRIMARY KEY,
  period_date DATE NOT NULL,
  report_type VARCHAR(10) NOT NULL,          -- FY=全年, H1=半年
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  net_interest_income NUMERIC(18,2),         -- 净利息收入 NII
  non_interest_income NUMERIC(18,2),         -- 非利息收入
  total_revenue NUMERIC(18,2),               -- 总营收
  operating_expenses NUMERIC(18,2),          -- 营业支出
  profit_before_tax NUMERIC(18,2),           -- 税前利润
  net_profit NUMERIC(18,2),                  -- 净利润
  eps NUMERIC(10,2),                         -- 每股收益
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (period_date, report_type, currency)
);

INSERT INTO public.hsbc_income_statement
  (period_date, report_type, currency, net_interest_income, non_interest_income, total_revenue, operating_expenses, profit_before_tax, net_profit, eps)
VALUES
  ('2020-12-31', 'FY', 'USD', 27600000000, 28800000000, 56400000000, 31500000000,  8800000000,  6100000000, 0.30),
  ('2021-12-31', 'FY', 'USD', 26500000000, 29200000000, 55700000000, 32000000000, 18900000000, 14700000000, 0.73),
  ('2022-12-31', 'FY', 'USD', 32600000000, 28900000000, 61500000000, 31000000000, 17500000000, 14800000000, 0.74),
  ('2023-12-31', 'FY', 'USD', 36040000000, 30260000000, 66300000000, 33100000000, 30300000000, 24600000000, 1.24),
  ('2024-06-30', 'H1', 'USD', 18200000000, 17800000000, 36000000000, 16000000000, 15500000000, 12000000000, 0.61)
ON CONFLICT (period_date, report_type, currency) DO UPDATE SET
  net_interest_income  = EXCLUDED.net_interest_income,
  non_interest_income  = EXCLUDED.non_interest_income,
  total_revenue        = EXCLUDED.total_revenue,
  operating_expenses   = EXCLUDED.operating_expenses,
  profit_before_tax    = EXCLUDED.profit_before_tax,
  net_profit           = EXCLUDED.net_profit,
  eps                  = EXCLUDED.eps;
