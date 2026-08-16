-- 多银行利润表（净利息收入 NII 口径）
-- 演示用近似数据，非精确财报数字。单位：美元。
-- 旧表 public.hsbc_income_statement 已废弃（可手动删除），统一迁移到本表。
CREATE TABLE IF NOT EXISTS public.bank_income_statement (
  id BIGSERIAL PRIMARY KEY,
  bank VARCHAR(50) NOT NULL,
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
  UNIQUE (bank, period_date, report_type, currency)
);

INSERT INTO public.bank_income_statement
  (bank, period_date, report_type, currency, net_interest_income, non_interest_income, total_revenue, operating_expenses, profit_before_tax, net_profit, eps)
VALUES
  -- 汇丰控股 HSBC
  ('HSBC',           '2020-12-31', 'FY', 'USD', 27600000000, 28800000000, 56400000000, 31500000000,  8800000000,  6100000000, 0.30),
  ('HSBC',           '2021-12-31', 'FY', 'USD', 26500000000, 29200000000, 55700000000, 32000000000, 18900000000, 14700000000, 0.73),
  ('HSBC',           '2022-12-31', 'FY', 'USD', 32600000000, 28900000000, 61500000000, 31000000000, 17500000000, 14800000000, 0.74),
  ('HSBC',           '2023-12-31', 'FY', 'USD', 36040000000, 30260000000, 66300000000, 33100000000, 30300000000, 24600000000, 1.24),
  ('HSBC',           '2024-06-30', 'H1', 'USD', 18200000000, 17800000000, 36000000000, 16000000000, 15500000000, 12000000000, 0.61),

  -- 摩根大通 JPMorgan Chase（NII 为主，其余近似）
  ('JPMorgan',       '2020-12-31', 'FY', 'USD', 51000000000, NULL, 119500000000, NULL, NULL, 29100000000, NULL),
  ('JPMorgan',       '2021-12-31', 'FY', 'USD', 52500000000, NULL, 121600000000, NULL, NULL, 48300000000, NULL),
  ('JPMorgan',       '2022-12-31', 'FY', 'USD', 68100000000, NULL, 128700000000, NULL, NULL, 37700000000, NULL),
  ('JPMorgan',       '2023-12-31', 'FY', 'USD', 89300000000, NULL, 158100000000, NULL, NULL, 49600000000, NULL),
  ('JPMorgan',       '2024-06-30', 'H1', 'USD', 46000000000, NULL, NULL, NULL, NULL, NULL, NULL),

  -- 美国银行 Bank of America
  ('Bank of America','2020-12-31', 'FY', 'USD', 43200000000, NULL,  85500000000, NULL, NULL, 17900000000, NULL),
  ('Bank of America','2021-12-31', 'FY', 'USD', 42900000000, NULL,  89100000000, NULL, NULL, 32000000000, NULL),
  ('Bank of America','2022-12-31', 'FY', 'USD', 52400000000, NULL,  95000000000, NULL, NULL, 27500000000, NULL),
  ('Bank of America','2023-12-31', 'FY', 'USD', 57200000000, NULL,  98600000000, NULL, NULL, 26500000000, NULL),
  ('Bank of America','2024-06-30', 'H1', 'USD', 28000000000, NULL, NULL, NULL, NULL, NULL, NULL),

  -- 花旗集团 Citigroup
  ('Citigroup',      '2020-12-31', 'FY', 'USD', 44000000000, NULL,  74300000000, NULL, NULL, 11000000000, NULL),
  ('Citigroup',      '2021-12-31', 'FY', 'USD', 43600000000, NULL,  71900000000, NULL, NULL, 22000000000, NULL),
  ('Citigroup',      '2022-12-31', 'FY', 'USD', 48000000000, NULL,  75300000000, NULL, NULL, 14800000000, NULL),
  ('Citigroup',      '2023-12-31', 'FY', 'USD', 55100000000, NULL,  78500000000, NULL, NULL,  9200000000, NULL),
  ('Citigroup',      '2024-06-30', 'H1', 'USD', 26600000000, NULL, NULL, NULL, NULL, NULL, NULL),

  -- 富国银行 Wells Fargo
  ('Wells Fargo',    '2020-12-31', 'FY', 'USD', 36200000000, NULL,  72300000000, NULL, NULL,  3300000000, NULL),
  ('Wells Fargo',    '2021-12-31', 'FY', 'USD', 35800000000, NULL,  78500000000, NULL, NULL, 21500000000, NULL),
  ('Wells Fargo',    '2022-12-31', 'FY', 'USD', 45000000000, NULL,  73800000000, NULL, NULL, 13200000000, NULL),
  ('Wells Fargo',    '2023-12-31', 'FY', 'USD', 52400000000, NULL,  82600000000, NULL, NULL, 19100000000, NULL),
  ('Wells Fargo',    '2024-06-30', 'H1', 'USD', 24000000000, NULL, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (bank, period_date, report_type, currency) DO UPDATE SET
  net_interest_income  = EXCLUDED.net_interest_income,
  non_interest_income  = EXCLUDED.non_interest_income,
  total_revenue        = EXCLUDED.total_revenue,
  operating_expenses   = EXCLUDED.operating_expenses,
  profit_before_tax    = EXCLUDED.profit_before_tax,
  net_profit           = EXCLUDED.net_profit,
  eps                  = EXCLUDED.eps;
