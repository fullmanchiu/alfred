import { useState, useEffect } from 'react';
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
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { api } from '@/services/api';
import type { Category } from '@/types';

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [form] = Form.useForm();

  useEffect(() => {
    loadCategories();
  }, [activeTab]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await api.getCategories();
      // 只获取当前类型的分类
      setCategories(data.filter((c) => c.type === activeTab));
    } catch (error) {
      message.error('加载分类失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取顶级分类（没有 parentId 的分类）
  const getTopLevelCategories = () => {
    return categories.filter((c) => !c.parentId);
  };

  // 获取子分类
  const getSubCategories = (parentId: number) => {
    return categories.filter((c) => c.parentId === parentId);
  };

  const toggleExpand = (categoryId: number) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleAdd = (parentId?: number) => {
    setEditingCategory(null);
    setModalVisible(true);
    form.resetFields();
    form.setFieldsValue({
      type: activeTab,
      isActive: true,
      parentId: parentId || null,
    });
  };

  const handleEdit = (category: Category) => {
    if (category.isSystem) {
      message.warning('系统分类不能修改');
      return;
    }
    setEditingCategory(category);
    setModalVisible(true);
    form.setFieldsValue(category);
  };

  const handleDelete = async (id: number) => {
    const category = categories.find((c) => c.id === id);
    if (category?.isSystem) {
      message.warning('系统分类不能删除');
      return;
    }

    // 检查是否有子分类
    const hasChildren = getSubCategories(id).length > 0;
    if (hasChildren) {
      message.warning('请先删除子分类');
      return;
    }

    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个分类吗？',
      onOk: async () => {
        try {
          await api.deleteCategory(id);
          message.success('删除成功');
          loadCategories();
        } catch (error) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingCategory) {
        await api.updateCategory(editingCategory.id, values);
        message.success('更新成功');
      } else {
        await api.createCategory(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadCategories();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const renderIcon = (iconCode: string | undefined, _color: string | undefined, _size: number = 24) => {
    if (!iconCode) return '📁';
    try {
      // 尝试解析十六进制 Unicode 码点
      const codePoint = parseInt(iconCode, 16);
      if (isNaN(codePoint)) {
        return '📁';
      }
      return String.fromCodePoint(codePoint);
    } catch {
      return '📁';
    }
  };

  // 渲染分类项（一级和二级）
  const renderCategoryItem = (category: Category, level: number = 0) => {
    const subCategories = getSubCategories(category.id);
    const hasChildren = subCategories.length > 0;
    const isExpanded = expandedCategories.has(category.id);

    return (
      <div key={category.id} style={{ marginBottom: 8 }}>
        {/* 分类条目 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            background: '#fff',
            borderRadius: 12,
            border: `2px solid ${category.color || '#d9d9d9'}`,
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginLeft: level * 24,
          }}
          onClick={() => hasChildren && toggleExpand(category.id)}
        >
          {/* 展开/收起图标 */}
          <span style={{ marginRight: 12, fontSize: 16, color: '#999' }}>
            {hasChildren ? (isExpanded ? '📂' : '📁') : '•'}
          </span>

          {/* 分类图标 */}
          <span
            style={{
              fontSize: 24,
              marginRight: 12,
              filter: category.color ? `drop-shadow(0 0 2px ${category.color}40)` : 'none',
            }}
          >
            {renderIcon(category.iconName, category.color)}
          </span>

          {/* 分类名称 */}
          <span style={{ flex: 1, fontSize: 16, fontWeight: 500 }}>
            {category.name}
          </span>

          {/* 子分类数量 */}
          {hasChildren && (
            <Tag color="blue" style={{ fontSize: 12, marginRight: 8 }}>
              {subCategories.length}
            </Tag>
          )}

          {/* 操作按钮 */}
          {!category.isSystem && (
            <Space size="small" onClick={(e) => e.stopPropagation()}>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(category)}
              >
                编辑
              </Button>
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(category.id)}
              >
                删除
              </Button>
            </Space>
          )}
        </div>

        {/* 子分类列表（展开时显示） */}
        {hasChildren && isExpanded && (
          <div style={{ marginTop: 8 }}>
            {subCategories.map((sub) => renderCategoryItem(sub, level + 1))}
          </div>
        )}

        {/* 快速添加子分类按钮 */}
        {!category.isSystem && (
          <div style={{ marginLeft: 36, marginTop: 8 }}>
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => handleAdd(category.id)}
            >
              添加子分类
            </Button>
          </div>
        )}
      </div>
    );
  };

  const topCategories = getTopLevelCategories();

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      {/* 类型切换标签 */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 8, marginBottom: 24, display: 'flex', gap: 8 }}>
        <Button
          size="large"
          type={activeTab === 'expense' ? 'primary' : 'default'}
          onClick={() => setActiveTab('expense')}
          style={{ flex: 1, borderRadius: 8, height: 48, fontSize: 16, fontWeight: 'bold' }}
        >
          ⬇️ 支出分类
        </Button>
        <Button
          size="large"
          type={activeTab === 'income' ? 'primary' : 'default'}
          onClick={() => setActiveTab('income')}
          style={{ flex: 1, borderRadius: 8, height: 48, fontSize: 16, fontWeight: 'bold' }}
        >
          ⬆️ 收入分类
        </Button>
      </div>

      {/* 添加顶级分类按钮 */}
      <div style={{ marginBottom: 24 }}>
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => handleAdd()}
          style={{ borderRadius: 24 }}
        >
          添加顶级分类
        </Button>
      </div>

      {/* 分类列表 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
      ) : topCategories.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 12 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>📁</div>
          <div style={{ fontSize: 16, color: '#999' }}>暂无分类</div>
          <div style={{ fontSize: 14, color: '#ccc', marginTop: 8 }}>点击上方按钮添加分类</div>
        </div>
      ) : (
        <div style={{ background: '#fafafa', borderRadius: 12, padding: 16 }}>
          {topCategories.map((cat) => renderCategoryItem(cat))}
        </div>
      )}

      {/* 添加/编辑分类弹窗 */}
      <Modal
        title={editingCategory ? '编辑分类' : '添加分类'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={560}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="type"
            label="类型"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select size="large" disabled={!!editingCategory}>
              <Select.Option value="expense">⬇️ 支出</Select.Option>
              <Select.Option value="income">⬆️ 收入</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label="分类名称"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input size="large" placeholder="例如：餐饮、交通、工资" />
          </Form.Item>

          <Form.Item name="parentId" label="父级分类" rules={[{ required: false }]}>
            <Select size="large" placeholder="留空则创建顶级分类" allowClear>
              {topCategories.map((cat) => (
                <Select.Option key={cat.id} value={cat.id}>
                  {renderIcon(cat.iconName, cat.color)} {cat.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="icon"
            label="图标 Unicode"
            rules={[{ required: true, message: '请输入图标代码' }]}
            extra={
              <span style={{ fontSize: 12, color: '#999' }}>
                常用图标：餐饮 f354 (🍔)、交通 f1b9 (🚕)、购物 f1d2 (🛒)、工资 f392 (💰)
              </span>
            }
          >
            <Input
              size="large"
              placeholder="例如: f354"
              prefix="0x"
              onChange={(e) => {
                // 实时预览图标
                const preview = document.getElementById('icon-preview');
                if (preview) {
                  preview.textContent = renderIcon(e.target.value, undefined, 32);
                }
              }}
            />
            <div
              id="icon-preview"
              style={{ marginTop: 12, fontSize: 32, textAlign: 'center', padding: 16, background: '#f5f5f5', borderRadius: 8 }}
            >
              {form.getFieldValue('icon') ? renderIcon(form.getFieldValue('icon'), undefined, 32) : '预览'}
            </div>
          </Form.Item>

          <Form.Item
            name="color"
            label="颜色"
            rules={[{ required: true, message: '请选择颜色' }]}
          >
            <Select size="large" placeholder="请选择颜色">
              <Select.Option value="#F5222D">
                <span style={{ color: '#F5222D' }}>❤️ 红色</span>
              </Select.Option>
              <Select.Option value="#FA8C16">
                <span style={{ color: '#FA8C16' }}>🧡 橙色</span>
              </Select.Option>
              <Select.Option value="#FAAD14">
                <span style={{ color: '#FAAD14' }}>💛 黄色</span>
              </Select.Option>
              <Select.Option value="#52C41A">
                <span style={{ color: '#52C41A' }}>💚 绿色</span>
              </Select.Option>
              <Select.Option value="#1890FF">
                <span style={{ color: '#1890FF' }}>💙 蓝色</span>
              </Select.Option>
              <Select.Option value="#722ED1">
                <span style={{ color: '#722ED1' }}>💜 紫色</span>
              </Select.Option>
              <Select.Option value="#EB2F96">
                <span style={{ color: '#EB2F96' }}>💗 粉色</span>
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="isActive" label="状态" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Categories;
