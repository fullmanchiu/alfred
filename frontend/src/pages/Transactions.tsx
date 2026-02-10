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
import { useIconHelpers } from '@/hooks/useIconHelpers';
import { useTransactions, useCategories, useAccounts, useCreateCategory, useCreateTransaction, useUpdateTransaction, useDeleteTransaction } from '@/queries';

// Material Icons 分类 - 使用官方正确的unicode代码，包含中文名称
// 对应11个支出一级分类
const MATERIAL_ICON_CATEGORIES = [
  {
    name: '餐饮',
    icons: [
      { code: 'e56c', name: '餐厅' },
      { code: 'e556', name: '美食' },
      { code: 'e57a', name: '快餐' },
      { code: 'ea61', name: '午餐' },
      { code: 'ea57', name: '晚餐' },
      { code: 'ea54', name: '早餐' },
      { code: 'ea64', name: '拉面' },
      { code: 'e842', name: '烤肉' },
      { code: 'f1ea', name: '套餐' },
      { code: 'f1f5', name: '米饭' },
      { code: 'e541', name: '咖啡馆' },
      { code: 'e544', name: '饮品' },
      { code: 'ea53', name: '烘焙' },
      { code: 'ea73', name: '早午餐' },
      { code: 'ea74', name: '外卖' },
      { code: 'eaac', name: '零食' },
      { code: 'f54e', name: '咖啡' },
      { code: 'f4c1', name: '茶' },
      { code: 'f1b5', name: '自助餐' },
      { code: 'e552', name: '披萨' },
      { code: 'e848', name: '餐厅菜单' },
      { code: 'e561', name: '菜单' },
    ],
  },
  {
    name: '交通',
    icons: [
      { code: 'e531', name: '汽车' },
      { code: 'e530', name: '公交' },
      { code: 'e533', name: '地铁' },
      { code: 'e534', name: '火车' },
      { code: 'e539', name: '航班' },
      { code: 'e559', name: '出租车' },
      { code: 'e9f9', name: '摩托车' },
      { code: 'eb29', name: '自行车' },
      { code: 'e536', name: '自行车' },
      { code: 'eb1f', name: '电动滑板车' },
      { code: 'e535', name: '步行' },
      { code: 'e565', name: '交通' },
      { code: 'e52e', name: '方向' },
      { code: 'e52f', name: '共享单车' },
      { code: 'e532', name: '轮渡' },
      { code: 'e904', name: '航班降落' },
      { code: 'e905', name: '航班起飞' },
      { code: 'e570', name: '有轨电车' },
      { code: 'e53e', name: '汽车租赁' },
      { code: 'e558', name: '洗车' },
    ],
  },
  {
    name: '购物',
    icons: [
      { code: 'e8cc', name: '购物车' },
      { code: 'e8cb', name: '购物篮' },
      { code: 'f1cc', name: '购物袋' },
      { code: 'e8c9', name: '便利店' },
      { code: 'ea12', name: '商店' },
      { code: 'e547', name: '杂货店' },
      { code: 'e54c', name: '商场' },
      { code: 'e54e', name: '优惠券' },
      { code: 'e8f6', name: '礼品卡' },
      { code: 'e8f7', name: '会员卡' },
      { code: 'e54a', name: '洗衣服务' },
      { code: 'e554', name: '洗衣' },
      { code: 'e555', name: '干洗' },
      { code: 'e545', name: '花店' },
      { code: 'e8d1', name: '日用品' },
      { code: 'f19e', name: '服饰' },
      { code: 'e1b1', name: '数码' },
      { code: 'e16b', name: '家居' },
      { code: 'e54f', name: '停车场' },
      { code: 'f17e', name: '销售点' },
    ],
  },
  {
    name: '住房',
    icons: [
      { code: 'e88a', name: '主页' },
      { code: 'ea44', name: '房屋' },
      { code: 'ea40', name: '公寓' },
      { code: 'e587', name: '小屋' },
      { code: 'e589', name: '别墅' },
      { code: 'ea40', name: '房租' },
      { code: 'e798', name: '水电' },
      { code: 'e53a', name: '酒店' },
      { code: 'efdf', name: '床' },
      { code: 'ea45', name: '大床' },
      { code: 'ea48', name: '单人床' },
      { code: 'eb47', name: '厨房' },
      { code: 'efee', name: '椅子' },
      { code: 'efed', name: '椅子' },
      { code: 'e58f', name: '阳台' },
      { code: 'f10b', name: '维修' },
      { code: 'e328', name: '宽带' },
      { code: 'e1e2', name: '网费' },
      { code: 'f1a2', name: '家庭洗手间' },
      { code: 'ea43', name: '壁炉' },
    ],
  },
  {
    name: '通讯',
    icons: [
      { code: 'e325', name: '话费' },
      { code: 'e0be', name: '流量' },
      { code: 'e328', name: '宽带' },
      { code: 'e0cd', name: '通讯录' },
      { code: 'e61c', name: '消息' },
      { code: 'e0bd', name: '评论' },
      { code: 'e0c5', name: '发信箱' },
      { code: 'e0c4', name: '收信箱' },
      { code: 'e0bf', name: '邮件' },
      { code: 'e0c0', name: '邮件锁定' },
      { code: 'e61f', name: '移动消息' },
      { code: 'e87c', name: '联系人' },
      { code: 'e0d0', name: '联系邮箱' },
      { code: 'e0d1', name: '联系电话' },
      { code: 'e61d', name: '消息提醒' },
      { code: 'e62c', name: '未读消息' },
      { code: 'e1ba', name: '通讯录清单' },
      { code: 'e1bb', name: '通讯星标' },
      { code: 'ef87', name: 'SIM卡' },
      { code: 'e32b', name: 'SIM卡2' },
    ],
  },
  {
    name: '订阅',
    icons: [
      { code: 'f01f', name: '订阅' },
      { code: 'e405', name: '视频音乐' },
      { code: 'e30a', name: '软件服务' },
      { code: 'e338', name: '游戏' },
      { code: 'e02c', name: '电影' },
      { code: 'e021', name: '游戏' },
      { code: 'ea19', name: '知识付费' },
      { code: 'e865', name: '书籍' },
      { code: 'e1e2', name: '云存储' },
      { code: 'e3a7', name: '云队列' },
      { code: 'e3a8', name: '云上传' },
      { code: 'e2eb', name: '理财' },
      { code: 'ebc5', name: '比特币' },
      { code: 'e870', name: '基金' },
      { code: 'eb70', name: '货币兑换' },
      { code: 'e0be', name: '流量' },
      { code: 'e063', name: '音乐视频' },
      { code: 'e064', name: '视频库' },
      { code: 'e8da', name: '剧院' },
      { code: 'e410', name: '照片' },
    ],
  },
  {
    name: '宠物',
    icons: [
      { code: 'e91d', name: '宠物' },
      { code: 'eaac', name: '食品' },
      { code: 'f033', name: '医疗' },
      { code: 'e548', name: '医院' },
      { code: 'e8d1', name: '用品' },
      { code: 'e87c', name: '美容' },
      { code: 'e53a', name: '寄养' },
      { code: 'e545', name: '花店' },
      { code: 'eb48', name: '宠物护理' },
      { code: 'eb49', name: '宠物旅行' },
      { code: 'eb4a', name: '宠物兽医' },
      { code: 'e590', name: '女性' },
      { code: 'e58e', name: '男性' },
      { code: 'eb69', name: '老年女性' },
      { code: 'e1d5', name: '健康安全' },
    ],
  },
  {
    name: '娱乐',
    icons: [
      { code: 'e405', name: '视频音乐' },
      { code: 'e021', name: '游戏' },
      { code: 'e338', name: '游戏机' },
      { code: 'e02c', name: '电影' },
      { code: 'ea66', name: 'KTV' },
      { code: 'e53f', name: '活动' },
      { code: 'e407', name: '旅游' },
      { code: 'e53d', name: '景点' },
      { code: 'e8da', name: '剧院' },
      { code: 'e063', name: '音乐视频' },
      { code: 'e064', name: '视频库' },
      { code: 'e410', name: '照片' },
      { code: 'e411', name: '相册' },
      { code: 'e412', name: '相机' },
      { code: 'e413', name: '照片库' },
      { code: 'e3b3', name: '相机' },
      { code: 'e8fc', name: '相机增强' },
      { code: 'e43b', name: '照片滤镜' },
      { code: 'e40a', name: '调色板' },
      { code: 'e3ae', name: '画笔' },
      { code: 'e420', name: '表情' },
      { code: 'e40b', name: '全景' },
    ],
  },
  {
    name: '健康',
    icons: [
      { code: 'e1d5', name: '健康安全' },
      { code: 'f109', name: '体检' },
      { code: 'f033', name: '药品' },
      { code: 'e548', name: '医院' },
      { code: 'e85d', name: '挂号' },
      { code: 'eb4c', name: '保健品' },
      { code: 'e1d5', name: '保险' },
      { code: 'e914', name: '无障碍' },
      { code: 'f21f', name: '洗手' },
      { code: 'ebed', name: '医疗信息' },
      { code: 'e50a', name: '健身房' },
      { code: 'eb43', name: '健身中心' },
      { code: 'ea4b', name: '科学' },
      { code: 'e3f3', name: '治愈' },
      { code: 'e023', name: '听力' },
      { code: 'f104', name: '听力障碍' },
      { code: 'f21a', name: '老人' },
      { code: 'e590', name: '女性' },
      { code: 'e58e', name: '男性' },
      { code: 'e91e', name: '孕妇' },
    ],
  },
  {
    name: '教育',
    icons: [
      { code: 'e80c', name: '学校' },
      { code: 'e84f', name: '学费' },
      { code: 'ea19', name: '书籍' },
      { code: 'efec', name: '培训' },
      { code: 'e30a', name: '在线课程' },
      { code: 'e86e', name: '班级' },
      { code: 'ea3e', name: '教育历史' },
      { code: 'e25f', name: '高亮' },
      { code: 'e89c', name: '笔记添加' },
      { code: 'e06f', name: '笔记' },
      { code: 'e26c', name: '笔记列表' },
      { code: 'e745', name: '编辑笔记' },
      { code: 'e865', name: '图书' },
      { code: 'e866', name: '书签' },
      { code: 'e02f', name: '图书馆添加' },
      { code: 'e030', name: '图书馆音乐' },
      { code: 'e02e', name: '图书馆添加' },
      { code: 'e156', name: '收件箱' },
      { code: 'e151', name: '草稿箱' },
      { code: 'f04c', name: '考试' },
    ],
  },
  {
    name: '人情',
    icons: [
      { code: 'e8f6', name: '红包' },
      { code: 'e8b1', name: '请客' },
      { code: 'e87d', name: '礼品' },
      { code: 'e25a', name: '孝敬' },
      { code: 'e227', name: '借出' },
      { code: 'ea65', name: '生日礼金' },
      { code: 'e145', name: '节日礼金' },
      { code: 'e87d', name: '婚礼礼金' },
      { code: 'e8dc', name: '红包2' },
      { code: 'e8f7', name: '会员卡' },
      { code: 'e8f8', name: '旅行卡' },
      { code: 'e8f0', name: '纪念品' },
      { code: 'e8f3', name: '礼盒' },
      { code: 'ea66', name: '庆祝' },
      { code: 'ea68', name: '节日' },
      { code: 'e53f', name: '活动' },
      { code: 'e838', name: '星标' },
      { code: 'e83a', name: '星标边框' },
      { code: 'e839', name: '半星' },
      { code: 'e87d', name: '收藏' },
    ],
  },
];

