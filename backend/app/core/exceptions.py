class AccountingError(Exception):
    """Base exception for accounting operations"""
    pass


class AccountNotFoundError(AccountingError):
    """Account not found or doesn't belong to user"""
    pass


class InsufficientFundsError(AccountingError):
    """Insufficient balance for transaction"""
    pass


class InvalidTransactionError(AccountingError):
    """Invalid transaction data or type"""
    pass


class CategoryNotFoundError(AccountingError):
    """Category not found"""
    pass


class BudgetAlreadyExistsError(AccountingError):
    """Budget already exists for category/period"""
    pass
