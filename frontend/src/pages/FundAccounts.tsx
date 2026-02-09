import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Button,
  message,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Card,
  Row,
  Col,
  Spin,
  Alert,
  Checkbox,
  AutoComplete,
  Dropdown,
  App,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowDownOutlined, ArrowUpOutlined, SwapOutlined, MoreOutlined, HistoryOutlined } from '@ant-design/icons';
import { api } from '@/services/api';
import type { Account, AccountHistory, Category } from '@/types';
import { getCurrencyInfo } from '@/utils/currency';
import { Pagination } from 'antd';
import { IconDisplay } from '@/components/IconDisplay';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

// 工具函数：获取账户类型图标
const getAccountIcon = (type: string) => {
  const icons: Record<string, string> = {
    cash: '💰',
    bank: '🏦',
    credit: '💳',
    ewallet: '📱',
  };
  return icons[type] || '💵';
};

// 工具函数：获取账户类型名称
const getAccountTypeName = (type: string) => {
  const typeNames: Record<string, string> = {
    cash: '现金',
    bank: '银行账户',
    credit: '信用卡',
    ewallet: '电子钱包',
  };
  return typeNames[type] || type;
};

// 根据金融机构获取图标
const getInstitutionIcon = (institutionName?: string) => {
  if (!institutionName) return getAccountIcon('cash');

  const institutionMap: Record<string, string> = {
    // 中国大陆银行
    '中国银行': '🏦',
    '招商银行': '🏦',
    '建设银行': '🏦',
    '工商银行': '🏦',
    '农业银行': '🏦',
    '交通银行': '🏦',
    '邮储银行': '🏦',
    // 香港银行
    '中银香港': '🏦',
    '汇丰香港': '🏦',
    '汇丰': '🏦',
    '恒生银行': '🏦',
    '渣打银行香港': '🏦',
    '花旗银行香港': '🏦',
    '星展银行香港': '🏦',
    '众安银行': '🏦',
    // 电子支付
    '支付宝': '💙',
    '微信支付': '💚',
    '云闪付': '💳',
    '京东支付': '🔴',
    'PayPal': '🅿️',
    // 现金
    '现金': '💰',
  };

  return institutionMap[institutionName] || '🏦';
};

// 获取账户显示图标（优先使用金融机构图标）
const getAccountDisplayIcon = (account: Account) => {
  // 如果 icon 字段包含下划线，说明是 Material Icons 名称，需要处理
  if (account.icon && !account.icon.includes('_') && account.icon.length <= 2) {
    return account.icon; // 使用自定义 emoji
  }
  // 否则根据金融机构显示图标
  return getInstitutionIcon(account.institutionName);
};

// ==================== 计算器弹窗组件 ====================
interface CalculatorModalProps {
  account: Account | null;
  initialMode?: 'deposit' | 'withdraw';
}

