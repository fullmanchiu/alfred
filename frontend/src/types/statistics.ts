/**
 * 统计分析模块类型定义
 */

/**
 * 异常消费响应
 */
export interface AnomalyResponse {
  /** 异常类型：单笔异常 or 分类突增 */
  type: 'single_transaction' | 'category_spike';
  /** 描述 */
  description: string;
  /** 交易ID（单笔异常有值） */
  transactionId: number | null;
  /** 交易日期 */
  transactionDate: string | null;
  /** 分类ID */
  categoryId: number | null;
  /** 分类名称 */
  categoryName: string | null;
  /** 金额 */
  amount: number;
  /** 平均金额 */
  averageAmount: number;
  /** 偏差百分比 */
  deviationPercentage: number;
  /** 严重程度：高/中/低 */
  severity: 'high' | 'medium' | 'low';
}

/**
 * 月度支出数据
 */
export interface MonthExpense {
  /** 年月（格式：yyyy-MM） */
  yearMonth: string;
  /** 支出金额 */
  expense: number;
}

/**
 * 预测分析响应
 */
export interface PredictionResponse {
  /** 下月预测支出 */
  nextMonthPredictedExpense: number;
  /** 预测方法说明 */
  predictionMethod: string;
  /** 近3个月支出数据 */
  recentThreeMonthsExpenses: MonthExpense[];
  /** 置信度：高/中/低 */
  confidence: 'high' | 'medium' | 'low';
  /** 趋势：上升/下降/稳定 */
  trend: 'rising' | 'falling' | 'stable';
  /** 预计超支时间（月数），null表示不会超支 */
  overBudgetMonth: number | null;
}

/**
 * 财务健康评分响应
 */
export interface HealthScoreResponse {
  /** 总分（0-100） */
  totalScore: number;
  /** 储蓄率得分（0-40） */
  savingsRateScore: number;
  /** 预算控制得分（0-30） */
  budgetControlScore: number;
  /** 消费多样性得分（0-30） */
  diversityScore: number;
  /** 评级：优秀/良好/一般/需改善 */
  level: 'excellent' | 'good' | 'fair' | 'poor';
  /** 储蓄率（百分比） */
  savingsRate: number;
  /** 预算使用率（百分比） */
  budgetUsageRate: number;
  /** 消费分类数量 */
  categoryCount: number;
  /** 优化建议列表 */
  suggestions: string[];
}

/**
 * 环比对比数据
 */
export interface MonthOverMonthComparison {
  /** 上月收入 */
  lastMonthIncome: number;
  /** 本月收入 */
  thisMonthIncome: number;
  /** 收入增长率（%） */
  incomeGrowthRate: number;
  /** 上月支出 */
  lastMonthExpense: number;
  /** 本月支出 */
  thisMonthExpense: number;
  /** 支出增长率（%） */
  expenseGrowthRate: number;
  /** 上月净储蓄 */
  lastMonthNetSavings: number;
  /** 本月净储蓄 */
  thisMonthNetSavings: number;
  /** 净储蓄增长率（%） */
  netSavingsGrowthRate: number;
}

/**
 * 同比对比数据
 */
export interface YearOverYearComparison {
  /** 去年同期收入 */
  lastYearIncome: number;
  /** 今年同期收入 */
  thisYearIncome: number;
  /** 收入增长率（%） */
  incomeGrowthRate: number;
  /** 去年同期支出 */
  lastYearExpense: number;
  /** 今年同期支出 */
  thisYearExpense: number;
  /** 支出增长率（%） */
  expenseGrowthRate: number;
  /** 去年同期净储蓄 */
  lastYearNetSavings: number;
  /** 今年同期净储蓄 */
  thisYearNetSavings: number;
  /** 净储蓄增长率（%） */
  netSavingsGrowthRate: number;
}

/**
 * 同比环比分析响应
 */
export interface ComparisonResponse {
  /** 环比数据 */
  monthOverMonth: MonthOverMonthComparison;
  /** 同比数据 */
  yearOverYear: YearOverYearComparison;
}
