// 语义层元数据：LLM 只能看到这一层，绝不暴露原始表结构 / SQL。
// cube 数量变多后，可改用 Cube.js Meta API（GET /cubejs-api/v1/meta）动态生成。
export const SEMANTIC_LAYER = {
  cubes: [
    {
      name: 'HsbcIncomeStatement',
      title: '汇丰利润表',
      description: '汇丰控股营收/利润表，包含净利息收入 NII、非利息收入、总营收、营业支出、税前利润、净利润等指标。',
      measures: [
        { name: 'netInterestIncome', title: '净利息收入 NII' },
        { name: 'nonInterestIncome', title: '非利息收入' },
        { name: 'totalRevenue', title: '总营收' },
        { name: 'operatingExpenses', title: '营业支出' },
        { name: 'profitBeforeTax', title: '税前利润' },
        { name: 'netProfit', title: '净利润' },
      ],
      dimensions: [
        { name: 'periodDate', title: '报告期', type: 'time' },
        { name: 'reportType', title: '报告类型（FY=全年，H1=半年）', type: 'string' },
        { name: 'currency', title: '货币', type: 'string' },
        { name: 'eps', title: '每股收益', type: 'number' },
      ],
    },
  ],
};
