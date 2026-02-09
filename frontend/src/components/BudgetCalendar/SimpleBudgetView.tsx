import { Card, Row, Col, Progress, Button, Tag, message, Empty, Spin } from 'antd';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { IconDisplay } from '@/components/IconDisplay';
import { api } from '@/services/api';
import BudgetSettingModal from './BudgetSettingModal';

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

interface BudgetLevel {
  period: 'daily' | 'weekly' | 'monthly';
  title: string;
  totalBudget: number;
  used: number;
  extraBudget: number;
  categoryBudgets: CategoryBudget[];
}

const SimpleBudgetView = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [addCategoryVisible, setAddCategoryVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryBudget | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBudgets, _setLoadingBudgets] = useState(false);

  // 日预算的分类（动态）
  const [dailyCategories, setDailyCategories] = useState<CategoryBudget[]>([]);
  const [weeklyCategories, setWeeklyCategories] = useState<CategoryBudget[]>([]);
  const [monthlyCategories, setMonthlyCategories] = useState<CategoryBudget[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCategories(),
        loadBudgetUsage()
      ]);
    } catch (error) {
      console.error('加载数据失败：', error);
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await api.getCategories({ type: 'expense' });
      setCategories(data);
    } catch (error) {
      console.error('加载分类失败：', error);
      throw error;
    }
  };

  const loadBudgetUsage = async () => {
    try {
      const data = await api.getBudgetUsage();

      // 根据周期将预算使用情况分配到对应的分类数组
      const daily = data.filter(b => ['daily', 'day'].includes(b.period)).map(b => ({
        categoryId: b.categoryId,
        categoryName: b.categoryName || '未分类',
        budget: b.budgetAmount,
        used: b.usedAmount,
        percentage: b.usagePercentage,
        icon: b.icon,
        color: b.color,
      }));

      const weekly = data.filter(b => ['weekly', 'week'].includes(b.period)).map(b => ({
        categoryId: b.categoryId,
        categoryName: b.categoryName || '未分类',
        budget: b.budgetAmount,
        used: b.usedAmount,
        percentage: b.usagePercentage,
        icon: b.icon,
        color: b.color,
      }));

      const monthly = data.filter(b => ['monthly', 'month'].includes(b.period)).map(b => ({
        categoryId: b.categoryId,
        categoryName: b.categoryName || '未分类',
        budget: b.budgetAmount,
        used: b.usedAmount,
        percentage: b.usagePercentage,
        icon: b.icon,
        color: b.color,
      }));

      setDailyCategories(daily);
      setWeeklyCategories(weekly);
      setMonthlyCategories(monthly);
    } catch (error) {
      console.error('加载预算使用情况失败：', error);
      throw error;
    }
  };

  const getStatusText = (percentage: number) => {
    if (percentage >= 100) return '已超支';
    if (percentage >= 80) return '接近限额';
    return '预算正常';
  };

  // 编辑分类
  const handleEditCategory = (category: CategoryBudget) => {
    setEditingCategory(category);
  };

  const handleUpdateCategory = async (categoryId: number, newBudget: number) => {
    try {
      // 先获取现有预算（需要知道预算ID）
      const budgets = await api.getBudgets();
      const budget = budgets.find(b => b.categoryId === categoryId);

      if (budget) {
        // 更新现有预算
        await api.updateBudget(budget.id, {
          ...budget,
          amount: newBudget
        });

        // 重新加载预算数据
        await loadBudgetUsage();
        setEditingCategory(null);
        message.success('预算已更新');
      } else {
        message.error('未找到对应的预算项');
      }
    } catch (error) {
      console.error('更新预算失败：', error);
      message.error('更新预算失败');
    }
  };

  // 添加分类预算
  const handleAddCategory = async (categoryId: number, budget: number) => {
    try {
      let category: any = null;

      // 在所有分类中查找（包括二级分类）
      categories.forEach(cat => {
        if (cat.id === categoryId) {
          category = cat;
        }
        if (cat.subcategories) {
          const sub = cat.subcategories.find((s: any) => s.id === categoryId);
          if (sub) category = sub;
        }
      });

      if (!category) {
        message.error('未找到对应分类');
        return;
      }

      // 创建新的预算
      await api.createBudget({
        categoryId,
        amount: budget,
        period: selectedPeriod,
        pattern: 'all',
        alertThreshold: 80,
        isRecurring: true,
        startDate: dayjs().toISOString(),
        endDate: null,
        isActive: true
      });

      // 重新加载预算数据
      await loadBudgetUsage();
      setAddCategoryVisible(false);
      message.success(`已添加${category.name}预算`);
    } catch (error) {
      console.error('添加预算失败：', error);
      message.error('添加预算失败');
    }
  };

  // 删除分类预算
  const handleRemoveCategory = async (categoryId: number) => {
    try {
      // 先获取现有预算（需要知道预算ID）
      const budgets = await api.getBudgets();
      const budget = budgets.find(b => b.categoryId === categoryId);

      if (budget) {
        await api.deleteBudget(budget.id);
        // 重新加载预算数据
        await loadBudgetUsage();
        message.success('已删除分类预算');
      } else {
        message.error('未找到对应的预算项');
      }
    } catch (error) {
      console.error('删除预算失败：', error);
      message.error('删除预算失败');
    }
  };

  // 根据选中的周期计算对应的数据
  const getSelectedBudgetData = () => {
    let categoryBudgets: CategoryBudget[] = [];

    switch(selectedPeriod) {
      case 'daily':
        categoryBudgets = dailyCategories;
        break;
      case 'weekly':
        categoryBudgets = weeklyCategories;
        break;
      case 'monthly':
        categoryBudgets = monthlyCategories;
        break;
      default:
        categoryBudgets = dailyCategories;
    }

    const totalBudget = categoryBudgets.reduce((sum, cat) => sum + cat.budget, 0);
    const totalUsed = categoryBudgets.reduce((sum, cat) => sum + cat.used, 0);

    return {
      categoryBudgets,
      totalBudget,
      totalUsed
    };
  };

  const { categoryBudgets } = getSelectedBudgetData();

  const budgetLevels: BudgetLevel[] = [
    {
      period: 'daily',
      title: '每日',
      totalBudget: dailyCategories.reduce((sum, cat) => sum + cat.budget, 0),
      used: dailyCategories.reduce((sum, cat) => sum + cat.used, 0),
      extraBudget: 0,
      categoryBudgets: dailyCategories,
    },
    {
      period: 'weekly',
      title: '每周',
      totalBudget: weeklyCategories.reduce((sum, cat) => sum + cat.budget, 0),
      used: weeklyCategories.reduce((sum, cat) => sum + cat.used, 0),
      extraBudget: 0,
      categoryBudgets: weeklyCategories,
    },
    {
      period: 'monthly',
      title: '每月',
      totalBudget: monthlyCategories.reduce((sum, cat) => sum + cat.budget, 0),
      used: monthlyCategories.reduce((sum, cat) => sum + cat.used, 0),
      extraBudget: 0,
      categoryBudgets: monthlyCategories,
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Row gutter={24} style={{ flex: 1, minHeight: 0 }}>
        {/* 左侧预算选择区域 */}
        <Col span={8}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '12px', overflow: 'hidden' }}>
            {budgetLevels.map((level) => {
              const percentage = (level.used / level.totalBudget) * 100;
              const statusText = getStatusText(percentage);
              const isSelected = selectedPeriod === level.period;

              return (
                <Card
                  key={level.period}
                  hoverable
                  onClick={() => setSelectedPeriod(level.period)}
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer',
                    border: '1px solid #e8e8e8',
                    outline: isSelected ? '1px solid #1890ff' : 'none',
                    outlineOffset: '-1px',
                    background: isSelected ? '#e6f7ff' : '#fff',
                    transition: 'all 0.3s ease',
                    boxShadow: isSelected ? '0 4px 12px rgba(24, 144, 255, 0.15)' : '0 2px 8px rgba(0,0,0,0.06)',
                    overflow: 'hidden',
                    flex: 1, // 让每个卡片平均分配空间
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  bodyStyle={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}
                >
                  {/* 标题和状态 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#262626' }}>
                      {level.title}
                    </span>
                    <Tag
                      color={percentage >= 100 ? 'error' : percentage >= 80 ? 'warning' : 'success'}
                      style={{ fontWeight: 600, padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}
                    >
                      {statusText}
                    </Tag>
                  </div>

                  {/* 预算概览 */}
                  <div style={{
                    flex: 1, // 让预算概览区域填充剩余空间
                    padding: '12px',
                    background: '#fff',
                    borderRadius: '8px',
                    border: '1px solid #f0f0f0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    <Row gutter={8} style={{ marginBottom: '8px' }}>
                      <Col span={8}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#8c8c8c', marginBottom: '2px' }}>已用</div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#262626' }}>
                            ¥{level.used.toFixed(0)}
                          </div>
                        </div>
                      </Col>
                      <Col span={8}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#8c8c8c', marginBottom: '2px' }}>剩余</div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#52c41a' }}>
                            ¥{(level.totalBudget - level.used).toFixed(0)}
                          </div>
                        </div>
                      </Col>
                      <Col span={8}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: '#8c8c8c', marginBottom: '2px' }}>总预算</div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#262626' }}>
                            ¥{level.totalBudget.toFixed(0)}
                          </div>
                        </div>
                      </Col>
                    </Row>
                    <div style={{ marginTop: 'auto' }}>
                      <Progress
                        percent={Math.min(percentage, 100)}
                        strokeColor={percentage >= 100 ? '#ff4d4f' : percentage >= 80 ? '#faad14' : '#52c41a'}
                        format={(percent) => (
                          <span style={{ fontWeight: 700, fontSize: '12px', color: percentage >= 100 ? '#ff4d4f' : percentage >= 80 ? '#faad14' : '#52c41a' }}>
                            {percent?.toFixed(0)}%
                          </span>
                        )}
                        size={6}
                        style={{ marginBottom: 0 }}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </Col>

        {/* 右侧编辑区域 */}
        <Col span={16}>
          <Card
            style={{
              height: '100%',
              borderRadius: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
            bodyStyle={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            {/* 顶部操作栏 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                {loadingBudgets && <span style={{ fontSize: '12px', color: '#8c8c8c' }}>正在刷新数据...</span>}
              </div>
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={() => setAddCategoryVisible(true)}
                style={{ borderRadius: '8px', fontWeight: 600, height: '40px' }}
              >
                添加
              </Button>
            </div>

            {/* 分类列表 */}
            {categoryBudgets.length > 0 ? (
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
                {categoryBudgets.map((category) => (
                  <div
                    key={category.categoryId}
                    style={{
                      marginBottom: '16px',
                      padding: '20px',
                      borderRadius: '12px',
                      background: '#fff',
                      border: '1px solid #f0f0f0',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#1890ff';
                      e.currentTarget.style.background = '#f0f9ff';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(24, 144, 255, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#f0f0f0';
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* 头部：图标、名称、操作按钮 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          background: category.color ? `${category.color}15` : '#f0f0f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <IconDisplay
                            icon={category.icon || 'help'}
                            size="xxl"
                            color={category.color}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#262626' }}>
                            {category.categoryName}
                          </div>
                          <div style={{ fontSize: '13px', color: '#8c8c8c', marginTop: '4px' }}>
                            已用 ¥{category.used.toFixed(0)} / 预算 ¥{category.budget}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button
                          type="primary"
                          size="small"
                          ghost
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditCategory(category);
                          }}
                          style={{ borderRadius: '6px', fontWeight: 500 }}
                        >
                          编辑
                        </Button>
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCategory(category.categoryId);
                          }}
                          style={{ borderRadius: '6px', fontWeight: 500 }}
                        >
                          删除
                        </Button>
                      </div>
                    </div>

                    {/* 预算进度条 */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#8c8c8c', fontWeight: 500 }}>
                          预算使用
                        </span>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: category.percentage >= 100 ? '#ff4d4f' : category.percentage >= 80 ? '#faad14' : '#52c41a'
                        }}>
                          {category.percentage.toFixed(0)}%
                        </span>
                      </div>
                      <Progress
                        percent={Math.min(category.percentage, 100)}
                        strokeColor={category.percentage >= 100 ? '#ff4d4f' : category.percentage >= 80 ? '#faad14' : '#52c41a'}
                        size={8}
                        showInfo={false}
                        style={{ marginBottom: 0 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                description="暂无分类预算，点击上方按钮添加"
                style={{ padding: '60px 0' }}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 添加/编辑分类弹窗 */}
      <BudgetSettingModal
        visible={addCategoryVisible || editingCategory !== null}
        categories={categories}
        editingCategory={editingCategory}
        onCancel={() => {
          setAddCategoryVisible(false);
          setEditingCategory(null);
        }}
        onOk={(categoryId, amount) => {
          if (editingCategory) {
            handleUpdateCategory(editingCategory.categoryId, amount);
          } else {
            handleAddCategory(categoryId, amount);
          }
        }}
      />
    </div>
  );
};

export default SimpleBudgetView;
