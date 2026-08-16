// 语义层元数据：LLM 只能看到这一层，绝不暴露原始表结构 / SQL。
// 每个银行一个 cube（同一底层表按 bank 过滤），LLM 依据问题中的银行路由到对应 cube。

const MEASURES = [
  { name: 'netInterestIncome', title: '净利息收入 NII' },
  { name: 'nonInterestIncome', title: '非利息收入' },
  { name: 'totalRevenue', title: '总营收' },
  { name: 'operatingExpenses', title: '营业支出' },
  { name: 'profitBeforeTax', title: '税前利润' },
  { name: 'netProfit', title: '净利润' },
];

const DIMENSIONS = [
  { name: 'periodDate', title: '报告期', type: 'time' },
  { name: 'reportType', title: '报告类型（FY=全年，H1=半年）', type: 'string' },
  { name: 'currency', title: '货币', type: 'string' },
  { name: 'eps', title: '每股收益', type: 'number' },
];

const BANKS = [
  { cube: 'HsbcIncomeStatement', bank: 'HSBC', title: '汇丰控股 HSBC' },
  { cube: 'JpmorganIncomeStatement', bank: 'JPMorgan', title: '摩根大通 JPMorgan Chase' },
  { cube: 'BankOfAmericaIncomeStatement', bank: 'Bank of America', title: '美国银行 Bank of America' },
  { cube: 'CitigroupIncomeStatement', bank: 'Citigroup', title: '花旗集团 Citigroup' },
  { cube: 'WellsFargoIncomeStatement', bank: 'Wells Fargo', title: '富国银行 Wells Fargo' },
];

// 供 prompt 路由使用：银行 → cube 名
export const BANK_ROUTING = BANKS.map((b) => ({
  cube: b.cube,
  bank: b.bank,
  title: b.title,
}));

export const SEMANTIC_LAYER = {
  banks: BANK_ROUTING,
  cubes: BANKS.map((b) => ({
    name: b.cube,
    bank: b.bank,
    title: b.title,
    description: `${b.title} 利润表，包含净利息收入 NII、总营收、净利润等指标（演示用近似数据）。`,
    measures: MEASURES.map((m) => ({ name: m.name, title: m.title })),
    dimensions: DIMENSIONS,
  })),
};
