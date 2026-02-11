import { useState } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { IconDisplay } from './IconDisplay';
import type { Category } from '@/types';
import { useCreateCategory } from '@/queries';

const MATERIAL_ICON_CATEGORIES = [
  {
    name: '餐饮',
    icons: [
      { code: 'restaurant', name: '餐厅' },
      { code: 'local_dining', name: '美食' },
      { code: 'fastfood', name: '快餐' },
      { code: 'lunch_dining', name: '午餐' },
      { code: 'dinner_dining', name: '晚餐' },
      { code: 'breakfast_dining', name: '早餐' },
      { code: 'ramen_dining', name: '拉面' },
      { code: 'kebab_dining', name: '烤肉' },
      { code: 'set_meal', name: '套餐' },
      { code: 'rice_bowl', name: '米饭' },
      { code: 'local_cafe', name: '咖啡馆' },
      { code: 'local_drink', name: '饮品' },
      { code: 'bakery_dining', name: '烘焙' },
      { code: 'brunch_dining', name: '早午餐' },
      { code: 'takeout_dining', name: '外卖' },
      { code: 'cookie', name: '零食' },
      { code: 'coffee', name: '咖啡' },
      { code: 'emoji_food_beverage', name: '茶' },
      { code: 'dining', name: '自助餐' },
      { code: 'local_pizza', name: '披萨' },
      { code: 'restaurant_menu', name: '餐厅菜单' },
      { code: 'menu_book', name: '菜单' },
    ],
  },
  {
    name: '交通',
    icons: [
      { code: 'directions_car', name: '汽车' },
      { code: 'directions_bus', name: '公交' },
      { code: 'directions_subway', name: '地铁' },
      { code: 'directions_railway', name: '火车' },
      { code: 'flight', name: '航班' },
      { code: 'local_taxi', name: '出租车' },
      { code: 'two_wheeler', name: '摩托车' },
      { code: 'pedal_bike', name: '自行车' },
      { code: 'directions_walk', name: '自行车' },
      { code: 'electric_scooter', name: '电动滑板车' },
      { code: 'directions_transit', name: '步行' },
      { code: 'traffic', name: '交通' },
      { code: 'directions', name: '方向' },
      { code: 'directions_bike', name: '共享单车' },
      { code: 'directions_boat', name: '轮渡' },
      { code: 'flight_land', name: '航班降落' },
      { code: 'flight_takeoff', name: '航班起飞' },
      { code: 'train', name: '有轨电车' },
      { code: 'local_atm', name: '汽车租赁' },
      { code: 'local_shipping', name: '洗车' },
    ],
  },
  {
    name: '购物',
    icons: [
      { code: 'shopping_cart', name: '购物车' },
      { code: 'shopping_basket', name: '购物篮' },
      { code: 'shopping_bag', name: '购物袋' },
      { code: 'shop', name: '便利店' },
      { code: 'storefront', name: '商店' },
      { code: 'local_grocery_store', name: '杂货店' },
      { code: 'local_mall', name: '商场' },
      { code: 'local_offer', name: '优惠券' },
      { code: 'wallet_giftcard', name: '礼品卡' },
      { code: 'wallet_membership', name: '会员卡' },
      { code: 'local_laundry_service', name: '洗衣服务' },
      { code: 'local_post_office', name: '洗衣' },
      { code: 'local_print_shop', name: '干洗' },
      { code: 'local_florist', name: '花店' },
      { code: 'store', name: '日用品' },
      { code: 'checkroom', name: '服饰' },
      { code: 'devices', name: '数码' },
      { code: 'weekend', name: '家居' },
      { code: 'local_parking', name: '停车场' },
      { code: 'point_of_sale', name: '销售点' },
    ],
  },
  {
    name: '住房',
    icons: [
      { code: 'home', name: '主页' },
      { code: 'house', name: '房屋' },
      { code: 'apartment', name: '公寓' },
      { code: 'cottage', name: '小屋' },
      { code: 'cabin', name: '别墅' },
      { code: 'apartment', name: '房租' },
      { code: 'water_drop', name: '水电' },
      { code: 'hotel', name: '酒店' },
      { code: 'bed', name: '床' },
      { code: 'king_bed', name: '大床' },
      { code: 'single_bed', name: '单人床' },
      { code: 'kitchen', name: '厨房' },
      { code: 'chair_alt', name: '椅子' },
      { code: 'chair', name: '椅子' },
      { code: 'balcony', name: '阳台' },
      { code: 'build', name: '维修' },
      { code: 'router', name: '宽带' },
      { code: 'wifi_tethering', name: '网费' },
      { code: 'wc', name: '家庭洗手间' },
      { code: 'fireplace', name: '壁炉' },
    ],
  },
  {
    name: '通讯',
    icons: [
      { code: 'phone_iphone', name: '话费' },
      { code: 'email', name: '流量' },
      { code: 'router', name: '宽带' },
      { code: 'phone', name: '通讯录' },
      { code: 'phone_forwarded', name: '消息' },
      { code: 'comment', name: '评论' },
      { code: 'outbox', name: '发信箱' },
      { code: 'invert_colors_off', name: '收信箱' },
      { code: 'forum', name: '邮件' },
      { code: 'lock', name: '邮件锁定' },
      { code: 'phone_missed', name: '移动消息' },
      { code: 'face', name: '联系人' },
      { code: 'quick_contacts_mail', name: '联系邮箱' },
      { code: 'ring_volume', name: '联系电话' },
      { code: 'phone_in_talk', name: '消息提醒' },
      { code: 'time_to_leave', name: '未读消息' },
      { code: 'network_wifi', name: '通讯录清单' },
      { code: 'nfc', name: '通讯星标' },
      { code: 'sim_card', name: 'SIM卡' },
      { code: 'sim_card', name: 'SIM卡2' },
    ],
  },
  {
    name: '订阅',
    icons: [
      { code: 'subscriptions', name: '订阅' },
      { code: 'music_note', name: '视频音乐' },
      { code: 'computer', name: '软件服务' },
      { code: 'videogame_asset', name: '游戏' },
      { code: 'movie', name: '电影' },
      { code: 'games', name: '游戏' },
      { code: 'menu_book', name: '知识付费' },
      { code: 'book', name: '书籍' },
      { code: 'wifi_tethering', name: '云存储' },
      { code: 'brightness_2', name: '云队列' },
      { code: 'brightness_3', name: '云上传' },
      { code: 'savings', name: '理财' },
      { code: 'currency_bitcoin', name: '比特币' },
      { code: 'credit_card', name: '基金' },
      { code: 'currency_exchange', name: '货币兑换' },
      { code: 'email', name: '流量' },
      { code: 'music_video', name: '音乐视频' },
      { code: 'subscriptions', name: '视频库' },
      { code: 'theaters', name: '剧院' },
      { code: 'photo', name: '照片' },
    ],
  },
  {
    name: '宠物',
    icons: [
      { code: 'pets', name: '宠物' },
      { code: 'cookie', name: '食品' },
      { code: 'medical_services', name: '医疗' },
      { code: 'local_hospital', name: '医院' },
      { code: 'store', name: '用品' },
      { code: 'face', name: '美容' },
      { code: 'hotel', name: '寄养' },
      { code: 'local_florist', name: '花店' },
      { code: 'pool', name: '宠物护理' },
      { code: 'room_service', name: '宠物旅行' },
      { code: 'smoke_free', name: '宠物兽医' },
      { code: 'female', name: '女性' },
      { code: 'male', name: '男性' },
      { code: 'elderly_woman', name: '老年女性' },
      { code: 'health_and_safety', name: '健康安全' },
    ],
  },
  {
    name: '娱乐',
    icons: [
      { code: 'music_note', name: '视频音乐' },
      { code: 'games', name: '游戏' },
      { code: 'videogame_asset', name: '游戏机' },
      { code: 'movie', name: '电影' },
      { code: 'theater_comedy', name: 'KTV' },
      { code: 'local_activity', name: '活动' },
      { code: 'nature_people', name: '旅游' },
      { code: 'local_airport', name: '景点' },
      { code: 'theaters', name: '剧院' },
      { code: 'music_video', name: '音乐视频' },
      { code: 'subscriptions', name: '视频库' },
      { code: 'photo', name: '照片' },
      { code: 'photo_album', name: '相册' },
      { code: 'photo_camera', name: '相机' },
      { code: 'photo_library', name: '照片库' },
      { code: 'camera_roll', name: '相机' },
      { code: 'enhance_photo_translate', name: '相机增强' },
      { code: 'photo_filter', name: '照片滤镜' },
      { code: 'palette', name: '调色板' },
      { code: 'brush', name: '画笔' },
      { code: 'tag_faces', name: '表情' },
      { code: 'panorama', name: '全景' },
    ],
  },
  {
    name: '健康',
    icons: [
      { code: 'health_and_safety', name: '健康安全' },
      { code: 'health_and_safety', name: '体检' },
      { code: 'medical_services', name: '药品' },
      { code: 'local_hospital', name: '医院' },
      { code: 'assignment', name: '挂号' },
      { code: 'spa', name: '保健品' },
      { code: 'health_and_safety', name: '保险' },
      { code: 'accessible', name: '无障碍' },
      { code: 'wash', name: '洗手' },
      { code: 'medical_information', name: '医疗信息' },
      { code: 'hiking', name: '健身房' },
      { code: 'fitness_center', name: '健身中心' },
      { code: 'science', name: '科学' },
      { code: 'healing', name: '治愈' },
      { code: 'hearing', name: '听力' },
      { code: 'hearing_disabled', name: '听力障碍' },
      { code: 'elderly', name: '老人' },
      { code: 'female', name: '女性' },
      { code: 'male', name: '男性' },
      { code: 'pregnant_woman', name: '孕妇' },
    ],
  },
  {
    name: '教育',
    icons: [
      { code: 'school', name: '学校' },
      { code: 'account_balance', name: '学费' },
      { code: 'menu_book', name: '书籍' },
      { code: 'cast_for_education', name: '培训' },
      { code: 'computer', name: '在线课程' },
      { code: 'class', name: '班级' },
      { code: 'history_edu', name: '教育历史' },
      { code: 'highlight', name: '高亮' },
      { code: 'note_add', name: '笔记添加' },
      { code: 'note', name: '笔记' },
      { code: 'notes', name: '笔记列表' },
      { code: 'edit_note', name: '编辑笔记' },
      { code: 'book', name: '图书' },
      { code: 'bookmark', name: '书签' },
      { code: 'my_library_books', name: '图书馆添加' },
      { code: 'my_library_music', name: '图书馆音乐' },
      { code: 'my_library_add', name: '图书馆添加' },
      { code: 'inbox', name: '收件箱' },
      { code: 'drafts', name: '草稿箱' },
      { code: 'quiz', name: '考试' },
    ],
  },
  {
    name: '人情',
    icons: [
      { code: 'wallet_giftcard', name: '红包' },
      { code: 'redeem', name: '请客' },
      { code: 'favorite', name: '礼品' },
      { code: 'vertical_align_top', name: '孝敬' },
      { code: 'attach_money', name: '借出' },
      { code: 'celebration', name: '生日礼金' },
      { code: 'add', name: '节日礼金' },
      { code: 'favorite', name: '婚礼礼金' },
      { code: 'thumb_up', name: '红包2' },
      { code: 'wallet_membership', name: '会员卡' },
      { code: 'wallet_travel', name: '旅行卡' },
      { code: 'view_module', name: '纪念品' },
      { code: 'view_week', name: '礼盒' },
      { code: 'theater_comedy', name: '庆祝' },
      { code: 'festival', name: '节日' },
      { code: 'local_activity', name: '活动' },
      { code: 'star', name: '星标' },
      { code: 'star_border', name: '星标边框' },
      { code: 'star_half', name: '半星' },
      { code: 'favorite', name: '收藏' },
    ],
  },
];
const COLOR_PRESETS = [
  '#F5222D', '#FA8C16', '#FAAD14', '#52C41A', '#13C2C2',
  '#1890FF', '#722ED1', '#EB2F96',
];

