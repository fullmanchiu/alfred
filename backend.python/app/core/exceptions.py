from typing import Optional, Any
from fastapi import HTTPException, status


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


# 标准 RESTful API 响应格式
class APIResponse:
    """标准 API 响应格式"""

    @staticmethod
    def success(data: Any = None, message: str = None, http_status: int = status.HTTP_200_OK) -> dict:
        """成功响应 - 包含 data 字段"""
        response = {
            "success": True,
            "data": data,
            "message": message
        }
        return response

    @staticmethod
    def error(message: str, code: str = None, http_status: int = status.HTTP_400_BAD_REQUEST) -> HTTPException:
        """错误响应 - 不包含 data 字段"""
        error_detail = {
            "success": False,
            "message": message,
            "error": {
                "code": code or "ERROR",
                "message": message
            }
        }
        raise HTTPException(status_code=http_status, detail=error_detail)


# 自定义异常类，用于全局异常处理
class APIException(Exception):
    """API 异常基类"""
    def __init__(self, message: str, code: str = None, http_status: int = status.HTTP_400_BAD_REQUEST):
        self.message = message
        self.code = code or "ERROR"
        self.http_status = http_status
        super().__init__(message)


class BadRequestException(APIException):
    """400 Bad Request"""
    def __init__(self, message: str, code: str = "BAD_REQUEST"):
        super().__init__(message, code, status.HTTP_400_BAD_REQUEST)


class UnauthorizedException(APIException):
    """401 Unauthorized"""
    def __init__(self, message: str = "未授权", code: str = "UNAUTHORIZED"):
        super().__init__(message, code, status.HTTP_401_UNAUTHORIZED)


class NotFoundException(APIException):
    """404 Not Found"""
    def __init__(self, message: str, code: str = "NOT_FOUND"):
        super().__init__(message, code, status.HTTP_404_NOT_FOUND)


class ConflictException(APIException):
    """409 Conflict"""
    def __init__(self, message: str, code: str = "CONFLICT"):
        super().__init__(message, code, status.HTTP_409_CONFLICT)


class InternalServerException(APIException):
    """500 Internal Server Error"""
    def __init__(self, message: str = "服务器内部错误", code: str = "INTERNAL_ERROR"):
        super().__init__(message, code, status.HTTP_500_INTERNAL_SERVER_ERROR)