function CalculatorModal({ account, initialMode = 'deposit' }: CalculatorModalProps) {
  const { message } = App.useApp();
  const [mode, setMode] = useState<'deposit' | 'withdraw'>(initialMode);
  // 默认选中第一个有余额的货币
  const firstCurrencyWithBalance = account?.balances.find(b => b.balance > 0)?.currency || account?.balances[0]?.currency || 'CNY';
  const [selectedCurrency, setSelectedCurrency] = useState(firstCurrencyWithBalance);
  const [inputValue, setInputValue] = useState('0');

  // 调试：追踪组件挂载
  useEffect(() => {
    console.log('[CalculatorModal] 组件挂载或重新挂载', {
      accountId: account?.id,
      accountName: account?.name,
      initialMode,
      selectedCurrency,
    });
  }, []);

  // 使用 ref 来跟踪上一个账户 ID，避免余额更新时重置状态
  const prevAccountIdRef = useRef<number | null>(null);
  // 使用 state 来维护本地的余额数据，避免依赖父组件刷新
  const [localBalances, setLocalBalances] = useState<Map<string, number>>(new Map());

  // 同步账户余额到本地状态
  useEffect(() => {
    if (!account) {
      setLocalBalances(new Map());
      return;
    }

    const isFirstLoad = prevAccountIdRef.current === null;
    const isAccountChanged = prevAccountIdRef.current !== account.id;

    console.log('[CalculatorModal] useEffect 触发', {
      isFirstLoad,
      isAccountChanged,
      prevAccountId: prevAccountIdRef.current,
      currentAccountId: account.id,
    });

    // 首次加载或账户切换时，同步所有余额
    if (isFirstLoad || isAccountChanged) {
      console.log('[CalculatorModal] 同步账户余额到本地状态');
      const newBalances = new Map<string, number>();
      account.balances.forEach(b => newBalances.set(b.currency, b.balance));
      setLocalBalances(newBalances);

      if (isAccountChanged && !isFirstLoad) {
        // 切换账户，重置其他状态，选择第一个有余额的货币
        const firstCurrencyWithBalance = account.balances.find(b => b.balance > 0)?.currency || account.balances[0]?.currency || 'CNY';
        setSelectedCurrency(firstCurrencyWithBalance);
        setInputValue('0');
      }
    }

    prevAccountIdRef.current = account.id;
  }, [account?.id, account?.balances]);

  // 如果没有账户，显示占位符（在所有 hooks 之后）
  if (!account) {
    return (
      <div style={{ padding: 'var(--spacing-lg)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
        请选择账户
      </div>
    );
  }

  const currentBalance = localBalances.get(selectedCurrency) || 0;
  const currencyInfo = getCurrencyInfo(selectedCurrency as any);

  // 计算器键盘点击处理
  const handleKeyPress = (key: string) => {
    if (key === '←') {
      // 删除最后一位
      setInputValue(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    } else if (key === '.') {
      // 小数点：只能有一个
      setInputValue(prev => prev.includes('.') ? prev : prev + '.');
    } else {
      // 数字
      setInputValue(prev => {
        if (prev === '0' && key !== '.') {
          return key;
        }
        // 限制：小数点后最多2位
        if (prev.includes('.')) {
          const decimalPart = prev.split('.')[1];
          if (decimalPart && decimalPart.length >= 2) {
            return prev;
          }
        }
        return prev + key;
      });
    }
  };

  // 实时提交操作
  const handleSubmit = async () => {
    if (!account) return;

    const amount = parseFloat(inputValue);
    console.log('[CalculatorModal] handleSubmit 开始', {
      amount,
      mode,
      selectedCurrency,
      currentBalance,
    });

    if (amount <= 0) {
      message.warning('请输入有效金额');
      return;
    }

    if (mode === 'withdraw' && amount > currentBalance) {
      message.error('余额不足');
      return;
    }

    try {
      const newBalance = mode === 'deposit'
        ? currentBalance + amount
        : currentBalance - amount;

      console.log('[CalculatorModal] 准备调用 API', {
        accountId: account.id,
        selectedCurrency,
        newBalance,
      });

      await api.updateAccountBalance(account.id, selectedCurrency, newBalance);

      console.log('[CalculatorModal] API 调用成功，更新本地余额');

      // 直接更新本地余额，避免父组件刷新导致状态丢失
      setLocalBalances(prev => {
        const newBalances = new Map(prev);
        newBalances.set(selectedCurrency, newBalance);
        console.log('[CalculatorModal] 本地余额已更新', newBalances);
        return newBalances;
      });

      message.success(mode === 'deposit' ? '余额校准成功' : '余额校准成功');
      setInputValue('0'); // 重置输入值

      // 不调用 onSubmit()，避免父组件刷新导致组件重新挂载
      // 用户关闭弹窗时会看到更新后的数据
    } catch (error) {
      console.error('[CalculatorModal] 操作失败', error);
      message.error('操作失败');
    }
  };

  const themeColor = mode === 'deposit' ? '#1677ff' : '#ff4d4f';

  return (
    <div style={{ padding: 'var(--spacing-lg)' }}>
      {/* 账户信息 */}
      <div style={{ marginBottom: 'var(--spacing-md)', textAlign: 'center' }}>
        <div style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
          {account.name}
        </div>
        <div style={{ fontSize: 'var(--font-size-xl)', color: themeColor, fontWeight: 'var(--font-weight-semibold)' }}>
          {currencyInfo.flag} {selectedCurrency} {currentBalance.toFixed(2)}
        </div>
      </div>

      {/* 余额校准切换 */}
      <div style={{ display: 'flex', marginBottom: 'var(--spacing-md)', background: 'var(--color-bg-layout)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-xs)' }}>
        <Button
          type={mode === 'deposit' ? 'primary' : 'text'}
          style={{
            flex: 1,
            borderRadius: 'var(--radius-base)',
            fontWeight: 'var(--font-weight-semibold)',
            fontSize: 'var(--font-size-sm)',
            height: '2rem',
          }}
          onClick={() => setMode('deposit')}
        >
          校准增加
        </Button>
        <Button
          type={mode === 'withdraw' ? 'primary' : 'text'}
          danger
          style={{
            flex: 1,
            borderRadius: 'var(--radius-base)',
            fontWeight: 'var(--font-weight-semibold)',
            fontSize: 'var(--font-size-sm)',
            height: '2rem',
          }}
          onClick={() => setMode('withdraw')}
        >
          校准减少
        </Button>
      </div>

      {/* 货币选择 */}
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {account.balances.map(b => {
            const info = getCurrencyInfo(b.currency as any);
            return (
              <Button
                key={b.currency}
                type={selectedCurrency === b.currency ? 'primary' : 'default'}
                size="small"
                onClick={() => setSelectedCurrency(b.currency)}
                style={{
                  borderRadius: 'var(--radius-md)',
                  fontWeight: selectedCurrency === b.currency ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
                  fontSize: 'var(--font-size-xs)',
                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                  height: '1.75rem',
                }}
              >
                {info.flag} {b.currency}
              </Button>
            );
          })}
        </div>
      </div>

      {/* 输入显示区 */}
      <div
        style={{
          background: mode === 'deposit' ? 'var(--color-primary-bg)' : 'var(--color-error-bg)',
          border: `0.125rem solid ${themeColor}`,
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-md)',
          textAlign: 'center',
          marginBottom: 'var(--spacing-md)',
        }}
      >
        <div style={{ fontSize: 'var(--font-size-xxl)', fontWeight: 'var(--font-weight-semibold)', color: themeColor }}>
          {mode === 'deposit' ? '+' : '-'} {currencyInfo.symbol}{parseFloat(inputValue).toFixed(2)}
        </div>
      </div>

      {/* 计算器键盘 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.375rem', marginBottom: 'var(--spacing-md)' }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '←'].map(key => (
          <Button
            key={key}
            style={{
              height: '2.5rem',
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              borderRadius: 'var(--radius-lg)',
              background: key === '←' ? '#ff7875' : '#fff',
              borderColor: key === '←' ? '#ff7875' : 'var(--color-border-base)',
              color: key === '←' ? '#fff' : '#000',
            }}
            onClick={() => handleKeyPress(key)}
          >
            {key}
          </Button>
        ))}
      </div>

      {/* 提交按钮 */}
      <Button
        type="primary"
        size="large"
        block
        style={{
          height: '2.25rem',
          fontSize: 'var(--font-size-base)',
          fontWeight: 'var(--font-weight-semibold)',
          background: themeColor,
          borderColor: themeColor,
        }}
        onClick={handleSubmit}
      >
        {mode === 'deposit' ? '校准增加' : '校准减少'}
      </Button>
    </div>
  );
}

// ==================== 账户历史弹窗组件 ====================
interface AccountHistoryModalProps {
  account: Account;
  categories: Category[];
  onClose: () => void;
}

function AccountHistoryModal({ account, categories, onClose: _onClose }: AccountHistoryModalProps) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [history, setHistory] = useState<AccountHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 0,
    pageSize: 20,
    total: 0,
  });
  // 默认选中第一个有余额的货币
  const firstCurrencyWithBalance = account.balances.find(b => b.balance > 0)?.currency || account.balances[0]?.currency || 'CNY';
  const [selectedCurrency, setSelectedCurrency] = useState(firstCurrencyWithBalance);

  // 当 account 变化时重新选择默认货币
  useEffect(() => {
    const firstCurrencyWithBalance = account.balances.find(b => b.balance > 0)?.currency || account.balances[0]?.currency || 'CNY';
    setSelectedCurrency(firstCurrencyWithBalance);
  }, [account.id]);

  useEffect(() => {
    loadHistory();
  }, [account.id, selectedCurrency, pagination.current]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await api.getAccountHistory(account.id, {
        currency: selectedCurrency,
        page: pagination.current,
        size: pagination.pageSize,
      });

      setHistory(response.content);
      setPagination({
        current: response.number,
        pageSize: response.size,
        total: response.totalElements,
      });
    } catch (error) {
      message.error('加载历史记录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 'var(--spacing-lg)', minHeight: '25rem', display: 'flex', flexDirection: 'column' }}>
      {/* 头部 */}
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h3 style={{ margin: 0 }}>{t('accounts.history')}</h3>
      </div>

      {/* 账户信息 */}
      <div style={{ marginBottom: 'var(--spacing-lg)', textAlign: 'center' }}>
        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-sm)' }}>
          {account.name}
        </div>
        <div>
          {account.balances.map(b => (
            <Button
              key={b.currency}
              size="small"
              type={selectedCurrency === b.currency ? 'primary' : 'default'}
              onClick={() => setSelectedCurrency(b.currency)}
              style={{ marginLeft: 'var(--spacing-xs)' }}
            >
              {getCurrencyInfo(b.currency as 'CNY' | 'HKD' | 'USD' | 'EUR' | 'MOP').flag} {b.currency}
            </Button>
          ))}
        </div>
      </div>

      {/* 历史记录列表 */}
      <Spin spinning={loading}>
        {history.length > 0 ? (
          <div>
            {history.map((item, index) => {
              // 递归查找分类
              const findCategoryById = (categoryList: Category[], id: number | undefined): Category | null => {
                if (!id) return null;
                for (const category of categoryList) {
                  if (category.id === id) {
                    return category;
                  }
                  if (category.subcategories && category.subcategories.length > 0) {
                    const found = findCategoryById(category.subcategories, id);
                    if (found) return found;
                  }
                }
                return null;
              };

              // 获取显示信息（图标、名称、颜色）- 与交易列表保持一致
              let iconName: string;
              let color: string;
              let displayName: string;

              if (item.typeCode === 'transfer_in' || item.typeCode === 'transfer_out') {
                displayName = item.typeDisplay; // "转入" / "转出"
                iconName = 'swap_horiz';
                color = '#722ed1';
              } else if (item.typeCode === 'balance_increase' || item.typeCode === 'balance_decrease') {
                displayName = item.typeDisplay; // "余额校准(增加)" / "余额校准(减少)"
                iconName = item.typeCode === 'balance_increase' ? 'add_circle' : 'remove_circle';
                color = '#1890ff';
              } else if (item.typeCode === 'income') {
                // 收入：优先显示分类名称
                const category = findCategoryById(categories, item.categoryId);
                if (category) {
                  displayName = category.name;
                  iconName = category.icon || 'trending_up';
                } else {
                  displayName = '收入';
                  iconName = 'trending_up';
                }
                color = 'var(--color-success)';
              } else if (item.typeCode === 'expense') {
                // 支出：优先显示分类名称
                const category = findCategoryById(categories, item.categoryId);
                if (category) {
                  displayName = category.name;
                  iconName = category.icon || 'trending_down';
                } else {
                  displayName = '支出';
                  iconName = 'trending_down';
                }
                color = 'var(--color-error)';
              } else {
                displayName = item.typeDisplay || '未知';
                iconName = 'help';
                color = 'var(--color-text-secondary)';
              }

              return (
                <div
                  key={item.id || index}
                  style={{
                    borderLeft: `0.1875rem solid ${item.isInflow ? 'var(--color-success)' : 'var(--color-error)'}`,
                    paddingLeft: 'var(--spacing-lg)',
                    padding: 'var(--spacing-sm) 0',
                  }}
                >
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* 左侧：图标和分类 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                      <IconDisplay
                        icon={iconName}
                        size="lg"
                        color={color}
                      />
                      <span style={{ fontWeight: 'var(--font-weight-semibold)', color }}>
                        {displayName}
                      </span>
                    </div>
                    {/* 右侧：金额和时间（一行显示） */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                      <span style={{
                        color: item.isInflow ? 'var(--color-success)' : 'var(--color-error)',
                        fontWeight: 'var(--font-weight-semibold)'
                      }}>
                        {item.isInflow ? '+' : '-'} {getCurrencyInfo(item.currency as 'CNY' | 'HKD' | 'USD' | 'EUR' | 'MOP').symbol} {item.amount.toFixed(2)}
                      </span>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                        {dayjs(item.transactionDate).format('MM-DD HH:mm')}{item.notes && ` • ${item.notes}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '3rem var(--spacing-lg)',
            color: 'var(--color-text-tertiary)',
            fontSize: 'var(--font-size-sm)'
          }}>
            暂无{selectedCurrency}交易记录
          </div>
        )}
      </Spin>

      {/* 分页 */}
      {history.length > 0 && pagination.total > pagination.pageSize && (
        <div style={{ marginTop: 'auto', paddingTop: 'var(--spacing-lg)', textAlign: 'center' }}>
          <Pagination
            current={pagination.current + 1}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onChange={(page) => setPagination({ ...pagination, current: page - 1 })}
          />
        </div>
      )}
    </div>
  );
}

// 可排序的账户卡片组件
interface SortableAccountCardProps {
  account: Account;
  onDepositWithdraw: (account: Account, type: 'deposit' | 'withdraw') => void;
  onTransfer: (account: Account) => void;
  onHistory: (account: Account) => void;
  onEdit: (account: Account) => void;
  onDelete: (id: number, isDefault: boolean) => void;
}

function SortableAccountCard({ account, onDepositWithdraw, onTransfer, onHistory, onEdit, onDelete }: SortableAccountCardProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: account.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // 创建操作菜单
  const menuItems: any[] = [
    {
      key: 'deposit',
      icon: <ArrowDownOutlined />,
      label: t('accounts.operations.deposit'),
      onClick: () => onDepositWithdraw(account, 'deposit'),
    },
    {
      key: 'withdraw',
      icon: <ArrowUpOutlined />,
      label: t('accounts.operations.withdraw'),
      onClick: () => onDepositWithdraw(account, 'withdraw'),
    },
    {
      key: 'transfer',
      icon: <SwapOutlined />,
      label: t('accounts.operations.transfer'),
      onClick: () => onTransfer(account),
    },
    {
      key: 'history',
      icon: <HistoryOutlined />,
      label: t('accounts.operations.history'),
      onClick: () => onHistory(account),
    },
  ];

  // 如果不是默认账户，添加编辑和删除选项
  if (!account.isDefault) {
    menuItems.push(
      {
        key: 'divider1',
        type: 'divider',
      },
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: '编辑',
        onClick: () => onEdit(account),
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '删除',
        danger: true,
        onClick: () => onDelete(account.id, account.isDefault),
      }
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        hoverable
        style={{
          border: 'var(--radius-xs) solid var(--color-border-secondary)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'grab',
          minHeight: '16rem',
        }}
        styles={{ body: { padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column' } }}
      >
        {/* 卡片头部：icon + 名称 + 操作按钮 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 'var(--font-size-xxl)', flexShrink: 0 }}>
              {getAccountDisplayIcon(account)}
            </div>
            <div
              style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
            >
              {account.name}
            </div>
          </div>
          <Dropdown menu={{ items: menuItems }} trigger={['hover']}>
            <Button
              type="text"
              icon={<MoreOutlined />}
              style={{
                padding: 'var(--spacing-sm)',
                borderRadius: 'var(--radius-md)',
                flexShrink: 0,
                transition: 'all 0.2s',
                fontSize: 'var(--font-size-lg)',
                fontWeight: 600,
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

        {/* 所有货币余额 - 自适应网格布局 */}
        <div
          style={{
            display: 'grid',
            // 1-3个货币：单列；4-6个货币：两列
            gridTemplateColumns: account.balances.length >= 4 ? '1fr 1fr' : '1fr',
            gap: 'var(--spacing-sm)',
            alignContent: account.balances.length <= 3 ? 'center' : 'start',
            // 防止 grid item 被拉伸
            alignItems: 'start',
          }}
        >
          {account.balances.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: 'var(--color-text-tertiary)',
              fontSize: 'var(--font-size-sm)',
              gridColumn: '1 / -1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--spacing-lg)',
              background: 'var(--color-bg-layout)',
              borderRadius: 'var(--radius-md)',
            }}>
              暂无余额
            </div>
          ) : (
            account.balances.map(balance => (
              <div
                key={balance.currency}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  background: 'var(--color-bg-layout)',
                  borderRadius: 'var(--radius-md)',
                  border: 'var(--radius-xs) solid var(--color-border-secondary)',
                  transition: 'all var(--transition-base)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-bg-base)';
                  e.currentTarget.style.borderColor = 'var(--color-border-base)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--color-bg-layout)';
                  e.currentTarget.style.borderColor = 'var(--color-border-secondary)';
                }}
              >
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-weight-medium)' }}>
                  {getCurrencyInfo(balance.currency as any).flag} {balance.currency}
                </span>
                <span style={{ fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>
                  {balance.balance.toFixed(2)}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

// 金融机构列表（包含代码和名称）
type InstitutionOption = {
  code: string;
  name: string;
  displayName: string;
};

const INSTITUTIONS: InstitutionOption[] = [
  // 中国大陆银行（CNAPS代码简化）
  { code: 'BOC', name: '中国银行', displayName: 'BOC - 中国银行' },
  { code: 'CMB', name: '招商银行', displayName: 'CMB - 招商银行' },
  { code: 'CCB', name: '建设银行', displayName: 'CCB - 建设银行' },
  { code: 'ICBC', name: '工商银行', displayName: 'ICBC - 工商银行' },
  { code: 'ABC', name: '农业银行', displayName: 'ABC - 农业银行' },
  { code: 'BOCOM', name: '交通银行', displayName: 'BOCOM - 交通银行' },
  { code: 'PSBC', name: '邮储银行', displayName: 'PSBC - 邮储银行' },
  { code: 'CMBCH', name: '招商银行信用卡', displayName: 'CMBCH - 招商银行信用卡' },

  // 香港银行
  { code: 'BOCHK', name: '中银香港', displayName: 'BOCHK - 中银香港' },
  { code: 'HSBC', name: '汇丰香港', displayName: 'HSBC - 汇丰香港' },
  { code: 'HASE', name: '恒生银行', displayName: 'HASE - 恒生银行' },
  { code: 'SCBL', name: '渣打银行香港', displayName: 'SCBL - 渣打银行香港' },
  { code: 'CITI', name: '花旗银行香港', displayName: 'CITI - 花旗银行香港' },
  { code: 'DBHK', name: '德银香港', displayName: 'DBHK - 德银香港' },
  { code: 'BKCH', name: '中信银行国际', displayName: 'BKCH - 中信银行国际' },
  { code: 'LAFH', name: '东亚银行', displayName: 'LAFH - 东亚银行' },
  { code: 'WCBL', name: '永隆银行', displayName: 'WCBL - 永隆银行' },
  { code: 'WHHB', name: '永亨银行', displayName: 'WHHB - 永亨银行' },
  { code: 'DABH', name: '星展银行香港', displayName: 'DABH - 星展银行香港' },
  { code: 'MBHK', name: '大众银行香港', displayName: 'MBHK - 大众银行香港' },
  { code: 'CHHK', name: '中信银行(中国)香港', displayName: 'CHHK - 中信银行(中国)香港' },
  { code: 'CITK', name: '商银香港', displayName: 'CITK - 商银香港' },
  { code: 'QFDB', name: '众安银行', displayName: 'QFDB - 众安银行' },
  { code: 'MOLH', name: '理慧银行', displayName: 'MOLH - 理慧银行' },
  { code: 'LCFB', name: '平安壹账通', displayName: 'LCFB - 平安壹账通' },

  // 澳门银行
  { code: 'BCM', name: '澳门国际银行', displayName: 'BCM - 澳门国际银行' },
  { code: 'TBB', name: '大丰银行', displayName: 'TBB - 大丰银行' },
  { code: 'BNU', name: '澳门币(大西洋银行)', displayName: 'BNU - 大西洋银行' },

  // 国际银行
  { code: 'CHAS', name: '摩根大通', displayName: 'CHAS - 摩根大通' },
  { code: 'BACS', name: '美国银行', displayName: 'BACS - 美国银行' },
  { code: 'BKNA', name: '纽约梅隆银行', displayName: 'BKNA - 纽约梅隆银行' },
  { code: 'CITI', name: '花旗银行', displayName: 'CITI - 花旗银行' },
  { code: 'BARC', name: '巴克莱银行', displayName: 'BARC - 巴克莱银行' },
  { code: 'DEUT', name: '德意志银行', displayName: 'DEUT - 德意志银行' },
  { code: 'UBSW', name: '瑞银集团', displayName: 'UBSW - 瑞银集团' },
  { code: 'CS', name: '瑞信集团', displayName: 'CS - 瑞信集团' },
  { code: 'ING', name: '荷兰ING集团', displayName: 'ING - 荷兰ING集团' },
  { code: 'BNP', name: '巴黎银行', displayName: 'BNP - 巴黎银行' },
  { code: 'SBKO', name: '三菱日联银行', displayName: 'SBKO - 三菱日联银行' },
  { code: 'SMBC', name: '三井住友银行', displayName: 'SMBC - 三井住友银行' },
  { code: 'DBSS', name: '星展银行', displayName: 'DBSS - 星展银行' },
  { code: 'HSBC', name: '汇丰银行', displayName: 'HSBC - 汇丰银行' },
  { code: 'SCBL', name: '渣打银行', displayName: 'SCBL - 渣打银行' },

  // 电子支付
  { code: 'ALIPAY', name: '支付宝', displayName: 'ALIPAY - 支付宝' },
  { code: 'WECHAT', name: '微信支付', displayName: 'WECHAT - 微信支付' },
  { code: 'UNIONPAY', name: '云闪付', displayName: 'UNIONPAY - 云闪付' },
  { code: 'JD', name: '京东支付', displayName: 'JD - 京东支付' },
  { code: 'BAIDU', name: '百度钱包', displayName: 'BAIDU - 百度钱包' },
  { code: 'PAYPAL', name: 'PayPal', displayName: 'PAYPAL - PayPal' },
  { code: 'STRIPE', name: 'Stripe', displayName: 'STRIPE - Stripe' },

  // 现金
  { code: 'CASH', name: '现金', displayName: 'CASH - 现金' },
];

const Accounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]); // 添加 categories 状态
  // 多维度筛选状态 - 支持多选
  const [selectedCurrencies, setSelectedCurrencies] = useState<Set<string>>(new Set());
  const [selectedAccountTypes, setSelectedAccountTypes] = useState<Set<string>>(new Set());
  const [selectedInstitutions, setSelectedInstitutions] = useState<Set<string>>(new Set());

  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [form] = Form.useForm();

  // 余额校准模态框
  const [depositWithdrawVisible, setDepositWithdrawVisible] = useState(false);
  const [selectedAccountForDW, setSelectedAccountForDW] = useState<Account | null>(null);
  const [depositWithdrawMode, setDepositWithdrawMode] = useState<'deposit' | 'withdraw'>('deposit');

  // 调试：追踪 Modal 状态变化
  useEffect(() => {
    console.log('[Accounts] depositWithdrawVisible 变化:', depositWithdrawVisible);
  }, [depositWithdrawVisible]);

  useEffect(() => {
    console.log('[Accounts] selectedAccountForDW 变化:', selectedAccountForDW?.id, selectedAccountForDW?.name);
  }, [selectedAccountForDW]);

  // 转账模态框
  const [transferVisible, setTransferVisible] = useState(false);
  const [selectedAccountForTransfer, setSelectedAccountForTransfer] = useState<Account | null>(null);
  const [transferForm] = Form.useForm();

  // 账户历史相关状态
  const [selectedAccountForHistory, setSelectedAccountForHistory] = useState<Account | null>(null);
  const [historyVisible, setHistoryVisible] = useState(false);

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getAccounts();
      setAccounts(data);
    } catch (err: any) {
      message.error('加载账户失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载分类
  const loadCategories = useCallback(async () => {
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (err: any) {
      console.error('加载分类失败', err);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
    loadCategories();
  }, [loadAccounts, loadCategories]);

  const handleAdd = () => {
    setEditingAccount(null);
    setModalVisible(true);
    form.resetFields();
    form.setFieldsValue({
      accountType: 'cash',
    });
  };

  const handleEdit = (account: Account) => {
    if (account.isDefault) {
      message.warning('默认账户不能编辑');
      return;
    }
    setEditingAccount(account);
    setModalVisible(true);
    form.setFieldsValue(account);
  };

  const handleDelete = async (id: number, isDefault: boolean) => {
    if (isDefault) {
      message.warning('默认账户不能删除');
      return;
    }
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个账户吗？',
      onOk: async () => {
        try {
          await api.deleteAccount(id);
          message.success('删除成功');
          loadAccounts();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingAccount) {
        await api.updateAccount(editingAccount.id, values);
        message.success('更新成功');
      } else {
        await api.createAccount(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadAccounts();
    } catch (error) {
      message.error('操作失败');
    }
  };

  // 余额校准处理
  const handleDepositWithdraw = (account: Account, type: 'deposit' | 'withdraw') => {
    setSelectedAccountForDW(account);
    setDepositWithdrawMode(type);
    setDepositWithdrawVisible(true);
  };

  const handleDepositWithdrawSubmit = async () => {
    console.log('[Accounts] handleDepositWithdrawSubmit 开始');
    await loadAccounts();
    console.log('[Accounts] handleDepositWithdrawSubmit 完成，selectedAccountForDW:', selectedAccountForDW);
  };

  // 转账处理
  const handleTransfer = (account: Account) => {
    setSelectedAccountForTransfer(account);
    transferForm.resetFields();
    transferForm.setFieldsValue({ fromAccountId: account.id });
    setTransferVisible(true);
  };

  const handleTransferSubmit = async () => {
    try {
      const values = await transferForm.validateFields();

      // 验证转账金额
      if (!values.amount || values.amount <= 0) {
        message.error('请输入有效的转账金额');
        return;
      }

      // 验证转出账户余额
      const fromAccount = accounts.find(a => a.id === values.fromAccountId);
      if (!fromAccount) {
        message.error('转出账户不存在');
        return;
      }

      // 找到转出账户的余额
      const fromCurrency = fromAccount.balances[0]?.currency; // 假设使用账户的第一个货币
      if (!fromCurrency) {
        message.error('转出账户没有设置货币');
        return;
      }

      // 找到转出账户的特定货币余额
      const fromBalance = fromAccount.balances.find(b => b.currency === fromCurrency);
      if (!fromBalance || fromBalance.balance < values.amount) {
        message.error('转出账户余额不足');
        return;
      }

      // 执行转账操作
      await api.createTransaction({
        type: 'transfer', // 修正类型为 'transfer'
        amount: values.amount,
        currency: fromCurrency,
        fromAccountId: values.fromAccountId,
        toAccountId: values.toAccountId,
        notes: `转账至账户${values.toAccountId}`,
        transactionDate: dayjs().toISOString(),
      });

      message.success('转账成功');
      setTransferVisible(false);
      loadAccounts(); // 重新加载账户数据
    } catch (error) {
      message.error('转账失败，请重试');
      console.error('转账失败:', error);
    }
  };

  // 历史记录处理
  const handleHistory = (account: Account) => {
    setSelectedAccountForHistory(account);
    setHistoryVisible(true);
  };

  // 多维度筛选：金融机构 + 账户类型 + 货币（支持多选）
  const filteredAccounts = accounts.filter(account => {
    // 金融机构筛选（多选：账户的机构必须在选中的机构中）
    if (selectedInstitutions.size > 0 && !account.institutionName) {
      return false;
    }
    if (selectedInstitutions.size > 0 && account.institutionName && !selectedInstitutions.has(account.institutionName)) {
      return false;
    }
    // 账户类型筛选（多选：账户类型必须在选中的类型中）
    if (selectedAccountTypes.size > 0 && !selectedAccountTypes.has(account.accountType)) {
      return false;
    }
    // 货币筛选（多选：账户必须包含至少一个选中的货币）
    if (selectedCurrencies.size > 0) {
      const hasSelectedCurrency = account.balances.some(b => selectedCurrencies.has(b.currency));
      if (!hasSelectedCurrency) {
        return false;
      }
    }
    return true;
  }).map(account => {
    // 如果指定了货币筛选，只返回选中货币的余额
    if (selectedCurrencies.size > 0) {
      return {
        ...account,
        balances: account.balances.filter(b => selectedCurrencies.has(b.currency))
      };
    }
    return account;
  });

  // 动态获取用户实际有的货币、账户类型、金融机构
  const availableCurrencies = Array.from(new Set(accounts.flatMap(a => a.balances.map(b => b.currency))));
  const availableAccountTypes = Array.from(new Set(accounts.map(a => a.accountType)));
  const availableInstitutions = Array.from(new Set(accounts.map(a => a.institutionName).filter((i): i is string => Boolean(i))));

  // 加载中状态
  if (loading) {
    return (
      <div style={{ padding: 'var(--spacing-xxl)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-lg)' }}>
        <Spin size="large" />
        <div style={{ color: 'var(--color-text-tertiary)' }}>加载中...</div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          title="暂无账户"
          description="请先创建账户"
          type="info"
          showIcon
        />
      </div>
    );
  }

  // 计算总资产
  // 按货币汇总总资产
  const totalBalanceByCurrency = accounts.reduce((acc, account) => {
    account.balances.forEach(balance => {
      if (!acc[balance.currency]) {
        acc[balance.currency] = 0;
      }
      acc[balance.currency] += balance.balance;
    });
    return acc;
  }, {} as Record<string, number>);

  // 切换筛选选项的辅助函数
  const toggleCurrency = (currency: string) => {
    setSelectedCurrencies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currency)) {
        newSet.delete(currency);
      } else {
        newSet.add(currency);
      }
      return newSet;
    });
  };

  const toggleAccountType = (type: string) => {
    setSelectedAccountTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  const toggleInstitution = (institution: string) => {
    setSelectedInstitutions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(institution)) {
        newSet.delete(institution);
      } else {
        newSet.add(institution);
      }
      return newSet;
    });
  };

  return (
    <>
      {/* 顶部操作栏 */}
      <div style={{ marginBottom: 'var(--spacing-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>我的账户</h2>

        {/* 筛选按钮组 - 混在一起，支持多选 */}
        <Space size="small" wrap>
          {/* 货币筛选 */}
          {availableCurrencies.map(currency => (
            <Button
              key={`currency-${currency}`}
              type={selectedCurrencies.has(currency) ? 'primary' : 'default'}
              onClick={() => toggleCurrency(currency)}
              size="small"
            >
              {getCurrencyInfo(currency as any).flag} {currency}
            </Button>
          ))}

          {/* 账户类型筛选 */}
          {availableAccountTypes.map(type => (
            <Button
              key={`type-${type}`}
              type={selectedAccountTypes.has(type) ? 'primary' : 'default'}
              onClick={() => toggleAccountType(type)}
              size="small"
            >
              {getAccountIcon(type)} {getAccountTypeName(type)}
            </Button>
          ))}

          {/* 金融机构筛选 */}
          {availableInstitutions.map(institution => (
            <Button
              key={`institution-${institution}`}
              type={selectedInstitutions.has(institution) ? 'primary' : 'default'}
              onClick={() => toggleInstitution(institution)}
              size="small"
            >
              {getInstitutionIcon(institution)} {institution}
            </Button>
          ))}
        </Space>
      </div>

      {/* 总资产卡片 */}
      {Object.keys(totalBalanceByCurrency).length > 0 && (
        <Card style={{ marginBottom: 'var(--spacing-xl)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ marginBottom: 'var(--spacing-lg)', fontSize: 'var(--font-size-base)', fontWeight: 'var(--font-weight-bold)' }}>总资产</div>
          <div style={{ display: 'flex', gap: 'var(--spacing-xl)', flexWrap: 'wrap' }}>
            {Object.entries(totalBalanceByCurrency).map(([currency, balance]) => {
              const info = getCurrencyInfo(currency as any);
              return (
                <div key={currency}>
                  <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                    {info.flag} {info.name}
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>
                    {info.symbol}{balance.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 账户列表 */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => {
          const { active, over } = event;
          if (over && active.id !== over.id) {
            setAccounts(accounts => {
              const oldIndex = accounts.findIndex(a => a.id.toString() === active.id);
              const newIndex = accounts.findIndex(a => a.id.toString() === over.id);
              return arrayMove(accounts, oldIndex, newIndex);
            });
          }
        }}
      >
        <SortableContext items={filteredAccounts.map(a => a.id.toString())} strategy={verticalListSortingStrategy}>
          <Row gutter={[16, 16]} align="stretch">
            {filteredAccounts.map(account => (
              <Col key={account.id} xs={24} sm={12} md={8} lg={6}>
                <SortableAccountCard
                  account={account}
                  onDepositWithdraw={handleDepositWithdraw}
                  onTransfer={handleTransfer}
                  onHistory={handleHistory}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </Col>
            ))}
          </Row>
        </SortableContext>
      </DndContext>

      {/* 添加/编辑账户弹窗 */}
      <Modal
        title={editingAccount ? '编辑账户' : '添加账户'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={480}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 'var(--spacing-xxl)' }}>
          <Form.Item
            name="name"
            label="账户名称"
            rules={[{ required: true, message: '请输入账户名称' }]}
          >
            <Input size="large" placeholder="例如：工资卡、零钱包" disabled={editingAccount?.isDefault} />
          </Form.Item>

          <Form.Item
            name="institutionName"
            label="金融机构"
          >
            <AutoComplete
              size="large"
              options={INSTITUTIONS.map(item => ({ value: item.name, label: item.displayName }))}
              placeholder="选择或输入金融机构（支持代码或名称搜索）"
              filterOption={(inputValue, option) => {
                const upperInput = inputValue.toUpperCase();
                const optionData = INSTITUTIONS.find(item => item.name === option?.value);
                if (!optionData) return false;
                // 支持按code或name搜索
                return optionData.code.toUpperCase().includes(upperInput) ||
                       optionData.name.toUpperCase().includes(upperInput);
              }}
            />
          </Form.Item>

          <Form.Item
            name="accountType"
            label="账户类型"
            rules={[{ required: true, message: '请选择账户类型' }]}
          >
            <Select size="large" placeholder="请选择账户类型" disabled={editingAccount?.isDefault}>
              <Select.Option value="cash">
                <span style={{ marginRight: 'var(--spacing-md)' }}>💰</span>
                现金
              </Select.Option>
              <Select.Option value="bank">
                <span style={{ marginRight: 'var(--spacing-md)' }}>🏦</span>
                银行账户
              </Select.Option>
              <Select.Option value="credit">
                <span style={{ marginRight: 'var(--spacing-md)' }}>💳</span>
                信用卡
              </Select.Option>
              <Select.Option value="ewallet">
                <span style={{ marginRight: 'var(--spacing-md)' }}>📱</span>
                电子钱包
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="currencies"
            label="货币"
            rules={[{ required: true, message: '请至少选择一种货币' }]}
            initialValue={['CNY']}
          >
            <Checkbox.Group style={{ width: '100%' }}>
              <Row>
                <Col span={12}>
                  <Checkbox value="CNY">🇨🇳 CNY - 人民币</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="HKD">🇭🇰 HKD - 港币</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="USD">🇺🇸 USD - 美元</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="EUR">🇪🇺 EUR - 欧元</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value="MOP">🇲🇴 MOP - 澳门币</Checkbox>
                </Col>
              </Row>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={3} placeholder="可选，添加账户相关说明" />
          </Form.Item>

          {/* 详细信息：仅在编辑时显示 */}
          {editingAccount && (
            <>
              <div style={{
                borderTop: 'var(--radius-xs) solid var(--color-border-secondary)',
                marginTop: 'var(--spacing-xxl)',
                paddingTop: 'var(--spacing-xxl)'
              }}>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-md)', color: 'var(--color-info)' }}>
                  📋 账户详细信息
                </div>

                <Form.Item name="accountNumber" label="账户号码/银行卡号">
                  <Input placeholder="可选，例如：6225 8888 8888 8888" />
                </Form.Item>

                <Form.Item name="fpsId" label="FPS ID（转数快）">
                  <Input placeholder="可选，香港转数快识别码" />
                </Form.Item>

                <Form.Item name="swiftCode" label="SWIFT代码">
                  <Input placeholder="可选，国际汇款SWIFT/BIC代码" />
                </Form.Item>

                <Form.Item name="iban" label="IBAN">
                  <Input placeholder="可选，欧洲银行账户号码" />
                </Form.Item>
              </div>
            </>
          )}
        </Form>
      </Modal>

      {/* 余额校准弹窗 - 重新设计 */}
      <Modal
        open={depositWithdrawVisible}
        onCancel={() => {
          setDepositWithdrawVisible(false);
          // 弹窗关闭时刷新数据
          handleDepositWithdrawSubmit();
        }}
        footer={null}
        closeIcon={null}
        width={420}
        destroyOnHidden={false}
        forceRender
        styles={{ body: { padding: 0 } }}
      >
        <CalculatorModal
          account={selectedAccountForDW}
          initialMode={depositWithdrawMode}
        />
      </Modal>

      {/* 转账弹窗 */}
      <Modal
        title="账户转账"
        open={transferVisible}
        onOk={handleTransferSubmit}
        onCancel={() => setTransferVisible(false)}
        width={480}
        okText="确认转账"
        cancelText="取消"
      >
        <Form form={transferForm} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="fromAccountId"
            label="转出账户"
            initialValue={selectedAccountForTransfer?.id}
          >
            <Select size="large" disabled>
              {accounts.map(acc => (
                <Select.Option key={acc.id} value={acc.id}>
                  {getAccountIcon(acc.accountType)} {acc.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="toAccountId"
            label="转入账户"
            rules={[{ required: true, message: '请选择转入账户' }]}
          >
            <Select size="large" placeholder="请选择转入账户">
              {accounts.filter(acc => acc.id !== selectedAccountForTransfer?.id).map(acc => (
                <Select.Option key={acc.id} value={acc.id}>
                  {getAccountIcon(acc.accountType)} {acc.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="amount"
            label="转账金额"
            rules={[{ required: true, message: '请输入转账金额' }]}
          >
            <InputNumber
              size="large"
              style={{ width: '100%' }}
              placeholder="0.00"
              precision={2}
              min={0}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 账户历史弹窗 */}
      {selectedAccountForHistory && (
        <Modal
          open={historyVisible}
          onCancel={() => setHistoryVisible(false)}
          footer={null}
          width={600}
          title={null}
        >
          <AccountHistoryModal
            account={selectedAccountForHistory}
            categories={categories}
            onClose={() => setHistoryVisible(false)}
          />
        </Modal>
      )}

      {/* 悬浮添加按钮 */}
      <Button
        type="primary"
        size="large"
        icon={<PlusOutlined />}
        onClick={handleAdd}
        style={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          borderRadius: '50%',
          width: 56,
          height: 56,
          boxShadow: '0 0.25rem 0.75rem rgba(24, 144, 255, 0.4)',
          zIndex: 1000,
        }}
      />
    </>
  );
};

export default Accounts;
