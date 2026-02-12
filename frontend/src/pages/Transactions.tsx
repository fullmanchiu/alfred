import { useState, useEffect } from 'react';
import {
  Button,
  message,
  Modal,
  Form,
  Input,
  DatePicker,
  TimePicker,
  Popover,
  Tag,
  Dropdown,
  Pagination,
} from 'antd';
import { PlusOutlined, DownCircleOutlined, UpCircleOutlined, MoreOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { Transaction, Category, Account } from '@/types';
import dayjs from 'dayjs';
import { getCurrencyInfo, CURRENCIES } from '@/utils/currency';
import { IconDisplay } from '@/components/IconDisplay';
import { CompactDropdownArrow } from '@/components/CompactDropdownArrow';
import { CategoryFormModal } from '@/components/CategoryFormModal';
import { useIconHelpers } from '@/hooks/useIconHelpers';
import { useTransactions, useCategories, useAccounts, useCreateCategory, useCreateTransaction, useUpdateTransaction, useDeleteTransaction } from '@/queries';


// ==================== 记账弹窗组件 ====================
interface TransactionModalProps {
  visible: boolean;
  editingRecord: Transaction | null;
  categories: Category[];
  accounts: Account[];
  onCancel: () => void;
  onOk: (values: any) => Promise<void>;
  onCategoryCreated?: (categoryId: number) => void;
  newCategoryId?: number | null;
}

function TransactionModal({ visible, editingRecord, categories, accounts, onCancel, onOk, onCategoryCreated, newCategoryId }: TransactionModalProps) {
  const { t } = useTranslation();
  const { hasValidIcon } = useIconHelpers();
  const [form] = Form.useForm();
  const createCategory = useCreateCategory();

  // 快速创建分类相关状态
  const [addCategoryModalVisible, setAddCategoryModalVisible] = useState(false);
  const [addCategoryParentId, setAddCategoryParentId] = useState<number | null>(null);
  const [subcategoryPopoverOpen, setSubcategoryPopoverOpen] = useState<number | null>(null);

  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('0');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<number | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('CNY');
  const [transactionDate, setTransactionDate] = useState<dayjs.Dayjs>(dayjs());
  const [transactionTime, setTransactionTime] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [currencySelectorOpen, setCurrencySelectorOpen] = useState(false);
  const [accountSelectorOpen, setAccountSelectorOpen] = useState(false);

  // 日期格式化：今天/昨天/前天/具体日期
  const formatDateDisplay = (date: dayjs.Dayjs | undefined) => {
    if (!date) return '今天';
    const today = dayjs().startOf('day');
    const targetDate = date.startOf('day');
    const diffDays = today.diff(targetDate, 'day');

    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays === 2) return '前天';
    return date.format('MM-DD');
  };

  // 重置表单
  useEffect(() => {
    if (visible) {
      if (editingRecord) {
        // 根据交易类型获取对应的账户ID
        const accountId = editingRecord.type === 'expense'
          ? editingRecord.fromAccountId
          : editingRecord.toAccountId;
        const account = accounts.find(a => a.id === accountId);
        setTransactionType(editingRecord.type as 'expense' | 'income');
        const amountStr = editingRecord.amount.toString();
        setAmount(amountStr);
        setCalculator({ currentValue: amountStr, previousValue: null, operator: null, display: '' });
        setSelectedCategory(editingRecord.categoryId ?? null);
        setSelectedAccount(account || null);
        setSelectedCurrency(account?.balances[0]?.currency || 'CNY');
        const date = dayjs(editingRecord.transactionDate);
        setTransactionDate(date);
        setTransactionTime(date.format('HH:mm'));
        form.setFieldsValue({
          ...editingRecord,
          transactionDate: date,
        });
      } else {
        // 优先选择上一次使用的账户（从localStorage获取），否则选择第一个账户
        const lastAccountId = localStorage.getItem('lastUsedAccountId');
        const lastAccount = lastAccountId ? accounts.find(a => a.id === parseInt(lastAccountId)) : null;
        const defaultAccount = lastAccount || accounts[0] || null;

        setTransactionType('expense');
        setAmount('0');
        setCalculator({ currentValue: '0', previousValue: null, operator: null, display: '' });
        setSelectedCategory(null);
        setSelectedSubCategory(null);
        setSelectedAccount(defaultAccount);
        setSelectedCurrency(defaultAccount?.balances[0]?.currency || 'CNY');
        const today = dayjs();
        setTransactionDate(today);
        setTransactionTime(today.format('HH:mm'));
        form.setFieldsValue({
          type: 'expense',
          transactionDate: today,
        });
      }
    }
  }, [visible, editingRecord, accounts]);

  // 计算器状态
  const [calculator, setCalculator] = useState({
    currentValue: '0',
    previousValue: null as string | null,
    operator: null as string | null,
    display: '' as string
  });

  // 键盘按键视觉反馈状态
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  // 计算器键盘处理
  const handleKeyPress = (key: string) => {
    setCalculator(prev => {
      let newValue = { ...prev };

      if (key === '←') {
        // 回退
        if (prev.currentValue.length > 1) {
          newValue.currentValue = prev.currentValue.slice(0, -1);
        } else {
          newValue.currentValue = '0';
        }
      }
      else if (key === '.') {
        // 小数点
        if (!prev.currentValue.includes('.')) {
          newValue.currentValue = prev.currentValue + '.';
        }
      }
      else if (/^[0-9]$/.test(key)) {
        // 数字
        if (prev.currentValue === '0' || prev.currentValue === '') {
          newValue.currentValue = key;
        } else {
          newValue.currentValue = prev.currentValue + key;
        }
      }
      else if (key === '+' || key === '-') {
        // 加减运算符
        if (!prev.operator && !prev.previousValue) {
          // 第一次运算符
          newValue.previousValue = prev.currentValue;
          newValue.operator = key;
          newValue.currentValue = '';
        } else if (prev.operator && prev.previousValue && prev.currentValue !== '') {
          // 执行计算
          const result = calculate(parseFloat(prev.previousValue), parseFloat(prev.currentValue), prev.operator);
          newValue.previousValue = String(result);
          newValue.operator = key;
          newValue.currentValue = '';
        } else if (prev.operator && !prev.previousValue) {
          // 连续运算符，替换
          newValue.operator = key;
        } else if (prev.operator && prev.previousValue && prev.currentValue === '') {
          // 运算符后立即按运算符，替换
          newValue.operator = key;
        }
      }
      else if (key === '=') {
        // 等号，执行计算
        if (prev.operator && prev.previousValue && prev.currentValue !== '') {
          const result = calculate(parseFloat(prev.previousValue), parseFloat(prev.currentValue), prev.operator);
          newValue.currentValue = String(result);
          newValue.previousValue = null;
          newValue.operator = null;
        }
      }

      // 更新显示
      if (newValue.previousValue && newValue.operator) {
        if (newValue.currentValue === '') {
          newValue.display = `${newValue.previousValue} ${newValue.operator}`;
        } else {
          newValue.display = `${newValue.previousValue} ${newValue.operator} ${newValue.currentValue}`;
        }
      } else {
        newValue.display = '';
      }

      return newValue;
    });
  };

  // 计算函数
  const calculate = (a: number, b: number, operator: string): number => {
    switch (operator) {
      case '+': return a + b;
      case '-': return a - b;
      default: return b;
    }
  };

  // 按钮样式生成函数（支持键盘反馈）
  const getButtonStyle = (buttonKey: string, customStyle?: React.CSSProperties): React.CSSProperties => {
    return {
      ...customStyle,
      transform: pressedKey === buttonKey ? 'scale(0.95)' : 'scale(1)',
    };
  };

  // 更新金额
  useEffect(() => {
    // 计算最终值用于保存
    let finalAmount = calculator.currentValue;
    if (calculator.operator && calculator.previousValue) {
      const result = calculate(parseFloat(calculator.previousValue), parseFloat(calculator.currentValue), calculator.operator);
      finalAmount = String(result);
    }
    setAmount(finalAmount);
  }, [calculator.currentValue, calculator.operator, calculator.previousValue]);


  // 键盘事件监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!visible) return;

      // 如果添加分类弹窗打开，不处理计算器按键
      if (!document.querySelector('.ant-modal:has(.category-form-modal)')?.classList.contains('hidden') === false) {
        const addCategoryModal = document.querySelector('.category-form-modal');
        if (addCategoryModal && addCategoryModal.closest('.ant-modal-open')) return;
      }

      // 检查当前聚焦的元素是否是输入框、文本域等可编辑元素
      const activeElement = document.activeElement;
      const isEditableElement = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).isContentEditable
      );

      // 如果聚焦的是可编辑元素，不处理计算器按键
      if (isEditableElement) return;

      const code = e.code;
      const key = e.key;
      const shiftKey = e.shiftKey;

      // 数字键（区分大键盘和小键盘）
      if (/^Digit[0-9]$/.test(code) || /^Numpad[0-9]$/.test(code)) {
        e.preventDefault();
        setPressedKey(e.key);
        handleKeyPress(e.key); // 使用key因为数字值一样
      }
      // 小数点
      else if (code === 'Period' || code === 'NumpadDecimal') {
        e.preventDefault();
        setPressedKey('.');
        handleKeyPress('.');
      }
      // 退格键
      else if (code === 'Backspace' || code === 'Delete') {
        e.preventDefault();
        setPressedKey('←');
        handleKeyPress('←');
      }
      // 加号 - 大键盘 Shift+=（显示+）或小键盘 +
      else if ((code === 'Equal' && shiftKey && key === '+') || code === 'NumpadAdd') {
        e.preventDefault();
        setPressedKey('+');
        handleKeyPress('+');
      }
      // 减号 - 大键盘 -（显示-）或小键盘 -
      else if ((code === 'Minus' && key === '-') || code === 'NumpadSubtract') {
        e.preventDefault();
        setPressedKey('-');
        handleKeyPress('-');
      }
      // 等号 - 大键盘 =（不按Shift，显示=）
      else if (code === 'Equal' && !shiftKey) {
        e.preventDefault();
        setPressedKey('=');
        handleKeyPress('=');
      }
    };

    const handleKeyUp = (_e: KeyboardEvent) => {
      setPressedKey(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [visible]);


  // 获取顶级分类
  const getTopCategories = () => {
    return categories.filter(c => !c.parentId && c.type === transactionType);
  };

  // 获取子分类
  const getSubCategories = (parentId: number) => {
    const parent = categories.find(c => c.id === parentId);
    return parent?.subcategories || [];
  };

  // 提交处理
  const handleSubmit = async () => {
    try {
      // 验证必填字段
      if (!selectedSubCategory && !selectedCategory) {
        message.error('请选择分类');
        return;
      }
      if (!selectedAccount?.id) {
        message.error('请选择账户');
        return;
      }
      if (amount === '0' || amount === '' || parseFloat(amount) <= 0) {
        message.error('请输入金额');
        return;
      }

      const values = await form.validateFields();
      // 保存最后使用的账户ID
      if (selectedAccount?.id) {
        localStorage.setItem('lastUsedAccountId', selectedAccount.id.toString());
      }
      // 合并日期和时间
      let transactionDate = values.transactionDate;
      if (transactionTime) {
        const [hours, minutes] = transactionTime.split(':');
        transactionDate = transactionDate.hour(parseInt(hours)).minute(parseInt(minutes));
      }

      // 根据交易类型使用不同的账户字段
      const transactionData: any = {
        ...values,
        // 使用本地时间格式，不使用toISOString()避免UTC转换问题
        transactionDate: transactionDate.format('YYYY-MM-DDTHH:mm:ss'),
        type: transactionType,
        amount: parseFloat(amount),
        categoryId: selectedSubCategory || selectedCategory,
        currency: selectedCurrency,
      };

      // 支出使用 fromAccountId，收入使用 toAccountId
      if (transactionType === 'expense') {
        transactionData.fromAccountId = selectedAccount?.id;
      } else {
        transactionData.toAccountId = selectedAccount?.id;
      }

      await onOk(transactionData);
    } catch (error) {
      console.error('提交失败:', error);
      message.error('操作失败');
    }
  };

  // 获取最匹配的账户 - 优先显示匹配货币的最近使用的账户
  const getPreferredAccount = () => {
    // 筛选有选中货币余额的账户
    const accountsWithCurrency = accounts.filter(account =>
      account.balances.some(b => b.currency === selectedCurrency)
    );

    if (accountsWithCurrency.length === 0) return null;

    // 优先选择上一次使用的账户（从localStorage获取）
    const lastAccountId = localStorage.getItem('lastUsedAccountId');
    const lastAccount = lastAccountId
      ? accountsWithCurrency.find(a => a.id === parseInt(lastAccountId))
      : null;

    return lastAccount || accountsWithCurrency[0] || null;
  };

  const currencyInfo = getCurrencyInfo(selectedCurrency as any);
  const themeColor = transactionType === 'expense' ? 'var(--color-error)' :
                    transactionType === 'income' ? 'var(--color-success)' : 'var(--color-primary)';

  const preferredAccount = getPreferredAccount();

  // 获取用户有账户的所有货币
  const getUserCurrencies = () => {
    const currencySet = new Set<string>();
    accounts.forEach(account => {
      account.balances.forEach(balance => {
        currencySet.add(balance.currency);
      });
    });
    return CURRENCIES.filter(c => currencySet.has(c.code));
  };

  // 获取账户在选中货币下的余额
  const getAccountBalance = (account: Account) => {
    const balance = account.balances.find(b => b.currency === selectedCurrency);
    return balance ? balance : null;
  };

  // 获取所有有选中货币的账户（用于Popover列表）
  const getAllAccountsWithCurrency = () => {
    return accounts.filter(account =>
      account.balances.some(b => b.currency === selectedCurrency)
    );
  };

  // 当选择的货币改变时，更新账户
  useEffect(() => {
    if (preferredAccount) {
      setSelectedAccount(preferredAccount);
    }
  }, [selectedCurrency, accounts]);

  // 当新分类创建后，自动选中该分类
  useEffect(() => {
    if (newCategoryId) {
      setSelectedCategory(newCategoryId);
      setSelectedSubCategory(null);
    }
  }, [newCategoryId]);

  return (
    <Modal
      wrapClassName="transaction-modal-no-focus"
      title={
        <div style={{ position: 'relative', width: '100%', height: '2rem' }}>
          {/* 左边：标题 */}
          <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', fontWeight: 500 }}>记一笔</span>

          {/* 中间：支出/收入切换（绝对居中） */}
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', gap: '0.3rem' }}>
            <Button
              type={transactionType === 'expense' ? 'primary' : 'default'}
              onClick={() => setTransactionType('expense')}
              size="small"
              icon={<DownCircleOutlined />}
              tabIndex={-1}
            >
              支出
            </Button>
            <Button
              type={transactionType === 'income' ? 'primary' : 'default'}
              onClick={() => setTransactionType('income')}
              size="small"
              icon={<UpCircleOutlined />}
              tabIndex={-1}
            >
              收入
            </Button>
          </div>

          {/* 右边：日期时间 */}
          <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
            {/* 日期选择器 */}
            <DatePicker
              value={transactionDate}
              onChange={(date) => {
                const newDate = date || dayjs();
                setTransactionDate(newDate);
                form.setFieldValue('transactionDate', newDate);
              }}
              open={datePickerOpen}
              onOpenChange={setDatePickerOpen}
              showToday={false}
              getPopupContainer={() => document.body}
              style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', width: 0, height: 0 }}
            />
            <span
              onClick={() => setDatePickerOpen(true)}
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0,
                padding: 0,
                lineHeight: 1
              }}
            >
              {formatDateDisplay(transactionDate)}
              <CompactDropdownArrow style={{ marginLeft: 'var(--icon-button-gap)' }} />
            </span>

            {/* 时间选择器 */}
            <TimePicker
              value={transactionTime ? dayjs(transactionTime, 'HH:mm') : null}
              onChange={(time) => setTransactionTime(time ? time.format('HH:mm') : '')}
              format="HH:mm"
              open={timePickerOpen}
              onOpenChange={setTimePickerOpen}
              showNow={false}
              needConfirm={false}
              getPopupContainer={() => document.body}
              style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', width: 0, height: 0 }}
            />
            <span
              onClick={() => setTimePickerOpen(true)}
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0,
                padding: 0,
                marginLeft: 0,
                lineHeight: 1
              }}
            >
              {transactionTime || '00:00'}
              <CompactDropdownArrow style={{ marginLeft: 'var(--icon-button-gap)' }} />
            </span>
          </div>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width="90vw"
      style={{ maxWidth: '28rem', top: '1.25rem' }}
      footer={null}
      closable={false}
      maskClosable={true}
      destroyOnHidden={false}
      focusable={{ focusTriggerAfterClose: false }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', userSelect: 'none' }}>
        {/* 金额输入框 + 货币选择器 */}
        <div style={{ display: 'flex', alignItems: 'stretch', height: '3.5rem', background: '#fff', border: `0.0625rem solid ${themeColor}`, borderRadius: '0.375rem' }}>
          {/* 货币选择器 */}
          <Popover
            content={
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {getUserCurrencies().map((curr) => (
                  <div
                    key={curr.code}
                    onClick={() => {
                      setSelectedCurrency(curr.code);
                      setCurrencySelectorOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem',
                      cursor: 'pointer',
                      borderRadius: '0.25rem',
                      background: selectedCurrency === curr.code ? 'var(--color-primary-bg)' : 'transparent',
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{curr.flag}</span>
                    <span style={{ fontSize: '0.875rem' }}>{curr.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{curr.code}</span>
                  </div>
                ))}
              </div>
            }
            trigger="click"
            placement="bottomLeft"
            open={currencySelectorOpen}
            onOpenChange={setCurrencySelectorOpen}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0 0.75rem',
                cursor: 'pointer',
                borderRight: '0.0625rem solid var(--color-border)',
                background: 'var(--color-bg-secondary)',
                minWidth: '5rem',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '1rem' }}>{currencyInfo.flag}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{currencyInfo.code}</span>
              <CompactDropdownArrow />
            </div>
          </Popover>

          {/* 金额输入 */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.2rem',
              fontWeight: 700,
              background: transactionType === 'expense'
                ? 'linear-gradient(135deg, rgba(255, 77, 79, 0.05) 0%, rgba(255, 77, 79, 0.02) 100%)'
                : 'linear-gradient(135deg, rgba(82, 196, 26, 0.05) 0%, rgba(82, 196, 26, 0.02) 100%)',
              color: themeColor,
              cursor: 'default',
            }}
          >
            {calculator.display ? calculator.display : currencyInfo.symbol + calculator.currentValue}
          </div>
        </div>


        {/* 一级分类 - 网格布局，自动换行 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem' }}>
          {getTopCategories().map((category) => {
            // 只要选中了这个一级分类（无论是否有子分类被选中），就显示选中状态
            const isActive = selectedCategory === category.id;
            const subCategories = getSubCategories(category.id);
            const hasSubCategories = subCategories.length > 0;
            const color = category.color;

            // 有子分类的，需要添加箭头和Popover
            if (hasSubCategories) {
              return (
                <div key={category.id} style={{ position: 'relative', display: 'inline-block' }}>
                  {/* 分类卡片 */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.15rem',
                      cursor: 'pointer',
                      padding: '0.3rem',
                      height: '3.5rem',
                      borderRadius: 'var(--radius-sm)',
                      background: isActive
                        ? `linear-gradient(135deg, ${color}30 0%, ${color}20 100%)`
                        : 'transparent',
                      boxShadow: isActive
                        ? `0 0 12px ${color}40, inset 0 0 12px ${color}10`
                        : 'none',
                      transition: 'all 0.2s',
                      transform: isActive ? 'scale(1.05)' : 'scale(1)',
                    }}
                    onClick={() => {
                      // 点击一级分类时，只选中一级分类，不展开子分类
                      setSelectedCategory(category.id);
                      setSelectedSubCategory(null);
                    }}
                  >
                    {/* Icon + 箭头 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '100%' }}>
                      <IconDisplay
                        icon={category.icon}
                        size="xxl"
                        color={color}
                        style={{ lineHeight: 1 }}
                      />
                      {/* 箭头 - 单独触发Popover */}
                      <Popover
                        content={
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', padding: '0.5rem' }}>
                            {subCategories.map((sub) => {
                              const isSelected = selectedSubCategory === sub.id;
                              return (
                                <div
                                  key={sub.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCategory(category.id);
                                    setSelectedSubCategory(sub.id);
                                    setSubcategoryPopoverOpen(null); // 关闭Popover
                                  }}
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.15rem',
                                    cursor: 'pointer',
                                    padding: '0.3rem',
                                    height: '3.5rem',
                                    borderRadius: 'var(--radius-sm)',
                                    background: isSelected
                                      ? `linear-gradient(135deg, ${color}30 0%, ${color}20 100%)`
                                      : 'transparent',
                                    boxShadow: isSelected
                                      ? `0 0 12px ${color}40, inset 0 0 12px ${color}10`
                                      : 'none',
                                    transition: 'all 0.2s',
                                  }}
                                >
                                  <IconDisplay
                                    icon={sub.icon}
                                    size="2.2rem"
                                    color={color}
                                    style={{ lineHeight: 1 }}
                                  />
                                  <span style={{ fontSize: '0.65rem', color: 'var(--color-text-primary)', textAlign: 'center', fontWeight: isSelected ? 600 : 400, lineHeight: 1.2 }}>
                                    {sub.name}
                                  </span>
                                </div>
                              );
                            })}
                            {/* 添加二级分类按钮 */}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setAddCategoryModalVisible(true);
                                setAddCategoryParentId(category.id);
                                setSubcategoryPopoverOpen(null); // 关闭Popover
                              }}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.15rem',
                                cursor: 'pointer',
                                padding: '0.3rem',
                                height: '3.5rem',
                                borderRadius: 'var(--radius-sm)',
                                border: `0.125rem dashed ${themeColor}40`,
                                background: `${themeColor}08`,
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = `${themeColor}15`;
                                e.currentTarget.style.borderColor = `${themeColor}60`;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = `${themeColor}08`;
                                e.currentTarget.style.borderColor = `${themeColor}40`;
                              }}
                            >
                              <PlusOutlined style={{ fontSize: '1.6rem', color: themeColor }} />
                              <span style={{ fontSize: '0.65rem', color: themeColor, fontWeight: 500 }}>添加</span>
                            </div>
                          </div>
                        }
                        trigger="click"
                        placement="bottomLeft"
                        open={subcategoryPopoverOpen === category.id}
                        onOpenChange={(open) => {
                          if (open) {
                            setSubcategoryPopoverOpen(category.id);
                          } else {
                            setSubcategoryPopoverOpen(null);
                          }
                        }}
                      >
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          style={{ marginLeft: '0', cursor: 'pointer', position: 'absolute', right: '0', zIndex: 1 }}
                        >
                          <CompactDropdownArrow />
                        </div>
                      </Popover>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-primary)', textAlign: 'center', fontWeight: isActive ? 600 : 400, lineHeight: 1.2 }}>
                      {category.name}
                    </span>
                  </div>
                </div>
              );
            }

            // 没有子分类的普通分类
            return (
              <div
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setSelectedSubCategory(null);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.15rem',
                  cursor: 'pointer',
                  padding: '0.3rem',
                  height: '3.5rem',
                  borderRadius: 'var(--radius-sm)',
                  background: isActive
                    ? `linear-gradient(135deg, ${color}30 0%, ${color}20 100%)`
                    : 'transparent',
                  boxShadow: isActive
                    ? `0 0 12px ${color}40, inset 0 0 12px ${color}10`
                    : 'none',
                  transition: 'all 0.2s',
                  transform: isActive ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                {/* Icon */}
                <IconDisplay
                  icon={category.icon}
                  size="xxl"
                  color={color}
                  style={{ lineHeight: 1 }}
                />
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-primary)', textAlign: 'center', fontWeight: isActive ? 600 : 400, lineHeight: 1.2 }}>
                  {category.name}
                </span>
              </div>
            );
          })}

          {/* 快速添加分类按钮 */}
          <div
            onClick={() => setAddCategoryModalVisible(true)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.2rem',
              cursor: 'pointer',
              padding: '0.5rem',
              minWidth: '3.5rem',
              minHeight: '3.5rem',
              borderRadius: 'var(--radius-sm)',
              border: `0.125rem dashed ${themeColor}40`,
              background: `${themeColor}08`,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${themeColor}15`;
              e.currentTarget.style.borderColor = `${themeColor}60`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `${themeColor}08`;
              e.currentTarget.style.borderColor = `${themeColor}40`;
            }}
          >
            <PlusOutlined style={{ fontSize: '1.5rem', color: themeColor }} />
            <span style={{ fontSize: '0.65rem', color: themeColor, fontWeight: 500 }}>添加</span>
          </div>
        </div>

        {/* 账户选择 - 单行完整显示，点击弹出选择 */}
        {preferredAccount && (() => {
          const account = preferredAccount;
          const balance = getAccountBalance(account);
          const allAccounts = getAllAccountsWithCurrency();

          return (
            <Popover
              content={
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxWidth: '20rem' }}>
                  {allAccounts.map((acc) => {
                    const accBalance = getAccountBalance(acc);
                    const isSelected = selectedAccount?.id === acc.id;
                    return (
                      <div
                        key={acc.id}
                        onClick={() => {
                          setSelectedAccount(acc);
                          setAccountSelectorOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          padding: '0.5rem',
                          borderRadius: '0.375rem',
                          border: `0.0625rem solid ${isSelected ? themeColor : 'var(--color-border)'}`,
                          background: isSelected ? `${themeColor}10` : 'var(--color-bg-container)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {/* 左侧：图标 + 名称 + 类型 + 机构 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', minWidth: 0, flex: 1 }}>
                          {hasValidIcon(acc.icon) && (
                            <IconDisplay
                              icon={acc.icon}
                              size="1rem"
                            />
                          )}
                          <span style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{acc.name}</span>
                          <span style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            · {t(`accounts.accountTypes.${acc.accountType}`, acc.accountType)}
                          </span>
                          {acc.institutionName && (
                            <span style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              · {acc.institutionName}
                            </span>
                          )}
                        </div>

                        {/* 右侧：余额 */}
                        {accBalance && (
                          <span style={{
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            color: accBalance.balance < 0
                              ? 'var(--color-error)'
                              : (accBalance.balance < 100 && accBalance.balance > 0)
                                ? 'var(--color-warning)'
                                : themeColor
                          }}>
                            {accBalance.currencySymbol} {accBalance.balance.toFixed(2)}
                            {accBalance.balance < 100 && accBalance.balance > 0 && (
                              <span style={{ fontSize: '0.7rem', marginLeft: '0.2rem' }}>⚠️</span>
                            )}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              }
              trigger="click"
              placement="topLeft"
              open={accountSelectorOpen}
              onOpenChange={setAccountSelectorOpen}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  border: '0.0625rem solid var(--color-border)',
                  background: 'var(--color-bg-container)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {/* 左侧：图标 + 名称 + 类型 + 机构 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', minWidth: 0, flex: 1 }}>
                  {hasValidIcon(account.icon) && (
                    <IconDisplay
                      icon={account.icon}
                      size="1rem"
                    />
                  )}
                  <span style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{account.name}</span>
                  <span style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    · {t(`accounts.accountTypes.${account.accountType}`, account.accountType)}
                  </span>
                  {account.institutionName && (
                    <span style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      · {account.institutionName}
                    </span>
                  )}
                </div>

                {/* 右侧：余额 + 下拉箭头 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--icon-button-gap)' }}>
                  {balance && (
                    <span style={{
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      color: balance.balance < 0
                        ? 'var(--color-error)'
                        : (balance.balance < 100 && balance.balance > 0)
                          ? 'var(--color-warning)'
                          : themeColor
                    }}>
                      {balance.currencySymbol} {balance.balance.toFixed(2)}
                      {balance.balance < 100 && balance.balance > 0 && (
                        <span style={{ fontSize: '0.7rem', marginLeft: '0.2rem' }}>⚠️</span>
                      )}
                    </span>
                  )}
                  {allAccounts.length > 1 && (
                    <CompactDropdownArrow />
                  )}
                </div>
              </div>
            </Popover>
          );
        })()}

        {/* 数字键盘 - 左边数字，右边操作按钮 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
          {/* Row 1: 7, 8, 9, ← */}
          <Button size="large" tabIndex={-1} style={getButtonStyle('7', { height: '2.5rem', fontWeight: 600, transition: 'all 0.1s' })}
            onClick={() => handleKeyPress('7')}>7</Button>
          <Button size="large" tabIndex={-1} style={getButtonStyle('8', { height: '2.5rem', fontWeight: 600, transition: 'all 0.1s' })}
            onClick={() => handleKeyPress('8')}>8</Button>
          <Button size="large" tabIndex={-1} style={getButtonStyle('9', { height: '2.5rem', fontWeight: 600, transition: 'all 0.1s' })}
            onClick={() => handleKeyPress('9')}>9</Button>
          <Button size="large" tabIndex={-1} style={getButtonStyle('←', { height: '2.5rem', fontWeight: 600, background: '#8c8c8c', borderColor: '#8c8c8c', color: '#fff', transition: 'all 0.1s' })}
            onClick={() => handleKeyPress('←')}>←</Button>

          {/* Row 2: 4, 5, 6, - */}
          <Button size="large" tabIndex={-1} style={getButtonStyle('4', { height: '2.5rem', fontWeight: 600, transition: 'all 0.1s' })}
            onClick={() => handleKeyPress('4')}>4</Button>
          <Button size="large" tabIndex={-1} style={getButtonStyle('5', { height: '2.5rem', fontWeight: 600, transition: 'all 0.1s' })}
            onClick={() => handleKeyPress('5')}>5</Button>
          <Button size="large" tabIndex={-1} style={getButtonStyle('6', { height: '2.5rem', fontWeight: 600, transition: 'all 0.1s' })}
            onClick={() => handleKeyPress('6')}>6</Button>
          <Button size="large" tabIndex={-1} style={getButtonStyle('-', { height: '2.5rem', fontWeight: 600, background: '#faad14', borderColor: '#faad14', color: '#fff', transition: 'all 0.1s' })}
            onClick={() => handleKeyPress('-')}>−</Button>

          {/* Row 3: 1, 2, 3, + */}
          <Button size="large" tabIndex={-1} style={getButtonStyle('1', { height: '2.5rem', fontWeight: 600, transition: 'all 0.1s' })}
            onClick={() => handleKeyPress('1')}>1</Button>
          <Button size="large" tabIndex={-1} style={getButtonStyle('2', { height: '2.5rem', fontWeight: 600, transition: 'all 0.1s' })}
            onClick={() => handleKeyPress('2')}>2</Button>
          <Button size="large" tabIndex={-1} style={getButtonStyle('3', { height: '2.5rem', fontWeight: 600, transition: 'all 0.1s' })}
            onClick={() => handleKeyPress('3')}>3</Button>
          <Button size="large" tabIndex={-1} style={getButtonStyle('+', { height: '2.5rem', fontWeight: 600, background: '#52c41a', borderColor: '#52c41a', color: '#fff', transition: 'all 0.1s' })}
            onClick={() => handleKeyPress('+')}>+</Button>

          {/* Row 4: 0 (跨2列), ., 保存/= */}
          <div style={{ gridColumn: 'span 2' }}>
            <Button size="large" block tabIndex={-1} style={getButtonStyle('0', { height: '2.5rem', fontWeight: 600, transition: 'all 0.1s' })}
              onClick={() => handleKeyPress('0')}>0</Button>
          </div>
          <Button size="large" tabIndex={-1} style={getButtonStyle('.', { height: '2.5rem', fontWeight: 600, transition: 'all 0.1s' })}
            onClick={() => handleKeyPress('.')}>.</Button>
          <Button
            type={calculator.operator ? 'default' : 'primary'}
            size="large"
            tabIndex={-1}
            style={getButtonStyle(calculator.operator ? '=' : 'save', { height: '2.5rem', fontWeight: 600, background: calculator.operator ? '#1890ff' : undefined, borderColor: calculator.operator ? '#1890ff' : undefined, color: '#fff', transition: 'all 0.1s' })}
            onClick={() => calculator.operator ? handleKeyPress('=') : handleSubmit()}
          >
            {calculator.operator ? '=' : '保存'}
          </Button>
        </div>

        {/* 备注 */}
        <Form form={form} layout="vertical">
          <Form.Item name="transactionDate" style={{ display: 'none' }}>
            <Input />
          </Form.Item>
          <Form.Item name="notes" style={{ marginBottom: 0 }}>
            <Input size="small" placeholder={t('transactions.notesPlaceholder')} />
          </Form.Item>
        </Form>
      </div>

      {/* 快速创建分类Modal */}
      {addCategoryModalVisible && (
        <CategoryFormModal
          visible={addCategoryModalVisible}
          onCancel={() => {
            setAddCategoryModalVisible(false);
            setAddCategoryParentId(null);
          }}
          onOk={async (values) => {
            const categoryData: Partial<Category> = {
              name: values.name,
              type: transactionType,
              icon: values.iconName,
              color: values.color,
              isActive: true,
              parentId: addCategoryParentId || undefined,
            };

            const newCategory = await createCategory.mutateAsync(categoryData as any);
            message.success('分类创建成功');
            setAddCategoryModalVisible(false);
            setAddCategoryParentId(null);

            // 通知父组件刷新分类列表并选中新分类
            if (onCategoryCreated && newCategory?.id) {
              onCategoryCreated(newCategory.id);
            }
          }}
          initialValues={{
            type: transactionType,
            parentId: addCategoryParentId ?? undefined,
          }}
        />
      )}
    </Modal>
  );
}

const Transactions = () => {
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Transaction | null>(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [newCategoryId, setNewCategoryId] = useState<number | null>(null);

  // 使用 React Query 获取数据（带缓存）
  const { data: transactionsData } = useTransactions(pagination.current - 1, pagination.pageSize);
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();

  // 提取 records 和 total
  const records = transactionsData?.content || [];
  const total = transactionsData?.totalElements || 0;

  // 更新 pagination total
  useEffect(() => {
    if (total !== pagination.total) {
      setPagination(prev => ({ ...prev, total }));
    }
  }, [total]);

  // Mutation hooks
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();

  const handleAdd = () => {
    setEditingRecord(null);
    setModalVisible(true);
  };

  const handleEdit = (record: Transaction) => {
    setEditingRecord(record);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: t('transactions.deleteConfirm'),
      content: t('transactions.deleteConfirmContent'),
      onOk: async () => {
        try {
          await deleteTransaction.mutateAsync(id);
          message.success(t('transactions.deleteSuccess'));
        } catch (error) {
          message.error(t('transactions.deleteFailed'));
        }
      },
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      // transactionDate 可能是 dayjs 对象或 ISO 字符串
      // 后端期望本地时间格式 (yyyy-MM-ddTHH:mm:ss)
      let transactionDate = values.transactionDate;
      if (dayjs.isDayjs(transactionDate)) {
        transactionDate = transactionDate.format('YYYY-MM-DDTHH:mm:ss');
      } else if (typeof transactionDate === 'string') {
        // 如果已经是字符串，解析后重新格式化为本地时间
        transactionDate = dayjs(transactionDate).format('YYYY-MM-DDTHH:mm:ss');
      }

      const data = {
        ...values,
        transactionDate,
      };

      if (editingRecord) {
        await updateTransaction.mutateAsync({ id: editingRecord.id, data });
        message.success(t('transactions.updateSuccess'));
      } else {
        await createTransaction.mutateAsync(data);
        message.success(t('transactions.createSuccess'));
      }
      setModalVisible(false);
    } catch (error) {
      console.error('保存交易失败:', error);
      message.error(t('common.operationFailed'));
    }
  };

  // 处理分类创建后的回调
  const handleCategoryCreated = async (categoryId: number) => {
    setNewCategoryId(categoryId);
    // React Query 会自动刷新分类缓存
  };

  const getAccountName = (transaction: Transaction) => {
    // 根据交易类型获取账户名称
    const accountId = transaction.type === 'expense'
      ? transaction.fromAccountId
      : transaction.toAccountId;

    if (!accountId) return t('accounts.unknown');

    const account = accounts.find(a => a.id === accountId);
    return account;
  };

  // 渲染交易列表项
  const renderTransactionItem = (record: Transaction) => {
    const account = getAccountName(record);

    // 操作菜单项
    const menuItems = [
      {
        key: 'edit',
        label: t('common.edit'),
        icon: <span>✏️</span>,
        onClick: () => handleEdit(record),
      },
      {
        key: 'delete',
        label: t('common.delete'),
        danger: true,
        icon: <span>🗑️</span>,
        onClick: () => handleDelete(record.id),
      },
    ];

    return (
      <div
        key={record.id}
        style={{
          position: 'relative',
          background: 'var(--color-bg-container)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 'var(--spacing-sm)',
          border: '0.0625rem solid var(--color-border)',
          transition: 'all 0.2s',
        }}
      >
        {/* 内容层 */}
        <div
          style={{
            padding: 'var(--spacing-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-md)',
          }}
        >
          {/* 图标 */}
          <div style={{ flexShrink: 0 }}>
            <IconDisplay icon={record.displayIcon} size="xxxl" color={record.displayColor} />
          </div>

          {/* 主要内容 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* 交易名称 */}
            <div style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: '0.5rem',
              color: 'var(--color-text-primary)',
            }}>
              {record.displayName}
            </div>

            {/* Tag 区域 */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.25rem',
            }}>
              {typeof account === 'object' && account?.institutionName && (
                <Tag color="blue" style={{ margin: 0 }}>
                  {account.institutionName}
                </Tag>
              )}
              {typeof account === 'object' && account && (
                <Tag color="cyan" style={{ margin: 0 }}>
                  {account.name}
                </Tag>
              )}
              <Tag
                color="default"
                style={{ margin: 0 }}
              >
                {getCurrencyInfo(record.currency as any).flag} {record.currency}
              </Tag>
            </div>
          </div>

          {/* 金额和时间 */}
          <div style={{
            flexShrink: 0,
            textAlign: 'right',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}>
            {/* 金额 */}
            <div style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: record.type === 'income' ? 'var(--color-income)' : 'var(--color-expense)',
              marginBottom: '0.25rem',
            }}>
              {!record.isInflow ? '-' : '+'}{getCurrencyInfo(record.currency as any).symbol}{record.amount.toFixed(2)}
            </div>

            {/* CNY等值（非CNY货币时显示后端计算的值） */}
            {record.currency && record.currency !== 'CNY' && record.cnyAmount && (
              <div style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-tertiary)',
                marginBottom: '0.25rem',
              }}>
                ≈ ¥{record.cnyAmount?.toFixed(2)}
                {record.exchangeRate && (
                  <span style={{ marginLeft: '4px', fontSize: '10px', opacity: 0.7 }}>
                    ({record.exchangeRate.toFixed(4)})
                  </span>
                )}
              </div>
            )}

            {/* 时间 */}
            <div style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-tertiary)',
            }}>
              {dayjs(record.transactionDate).format('MM-DD HH:mm')}
            </div>
          </div>

          {/* 操作菜单按钮 */}
          <Dropdown menu={{ items: menuItems }} trigger={['hover']}>
            <Button
              type="text"
              icon={<MoreOutlined />}
              style={{
                padding: 'var(--spacing-xs)',
                borderRadius: 'var(--radius-md)',
                flexShrink: 0,
                transition: 'all 0.2s',
                fontSize: 'var(--font-size-lg)',
                color: 'var(--color-text-secondary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-layout)';
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            />
          </Dropdown>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 悬浮按钮 */}
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={handleAdd}
        style={{
          position: 'fixed',
          bottom: 'var(--spacing-xxl)',
          right: 'var(--spacing-xxl)',
          borderRadius: 'var(--radius-round)',
          height: '3.5rem',
          width: '3.5rem',
          fontSize: 'var(--font-size-xxl)',
          boxShadow: 'var(--shadow-3)',
          zIndex: 1000,
        }}
      />

      {/* 记账列表 */}
      <div>
        {records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-tertiary)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
            <div style={{ fontSize: 'var(--font-size-lg)', marginBottom: '0.5rem' }}>{t('transactions.noRecords')}</div>
            <div style={{ fontSize: 'var(--font-size-sm)' }}>{t('transactions.noRecordsTip')}</div>
          </div>
        ) : (
          <div>
            {records.map((record: Transaction) => renderTransactionItem(record))}

            {/* 分页 */}
            {pagination.total > pagination.pageSize && (
              <Pagination
                current={pagination.current + 1}
                pageSize={pagination.pageSize}
                total={pagination.total}
                onChange={(page, pageSize) => {
                  setPagination({
                    ...pagination,
                    current: (page || 1) - 1,
                    pageSize: pageSize || 20,
                  });
                }}
                style={{ marginTop: 'var(--spacing-lg)', textAlign: 'center' }}
              />
            )}
          </div>
        )}
      </div>

      {/* 记账弹窗 */}
      <TransactionModal
        visible={modalVisible}
        editingRecord={editingRecord}
        categories={categories}
        accounts={accounts}
        onCancel={() => {
          setModalVisible(false);
          setNewCategoryId(null); // 关闭时清空新分类ID
        }}
        onOk={handleSubmit}
        onCategoryCreated={handleCategoryCreated}
        newCategoryId={newCategoryId}
      />
    </>
  );
};

export default Transactions;
