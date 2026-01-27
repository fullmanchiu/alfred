import { useState, useEffect, useRef } from 'react';
import {
  Button,
  message,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Space,
  Tag,
  Card,
  Progress,
  DatePicker,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, WarningOutlined } from '@ant-design/icons';
import { api } from '@/services/api';
import type { Budget, BudgetUsage, Category } from '@/types';
import type { FormInstance } from 'antd/es/form';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const Budgets = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetUsage, setBudgetUsage] = useState<BudgetUsage[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const formRef = useRef<FormInstance>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [budgetsData, categoriesData] = await Promise.all([
        api.getBudgets(),
        api.getCategories(),
      ]);
      setBudgets(budgetsData);
      setCategories(categoriesData);
      // TODO: 实现 getBudgetUsage API
      setBudgetUsage([]);
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingBudget(null);
    setModalVisible(true);
    formRef.current?.resetFields();
    formRef.current?.setFieldsValue({
      periodType: 'monthly',
      isActive: true,
      startDate: dayjs(),
      endDate: dayjs().add(1, 'month'),
    });
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setModalVisible(true);
    formRef.current?.setFieldsValue({
      ...budget,
      startDate: dayjs(budget.startDate),
      endDate: dayjs(budget.endDate),
    });
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个预算吗？',
      onOk: async () => {
        try {
          await api.deleteBudget(id);
          message.success('删除成功');
          loadData();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await formRef.current?.validateFields();
      const data = {
        ...values,
        startDate: values.startDate[0].format('YYYY-MM-DD'),
        endDate: values.startDate[1].format('YYYY-MM-DD'),
      };

      if (editingBudget) {
        await api.updateBudget(editingBudget.id, data);
        message.success('更新成功');
      } else {
        await api.createBudget(data);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadData();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || `#${categoryId}`;
  };

  const getProgressColor = (percentage: number, isOverBudget: boolean) => {
    if (isOverBudget || percentage >= 100) return '#ff4d4f';
    if (percentage >= 80) return '#faad14';
    return '#52c41a';
  };

  const renderBudgetCard = (usage: BudgetUsage) => {
    const progressColor = getProgressColor(usage.usagePercentage, usage.isOverBudget);

    return (
      <Card
        key={usage.budgetId}
        size="small"
        style={{ marginBottom: 12 }}
        title={
          <Space>
            <span>{getCategoryName(usage.budgetId)}</span>
            {usage.isOverBudget && (
              <Tag color="red" icon={<WarningOutlined />}>
                超支警告
              </Tag>
            )}
            {!usage.isOverBudget && usage.usagePercentage >= 80 && (
              <Tag color="orange" icon={<WarningOutlined />}>
                接近限额
              </Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => {
                const budget = budgets.find((b) => b.id === usage.budgetId);
                if (budget) handleEdit(budget);
              }}
            >
              编辑
            </Button>
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(usage.budgetId)}
            >
              删除
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 8 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>已支出: ¥{usage.usedAmount.toFixed(2)}</span>
              <span>预算: ¥{usage.budgetAmount.toFixed(2)}</span>
            </div>
            <Progress
              percent={Math.min(usage.usagePercentage, 100)}
              strokeColor={progressColor}
              showInfo={true}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666' }}>
              <span>剩余: ¥{usage.remainingAmount.toFixed(2)}</span>
              <span>{usage.usagePercentage.toFixed(1)}%</span>
            </div>
          </Space>
        </div>
      </Card>
    );
  };

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增预算
          </Button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 24 }}>加载中...</div>
        ) : budgetUsage.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24 }}>暂无预算数据</div>
        ) : (
          <div style={{ maxWidth: 800 }}>
            {budgetUsage.map(renderBudgetCard)}
          </div>
        )}
      </Card>

      <Modal
        title={editingBudget ? '编辑预算' : '新增预算'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form
          ref={formRef}
          layout="vertical"
        >
          <Form.Item
            name="categoryId"
            label="分类"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select placeholder="请选择">
              {categories
                .filter((c) => c.type === 'expense')
                .map((cat) => (
                  <Select.Option key={cat.id} value={cat.id}>
                    {cat.name}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="periodType"
            label="周期类型"
            rules={[{ required: true, message: '请选择周期类型' }]}
          >
            <Select placeholder="请选择">
              <Select.Option value="monthly">月度</Select.Option>
              <Select.Option value="yearly">年度</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="amount"
            label="预算金额"
            rules={[{ required: true, message: '请输入预算金额' }]}
          >
            <Input type="number" placeholder="0.00" />
          </Form.Item>

          <Form.Item
            name="startDate"
            label="有效期限"
            rules={[{ required: true, message: '请选择有效期限' }]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="状态"
            initialValue={true}
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Budgets;
