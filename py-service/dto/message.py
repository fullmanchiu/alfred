"""
WebSocket消息格式定义
"""
from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class MessageType(str, Enum):
    """WebSocket 消息类型枚举"""
    REQUEST = "request"
    RESPONSE = "response"
    NOTIFICATION = "notification"


class WebSocketMessage(BaseModel):
    """WebSocket 消息格式

    Attributes:
        type: 消息类型（request/response/notification）
        request_id: 请求ID（用于关联请求和响应）
        payload: 消息负载数据
    """
    type: MessageType
    request_id: Optional[str] = Field(None, alias="requestId")
    payload: Dict[str, Any]

    model_config = ConfigDict(
        # 使用Pydantic V2的新配置方式
        populate_by_name=True,  # 允许使用Python字段名
        json_encoders={},
        # 排除None值
        exclude_none=True
    )

    def model_dump_json(self, **kwargs) -> str:
        """重写以默认使用 camelCase 别名"""
        kwargs.setdefault('by_alias', True)
        kwargs.setdefault('exclude_none', True)
        return super().model_dump_json(**kwargs)
