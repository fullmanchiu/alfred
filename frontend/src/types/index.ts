// 用户
export interface User {
  id: number;
  username: string;
  email: string;
  nickname: string;
}

// 登录响应
export interface LoginResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

// 账户
export interface Account {
  id: number;
  accountName: string;
  accountType: string;
  balance: number;
  isActive: boolean;
}

// 分类
export interface Category {
  id: number;
  name: string;
  type: 'expense' | 'income';
  parentId?: number;
  iconName?: string;
  color?: string;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
}

// 记账
export interface Transaction {
  id: number;
  transactionDate: string;
  amount: number;
  type: 'expense' | 'income' | 'transfer';
  categoryId: number;
  accountId: number;
  notes?: string;
}

// 预算
export interface Budget {
  id: number;
  categoryId: number;
  periodType: 'monthly' | 'yearly';
  amount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

// 预算使用情况
export interface BudgetUsage {
  budgetId: number;
  categoryId: number;
  categoryName: string | null;
  budgetAmount: number;
  usedAmount: number;
  remainingAmount: number;
  usagePercentage: number;
  isOverBudget: boolean;
  period: string;
  alertThreshold: number;
}

// 统计概览
export interface StatisticsOverview {
  incomeTotal: number;
  expenseTotal: number;
  netSavings: number;
  categoryBreakdown: CategoryBreakdown[];
}

export interface CategoryBreakdown {
  categoryId: number;
  amount: number;
}

// API 响应
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

// 分页参数
export interface PageParams {
  current?: number;
  pageSize?: number;
}

// 分页响应
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
}

// ==================== 股票相关类型 ====================

// 股票
export interface Stock {
  id: number;
  code: string;
  name: string;
  userId: number;
  addedAt: string;
}

// 股票实时数据
export interface StockRealtimeData {
  stock_name: string;
  current_price: number;
  change_percent: number;
  volume: number;
  market_cap: number;
  open_price?: number;
  high_price?: number;
  low_price?: number;
}

// 技术分析指标
export interface TechnicalIndicators {
  ma: number;
  macd: number;
  rsi: number;
  boll_upper?: number;
  boll_lower?: number;
  kdj_k?: number;
  kdj_d?: number;
}

// 技术分析结果
export interface TechnicalAnalysis {
  score: number;
  trend: string;
  strength: string;
  indicators: TechnicalIndicators;
}

// 基本面分析结果
export interface FundamentalAnalysis {
  score: number;
  reasons: string[];
}

// 股票分析请求
export interface StockAnalyzeRequest {
  code: string;
  start_date?: string;
  end_date?: string;
  include_ai?: boolean;
}

// 股票分析响应
export interface StockAnalysisResponse {
  stock_code: string;
  stock_name: string;
  realtime_data: StockRealtimeData;
  technical_analysis: TechnicalAnalysis;
  fundamental_analysis: FundamentalAnalysis;
  ai_report?: string;
}

// 股票信息
export interface StockInfo {
  code: string;
  name: string;
  current_price: number;
  change_percent: number;
  volume: number;
  market_cap: number;
}
