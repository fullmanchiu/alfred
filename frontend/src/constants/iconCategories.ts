/**
 * 图标分类数据 - 共享常量
 *
 * 用于：
 * - Categories.tsx (分类管理页面)
 * - Transactions.tsx (记账页面)
 *
 * 修改此文件会同时影响两个页面的图标选择器
 */

export interface IconCategory {
  name: string;
  icons: Array<{ code: string; name: string }>;
}

/**
 * Material Icon 图标分类
 *
 * 设计原则：
 * - 只保留具体的、可记录的消费项目
 * - 移除抽象概念、工具、功能类图标
 * - 避免重复和冗余
 */
export const MATERIAL_ICON_CATEGORIES: IconCategory[] = [
  {
    name: '餐饮',
    icons: [
      // 用餐时间
      { code: 'breakfast_dining', name: '早餐' },
      { code: 'brunch_dining', name: '早午餐' },
      { code: 'lunch_dining', name: '午餐' },
      { code: 'dinner_dining', name: '晚餐' },
      // 餐厅类型
      { code: 'restaurant', name: '餐厅' },
      { code: 'local_restaurant', name: '本地餐厅' },
      { code: 'table_restaurant', name: '餐桌' },
      { code: 'fastfood', name: '快餐' },
      { code: 'dining', name: '餐饮' },
      // 餐饮服务
      { code: 'takeout_dining', name: '外卖' },
      { code: 'delivery_dining', name: '外送' },
      { code: 'set_meal', name: '套餐' },
      { code: 'free_breakfast', name: '免费早餐' },
      { code: 'restaurant_menu', name: '菜单' },
      { code: 'food_bank', name: '食物银行' },
      // 特色餐饮
      { code: 'ramen_dining', name: '拉面' },
      { code: 'rice_bowl', name: '米饭' },
      { code: 'kebab_dining', name: '烤肉串' },
      { code: 'local_pizza', name: '披萨' },
      { code: 'tapas', name: '塔帕斯' },
      { code: 'outdoor_grill', name: '烧烤' },
      // 食物
      { code: 'soup_kitchen', name: '汤' },
      { code: 'bakery_dining', name: '烘焙' },
      { code: 'cookie', name: '曲奇' },
      { code: 'cake', name: '蛋糕' },
      { code: 'egg', name: '鸡蛋' },
      { code: 'icecream', name: '冰淇淋' },
      { code: 'flatware', name: '餐具' },
      { code: 'emoji_food_beverage', name: '食物饮料' },
      // 饮料
      { code: 'local_cafe', name: '咖啡馆' },
      { code: 'coffee', name: '咖啡' },
      { code: 'coffee_maker', name: '咖啡机' },
      { code: 'local_drink', name: '饮料' },
      { code: 'local_bar', name: '酒吧' },
      { code: 'liquor', name: '烈酒' },
      { code: 'wine_bar', name: '红酒' },
      { code: 'sports_bar', name: '运动酒吧' },
      { code: 'water', name: '水' },
      { code: 'water_drop', name: '水滴' },
    ],
  },
  {
    name: '交通',
    icons: [
      { code: 'directions_bus', name: '公交' },
      { code: 'subway', name: '地铁' },
      { code: 'train', name: '火车' },
      { code: 'flight', name: '飞机' },
      { code: 'local_taxi', name: '打车' },
      { code: 'directions_bike', name: '共享单车' },
      { code: 'local_gas_station', name: '加油' },
      { code: 'ev_station', name: '充电' },
      { code: 'local_parking', name: '停车费' },
      { code: 'build', name: '保养' },
      { code: 'no_crash', name: '保险' },
      { code: 'car_rental', name: '租车' },
      { code: 'directions_ferry', name: '轮渡' },
    ],
  },
  {
    name: '购物',
    icons: [
      { code: 'checkroom', name: '服饰' },
      { code: 'devices', name: '数码产品' },
      { code: 'soap', name: '日用品' },
      { code: 'weekend', name: '家居' },
      { code: 'local_florist', name: '鲜花' },
      { code: 'child_care', name: '玩具' },
      { code: 'book', name: '图书' },
      { code: 'fitness_center', name: '运动用品' },
      { code: 'local_laundry_service', name: '洗衣' },
    ],
  },
  {
    name: '住房',
    icons: [
      { code: 'home', name: '房租' },
      { code: 'home_work', name: '房贷' },
      { code: 'payments', name: '物业费' },
      { code: 'water_drop', name: '水费' },
      { code: 'electrical_services', name: '电费' },
      { code: 'local_fire_department', name: '燃气费' },
      { code: 'router', name: '网费' },
      { code: 'waves', name: '供暖费' },
      { code: 'cleaning_services', name: '家政' },
      { code: 'handyman', name: '维修' },
    ],
  },
  {
    name: '订阅',
    icons: [
      { code: 'play_circle', name: '视频会员' },
      { code: 'apps', name: '软件服务' },
      { code: 'videogame_asset', name: '游戏' },
      { code: 'menu_book', name: '知识付费' },
      { code: 'cloud', name: '云存储' },
      { code: 'star', name: '星级会员' },
      { code: 'workspace_premium', name: 'VIP' },
      { code: 'verified', name: '认证会员' },
      { code: 'card_membership', name: '会员卡' },
    ],
  },
  {
    name: '娱乐',
    icons: [
      { code: 'sports_esports', name: '游戏' },
      { code: 'movie', name: '电影' },
      { code: 'mic', name: 'KTV' },
      { code: 'landscape', name: '景点' },
      { code: 'theater_comedy', name: '演出' },
      { code: 'photo_camera', name: '摄影' },
      { code: 'sports', name: '运动' },
    ],
  },
  {
    name: '健康',
    icons: [
      { code: 'assignment', name: '体检' },
      { code: 'medication', name: '药品' },
      { code: 'local_hospital', name: '医院' },
      { code: 'event_available', name: '挂号' },
      { code: 'vaccines', name: '保健品' },
      { code: 'verified_user', name: '保险' },
      { code: 'fitness_center', name: '健身' },
      { code: 'spa', name: '按摩' },
    ],
  },
  {
    name: '教育',
    icons: [
      { code: 'school', name: '学费' },
      { code: 'menu_book', name: '书籍' },
      { code: 'cast_for_education', name: '培训' },
      { code: 'computer', name: '在线课程' },
      { code: 'quiz', name: '考试' },
    ],
  },
  {
    name: '人情',
    icons: [
      { code: 'card_giftcard', name: '红包' },
      { code: 'restaurant_menu', name: '请客' },
      { code: 'redeem', name: '礼品' },
      { code: 'elderly', name: '孝敬' },
      { code: 'volunteer_activism', name: '借出' },
      { code: 'celebration', name: '庆典' },
    ],
  },
  {
    name: '其他',
    icons: [
      { code: 'phone_in_talk', name: '话费' },
      { code: 'pets', name: '宠物' },
    ],
  },
];

/**
 * 预设颜色
 */
export const COLOR_PRESETS = [
  '#F5222D', '#FA8C16', '#FAAD14', '#52C41A', '#13C2C2',
  '#1890FF', '#722ED1', '#EB2F96',
];
