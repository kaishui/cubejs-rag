// 多银行利润表语义层：每个银行一个 cube。
// 底层统一表 public.bank_income_statement，用 sql 子查询按 bank 过滤。
// LLM 依据问题中的银行路由到对应 cube（例如 JPMorgan → JpmorganIncomeStatement）。

const BANKS = [
  { name: 'HsbcIncomeStatement', bank: 'HSBC', title: '汇丰控股 HSBC' },
  { name: 'JpmorganIncomeStatement', bank: 'JPMorgan', title: '摩根大通 JPMorgan Chase' },
  { name: 'BankOfAmericaIncomeStatement', bank: 'Bank of America', title: '美国银行 Bank of America' },
  { name: 'CitigroupIncomeStatement', bank: 'Citigroup', title: '花旗集团 Citigroup' },
  { name: 'WellsFargoIncomeStatement', bank: 'Wells Fargo', title: '富国银行 Wells Fargo' },
];

BANKS.forEach(({ name, bank, title }) => {
  cube(name, {
    sql: `SELECT * FROM public.bank_income_statement WHERE bank = '${bank}'`,

    title,
    description: `${title} 利润表，包含净利息收入 NII、总营收、净利润等指标（演示用近似数据）。`,

    dimensions: {
      periodDate: {
        sql: `period_date`,
        type: `time`,
        title: `报告期`,
        description: `财报期末日期`,
      },
      reportType: {
        sql: `report_type`,
        type: `string`,
        title: `报告类型`,
        description: `FY=全年，H1=半年`,
      },
      currency: {
        sql: `currency`,
        type: `string`,
        title: `货币`,
      },
      eps: {
        sql: `eps`,
        type: `number`,
        title: `每股收益`,
        description: `Basic EPS`,
      },
    },

    measures: {
      netInterestIncome: {
        sql: `net_interest_income`,
        type: `sum`,
        format: `currency`,
        title: `净利息收入`,
        description: `Net Interest Income (NII)`,
      },
      nonInterestIncome: {
        sql: `non_interest_income`,
        type: `sum`,
        format: `currency`,
        title: `非利息收入`,
        description: `Non-interest income`,
      },
      totalRevenue: {
        sql: `total_revenue`,
        type: `sum`,
        format: `currency`,
        title: `总营收`,
        description: `Total revenue`,
      },
      operatingExpenses: {
        sql: `operating_expenses`,
        type: `sum`,
        format: `currency`,
        title: `营业支出`,
        description: `Operating expenses`,
      },
      profitBeforeTax: {
        sql: `profit_before_tax`,
        type: `sum`,
        format: `currency`,
        title: `税前利润`,
        description: `Profit before tax`,
      },
      netProfit: {
        sql: `net_profit`,
        type: `sum`,
        format: `currency`,
        title: `净利润`,
        description: `Net profit`,
      },
    },
  });
});
