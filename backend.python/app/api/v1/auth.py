from fastapi import APIRouter, Depends, status, Response, Cookie
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, Dict
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt, JWTError
import bcrypt
import logging

from app.deps import get_db
from app.models.user import User as UserModel
from app.models.account import Account
from app.services import category_service
from app.core.config import settings
from app.core.exceptions import APIResponse, UnauthorizedException, ConflictException

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer(auto_error=False)

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    password: str = Field(..., min_length=6, max_length=128, description="密码")
    email: Optional[str] = Field(None, description="邮箱")

class LoginRequest(BaseModel):
    username: str = Field(..., description="用户名或邮箱")
    password: str = Field(..., min_length=6, description="密码")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def get_password_hash(plain: str) -> str:
    # 直接使用bcrypt库，避免passlib版本兼容性问题
    password_bytes = plain.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    try:
        password_bytes = plain.encode('utf-8')
        hashed_bytes = hashed.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False

@router.post("/register", response_model=Dict, summary="注册", status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    logger.info(f"注册请求: 用户名={payload.username}, 邮箱={payload.email}, 密码长度={len(payload.password)}")

    # 检查用户名是否已存在
    username_exists = (
        db.query(UserModel)
        .filter(UserModel.username == payload.username)
        .first()
    )
    if username_exists:
        logger.warning(f"注册失败: 用户名已存在 - 用户名={payload.username}")
        raise ConflictException("用户名已存在", code="USERNAME_EXISTS")

    # 只有提供了email时才检查email是否已存在
    if payload.email:
        email_exists = (
            db.query(UserModel)
            .filter(UserModel.email == payload.email)
            .first()
        )
        if email_exists:
            logger.warning(f"注册失败: 邮箱已存在 - 邮箱={payload.email}")
            raise ConflictException("邮箱已存在", code="EMAIL_EXISTS")

    # 测试密码哈希和验证
    plain_password = payload.password
    hashed_password = get_password_hash(plain_password)
    logger.info(f"密码哈希生成: 原密码长度={len(plain_password)}, 哈希值长度={len(hashed_password)}, 哈希前5位={hashed_password[:5]}")

    # 验证哈希密码
    is_valid = verify_password(plain_password, hashed_password)
    logger.info(f"密码哈希验证: 结果={is_valid}")

    user = UserModel(
        username=payload.username,
        password_hash=hashed_password,
        email=payload.email,
        nickname=payload.username,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    logger.info(f"注册成功: 用户ID={user.id}, 用户名={user.username}")

    # 初始化默认分类
    try:
        category_service.init_default_categories(user.id, db)
        logger.info(f"默认分类初始化成功: 用户ID={user.id}")
    except Exception as e:
        logger.error(f"默认分类初始化失败: 用户ID={user.id}, 错误={str(e)}")
        # 不中断注册流程，仅记录错误

    # 创建默认现金账户
    try:
        default_account = Account(
            user_id=user.id,
            name="现金",
            account_type="cash",
            balance=0.00,
            currency="CNY",
            is_default=True,
            icon="account_balance_wallet",
            color="#4CAF50"
        )
        db.add(default_account)
        db.commit()
        logger.info(f"默认账户创建成功: 用户ID={user.id}, 账户ID={default_account.id}")
    except Exception as e:
        logger.error(f"默认账户创建失败: 用户ID={user.id}, 错误={str(e)}")
        # 不中断注册流程，仅记录错误

    token = create_access_token({"sub": str(user.id), "username": user.username})

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False
    )

    response.status_code = status.HTTP_201_CREATED

    return APIResponse.success(
        data={
            "user": {"id": user.id, "username": user.username, "email": user.email, "nickname": user.nickname},
            "token": {"access_token": token, "token_type": "bearer", "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60},
        },
        message="注册成功"
    )

@router.post("/login", response_model=Dict, summary="登录")
async def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    logger.info(f"登录请求: 用户名={payload.username}, 密码长度={len(payload.password)}")

    user = (
        db.query(UserModel)
        .filter((UserModel.username == payload.username) | (UserModel.email == payload.username))
        .first()
    )

    if not user:
        logger.warning(f"登录失败: 用户不存在 - 用户名={payload.username}")
        raise UnauthorizedException("用户名或密码错误", code="INVALID_CREDENTIALS")

    logger.info(f"找到用户: ID={user.id}, 用户名={user.username}, 存储的密码哈希长度={len(user.password_hash or '')}, 哈希前5位={user.password_hash[:5] if user.password_hash else '无'}")

    # 验证密码
    is_valid = verify_password(payload.password, user.password_hash or "")
    logger.info(f"密码验证结果: {is_valid}")

    if not is_valid:
        logger.warning(f"登录失败: 密码错误 - 用户名={payload.username}")
        raise UnauthorizedException("用户名或密码错误", code="INVALID_CREDENTIALS")

    logger.info(f"登录成功: 用户ID={user.id}, 用户名={user.username}")

    token = create_access_token({"sub": str(user.id), "username": user.username})

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False
    )

    return APIResponse.success(
        data={
            "user": {"id": user.id, "username": user.username, "email": user.email, "nickname": user.nickname},
            "token": {"access_token": token, "token_type": "bearer", "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60},
        },
        message="登录成功"
    )

@router.post("/logout", summary="登出")
async def logout(response: Response):
    response.delete_cookie(key="access_token")
    return APIResponse.success(message="已登出")

def get_current_user(
    authorization: Optional[HTTPAuthorizationCredentials] = Depends(security),
    token_cookie: Optional[str] = Cookie(None, alias="access_token"),
    db: Session = Depends(get_db)
) -> Dict:
    token_str = None

    if authorization:
        token_str = authorization.credentials
    elif token_cookie:
        token_str = token_cookie

    if not token_str:
        raise UnauthorizedException("未提供认证令牌", code="TOKEN_MISSING")

    try:
        payload = jwt.decode(token_str, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = int(payload.get("sub"))
        if not user_id:
            raise UnauthorizedException("令牌格式错误", code="INVALID_TOKEN")
    except JWTError:
        raise UnauthorizedException("无效或过期的令牌", code="INVALID_TOKEN")
    except (ValueError, TypeError):
        raise UnauthorizedException("令牌解析失败", code="TOKEN_PARSE_ERROR")

    user = db.query(UserModel).filter_by(id=user_id).first()
    if not user:
        raise UnauthorizedException("用户不存在或已被删除", code="USER_NOT_FOUND")

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "nickname": user.nickname,
    }

@router.get("/me", summary="获取当前登录用户")
async def get_me(current_user: Dict = Depends(get_current_user)):
    return APIResponse.success(data=current_user, message="获取用户信息成功")
