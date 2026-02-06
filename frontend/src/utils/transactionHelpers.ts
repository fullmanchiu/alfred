import dayjs from 'dayjs';
import { CURRENCIES } from './currency';

/**
 * 交易相关工具函数
 */

/**
 * 格式化日期显示为中文
 * @param date 日期对象
 * @returns 今天/昨天/前天/MM-DD
 */
export const formatDateDisplay = (date: dayjs.Dayjs | undefined): string => {
  if (!date) return '今天';

  const today = dayjs().startOf('day');
  const targetDate = date.startOf('day');
  const diffDays = today.diff(targetDate, 'day');

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays === 2) return '前天';

  return date.format('MM-DD');
};

/**
 * 验证金额格式
 * @param amount 金额字符串
 * @returns 是否有效（最多2位小数）
 */
export const validateAmount = (amount: string): boolean => {
  return /^\d*\.?\d{0,2}$/.test(amount) || amount === '';
};

/**
 * 计算账户在指定货币下的余额
 * @param account 账户对象
 * @param currency 货币代码
 * @returns 余额信息或null
 */
export const getAccountBalance = (
  account: any,
  currency: string
): { balance: number; currencySymbol: string; currency: string } | null => {
  const balance = account.balances?.find((b: any) => b.currency === currency);
  return balance || null;
};

/**
 * 获取余额显示颜色
 * @param balance 余额数值
 * @param themeColor 主题色
 * @returns CSS颜色值
 */
export const getBalanceColor = (balance: number, themeColor: string): string => {
  if (balance < 0) return 'var(--color-error)';
  if (balance < 100 && balance > 0) return 'var(--color-warning)';
  return themeColor;
};

/**
 * 检查余额是否需要警告
 * @param balance 余额数值
 * @returns 是否需要显示警告图标
 */
export const shouldShowBalanceWarning = (balance: number): boolean => {
  return balance < 100 && balance > 0;
};

/**
 * 获取顶级分类列表
 * @param categories 所有分类
 * @param type 交易类型（expense/income）
 * @returns 顶级分类列表
 */
export const getTopCategories = (
  categories: any[],
  type: 'expense' | 'income'
): any[] => {
  return categories.filter((c: any) => !c.parentId && c.type === type);
};

/**
 * 获取子分类列表
 * @param categories 所有分类
 * @param parentId 父分类ID
 * @returns 子分类列表
 */
export const getSubCategories = (
  categories: any[],
  parentId: number
): any[] => {
  const parent = categories.find((c: any) => c.id === parentId);
  return parent?.subcategories || [];
};

/**
 * 获取用户有账户的所有货币
 * @param accounts 账户列表
 * @returns 用户拥有的货币列表
 */
export const getUserCurrencies = (accounts: any[]): any[] => {
  const currencySet = new Set<string>();
  accounts.forEach(account => {
    account.balances?.forEach((balance: any) => {
      currencySet.add(balance.currency);
    });
  });

  return CURRENCIES.filter((c: any) => currencySet.has(c.code));
};

/**
 * 获取所有有指定货币的账户
 * @param accounts 账户列表
 * @param currency 货币代码
 * @returns 拥有该货币的账户列表
 */
export const getAllAccountsWithCurrency = (
  accounts: any[],
  currency: string
): any[] => {
  return accounts.filter(account =>
    account.balances?.some((b: any) => b.currency === currency)
  );
};

/**
 * 获取首选账户（优先使用最近使用的账户）
 * @param accounts 所有账户
 * @param currency 货币代码
 * @returns 首选账户或null
 */
export const getPreferredAccount = (
  accounts: any[],
  currency: string
): any | null => {
  // 筛选有选中货币余额的账户
  const accountsWithCurrency = accounts.filter(account =>
    account.balances?.some((b: any) => b.currency === currency)
  );

  if (accountsWithCurrency.length === 0) return null;

  // 优先选择上一次使用的账户（从localStorage获取）
  const lastAccountId = localStorage.getItem('lastUsedAccountId');
  const lastAccount = lastAccountId
    ? accountsWithCurrency.find((a: any) => a.id === parseInt(lastAccountId))
    : null;

  return lastAccount || accountsWithCurrency[0] || null;
};

/**
 * 数字键盘处理
 * @param currentValue 当前值
 * @param key 按下的键
 * @returns 新值
 */
export const handleKeypadInput = (currentValue: string, key: string): string => {
  if (key === '←') {
    return currentValue.length > 1 ? currentValue.slice(0, -1) : '0';
  }

  if (key === '.') {
    return currentValue.includes('.') ? currentValue : currentValue + '.';
  }

  // 处理数字
  if (currentValue === '0' && key !== '.') {
    return key;
  }

  // 限制小数点后最多2位
  if (currentValue.includes('.')) {
    const decimalPart = currentValue.split('.')[1];
    if (decimalPart && decimalPart.length >= 2) {
      return currentValue;
    }
  }

  return currentValue + key;
};

/**
 * 合并日期和时间
 * @param date 日期
 * @param time 时间字符串（HH:mm）
 * @returns 合并后的日期对象
 */
export const mergeDateTime = (date: dayjs.Dayjs, time: string): dayjs.Dayjs => {
  if (!time) return date;

  const [hours, minutes] = time.split(':');
  return date.hour(parseInt(hours)).minute(parseInt(minutes));
};

/**
 * 判断是否为低余额
 * @param balance 余额
 * @param threshold 阈值（默认100）
 * @returns 是否为低余额
 */
export const isLowBalance = (balance: number, threshold: number = 100): boolean => {
  return balance > 0 && balance < threshold;
};

/**
 * 判断是否为负余额
 * @param balance 余额
 * @returns 是否为负余额
 */
export const isNegativeBalance = (balance: number): boolean => {
  return balance < 0;
};
