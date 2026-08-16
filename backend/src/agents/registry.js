// 专业 Agent 注册表：每个 Agent 只关注一个窄领域，拥有专属系统提示词 + 专属 measure 范围 + 专属工具。
// 占位 Agent（risk / text）暂未接入数据/工具，仅作为未来扩展入口。

export const AGENTS = [
  {
    id: 'nii',
    title: 'NII 分析',
    emoji: '📈',
    description: '净利息收入 NII 的趋势、增长与跨银行对比',
    measures: ['netInterestIncome'],
    tools: ['query_cube', 'calculate_growth_rate', 'calculate_share'],
    systemPrompt:
      'You are an NII (net interest income) analysis specialist for multi-bank financial data. ' +
      'You ONLY answer questions about net interest income (NII), its trend, growth, and comparison across banks.',
    answerPrompt:
      'You are an NII analysis specialist. Answer ONLY from the provided result data, in the same language as the question. ' +
      'Amounts are USD; convert to "billion USD" where helpful and state the conversion. Never invent numbers.',
  },
  {
    id: 'revenue',
    title: '营收分析',
    emoji: '💰',
    description: '总营收、非利息收入的趋势与构成',
    measures: ['totalRevenue', 'nonInterestIncome'],
    tools: ['query_cube', 'calculate_growth_rate', 'calculate_share'],
    systemPrompt:
      'You are a revenue analysis specialist for multi-bank financial data. ' +
      'You ONLY answer questions about total revenue and non-interest income, their trend and composition.',
    answerPrompt:
      'You are a revenue analysis specialist. Answer ONLY from the provided result data, in the same language as the question. ' +
      'Amounts are USD; convert to "billion USD" where helpful. Never invent numbers.',
  },
  {
    id: 'profit',
    title: '利润分析',
    emoji: '🧾',
    description: '净利润、税前利润分析',
    measures: ['netProfit', 'profitBeforeTax'],
    tools: ['query_cube', 'calculate_growth_rate'],
    systemPrompt:
      'You are a profit analysis specialist for multi-bank financial data. ' +
      'You ONLY answer questions about net profit and profit before tax, their trend and comparison.',
    answerPrompt:
      'You are a profit analysis specialist. Answer ONLY from the provided result data, in the same language as the question. ' +
      'Amounts are USD; convert to "billion USD" where helpful. Never invent numbers.',
  },
  {
    id: 'risk',
    title: '风险分析',
    emoji: '🛡️',
    description: '信用风险、市场风险、资本充足率（待接入风险数据）',
    measures: [],
    tools: [],
    placeholder: true,
  },
  {
    id: 'text',
    title: '文本解读',
    emoji: '📄',
    description: '从 PDF / 新闻 / 管理层讨论中提取观点（待接入向量检索）',
    measures: [],
    tools: [],
    placeholder: true,
  },
];

export function getAgent(id) {
  return AGENTS.find((a) => a.id === id);
}

// 仅返回可用（非占位）Agent，供路由使用
export const ACTIVE_AGENTS = AGENTS.filter((a) => !a.placeholder);
