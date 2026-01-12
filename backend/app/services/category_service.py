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
        "subcategories": ["早餐", "午餐", "晚餐", "零食", "外卖"]
    },
    {
        "name": "交通",
        "icon": "transport",
        "color": "#ff7a45",
        "subcategories": ["公交", "地铁", "出租车", "加油", "停车"]
    },
    {
        "name": "购物",
        "icon": "shopping",
        "color": "#ffa940",
        "subcategories": ["日用品", "服装", "电子产品", "家电"]
    },
    {
        "name": "居住",
        "icon": "home",
        "color": "#ffc53d",
        "subcategories": ["房租", "水电费", "燃气费", "物业费"]
    },
    {
        "name": "娱乐",
        "icon": "entertainment",
        "color": "#ffec3d",
        "subcategories": ["电影", "KTV", "游戏", "旅游"]
    },
    {
        "name": "医疗",
        "icon": "medical",
        "color": "#bae637",
        "subcategories": ["挂号", "药品", "体检", "保险"]
    },
    {
        "name": "教育",
        "icon": "education",
        "color": "#73d13d",
        "subcategories": ["学费", "书籍", "培训", "考证"]
    },
    {
        "name": "通讯",
        "icon": "phone",
        "color": "#52c41a",
        "subcategories": ["话费", "宽带", "流量"]
    },
    {
        "name": "人情",
        "icon": "social",
        "color": "#13c2c2",
        "subcategories": ["礼物", "红包", "请客"]
    },
    {"name": "其他支出", "icon": "other", "color": "#ffffff"},
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