// 预设颜色 - 更少的选项，小圆形
const COLOR_PRESETS = [
  '#F5222D', '#FA8C16', '#FAAD14', '#52C41A', '#13C2C2',
  '#1890FF', '#722ED1', '#EB2F96',
];

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
  const [selectedIconCategory, setSelectedIconCategory] = useState(0);
  const [newCategoryForm] = Form.useForm();
  const [subcategoryPopoverOpen, setSubcategoryPopoverOpen] = useState<number | null>(null);
  const [selectedIconName, setSelectedIconName] = useState<string>('restaurant');
  const [selectedColor, setSelectedColor] = useState<string>('#f5222d');

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
        // 根据交易类型获取正确的账户ID
        const accountId = editingRecord.type === 'expense'
          ? editingRecord.fromAccountId
          : editingRecord.toAccountId;
        const account = accounts.find(a => a.id === accountId);

        // 处理分类：判断是父分类还是子分类
        let parentCategoryId: number | null = null;
        let subCategoryId: number | null = null;
        if (editingRecord.categoryId) {
          const category = categories.find(c => c.id === editingRecord.categoryId);
          if (category) {
            if (category.parentId) {
              // 是子分类，设置父分类和子分类
              parentCategoryId = category.parentId;
              subCategoryId = category.id;
            } else {
              // 是父分类，只设置父分类
              parentCategoryId = category.id;
            }
          }
        }

        setTransactionType(editingRecord.type as 'expense' | 'income');
        const amountStr = editingRecord.amount.toString();
        setAmount(amountStr);
        setCalculator({ currentValue: amountStr, previousValue: null, operator: null, display: '' });
        setSelectedCategory(parentCategoryId);
        setSelectedSubCategory(subCategoryId);
        setSelectedAccount(account || null);
        // 使用交易记录原本的货币，而非账户的默认货币
        setSelectedCurrency(editingRecord.currency || 'CNY');
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
  }, [visible, editingRecord, accounts, categories]);

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
      if (addCategoryModalVisible) return;

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
  }, [visible, addCategoryModalVisible]);


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
      <Modal
        title="添加分类"
        open={addCategoryModalVisible}
        onCancel={() => {
          setAddCategoryModalVisible(false);
          setAddCategoryParentId(null);
          setSelectedIconCategory(0);
          setSelectedIconName('restaurant');
          setSelectedColor('#f5222d');
          newCategoryForm.resetFields();
        }}
        onOk={async () => {
          try {
            const values = await newCategoryForm.validateFields();
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
            setSelectedIconCategory(0);
            setSelectedIconName('restaurant');
            setSelectedColor('#f5222d');
            newCategoryForm.resetFields();

            // 通知父组件刷新分类列表并选中新分类
            if (onCategoryCreated && newCategory?.id) {
              onCategoryCreated(newCategory.id);
            }
          } catch (error) {
            message.error('创建分类失败');
          }
        }}
        okText="创建"
        cancelButtonProps={{ style: { display: 'none' } }}
        width="95vw"
        style={{ maxWidth: '420px' }}
        maskClosable={true}
        destroyOnHidden={false}
      >
        <Form form={newCategoryForm} layout="vertical" style={{ marginTop: 'var(--spacing-md)' }}>
          {/* 分类名称 */}
          <Form.Item
            name="name"
            label="分类名称"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input size="large" placeholder="请输入分类名称" />
          </Form.Item>

          {/* 图标和颜色选择 - 二维布局 */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {/* 左侧：分类列表 */}
            <div style={{ width: '3.5rem', flexShrink: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', maxHeight: '320px', overflowY: 'auto' }}>
                {MATERIAL_ICON_CATEGORIES.map((category, index) => {
                  const isSelected = selectedIconCategory === index;
                  return (
                    <div
                      key={category.name}
                      onClick={() => setSelectedIconCategory(index)}
                      style={{
                        fontSize: '0.65rem',
                        padding: '0.35rem 0.2rem',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        background: isSelected ? 'var(--color-primary-bg)' : 'transparent',
                        color: isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s',
                        border: isSelected ? '1px solid var(--color-primary)' : '1px solid transparent',
                      }}
                    >
                      {category.name}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 右侧：图标网格 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.25rem', maxHeight: '320px', overflowY: 'auto' }}>
                {MATERIAL_ICON_CATEGORIES[selectedIconCategory].icons.map((iconItem) => {
                  const isSelected = selectedIconName === iconItem.code;
                  return (
                    <div
                      key={iconItem.code}
                      onClick={() => {
                        setSelectedIconName(iconItem.code);
                        newCategoryForm.setFieldValue('iconName', iconItem.code);
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.5rem 0.25rem',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        background: isSelected ? `${selectedColor}15` : 'transparent',
                        border: isSelected ? `2px solid ${selectedColor}` : '1px solid transparent',
                        transition: 'all 0.15s',
                        gap: '0.25rem',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'var(--color-bg-layout)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <IconDisplay icon={iconItem.code} size="lg" color={isSelected ? selectedColor : undefined} />
                      <span style={{
                        fontSize: '0.6rem',
                        color: 'var(--color-text-secondary)',
                        textAlign: 'center',
                        lineHeight: '1.2',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {iconItem.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 颜色选择 - 小圆形，紧凑 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {COLOR_PRESETS.map((color) => {
              const isSelected = selectedColor === color;
              return (
                <div
                  key={color}
                  onClick={() => {
                    setSelectedColor(color);
                    newCategoryForm.setFieldValue('color', color);
                  }}
                  style={{
                    width: '1.5rem',
                    height: '1.5rem',
                    borderRadius: '50%',
                    backgroundColor: color,
                    cursor: 'pointer',
                    border: isSelected ? '2px solid var(--color-text-primary)' : '1px solid var(--color-border)',
                    transition: 'all 0.2s',
                    transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                  }}
                />
              );
            })}
          </div>

          {/* 隐藏字段 */}
          <Form.Item name="iconName" style={{ display: 'none' }} initialValue={MATERIAL_ICON_CATEGORIES[0].icons[0].code}>
            <Input />
          </Form.Item>
          <Form.Item name="color" style={{ display: 'none' }} initialValue={COLOR_PRESETS[0]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
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
      // 使用本地时间格式，避免时区转换问题
      let transactionDate = values.transactionDate;
      if (dayjs.isDayjs(transactionDate)) {
        transactionDate = transactionDate.format('YYYY-MM-DDTHH:mm:ss');
      } else if (typeof transactionDate === 'string') {
        // 如果已经是字符串格式，dayjs 会自动解析
        // 然后转换为本地时间格式
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
              color: record.displayColor,
              marginBottom: '0.25rem',
            }}>
              {!record.isInflow ? '-' : '+'}{getCurrencyInfo(record.currency as any).symbol}{record.amount.toFixed(2)}
            </div>

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
