import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()


class Settings:
    """应用配置设置类"""
    
    # 数据库配置
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/data.db")
    
    # 阿里云号码认证服务配置
    # 请填入您的阿里云AccessKey信息
    ALIYUN_ACCESS_KEY_ID = os.getenv("ALIYUN_ACCESS_KEY_ID", "your-access-key-id")
    ALIYUN_ACCESS_KEY_SECRET = os.getenv("ALIYUN_ACCESS_KEY_SECRET", "your-access-key-secret")
    ALIYUN_SMS_ENDPOINT = "dysmsapi.aliyuncs.com"  # 号码认证服务使用短信服务的endpoint
    ALIYUN_SMS_SIGN_NAME = os.getenv("ALIYUN_SMS_SIGN_NAME", "your-sign-name")
    ALIYUN_SMS_TEMPLATE_CODE = os.getenv("ALIYUN_SMS_TEMPLATE_CODE", "your-template-code")

    # Redis配置 (用于存储验证码)
    REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "")
    REDIS_DB = int(os.getenv("REDIS_DB", "0"))

    # JWT配置
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
    ALGORITHM = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

    # 验证码配置
    CODE_EXPIRE_SECONDS = int(os.getenv("CODE_EXPIRE_SECONDS", "300"))  # 验证码过期时间(秒)
    CODE_LENGTH = int(os.getenv("CODE_LENGTH", "6"))  # 验证码长度

    # 高德地图配置
    AMAP_API_KEY = os.getenv("AMAP_API_KEY", "")  # 高德地图API密钥
    AMAP_API_SECRET = os.getenv("AMAP_API_SECRET", "")  # 高德地图API安全密钥（如需要）


# 创建全局设置实例
settings = Settings()