interface AddCategoryModalProps {
  visible: boolean;
  onCancel: () => void;
  onCreated?: (categoryId: number) => void;
  categoryType: 'expense' | 'income';
  parentId?: number | null;
}

export const AddCategoryModal = ({
  visible,
  onCancel,
  onCreated,
  categoryType,
  parentId,
}: AddCategoryModalProps) => {
  const [form] = Form.useForm();
  const createCategory = useCreateCategory();
  const [selectedIconCategory, setSelectedIconCategory] = useState(0);
  const [selectedIconName, setSelectedIconName] = useState(MATERIAL_ICON_CATEGORIES[0].icons[0].code);
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const categoryData: Partial<Category> = {
        name: values.name,
        type: categoryType,
        icon: values.iconName,
        color: values.color,
        isActive: true,
        parentId: parentId || undefined,
      };

      const newCategory = await createCategory.mutateAsync(categoryData as any);
      message.success('分类创建成功');

      // 重置表单
      form.resetFields();
      setSelectedIconCategory(0);
      setSelectedIconName(MATERIAL_ICON_CATEGORIES[0].icons[0].code);
      setSelectedColor(COLOR_PRESETS[0]);

      // 通知父组件
      if (onCreated && newCategory?.id) {
        onCreated(newCategory.id);
      }

      onCancel();
    } catch (error) {
      message.error('创建分类失败');
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSelectedIconCategory(0);
    setSelectedIconName(MATERIAL_ICON_CATEGORIES[0].icons[0].code);
    setSelectedColor(COLOR_PRESETS[0]);
    onCancel();
  };

  return (
    <Modal
      title="添加分类"
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="创建"
      cancelButtonProps={{ style: { display: 'none' } }}
      width="95vw"
      style={{ maxWidth: '420px' }}
      maskClosable={true}
      destroyOnClose={true}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 'var(--spacing-md)' }}>
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
                      form.setFieldValue('iconName', iconItem.code);
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
                  form.setFieldValue('color', color);
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
  );
};
