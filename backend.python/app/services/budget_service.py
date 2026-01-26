from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import datetime
from typing import Dict, Any
from app.models.budget import Budget
from app.core.exceptions import (
    BudgetAlreadyExistsError,
    CategoryNotFoundError,
    AccountNotFoundError
)


class BudgetService:
    """Service layer for budget management"""
    
    @staticmethod
    def create_budget(user_id: int, data: Dict[str, Any], db: Session) -> Budget:
        """Create a new budget"""
        category_id = data.get('category_id')
        amount = Decimal(str(data.get('amount', 0)))
        period = data.get('period', 'monthly')
        alert_threshold = data.get('alert_threshold', 80.0)
        
        with db.begin():
            # Check if budget already exists for this category/period
            existing = db.query(Budget).filter_by(
                user_id=user_id,
                category_id=category_id,
                period=period,
                is_active=True
            ).first()
            
            if existing:
                raise BudgetAlreadyExistsError(
                    f"Budget already exists for category {category_id} with period {period}"
                )
            
            # Set start date based on period
            now = datetime.utcnow()
            if period == "monthly":
                start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            elif period == "yearly":
                start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            elif period == "weekly":
                start_date = now
            else:
                start_date = now
            
            new_budget = Budget(
                user_id=user_id,
                category_id=category_id,
                amount=amount,
                period=period,
                alert_threshold=Decimal(str(alert_threshold)),
                start_date=start_date
            )
            
            db.add(new_budget)
            db.flush()
            db.refresh(new_budget)
            
            return new_budget
    
    @staticmethod
    def update_budget(user_id: int, budget_id: int, data: Dict[str, Any], db: Session) -> Budget:
        """Update budget information"""
        budget = db.query(Budget).filter_by(
            id=budget_id,
            user_id=user_id
        ).first()
        
        if not budget:
            raise AccountNotFoundError(f"Budget {budget_id} not found")
        
        update_data = {k: v for k, v in data.items() if v is not None}
        
        for field, value in update_data.items():
            if field in ['amount', 'alert_threshold']:
                setattr(budget, field, Decimal(str(value)))
            else:
                setattr(budget, field, value)
        
        db.commit()
        db.refresh(budget)
        return budget
    
    @staticmethod
    def delete_budget(user_id: int, budget_id: int, db: Session) -> bool:
        """Delete budget (soft delete - set is_active=False)"""
        budget = db.query(Budget).filter_by(
            id=budget_id,
            user_id=user_id
        ).first()
        
        if not budget:
            raise AccountNotFoundError(f"Budget {budget_id} not found")
        
        budget.is_active = False
        db.commit()
        return True
    
    @staticmethod
    def get_budgets(user_id: int, period: str = None, db: Session = None) -> list:
        """Get budgets for a user, optionally filtered by period"""
        query = db.query(Budget).filter(Budget.user_id == user_id)
        
        if period:
            query = query.filter(Budget.period == period)
        
        budgets = query.filter(Budget.is_active == True).all()
        return budgets
