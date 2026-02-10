import { Modal, Button, Form, Input, Popover, message } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { IconDisplay } from '@/components/IconDisplay';

interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  subcategories?: Category[];
}

interface CategoryBudget {
  categoryId: number;
  categoryName: string;
  budget: number;
  used: number;
  percentage: number;
  icon?: string;
  color?: string;
  parentId?: number | null;
}

interface BudgetSettingModalProps {
  visible: boolean;
  categories: Category[];
  editingCategory?: CategoryBudget | null;
  onCancel: () => void;
  onOk: (categoryId: number, amount: number) => void;
}

const BudgetSettingModal = ({ visible, categories, editingCategory, onCancel, onOk }: BudgetSettingModalProps) => {
  const [form] = Form.useForm();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<number | null>(null);
  const [subcategoryPopoverOpen, setSubcategoryPopoverOpen] = useState<number | null>(null);

  // 计算器状态
  const [calculator, setCalculator] = useState({
    currentValue: '0',
    previousValue: null as string | null,
    operator: null as string | null,
    display: '' as string
  });

  const [pressedKey, setPressedKey] = useState<string | null>(null);

  // 重置表单和初始化编辑模式
  useEffect(() => {
    if (visible) {
      if (editingCategory) {
        // 编辑模式：初始化金额和分类
        setCalculator({
          currentValue: String(editingCategory.budget),
          previousValue: null,
          operator: null,
          display: ''
        });
        setSelectedCategory(editingCategory.parentId || editingCategory.categoryId);
        setSelectedSubCategory(editingCategory.parentId ? editingCategory.categoryId : null);
      } else {
        // 新增模式：重置
        setCalculator({ currentValue: '0', previousValue: null, operator: null, display: '' });
        setSelectedCategory(null);
        setSelectedSubCategory(null);
        form.resetFields();
      }
    }
  }, [visible, editingCategory, form]);

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
      } else if (key === '.') {
        // 小数点
        if (!prev.currentValue.includes('.')) {
          newValue.currentValue = prev.currentValue + '.';
        }
      } else if (/^[0-9]$/.test(key)) {
        // 数字
        if (prev.currentValue === '0' || prev.currentValue === '') {
          newValue.currentValue = key;
        } else {
          newValue.currentValue = prev.currentValue + key;
        }
      } else if (key === '+' || key === '-') {
        // 加减运算符
        if (!prev.operator && !prev.previousValue) {
          newValue.previousValue = prev.currentValue;
          newValue.operator = key;
          newValue.currentValue = '';
        } else if (prev.operator && prev.previousValue && prev.currentValue !== '') {
          const result = calculate(parseFloat(prev.previousValue), parseFloat(prev.currentValue), prev.operator);
          newValue.previousValue = String(result);
          newValue.operator = key;
          newValue.currentValue = '';
        } else if (prev.operator && !prev.previousValue) {
          newValue.operator = key;
        } else if (prev.operator && prev.previousValue && prev.currentValue === '') {
          newValue.operator = key;
        }
      } else if (key === '=') {
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

  // 获取子分类
  const getSubCategories = (parentId: number) => {
    const parent = categories.find(c => c.id === parentId);
    return parent?.subcategories || [];
  };

  // 提交处理
  const handleSubmit = async () => {
    try {
      if (!editingCategory) {
        // 新增模式：需要选择分类
        if (!selectedSubCategory && !selectedCategory) {
          message.error('请选择分类');
          return;
        }
      }

      let finalAmount = calculator.currentValue;
      if (calculator.operator && calculator.previousValue) {
        const result = calculate(parseFloat(calculator.previousValue), parseFloat(calculator.currentValue), calculator.operator);
        finalAmount = String(result);
      }

      const amount = parseFloat(finalAmount);
      if (amount <= 0) {
        message.error('请输入金额');
        return;
      }

      const categoryId = editingCategory
        ? editingCategory.categoryId
        : (selectedSubCategory || selectedCategory!);
      onOk(categoryId, amount);
    } catch (error) {
      console.error('提交失败:', error);
    }
  };

  // 按钮样式生成函数
  const getButtonStyle = (buttonKey: string, customStyle?: React.CSSProperties): React.CSSProperties => {
    return {
      ...customStyle,
      transform: pressedKey === buttonKey ? 'scale(0.95)' : 'scale(1)',
    };
  };

  // 键盘事件监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!visible) return;

      const activeElement = document.activeElement;
      const isEditableElement = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).isContentEditable
      );

      if (isEditableElement) return;

      const code = e.code;
      const key = e.key;
      const shiftKey = e.shiftKey;

      if (/^Digit[0-9]$/.test(code) || /^Numpad[0-9]$/.test(code)) {
        e.preventDefault();
        setPressedKey(e.key);
        handleKeyPress(e.key);
      } else if (code === 'Period' || code === 'NumpadDecimal') {
        e.preventDefault();
        setPressedKey('.');
        handleKeyPress('.');
      } else if (code === 'Backspace' || code === 'Delete') {
        e.preventDefault();
        setPressedKey('←');
        handleKeyPress('←');
      } else if ((code === 'Equal' && shiftKey && key === '+') || code === 'NumpadAdd') {
        e.preventDefault();
        setPressedKey('+');
        handleKeyPress('+');
      } else if ((code === 'Minus' && key === '-') || code === 'NumpadSubtract') {
        e.preventDefault();
        setPressedKey('-');
        handleKeyPress('-');
      } else if (code === 'Equal' && !shiftKey) {
        e.preventDefault();
        setPressedKey('=');
        handleKeyPress('=');
      }
    };

    const handleKeyUp = () => {
      setPressedKey(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [visible]);

  const themeColor = '#52c41a';

  return (
    <Modal
      title={editingCategory ? "编辑预算" : "设置预算"}
      open={visible}
      onCancel={onCancel}
      width="90vw"
      style={{ maxWidth: '28rem', top: '1.25rem' }}
      footer={null}
      closable={true}
      maskClosable={true}
      destroyOnHidden={true}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', userSelect: 'none' }}>
        {/* 金额输入框 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '3.5rem',
          border: `0.0625rem solid ${themeColor}`,
          borderRadius: '0.375rem',
          fontSize: '2.2rem',
          fontWeight: 700,
          background: 'linear-gradient(135deg, rgba(82, 196, 26, 0.05) 0%, rgba(82, 196, 26, 0.02) 100%)',
          color: themeColor,
          cursor: 'default',
        }}>
          ¥{calculator.display ? calculator.display : calculator.currentValue}
        </div>

        {/* 分类选择区域 - 仅在新增模式显示 */}
        {!editingCategory && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem' }}>
          {categories.map((category) => {
            const isActive = selectedCategory === category.id;
            const subCategories = getSubCategories(category.id);
            const hasSubCategories = subCategories.length > 0;
            const color = category.color;

            if (hasSubCategories) {
              return (
                <div key={category.id} style={{ position: 'relative', display: 'inline-block' }}>
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
                                    setSubcategoryPopoverOpen(null);
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
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          style={{
                            position: 'absolute',
                            right: '-2px',
                            bottom: '-2px',
                            cursor: 'pointer',
                            fontSize: '10px',
                            color: color,
                            background: 'white',
                            borderRadius: '50%',
                            width: '14px',
                            height: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid ' + color,
                          }}
                        >
                          <DownOutlined style={{ fontSize: '8px' }} />
                        </span>
                      </Popover>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-primary)', textAlign: 'center', fontWeight: isActive ? 600 : 400, lineHeight: 1.2 }}>
                      {category.name}
                    </span>
                  </div>
                </div>
              );
            }

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
          </div>
        )}

        {/* 数字键盘 */}
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
          <Form.Item name="notes" style={{ marginBottom: 0 }}>
            <Input size="small" placeholder="备注（可选）" />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default BudgetSettingModal;
