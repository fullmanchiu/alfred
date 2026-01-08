from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import datetime
from typing import Dict, Any, Optional
from app.models.transaction import Transaction, TransactionType
from app.models.account import Account
from app.models.tag import Tag, TransactionTag
from app.core.exceptions import (
    AccountNotFoundError,
    InsufficientFundsError,
    InvalidTransactionError
)


class TransactionService:
    """Service layer for transaction management with atomic operations"""
    
    @staticmethod
    def create_transaction(user_id: int, data: Dict[str, Any], db: Session) -> Transaction:
        """Create transaction with automatic balance updates in a single transaction"""
        try:
            transaction_type = data.get('type')
            amount = Decimal(str(data.get('amount', 0)))
            from_account_id = data.get('from_account_id')
            to_account_id = data.get('to_account_id')
            category_id = data.get('category_id')
            
            TransactionService._validate_transaction_type(transaction_type, from_account_id, to_account_id)
            
            from_account = None
            if from_account_id:
                from_account = TransactionService._get_and_validate_account(
                    user_id, from_account_id, db
                )
            
            to_account = None
            if to_account_id:
                to_account = TransactionService._get_and_validate_account(
                    user_id, to_account_id, db
                )
            
            TransactionService._check_sufficient_funds(
                transaction_type, amount, from_account
            )
            
            new_transaction = Transaction(
                user_id=user_id,
                type=transaction_type,
                amount=amount,
                from_account_id=from_account_id,
                to_account_id=to_account_id,
                category_id=category_id,
                transaction_date=data.get('transaction_date') or datetime.utcnow(),
                notes=data.get('notes'),
                location=data.get('location'),
                merchant=data.get('merchant'),
                receipt_number=data.get('receipt_number'),
                related_transaction_id=data.get('related_transaction_id')
            )
            
            db.add(new_transaction)
            db.flush()
            
            TransactionService._update_account_balances(
                transaction_type, amount, from_account, to_account
            )
            
            tags_list = data.get('tags', [])
            if tags_list:
                TransactionService._process_tags(
                    user_id, new_transaction.id, tags_list, db
                )
            
            db.commit()
            db.refresh(new_transaction)
            return new_transaction
        except Exception:
            db.rollback()
            raise
    
    @staticmethod
    def update_transaction(user_id: int, transaction_id: int, data: Dict[str, Any], db: Session) -> Transaction:
        """Update transaction (no balance changes)"""
        
        transaction = db.query(Transaction).filter_by(
            id=transaction_id,
            user_id=user_id
        ).first()
        
        if not transaction:
            raise AccountNotFoundError(f"Transaction {transaction_id} not found")
        
        updatable_fields = ['amount', 'category_id', 'transaction_date', 'notes', 'location', 'merchant']
        for field in updatable_fields:
            if field in data and data[field] is not None:
                if field == 'amount':
                    setattr(transaction, field, Decimal(str(data[field])))
                else:
                    setattr(transaction, field, data[field])
        
        tags_list = data.get('tags')
        if tags_list is not None:
            db.query(TransactionTag).filter_by(transaction_id=transaction_id).delete()
            
            if tags_list:
                TransactionService._process_tags(
                    user_id, transaction_id, tags_list, db
                )
        
        db.commit()
        db.refresh(transaction)
        return transaction
    
    @staticmethod
    def delete_transaction(user_id: int, transaction_id: int, db: Session) -> bool:
        """Delete transaction with balance rollback"""
        try:
            transaction = db.query(Transaction).filter_by(
                id=transaction_id,
                user_id=user_id
            ).first()
            
            if not transaction:
                raise AccountNotFoundError(f"Transaction {transaction_id} not found")
            
            TransactionService._rollback_balances(transaction, db)
            
            db.delete(transaction)
            db.commit()
            return True
        except Exception:
            db.rollback()
            raise
    
    @staticmethod
    def get_user_balance(user_id: int, db: Session) -> float:
        """Calculate total balance across all active accounts"""
        
        accounts = db.query(Account).filter(
            Account.user_id == user_id,
            Account.is_active == True
        ).all()
        
        total_balance = sum(float(account.balance or 0) for account in accounts)
        return total_balance
    
    @staticmethod
    def _validate_transaction_type(transaction_type: str, from_account_id: Optional[int], to_account_id: Optional[int]) -> None:
        """Validate transaction type and required accounts"""
        
        valid_types = [
            TransactionType.INCOME,
            TransactionType.EXPENSE,
            TransactionType.TRANSFER,
            TransactionType.LOAN_IN,
            TransactionType.LOAN_OUT,
            TransactionType.REPAYMENT
        ]
        
        if transaction_type not in valid_types:
            raise InvalidTransactionError(
                f"Invalid transaction type. Must be one of: {valid_types}"
            )
        
        if transaction_type in [TransactionType.EXPENSE, TransactionType.LOAN_OUT]:
            if not from_account_id:
                raise InvalidTransactionError("Must specify from_account_id for expense/loan_out")
        
        elif transaction_type in [TransactionType.INCOME, TransactionType.LOAN_IN]:
            if not to_account_id:
                raise InvalidTransactionError("Must specify to_account_id for income/loan_in")
        
        elif transaction_type == TransactionType.TRANSFER:
            if not from_account_id or not to_account_id:
                raise InvalidTransactionError("Transfer requires both from_account_id and to_account_id")
            if from_account_id == to_account_id:
                raise InvalidTransactionError("Transfer accounts cannot be the same")
    
    @staticmethod
    def _get_and_validate_account(user_id: int, account_id: int, db: Session) -> Account:
        """Get account and validate ownership"""
        
        account = db.query(Account).filter_by(
            id=account_id,
            user_id=user_id
        ).first()
        
        if not account:
            raise AccountNotFoundError(f"Account {account_id} not found or doesn't belong to user")
        
        return account
    
    @staticmethod
    def _check_sufficient_funds(transaction_type: str, amount: Decimal, account: Optional[Account]) -> None:
        """Check if account has sufficient funds for the transaction"""
        
        if transaction_type in [TransactionType.EXPENSE, TransactionType.LOAN_OUT, TransactionType.TRANSFER]:
            if account and (account.balance or Decimal('0')) < amount:
                raise InsufficientFundsError(
                    f"Insufficient funds in account '{account.name}'. "
                    f"Required: {amount}, Available: {account.balance}"
                )
    
    @staticmethod
    def _update_account_balances(
        transaction_type: str,
        amount: Decimal,
        from_account: Optional[Account],
        to_account: Optional[Account]
    ) -> None:
        """Update account balances based on transaction type"""
        
        if transaction_type in [TransactionType.EXPENSE, TransactionType.LOAN_OUT]:
            if from_account:
                from_account.balance -= amount
        
        elif transaction_type in [TransactionType.INCOME, TransactionType.LOAN_IN]:
            if to_account:
                to_account.balance += amount
        
        elif transaction_type == TransactionType.TRANSFER:
            if from_account:
                from_account.balance -= amount
            if to_account:
                to_account.balance += amount
        
        elif transaction_type == TransactionType.TRANSFER:
            if from_account:
                from_account.balance -= amount
            if to_account:
                to_account.balance += amount
    
    @staticmethod
    def _rollback_balances(transaction: Transaction, db: Session) -> None:
        """Rollback account balances when deleting a transaction"""
        
        from_account = None
        if transaction.from_account_id:
            from_account = db.query(Account).filter_by(id=transaction.from_account_id).first()
        
        to_account = None
        if transaction.to_account_id:
            to_account = db.query(Account).filter_by(id=transaction.to_account_id).first()
        
        if transaction.type in [TransactionType.EXPENSE, TransactionType.LOAN_OUT]:
            if from_account:
                from_account.balance += transaction.amount
        
        elif transaction.type in [TransactionType.INCOME, TransactionType.LOAN_IN]:
            if to_account:
                to_account.balance -= transaction.amount
        
        elif transaction.type == TransactionType.TRANSFER:
            if from_account:
                from_account.balance += transaction.amount
            if to_account:
                to_account.balance -= transaction.amount
    
    @staticmethod
    def _process_tags(user_id: int, transaction_id: int, tags_list: list, db: Session) -> None:
        """Process tags for a transaction"""
        
        for tag_name in tags_list:
            tag = db.query(Tag).filter_by(
                user_id=user_id,
                name=tag_name
            ).first()
            
            if not tag:
                tag = Tag(user_id=user_id, name=tag_name)
                db.add(tag)
                db.flush()
            
            transaction_tag = TransactionTag(
                transaction_id=transaction_id,
                tag_id=tag.id
            )
            db.add(transaction_tag)
