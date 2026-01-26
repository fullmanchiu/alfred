"""修复老用户子分类的图标和颜色

为老用户的二级分类添加图标和颜色，继承自父分类
"""

import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models.category import Category


def fix_subcategory_icon_color():
    """修复子分类的图标和颜色"""
    db: Session = SessionLocal()

    try:
        # 查找所有有子分类的父分类
        parent_categories = db.query(Category).filter(
            Category.parent_id.is_(None)
        ).all()

        fixed_count = 0

        for parent in parent_categories:
            if parent.subcategories:
                for subcategory in parent.subcategories:
                    # 如果子分类没有图标，继承父分类的图标
                    if not subcategory.icon and parent.icon:
                        subcategory.icon = parent.icon
                        fixed_count += 1

                    # 如果子分类没有颜色，继承父分类的颜色
                    if not subcategory.color and parent.color:
                        subcategory.color = parent.color
                        fixed_count += 1

        db.commit()

        print(f"✅ 成功修复了 {fixed_count} 个子分类的图标和颜色")

    except Exception as e:
        db.rollback()
        print(f"❌ 修复失败: {str(e)}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("开始修复老用户子分类的图标和颜色...")
    fix_subcategory_icon_color()
    print("修复完成！")
