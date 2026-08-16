cube(`HsbcIncomeStatement`, {
  sql_table: `public.hsbc_income_statement`,

  title: `汇丰利润表`,
  description: `汇丰控股营收/利润表，包含净利息收入 NII、非利息收入、总营收、营业支出、税前利润、净利润等指标。`,

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
