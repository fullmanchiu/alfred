"""默认分类初始化服务

为新用户创建默认的收入和支出分类
"""

from sqlalchemy.orm import Session
from app.models.category import Category


# 默认收入分类
DEFAULT_INCOME_CATEGORIES = [
    {"name": "工资", "icon": "salary", "color": "#52c41a"},
    {"name": "奖金", "icon": "bonus", "color": "#73d13d"},
    {"name": "投资收益", "icon": "investment", "color": "#95de64"},
    {"name": "兼职", "icon": "parttime", "color": "#b7eb8f"},
    {"name": "礼金", "icon": "gift", "color": "#d9f7be"},
    {"name": "其他收入", "icon": "other", "color": "#ffffff"},
]

# 默认支出分类（带子分类）
DEFAULT_EXPENSE_CATEGORIES = [
    {
        "name": "餐饮",
        "icon": "food",
        "color": "#ff4d4f",
        "subcategories": [
            {"name": "早餐", "icon": "breakfast_dining"},
            {"name": "午餐", "icon": "restaurant"},
            {"name": "晚餐", "icon": "dinner_dining"},
            {"name": "零食", "icon": "fastfood"},
            {"name": "外卖", "icon": "local_dining"}
        ]
    },
    {
        "name": "交通",
        "icon": "transport",
        "color": "#ff7a45",
        "subcategories": [
            {"name": "公交", "icon": "directions_bus"},
            {"name": "地铁", "icon": "subway"},
            {"name": "出租车", "icon": "local_taxi"},
            {"name": "加油", "icon": "local_gas_station"},
            {"name": "停车", "icon": "local_parking"}
        ]
    },
    {
        "name": "购物",
        "icon": "shopping",
        "color": "#ffa940",
        "subcategories": [
            {"name": "日用品", "icon": "shopping_basket"},
            {"name": "服装", "icon": "checkroom"},
            {"name": "电子产品", "icon": "devices"},
            {"name": "家电", "icon": "kitchen"}
        ]
    },
    {
        "name": "居住",
        "icon": "home",
        "color": "#ffc53d",
        "subcategories": [
            {"name": "房租", "icon": "apartment"},
            {"name": "水电费", "icon": "water_drop"},
            {"name": "燃气费", "icon": "propane_tank"},
            {"name": "物业费", "icon": "home_work"}
        ]
    },
    {
        "name": "娱乐",
        "icon": "entertainment",
        "color": "#ffec3d",
        "subcategories": [
            {"name": "电影", "icon": "movie"},
            {"name": "KTV", "icon": "mic"},
            {"name": "游戏", "icon": "sports_esports"},
            {"name": "旅游", "icon": "flight"}
        ]
    },
    {
        "name": "医疗",
        "icon": "medical",
        "color": "#bae637",
        "subcategories": [
            {"name": "挂号", "icon": "local_hospital"},
            {"name": "药品", "icon": "medication"},
            {"name": "体检", "icon": "health_and_safety"},
            {"name": "保险", "icon": "vaccines"}
        ]
    },
    {
        "name": "教育",
        "icon": "education",
        "color": "#73d13d",
        "subcategories": [
            {"name": "学费", "icon": "school"},
            {"name": "书籍", "icon": "menu_book"},
            {"name": "培训", "icon": "psychology"},
            {"name": "考证", "icon": "workspace_premium"}
        ]
    },
    {
        "name": "通讯",
        "icon": "phone",
        "color": "#52c41a",
        "subcategories": [
            {"name": "话费", "icon": "phone"},
            {"name": "宽带", "icon": "wifi"},
            {"name": "流量", "icon": "network_check"}
        ]
    },
    {
        "name": "人情",
        "icon": "social",
        "color": "#13c2c2",
        "subcategories": [
            {"name": "礼物", "icon": "card_giftcard"},
            {"name": "红包", "icon": "redeem"},
            {"name": "请客", "icon": "restaurant"}
        ]
    },
    {"name": "其他支出", "icon": "other", "color": "#607D8B"},
]


def init_default_categories(user_id: int, db: Session) -> None:
    """为新用户初始化默认分类

    Args:
        user_id: 用户ID
        db: 数据库会话
    """
    # 检查用户是否已有分类
    existing = db.query(Category).filter_by(user_id=user_id).first()
    if existing:
        return

    # 创建收入分类
    for cat_data in DEFAULT_INCOME_CATEGORIES:
        category = Category(
            user_id=user_id,
            name=cat_data["name"],
            type="income",
            icon=cat_data["icon"],
            color=cat_data["color"],
            is_system=True
        )
        db.add(category)

    # 创建支出分类
    for cat_data in DEFAULT_EXPENSE_CATEGORIES:
        category = Category(
            user_id=user_id,
            name=cat_data["name"],
            type="expense",
            icon=cat_data["icon"],
            color=cat_data["color"],
            is_system=True
        )
        db.add(category)
        db.flush()  # 获取ID

        # 创建子分类（如果有）
        if "subcategories" in cat_data:
            for sub_name in cat_data["subcategories"]:
                subcategory = Category(
                    user_id=user_id,
                    name=sub_name,
                    type="expense",
                    parent_id=category.id,
                    icon=cat_data["icon"],  # 继承父分类的图标
                    color=cat_data["color"],  # 继承父分类的颜色
                    is_system=True
                )
                db.add(subcategory)

    db.commit()
