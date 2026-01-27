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
