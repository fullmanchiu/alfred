import { useState, useEffect } from 'react';
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
  Modal,
  Form,
  Input,
  Card,
  Row,
  Col,
  Alert,
  App,
  Dropdown,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DownCircleOutlined, UpCircleOutlined, MoreOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import type { Category } from '@/types';
import { IconDisplay } from '@/components/IconDisplay';
import { AddCategoryModal } from '@/components/AddCategoryModal';

// ==================== 分类卡片组件 ====================
interface SortableCategoryCardProps {
  category: Category;
  subCategories: Category[];
  onAddSub: (parentId: number) => void;
  onEdit: (category: Category) => void;
  onDelete: (id: number) => void;
}

function SortableCategoryCard({ category, subCategories, onAddSub, onEdit, onDelete }: SortableCategoryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: category.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const { t } = useTranslation();

  // 菜单项
  const menuItems = [
    { key: 'addSub', icon: <PlusOutlined />, label: t('categories.addSubCategory') },
  ] as any[];

  if (!category.isSystem) {
    menuItems.push(
      { type: 'divider' as const },
      { key: 'edit', icon: <EditOutlined />, label: t('categories.editCategory') },
      { key: 'delete', icon: <DeleteOutlined />, label: t('categories.deleteCategory'), danger: true }
    );
  }

  const handleMenuClick = ({ key }: { key: string }) => {
    switch (key) {
      case 'addSub':
        onAddSub(category.id);
        break;
      case 'edit':
        onEdit(category);
        break;
      case 'delete':
        onDelete(category.id);
        break;
    }
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        hoverable
        style={{
          border: '1px solid var(--color-border-secondary)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'grab',
          minHeight: '20rem',
        }}
        styles={{ body: { padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', flex: 1 } }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flex: 1, minWidth: 0 }}>
            <IconDisplay
              icon={category.icon}
              size="xxl"
              color={category.color}
            />
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
              {category.name}
            </div>
          </div>
          <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }} trigger={['hover']}>
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

        {/* Sub-categories list */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-xs)',
            flex: 1,
            overflowY: 'auto',
            maxHeight: '15rem',
          }}
        >
          {subCategories.map((sub) => (
            <div
              key={sub.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--spacing-xs) var(--spacing-sm)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-base)',
                background: 'var(--color-bg-container)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-bg-layout)';
                e.currentTarget.style.borderColor = 'var(--color-border-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--color-bg-container)';
                e.currentTarget.style.borderColor = 'var(--color-border-base)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flex: 1, minWidth: 0 }}>
                <IconDisplay
                  icon={sub.icon}
                  size="base"
                  color={sub.color}
                />
                <span
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  {sub.name}
                </span>
              </div>
              {!sub.isSystem && (
                <Dropdown
                  menu={{
                    items: [
                      { key: 'edit', icon: <EditOutlined />, label: t('common.edit') },
                      { key: 'delete', icon: <DeleteOutlined />, label: t('common.delete'), danger: true }
                    ],
                    onClick: ({ key }) => {
                      if (key === 'edit') onEdit(sub);
                      if (key === 'delete') onDelete(sub.id);
                    }
                  }}
                  trigger={['hover']}
                >
                  <Button
                    type="text"
                    icon={<MoreOutlined />}
                    style={{
                      padding: 'var(--spacing-xs)',
                      borderRadius: 'var(--radius-sm)',
                      flexShrink: 0,
                      transition: 'all 0.2s',
                      fontSize: 'var(--font-size-base)',
                      color: 'var(--color-text-tertiary)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg-layout)';
                      e.currentTarget.style.color = 'var(--color-text-secondary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--color-text-tertiary)';
                    }}
                  />
                </Dropdown>
              )}
            </div>
          ))}

          {/* Add sub-category button */}
          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => onAddSub(category.id)}
            style={{
              width: '100%',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            {t('categories.addSubCategory')}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Main Categories component
const Categories = () => {
  const { t } = useTranslation();
  const { message: messageApi } = App.useApp();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [addCategoryModalVisible, setAddCategoryModalVisible] = useState(false);
  const [addCategoryParentId, setAddCategoryParentId] = useState<number | null>(null);
  const [form] = Form.useForm();

  // 版本更新提示状态
  const [versionInfo, setVersionInfo] = useState<{configVersion: string; dbVersion: string; hasUpdate: boolean} | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Drag sensors
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

  useEffect(() => {
    loadCategories();
  }, [activeTab]);

  useEffect(() => {
    checkVersion();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      // Backend already returns nested structure with subcategories
      const data = await api.getCategories({ type: activeTab });
      setCategories(data);
    } catch (error) {
      messageApi.error(t('categories.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 检查分类版本
  const checkVersion = async () => {
    try {
      const info = await api.checkCategoryVersion();
      setVersionInfo(info);
    } catch (error) {
      console.error('检查分类版本失败：', error);
    }
  };

  // 立即更新分类
  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      const result = await api.syncSystemCategories();
      if (result.synced) {
        messageApi.success('分类已更新到最新版本');
        // 更新版本信息
        await checkVersion();
        // 重新加载分类列表
        await loadCategories();
      } else {
        messageApi.info('分类已是最新版本');
        setVersionInfo(null);
      }
    } catch (error: any) {
      messageApi.error('更新分类失败：' + (error.response?.data?.message || '未知错误'));
    } finally {
      setSyncing(false);
    }
  };

  const getTopLevelCategories = () => {
    return categories; // Backend already returns only top-level with type filter
  };

  const getSubCategories = (parentId: number) => {
    const parent = categories.find(c => c.id === parentId);
    return parent?.subcategories || [];
  };

  const handleAdd = (parentId?: number) => {
    setAddCategoryParentId(parentId || null);
    setAddCategoryModalVisible(true);
  };

  const handleEdit = (category: Category) => {
    if (category.isSystem) {
      messageApi.warning(t('categories.systemCategoryWarning'));
      return;
    }
    setEditingCategory(category);
    setModalVisible(true);
    form.setFieldsValue({
      name: category.name,
      type: category.type,
      parentId: category.parentId,
      isActive: category.isActive,
    });
  };

  const handleDelete = async (id: number) => {
    const category = categories.find((c) => c.id === id);
    if (category?.isSystem) {
      messageApi.warning(t('categories.systemCategoryWarning'));
      return;
    }

    const hasChildren = getSubCategories(id).length > 0;
    if (hasChildren) {
      messageApi.warning(t('categories.hasChildrenWarning'));
      return;
    }

    Modal.confirm({
      title: t('categories.deleteConfirm'),
      content: t('categories.deleteConfirmContent'),
      onOk: async () => {
        try {
          await api.deleteCategory(id);
          messageApi.success(t('categories.deleteSuccess'));
          loadCategories();
        } catch (error) {
          messageApi.error(t('categories.deleteFailed'));
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingCategory) {
        await api.updateCategory(editingCategory.id, values);
        messageApi.success(t('categories.updateSuccess'));
      } else {
        await api.createCategory(values);
        messageApi.success(t('categories.createSuccess'));
      }
      setModalVisible(false);
      loadCategories();
    } catch (error) {
      messageApi.error(t('common.operationFailed'));
    }
  };

  const topCategories = getTopLevelCategories();

  return (
    <div style={{ paddingTop: 'var(--spacing-xl)', paddingBottom: '6.25rem', padding: 'var(--spacing-xl)', maxWidth: '75rem', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--spacing-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{t('categories.title')}</h2>

        {/* Type toggle - Button style */}
        <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
          <Button
            type={activeTab === 'expense' ? 'primary' : 'default'}
            onClick={() => setActiveTab('expense')}
            size="small"
            icon={<DownCircleOutlined />}
          >
            {t('transactions.types.expense').replace('⬇️ ', '')}
          </Button>
          <Button
            type={activeTab === 'income' ? 'primary' : 'default'}
            onClick={() => setActiveTab('income')}
            size="small"
            icon={<UpCircleOutlined />}
          >
            {t('transactions.types.income').replace('⬆️ ', '')}
          </Button>
        </div>
      </div>

      {/* 版本更新提示 */}
      {versionInfo?.hasUpdate && (
        <Alert
          title="系统分类有新版本"
          description={`当前版本：${versionInfo.dbVersion}，最新版本：${versionInfo.configVersion}`}
          type="warning"
          showIcon
          action={
            <Button size="small" onClick={handleSyncNow} loading={syncing}>
              立即更新
            </Button>
          }
          style={{ marginBottom: '1rem' }}
          closable
          onClose={() => setVersionInfo(null)}
        />
      )}

      {/* Categories grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--spacing-xxl)' }}>
          {t('common.loading')}
        </div>
      ) : topCategories.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3.75rem',
            background: 'var(--color-bg-base)',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-lg)' }}>📁</div>
          <div style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-tertiary)' }}>
            {t('categories.noCategories')}
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-quaternary)', marginTop: 'var(--spacing-sm)' }}>
            {t('categories.noCategoriesTip')}
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => {
            const { active, over } = event;
            if (over && active.id !== over.id) {
              setCategories((cats) => {
                const oldIndex = cats.findIndex((c) => c.id.toString() === active.id);
                const newIndex = cats.findIndex((c) => c.id.toString() === over.id);
                return arrayMove(cats, oldIndex, newIndex);
              });
            }
          }}
        >
          <SortableContext items={topCategories.map((c) => c.id.toString())} strategy={verticalListSortingStrategy}>
            <Row gutter={[16, 16]}>
              {topCategories.map((cat) => (
                <Col key={cat.id} xs={24} sm={12} md={8} lg={6}>
                  <SortableCategoryCard
                    category={cat}
                    subCategories={getSubCategories(cat.id)}
                    onAddSub={handleAdd}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                </Col>
              ))}
            </Row>
          </SortableContext>
        </DndContext>
      )}

      {/* Floating add button */}
      <Button
        type="primary"
        size="large"
        icon={<PlusOutlined />}
        onClick={() => handleAdd()}
        style={{
          position: 'fixed',
          right: '1.5rem',
          bottom: '1.5rem',
          borderRadius: '50%',
          width: '3.5rem',
          height: '3.5rem',
          boxShadow: '0 4px 12px rgba(24, 144, 255, 0.4)',
          zIndex: 1000,
        }}
        title={t('categories.addTopLevel')}
      />

      {/* Edit modal - 只用于编辑分类名称 */}
      <Modal
        title={t('categories.editCategory')}
        open={modalVisible && !!editingCategory}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width="95vw"
        style={{ maxWidth: '420px' }}
        okText={t('common.save')}
        cancelButtonProps={{ style: { display: 'none' } }}
        maskClosable={true}
        destroyOnHidden={true}
      >
        {modalVisible && editingCategory && (
          <Form form={form} layout="vertical" preserve={false} style={{ marginTop: 'var(--spacing-md)' }}>
            {/* 只能编辑名称 */}
            <Form.Item
              name="name"
              label={t('categories.fields.name')}
              rules={[{ required: true, message: t('errors.required', { field: t('categories.fields.name') }) }]}
            >
              <Input size="large" placeholder={t('categories.namePlaceholder')} />
            </Form.Item>

            {/* 隐藏字段 */}
            <Form.Item name="type" style={{ display: 'none' }}>
              <Input />
            </Form.Item>
            <Form.Item name="parentId" style={{ display: 'none' }}>
              <Input />
            </Form.Item>
            <Form.Item name="isActive" style={{ display: 'none' }} initialValue={true}>
              <Input />
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Add Category Modal - 用于添加新分类 */}
      <AddCategoryModal
        visible={addCategoryModalVisible}
        onCancel={() => {
          setAddCategoryModalVisible(false);
          setAddCategoryParentId(null);
        }}
        onCreated={() => {
          loadCategories();
        }}
        categoryType={activeTab}
        parentId={addCategoryParentId}
      />
    </div>
  );
};

export default Categories;
