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

// Sortable top-level category card
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
              icon={category.iconName}
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
                  icon={sub.iconName}
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
  const [selectedIconCategory, setSelectedIconCategory] = useState(0);
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
    setEditingCategory(null);
    setModalVisible(true);
    setSelectedIconCategory(0);
    form.resetFields();
    form.setFieldsValue({
      type: activeTab,
      isActive: true,
      parentId: parentId || null,
      iconName: MATERIAL_ICON_CATEGORIES[0].icons[0].code,
      color: COLOR_PRESETS[0],
    });
  };

  const handleEdit = (category: Category) => {
    if (category.isSystem) {
      messageApi.warning(t('categories.systemCategoryWarning'));
      return;
    }
    setEditingCategory(category);
    setModalVisible(true);
    setSelectedIconCategory(0);
    form.setFieldsValue({
      ...category,
      iconName: category.iconName || MATERIAL_ICON_CATEGORIES[0].icons[0].code,
      color: category.color || COLOR_PRESETS[0],
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

      {/* Edit/Add modal */}
      <Modal
        title={editingCategory ? t('categories.editCategory') : t('categories.addCategory')}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width="95vw"
        style={{ maxWidth: '420px' }}
        okText={t('common.save')}
        cancelButtonProps={{ style: { display: 'none' } }}
        maskClosable={true}
        destroyOnHidden={true}
      >
        {modalVisible && (
          <Form form={form} layout="vertical" preserve={false} style={{ marginTop: 'var(--spacing-md)' }}>
          {/* 分类名称 */}
          <Form.Item
            name="name"
            label={t('categories.fields.name')}
            rules={[{ required: true, message: t('errors.required', { field: t('categories.fields.name') }) }]}
          >
            <Input size="large" placeholder={t('categories.namePlaceholder')} />
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
                  const isSelected = form.getFieldValue('iconName') === iconItem.code;
                  const selectedColor = form.getFieldValue('color') || COLOR_PRESETS[0];
                  return (
                    <div
                      key={iconItem.code}
                      onClick={() => form.setFieldValue('iconName', iconItem.code)}
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
              const isSelected = form.getFieldValue('color') === color;
              return (
                <div
                  key={color}
                  onClick={() => form.setFieldValue('color', color)}
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
          <Form.Item name="type" style={{ display: 'none' }}>
            <Input />
          </Form.Item>
          <Form.Item name="iconName" style={{ display: 'none' }} initialValue={MATERIAL_ICON_CATEGORIES[0].icons[0].code}>
            <Input />
          </Form.Item>
          <Form.Item name="color" style={{ display: 'none' }} initialValue={COLOR_PRESETS[0]}>
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
    </div>
  );
};

export default Categories;
