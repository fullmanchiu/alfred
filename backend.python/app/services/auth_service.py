from datetime import datetime, timedelta
from typing import Dict, Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core import config


class AuthService:
    """用户认证服务类（使用内存存储）"""
    
    def __init__(self):
        self.pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
        # 使用内存存储代替Redis
        self._storage = {}
        self._blacklist = set()
        # 创建默认测试用户
        self._create_default_user()
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        """
        创建JWT访问令牌
        
        Args:
            data: 要编码的数据
            expires_delta: 过期时间增量
            
        Returns:
            str: JWT令牌
        """
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, config.SECRET_KEY, algorithm=config.ALGORITHM)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[Dict]:
        """
        验证JWT令牌
        
        Args:
            token: JWT令牌
            
        Returns:
            Optional[Dict]: 验证成功返回用户信息，失败返回None
        """
        try:
            payload = jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
            username: str = payload.get("sub")
            if username is None:
                return None
            return {"username": username}
        except JWTError:
            return None
    
    def authenticate_user(self, username: str, password: str) -> Dict:
        """
        通过用户名和密码认证用户
        
        Args:
            username: 用户名
            password: 密码
            
        Returns:
            Dict: 认证结果
        """
        # 直接从存储中获取用户信息（包含哈希密码）
        user_key = f"user:{username}"
        user_data = self._storage.get(user_key)
        
        # 检查用户是否存在
        if not user_data:
            return {
                "success": False,
                "message": "用户名或密码错误"
            }
        
        # 验证密码
        if not self.verify_password(password, user_data.get("hashed_password")):
            return {
                "success": False,
                "message": "用户名或密码错误"
            }
        
        # 创建访问令牌
        access_token_expires = timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = self.create_access_token(
            data={"sub": user_data["username"]}, expires_delta=access_token_expires
        )
        
        # 更新最后登录时间
        user_data["last_login"] = datetime.now().isoformat()
        self._storage[user_key] = user_data
        
        # 返回用户信息时排除哈希密码
        user_info = user_data.copy()
        user_info.pop("hashed_password", None)
        
        return {
            "success": True,
            "message": "登录成功",
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_info
        }
    
    def hash_password(self, password: str) -> str:
        """
        对密码进行哈希处理
        
        Args:
            password: 原始密码
            
        Returns:
            str: 哈希后的密码
        """
        # bcrypt限制密码不能超过72个字节，需要截断
        password = password[:72] if password else password
        return self.pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        验证密码
        
        Args:
            plain_password: 原始密码
            hashed_password: 哈希后的密码
            
        Returns:
            bool: 密码是否正确
        """
        # bcrypt限制密码不能超过72个字节，需要截断
        plain_password = plain_password[:72] if plain_password else plain_password
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def register_user(self, username: str, password: str, **kwargs) -> Dict:
        """
        注册新用户
        
        Args:
            username: 用户名
            password: 密码
            **kwargs: 其他用户信息
            
        Returns:
            Dict: 注册结果
        """
        # 检查用户是否已存在
        if self.get_user_by_username(username):
            return {
                "success": False,
                "message": "用户名已存在"
            }
        
        # 创建新用户
        user_data = {
            "username": username,
            "hashed_password": self.hash_password(password),
            "created_at": datetime.now().isoformat(),
            "avatar": kwargs.get("avatar", ""),
            "phone": kwargs.get("phone", "")
        }
        
        # 存储用户信息到内存
        user_key = f"user:{username}"
        self._storage[user_key] = user_data
        
        return {
            "success": True,
            "message": "注册成功",
            "user": user_data
        }
    
    def _create_default_user(self):
        """
        创建默认测试用户
        """
        # 强制创建测试用户，使用新的哈希算法
        test_user = {
            "username": "admin",
            "hashed_password": self.hash_password("admin123"),
            "created_at": datetime.now().isoformat(),
            "avatar": "",
            "phone": ""
        }
        
        user_key = f"user:admin"
        # 强制覆盖，确保使用新的哈希算法
        self._storage[user_key] = test_user
        print(f"默认测试用户已创建: admin/admin123")
    
    def get_user_by_username(self, username: str) -> Optional[Dict]:
        """
        根据用户名获取用户信息
        
        Args:
            username: 用户名
            
        Returns:
            Optional[Dict]: 用户信息，不存在返回None
        """
        user_key = f"user:{username}"
        user_data = self._storage.get(user_key)
        # 返回用户信息，但不包含哈希密码
        if user_data:
            user_info = user_data.copy()
            user_info.pop("hashed_password", None)
            return user_info
        return None
    
    def is_token_blacklisted(self, token: str) -> bool:
        """
        检查令牌是否在黑名单中
        
        Args:
            token: 访问令牌
            
        Returns:
            bool: 如果令牌在黑名单中返回True，否则返回False
        """
        return token in self._blacklist
    
    def logout_user(self, token: str) -> Dict:
        """
        用户登出，将令牌加入黑名单
        
        Args:
            token: 访问令牌
            
        Returns:
            Dict: 登出结果
        """
        try:
            # 将令牌加入黑名单
            self._blacklist.add(token)
            return {
                "success": True,
                "message": "登出成功"
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"登出失败: {str(e)}"
            }