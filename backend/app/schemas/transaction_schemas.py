from pydantic import BaseModel, validator, Field
from typing import Optional, List
from datetime import datetime


class TransactionCreateSchema(BaseModel):
    type: str = Field(..., description="交易类型：income, expense, transfer, loan_in, loan_out, repayment")
    amount: float = Field(..., gt=0, description="交易金额")
    from_account_id: Optional[int] = Field(None, description="转出账户ID")
    to_account_id: Optional[int] = Field(None, description="转入账户ID")
    category_id: Optional[int] = Field(None, description="分类ID")
    transaction_date: Optional[datetime] = Field(None, description="交易日期")
    tags: Optional[List[str]] = Field(default_factory=list, description="标签列表")
    notes: Optional[str] = Field(None, description="备注")
    location: Optional[str] = Field(None, description="交易地点")
    merchant: Optional[str] = Field(None, description="商户名称")
    receipt_number: Optional[str] = Field(None, description="收据号")
    related_transaction_id: Optional[int] = Field(None, description="关联交易ID（用于还款）")
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        return v
    
    @validator('type')
    def validate_type(cls, v):
        valid_types = ['income', 'expense', 'transfer', 'loan_in', 'loan_out', 'repayment']
        if v not in valid_types:
            raise ValueError(f'Invalid transaction type. Must be one of: {valid_types}')
        return v


class TransactionUpdateSchema(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    category_id: Optional[int] = None
    transaction_date: Optional[datetime] = None
    notes: Optional[str] = None
    location: Optional[str] = None
    merchant: Optional[str] = None
    tags: Optional[List[str]] = None
