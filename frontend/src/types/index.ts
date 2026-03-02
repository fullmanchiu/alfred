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
  refreshToken?: string;
  user: User;
}

// ==================== 多货币账户相关类型 ====================

// 货币类型
export type Currency = 'CNY' | 'HKD' | 'USD' | 'EUR' | 'MOP';

// 货币信息
export interface CurrencyInfo {
  code: Currency;
  symbol: string;
  name: string;
  flag: string;
}

// 货币账户
export interface CurrencyAccount {
  id: number;
  currency: Currency;
  balance: number;
  currencySymbol: string;
  currencyName: string;
}

// 金融机构
export interface Institution {
  id: number;
  name: string;
  type: string;
  icon?: string;
  color?: string;
  countryCode: string;
  accountCount: number;
}

// 账户组（用户感知的"账户"）
export interface FundAccountGroup {
  id: number;
  institutionId: number;
  institutionName: string;
  institutionType: string;
  name: string;
  accountNumber?: string;
  description?: string;
  isDefault: boolean;
  currencies: CurrencyAccount[];
  totalBalance: Record<string, number>;
}

// 多货币账户列表响应
export interface MultiCurrencyAccountsResponse {
  accounts: FundAccountGroup[];
  totalBalanceByCurrency: Record<string, number>;
  institutions: Institution[];
}

// 创建账户组请求
export interface CreateFundAccountGroupRequest {
  institutionId: number;
  name: string;
  accountNumber?: string;
  description?: string;
  isDefault?: boolean;
  currencies: Array<{
    currency: Currency;
    initialBalance?: number;
  }>;
}

// 添加货币请求
export interface AddCurrencyRequest {
  currency: Currency;
  initialBalance?: number;
}

// ==================== 账户类型 ====================

// 账户余额
export interface AccountBalance {
  currency: string;
  balance: number;
  currencySymbol: string;
  currencyName: string;
}

/**
 * 金融账户（对应后端的 FundAccount）
 *
 * 注意：此类型对应后端的 FundAccount 实体，用于区分金融账户和系统账户
 */
export interface Account {
  id: number;
  name: string;
  accountType: string;
  accountNumber: string;
  balances: AccountBalance[];
  institutionName?: string;
  balance: number; // 总余额（保留兼容）
  currency: string; // 主要货币（保留兼容）
  isDefault: boolean;
  icon: string;
  color: string;
  notes: string;
  fpsId?: string;
  swiftCode?: string;
  iban?: string;
  createdAt: string;
}

// 类型别名：明确 Account 就是 FundAccount
export type FundAccount = Account;

// 旧版账户类型（兼容旧接口）
export interface AccountLegacy {
  id: number;
  accountName: string;
  accountType: string;
  balance: number;
  currency?: string;
}

// 分类
export interface Category {
  id: number;
  name: string;
  type: 'expense' | 'income';
  parentId?: number;
  icon?: string;  // 后端字段名是 icon，不是 iconName
  color?: string;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  subcategories?: Category[];
}

// 记账
export interface Transaction {
  id: number;
  transactionDate: string;
  amount: number;
  currency?: string;
  exchangeRate?: number;    // 汇率
  cnyAmount?: number;       // CNY等值金额
  type: 'expense' | 'income' | 'transfer' | 'adjustment' | 'loan_in' | 'loan_out' | 'repayment';
  categoryId?: number;
  accountId?: number; // 保留兼容
  fromAccountId?: number;
  toAccountId?: number;
  notes?: string;

  // 后端填充的显示信息
  displayIcon: string;      // Material Icon 名称
  displayColor: string;     // 颜色值
  displayName: string;      // 显示名称
  categoryName?: string;    // 分类名称
  isInflow: boolean;        // 是否流入
}

// 预算
export interface Budget {
  id: number;
  categoryId: number;
  amount: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';  // 周期类型
  alertThreshold: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
}

// 分类预算详情
export interface CategoryBudgetDetailDto {
  categoryId: number;
  categoryName: string;
  budget: number;
  used: number;
  percentage: number;
  status: 'normal' | 'warning' | 'over';
}

