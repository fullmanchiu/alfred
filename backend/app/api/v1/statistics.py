"""统计分析API"""
from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_
from app.api.v1.auth import get_current_user
from app.deps import get_db
from app.models.transaction import Transaction
from app.models.category import Category
from app.models.budget import Budget

router = APIRouter(prefix="/statistics", tags=["statistics"])


@router.get("/overview", summary="获取统计概览")
async def get_statistics_overview(
    period: str = Query("month", description="时间周期：week, month, year"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 计算日期范围 - 使用真正的本月/本周/本年
    now = datetime.utcnow()
    if period == "week":
        # 本周：从周一到周日
        start_date = now - timedelta(days=now.weekday())
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = start_date + timedelta(days=6)
        end_date = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)
    elif period == "month":
        # 本月：从1号到月底
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        # 计算月底
        if now.month == 12:
            end_date = now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            end_date = now.replace(month=now.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end_date = end_date - timedelta(seconds=1)
    elif period == "year":
        # 本年：从1月1号到12月31号
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end_date = now.replace(month=12, day=31, hour=23, minute=59, second=59, microsecond=999999)
    else:
        # 默认：过去30天
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=30)

    # 查询时间段内的交易
    # 计算总收入
    income_total = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.user_id == current_user["id"],
        Transaction.type == "income",
        Transaction.transaction_date >= start_date,
        Transaction.transaction_date <= end_date
    ).scalar()

    # 计算总支出
    expense_total = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
        Transaction.user_id == current_user["id"],
        Transaction.type == "expense",
        Transaction.transaction_date >= start_date,
        Transaction.transaction_date <= end_date
    ).scalar()

    # 分类统计
    category_stats = db.query(
        Category.name,
        Category.icon,
        Category.color,
        func.coalesce(func.sum(Transaction.amount), 0).label("total")
    ).outerjoin(
        Transaction,
        and_(
            Transaction.category_id == Category.id,
            Transaction.type == "expense",
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date
        )
    ).filter(
        Category.user_id == current_user["id"],
        Category.type == "expense",
        Category.parent_id.is_(None)  # 只统计主分类
    ).group_by(Category.id).all()

    return {
        "success": True,
        "data": {
            "period": period,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "income_total": float(income_total),
            "expense_total": float(expense_total),
            "net_savings": float(income_total - expense_total),
            "category_breakdown": [
                {
                    "name": stat.name,
                    "icon": stat.icon,
                    "color": stat.color,
                    "total": float(stat.total)
                }
                for stat in category_stats
                if stat.total > 0
            ]
        }
    }


@router.get("/trend", summary="获取趋势分析")
async def get_trend_analysis(
    type: str = Query("expense", description="交易类型：income or expense"),
    granularity: str = Query("daily", description="时间粒度：daily, weekly, monthly"),
    months: int = Query(6, description="分析月数"),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取收支趋势分析数据"""
    start_date = datetime.utcnow() - timedelta(days=30 * months)

    if granularity == "monthly":
        # 按月分组
        trend_data = db.query(
            extract('year', Transaction.transaction_date).label('year'),
            extract('month', Transaction.transaction_date).label('month'),
            func.coalesce(func.sum(Transaction.amount), 0).label("total")
        ).filter(
            Transaction.user_id == current_user["id"],
            Transaction.type == type,
            Transaction.transaction_date >= start_date
        ).group_by('year', 'month').order_by('year', 'month').all()

        formatted_data = [
            {
                "period": f"{int(d.year)}-{int(d.month):02d}",
                "total": float(d.total)
            }
            for d in trend_data
        ]
    elif granularity == "weekly":
        # 按周分组
        trend_data = db.query(
            extract('year', Transaction.transaction_date).label('year'),
            extract('week', Transaction.transaction_date).label('week'),
            func.coalesce(func.sum(Transaction.amount), 0).label("total")
        ).filter(
            Transaction.user_id == current_user["id"],
            Transaction.type == type,
            Transaction.transaction_date >= start_date
        ).group_by('year', 'week').order_by('year', 'week').all()

        formatted_data = [
            {
                "period": f"{int(d.year)}-W{int(d.week):02d}",
                "total": float(d.total)
            }
            for d in trend_data
        ]
    else:  # daily
        # 按天分组
        trend_data = db.query(
            func.date(Transaction.transaction_date).label('date'),
            func.coalesce(func.sum(Transaction.amount), 0).label("total")
        ).filter(
            Transaction.user_id == current_user["id"],
            Transaction.type == type,
            Transaction.transaction_date >= start_date
        ).group_by('date').order_by('date').all()

        formatted_data = [
            {
                "period": d.date.isoformat(),
                "total": float(d.total)
            }
            for d in trend_data
        ]

    return {
        "success": True,
        "data": {
            "type": type,
            "granularity": granularity,
            "trend": formatted_data
        }
    }


@router.get("/budget", summary="获取预算统计")
async def get_budget_statistics(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取当前月份的预算使用情况"""
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_end = (month_start.replace(month=month_start.month % 12 + 1, day=1)
                 if month_start.month < 12
                 else month_start.replace(year=month_start.year + 1, month=1, day=1))
    month_end = month_end - timedelta(seconds=1)

    # 获取活跃的月度预算
    budgets = db.query(Budget).filter(
        Budget.user_id == current_user["id"],
        Budget.is_active == True,
        Budget.period == "monthly"
    ).all()

    budget_stats = []
    for budget in budgets:
        # 计算实际支出
        spent = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
            Transaction.user_id == current_user["id"],
            Transaction.category_id == budget.category_id,
            Transaction.type == "expense",
            Transaction.transaction_date >= month_start,
            Transaction.transaction_date <= month_end
        ).scalar()

        percentage = (float(spent) / float(budget.amount) * 100) if budget.amount > 0 else 0
        remaining = float(budget.amount) - float(spent)
        is_over_budget = remaining < 0
        alert_triggered = percentage >= float(budget.alert_threshold)

        budget_stats.append({
            "category": {
                "id": budget.category.id,
                "name": budget.category.name,
                "icon": budget.category.icon,
                "color": budget.category.color
            },
            "budget_amount": float(budget.amount),
            "spent": float(spent),
            "remaining": remaining,
            "percentage": round(percentage, 2),
            "is_over_budget": is_over_budget,
            "alert_triggered": alert_triggered
        })

    return {
        "success": True,
        "data": {
            "period": f"{now.year}-{now.month:02d}",
            "budgets": budget_stats
        }
    }
