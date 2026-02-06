import type { Currency, CurrencyInfo } from '../types';

/**
 * 支持的货币列表
 */
export const CURRENCIES: CurrencyInfo[] = [
  { code: 'CNY', symbol: '¥', name: '人民币', flag: '🇨🇳' },
  { code: 'HKD', symbol: 'HK$', name: '港币', flag: '🇭🇰' },
  { code: 'USD', symbol: '$', name: '美元', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: '欧元', flag: '🇪🇺' },
  { code: 'MOP', symbol: 'MOP$', name: '澳门元', flag: '🇲🇴' },
];

/**
 * 根据货币代码获取货币信息
 */
export const getCurrencyInfo = (currency: Currency): CurrencyInfo => {
  return CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
};

/**
 * 格式化货币金额
 */
export const formatCurrency = (amount: number, currency: Currency = 'CNY'): string => {
  const info = getCurrencyInfo(currency);
  return `${info.symbol}${amount.toFixed(2)}`;
};

/**
 * 获取货币符号
 */
export const getCurrencySymbol = (currency: Currency): string => {
  return getCurrencyInfo(currency).symbol;
};

/**
 * 获取货币名称
 */
export const getCurrencyName = (currency: Currency): string => {
  return getCurrencyInfo(currency).name;
};

/**
 * 获取货币旗帜
 */
export const getCurrencyFlag = (currency: Currency): string => {
  return getCurrencyInfo(currency).flag;
};
