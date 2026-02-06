import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import type { Transaction, Category, Account } from '@/types';
import {
  formatDateDisplay,
  getPreferredAccount,
  handleKeypadInput,
} from '@/utils/transactionHelpers';
import { CURRENCIES } from '@/utils/currency';

/**
 * 记账表单自定义 Hook
 *
 * 管理记账表单的所有状态和逻辑
 */
export const useTransactionForm = (
  editingRecord: Transaction | null,
  categories: Category[],
  accounts: Account[],
  visible: boolean
) => {
  // 基础状态
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('0');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<number | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('CNY');
  const [transactionTime, setTransactionTime] = useState('');

  // 弹窗控制状态
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [currencySelectorOpen, setCurrencySelectorOpen] = useState(false);
  const [accountSelectorOpen, setAccountSelectorOpen] = useState(false);

  // 初始化表单
  useEffect(() => {
    if (visible) {
      if (editingRecord) {
        // 编辑模式：填充现有数据
        const account = accounts.find(a => a.id === editingRecord.accountId);
        setTransactionType(editingRecord.type as 'expense' | 'income');
        setAmount(editingRecord.amount.toString());
        setSelectedCategory(editingRecord.categoryId ?? null);
        setSelectedAccount(account || null);
        setSelectedCurrency(account?.balances?.[0]?.currency || 'CNY');
        const date = dayjs(editingRecord.transactionDate);
        setTransactionTime(date.format('HH:mm'));
      } else {
        // 新增模式：设置默认值
        const lastAccountId = localStorage.getItem('lastUsedAccountId');
        const lastAccount = lastAccountId ? accounts.find(a => a.id === parseInt(lastAccountId)) : null;
        const defaultAccount = lastAccount || accounts[0] || null;

        setTransactionType('expense');
        setAmount('0');
        setSelectedCategory(null);
        setSelectedSubCategory(null);
        setSelectedAccount(defaultAccount);
        setSelectedCurrency(defaultAccount?.balances?.[0]?.currency || 'CNY');
        setTransactionTime(dayjs().format('HH:mm'));
      }
    }
  }, [visible, editingRecord, accounts]);

  // 当选择的货币改变时，更新账户
  useEffect(() => {
    const preferred = getPreferredAccount(accounts, selectedCurrency);
    if (preferred) {
      setSelectedAccount(preferred);
    }
  }, [selectedCurrency, accounts]);

  // 数字键盘处理
  const handleKeyPress = (key: string) => {
    setAmount(prev => handleKeypadInput(prev, key));
  };

  // 切换交易类型
  const switchTransactionType = (type: 'expense' | 'income') => {
    setTransactionType(type);
    // 切换类型时清空已选分类
    setSelectedCategory(null);
    setSelectedSubCategory(null);
  };

  // 选择分类
  const selectCategory = (categoryId: number) => {
    setSelectedCategory(categoryId);
    setSelectedSubCategory(null);
  };

  // 选择子分类
  const selectSubCategory = (subCategoryId: number) => {
    setSelectedSubCategory(subCategoryId);
  };

  // 获取主题色
  const getThemeColor = (): string => {
    if (transactionType === 'expense') return 'var(--color-error)';
    if (transactionType === 'income') return 'var(--color-success)';
    return 'var(--color-primary)';
  };

  // 获取顶级分类
  const getTopCategories = () => {
    return categories.filter(c => !c.parentId && c.type === transactionType);
  };

  // 获取子分类
  const getSubCategories = (parentId: number) => {
    const parent = categories.find(c => c.id === parentId);
    return parent?.subcategories || [];
  };

  // 获取用户有账户的所有货币
  const getUserCurrencies = () => {
    const currencySet = new Set<string>();
    accounts.forEach(account => {
      account.balances?.forEach((balance: any) => {
        currencySet.add(balance.currency);
      });
    });

    return CURRENCIES.filter((c: any) => currencySet.has(c.code));
  };

  // 获取账户在选中货币下的余额
  const getAccountBalance = (account: Account) => {
    const balance = account.balances.find(b => b.currency === selectedCurrency);
    return balance || null;
  };

  // 获取所有有选中货币的账户
  const getAllAccountsWithCurrency = () => {
    return accounts.filter(account =>
      account.balances.some(b => b.currency === selectedCurrency)
    );
  };

  // 格式化日期显示
  const formatDate = (date: dayjs.Dayjs | undefined) => {
    return formatDateDisplay(date);
  };

  return {
    // 状态
    transactionType,
    amount,
    selectedCategory,
    selectedSubCategory,
    selectedAccount,
    selectedCurrency,
    transactionTime,
    datePickerOpen,
    timePickerOpen,
    currencySelectorOpen,
    accountSelectorOpen,

    // 设置器
    setTransactionType: switchTransactionType,
    setAmount,
    setSelectedCategory,
    setSelectedSubCategory,
    setSelectedAccount,
    setSelectedCurrency,
    setTransactionTime,
    setDatePickerOpen,
    setTimePickerOpen,
    setCurrencySelectorOpen,
    setAccountSelectorOpen,

    // 方法
    handleKeyPress,
    selectCategory,
    selectSubCategory,
    getThemeColor,
    getTopCategories,
    getSubCategories,
    getUserCurrencies,
    getAccountBalance,
    getAllAccountsWithCurrency,
    formatDate,
  };
};
