/**
 * 日历单元格数据
 */
export interface CalendarCell {
  date: string;           // ISO日期
  period: 'week' | 'month' | 'year';
  budget: number;         // 预算金额
  used: number;           // 已用金额
  percentage: number;     // 使用百分比
  status: 'normal' | 'warning' | 'over';
  categoryBudgets?: CategoryBudget[];
}

/**
 * 分类预算
 */
export interface CategoryBudget {
  categoryId: number;
  categoryName: string;
  budget: number;
  used: number;
  percentage: number;
}

/**
 * 预算层级关系
 */
export interface BudgetHierarchy {
  date: string;
  dayBudget: number;
  weekBudgetAggregate: number;
  weekSpecific: number;
  monthBudgetAggregate: number;
  monthSpecific: number;
  yearBudgetAggregate: number;
  yearSpecific: number;
  totalBudget: number;
}

/**
 * 视图类型
 */
export type CalendarView = 'week' | 'month' | 'year';

/**
 * 同步请求
 */
export interface SyncBudgetRequest {
  budgetId: number;
  pattern: 'all' | 'workday' | 'weekend';
  startDate: string;  // 只同步此日期之后的
}
