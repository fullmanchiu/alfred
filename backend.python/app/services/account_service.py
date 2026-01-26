from sqlalchemy.orm import Session
from decimal import Decimal
from typing import Optional, List, Dict, Any
from app.models.account import Account
from app.core.exceptions import AccountNotFoundError


class AccountService:
    """Service layer for account management"""
    
    @staticmethod
    def create_account(user_id: int, data: Dict[str, Any], db: Session) -> Account:
        """Create a new account"""
        name = data.get('name')
        account_type = data.get('account_type')
        initial_balance = Decimal(str(data.get('initial_balance', 0)))
        is_default = data.get('is_default', False)
        
        with db.begin():
            # If setting as default, unset other default accounts
            if is_default:
                db.query(Account).filter(
                    Account.user_id == user_id,
                    Account.is_default == True
                ).update({"is_default": False})
            
            new_account = Account(
                user_id=user_id,
                name=name,
                account_type=account_type,
                account_number=data.get('account_number'),
                balance=initial_balance,
                currency=data.get('currency', 'CNY'),
                icon=data.get('icon'),
                color=data.get('color'),
                notes=data.get('notes'),
                is_default=is_default
            )
            
            db.add(new_account)
            db.flush()
            db.refresh(new_account)
            
            return new_account
    
    @staticmethod
    def update_account(user_id: int, account_id: int, data: Dict[str, Any], db: Session) -> Account:
        """Update account information"""
        account = db.query(Account).filter_by(
            id=account_id,
            user_id=user_id
        ).first()
        
        if not account:
            raise AccountNotFoundError(f"Account {account_id} not found")
        
        update_data = {k: v for k, v in data.items() if v is not None}
        
        for field, value in update_data.items():
            if field == 'initial_balance':
                continue  # Don't update balance through this method
            setattr(account, field, value)
        
        # Handle default account logic
        if data.get('is_default'):
            db.query(Account).filter(
                Account.user_id == user_id,
                Account.id != account_id,
                Account.is_default == True
            ).update({"is_default": False})
        
        db.commit()
        db.refresh(account)
        return account
    
    @staticmethod
    def delete_account(user_id: int, account_id: int, db: Session) -> bool:
        """Soft delete account (set is_active=False)"""
        account = db.query(Account).filter_by(
            id=account_id,
            user_id=user_id
        ).first()
        
        if not account:
            raise AccountNotFoundError(f"Account {account_id} not found")
        
        account.is_active = False
        db.commit()
        return True
    
    @staticmethod
    def get_accounts(user_id: int, db: Session) -> List[Account]:
        """Get all active accounts for a user"""
        accounts = db.query(Account).filter(
            Account.user_id == user_id,
            Account.is_active == True
        ).order_by(Account.is_default.desc(), Account.created_at).all()
        
        return accounts
    
    @staticmethod
    def get_account_balance(user_id: int, account_id: int, db: Session) -> float:
        """Get balance for a specific account"""
        account = db.query(Account).filter_by(
            id=account_id,
            user_id=user_id,
            is_active=True
        ).first()
        
        if not account:
            raise AccountNotFoundError(f"Account {account_id} not found")
        
        return float(account.balance or 0)
    
    @staticmethod
    def update_account_balance(account_id: int, amount: Decimal, db: Session) -> Account:
        """Update account balance (used by transactions)"""
        account = db.query(Account).filter_by(id=account_id).first()
        
        if not account:
            raise AccountNotFoundError(f"Account {account_id} not found")
        
        account.balance = amount
        db.flush()
        return account