// 预算层级详情
export interface BudgetHierarchyDto {
  date: string;
  period: string;
  dayBudget: number;
  weekBudgetAggregate: number;
  weekSpecific: number;
  monthBudgetAggregate: number;
  monthSpecific: number;
  yearBudgetAggregate: number;
  yearSpecific: number;
  totalBudget: number;
  used: number;
  percentage: number;
  status: 'normal' | 'warning' | 'over';
  categoryBudgets: CategoryBudgetDetailDto[];
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
  isNearLimit: boolean;  // 是否接近限额
  period: string;
  pattern: string;  // 预算生效模式
  alertThreshold: number;
  icon?: string;    // 分类图标
  color?: string;   // 分类颜色
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

// 汇率
export interface ExchangeRate {
  date: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  createdAt: string;
  updatedAt: string;
}

// 当前汇率信息
export interface CurrentExchangeRate {
  date: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
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

// 同步任务
export interface SyncTask {
  id: number;
  stockCode: string;
  taskName?: string;
  taskType: 'kline' | 'indicator';
  syncInterval: number;
  status: 'running' | 'stopped' | 'paused' | 'error';
  lastSyncAt?: string;
  lastSyncStatus?: string;
  lastSyncRecords: number;
  totalRecords: number;
  lastError?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// 股票数据检查响应
export interface StockDataCheckResponse {
  hasData: boolean;
  klineCount: number;
  latestDate?: string;
  message?: string;
  suggestSync: boolean;
}

// ==================== 账户历史相关类型 ====================

/**
 * 账户历史记录
 */
export interface AccountHistory {
  id: number;
  typeCode: string; // 'income', 'expense', 'transfer_in', 'transfer_out', 'deposit', 'withdrawal'
  typeDisplay: string; // '收入', '支出', '转入', '转出', '入金', '出金'
  amount: number;
  currency: string;
  isInflow: boolean;
  entryType: 'DEBIT' | 'CREDIT' | null;
  transactionDate: string;
  relatedAccount?: number;
  notes?: string;
  categoryId?: number; // 分类ID，用于查询分类图标和名称
  categoryName?: string; // 已废弃
}

/**
 * 账户历史响应（分页）
 */
export interface AccountHistoryResponse {
  content: AccountHistory[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

/**
 * 最近活动响应
 * 来自后端的原始活动数据
 */
export interface RecentActivity {
  id: number;
  transactionType?: string; // income, expense, transfer, loan_in, loan_out, repayment
  categoryName?: string;
  categoryIcon?: string; // 分类图标（hex代码或Material Icon名称）
  categoryColor?: string; // 分类颜色（用于首页最近动态显示）
  accountName?: string; // 账户名称
  institutionName?: string; // 金融机构名称
  currency?: string; // 币种
  amount?: number;
  notes?: string;
  isInflow?: boolean; // 是否流入（收入），用于显示符号
  activityType?: string; // running, cycling, swimming, walking
  activityName?: string;
  distance?: number;
  duration?: number;
  weight?: number;
  timestamp: string;
  isBalanceAdjustment?: boolean;
}

// ==================== 运动活动相关类型 ====================

/**
 * 运动活动
 */
export interface Activity {
  id: number;
  userId: number;
  name: string;
  type: 'running' | 'cycling' | 'swimming' | 'walking';
  distance?: number;       // 距离(米)
  duration?: number;       // 时长(秒)
  avgSpeed?: number;       // 平均速度(m/s)
  maxSpeed?: number;       // 最大速度(m/s)
  totalElevation?: number; // 总爬升(米)
  avgHeartRate?: number;   // 平均心率
  maxHeartRate?: number;   // 最大心率
  avgPower?: number;       // 平均功率(瓦)
  maxPower?: number;       // 最大功率(瓦)
  avgCadence?: number;     // 平均踏频(rpm)
  calories?: number;       // 消耗卡路里
  startTime?: string;
  endTime?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * 创建/更新运动活动请求
 */
export interface ActivityRequest {
  name: string;
  type: 'running' | 'cycling' | 'swimming' | 'walking';
  distance?: number;
  duration?: number;
  avgSpeed?: number;
  maxSpeed?: number;
  totalElevation?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgPower?: number;
  maxPower?: number;
  avgCadence?: number;
  calories?: number;
  startTime?: string;
  endTime?: string;
}

// ==================== 健康档案相关类型 ====================

/**
 * 健康档案
 */
export interface HealthProfile {
  id: number;
  userId: number;
  height?: number;       // 身高(cm)
  weight?: number;       // 体重(kg)
  bodyFat?: number;      // 体脂率(%)
  muscleRate?: number;   // 肌肉率(%)
  waterRate?: number;    // 水分率(%)
  boneMass?: number;     // 骨量(kg)
  proteinRate?: number;  // 蛋白质率(%)
  bmr?: number;          // 基础代谢(kcal)
  visceralFat?: number;  // 内脏脂肪等级
  bmi?: number;          // 体质指数
  createdAt: string;
  updatedAt?: string;
}

/**
 * 创建/更新健康档案请求
 */
export interface HealthProfileRequest {
  height?: number;
  weight?: number;
  bodyFat?: number;
  muscleRate?: number;
  waterRate?: number;
  boneMass?: number;
  proteinRate?: number;
  bmr?: number;
  visceralFat?: number;
}

// ==================== 用户档案相关类型 ====================

/**
 * 用户档案
 */
export interface UserProfile {
  id: number;
  username: string;
  email?: string;
  nickname?: string;
  avatar?: string;
  createdAt: string;
}

/**
 * 更新用户档案请求
 */
export interface UpdateUserProfileRequest {
  nickname?: string;
  email?: string;
  avatar?: string;
}

// ==================== 统计分析相关类型 ====================

// 从 statistics.ts 导出所有统计分析类型
export * from './statistics';

// ==================== 任务管理相关类型 ====================

// 从 task.ts 导出所有任务管理类型
export * from './task';
