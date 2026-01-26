# app/api/router.py
from fastapi import APIRouter
from app.api.v1 import auth, user, upload, activities, health
from app.api.v1 import accounts, transactions, categories, statistics, budgets, transaction_images, init

# 这里聚合 v1 的各个子路由模块；请按你的实际文件调整导入
# 例如：app/api/v1/users.py 和 app/api/v1/activities.py 都应定义 `router = APIRouter()`

api_router = APIRouter(prefix="/api/v1")

# 将各子路由挂到 /api/v1 下
api_router.include_router(user.router, tags=["user"])
api_router.include_router(activities.router, tags=["activities"])
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(upload.router, tags=["upload"])
api_router.include_router(health.router, tags=["health"])

# 记账功能路由
api_router.include_router(accounts.router, tags=["accounts"])
api_router.include_router(transactions.router, tags=["transactions"])
api_router.include_router(categories.router, tags=["categories"])
api_router.include_router(statistics.router, tags=["statistics"])
api_router.include_router(budgets.router, tags=["budgets"])
api_router.include_router(transaction_images.router, tags=["transaction_images"])
api_router.include_router(init.router, tags=["init"])

__all__ = ["api_router"]
