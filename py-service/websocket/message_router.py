from typing import Dict, Any
from fastapi import WebSocket
from dto.message import WebSocketMessage, MessageType
from action_handlers import get_registry, invoke, ActionResult
from logging_config import get_logger, RequestContext
import json

logger = get_logger('websocket.message_router')


class MessageRouter:
    """路由 WebSocket 消息到处理器"""

    def __init__(self):
        self.registry = get_registry()

    async def handle_message(self, websocket: WebSocket, raw_message: str):
        """处理收到的消息"""
        try:
            # 解析消息
            data = json.loads(raw_message)
            message = WebSocketMessage(**data)

            # 设置 request-id 到日志上下文
            if message.request_id:
                RequestContext.set_request_id(message.request_id)

            logger.info(f"收到消息: type={message.type}, requestId={message.request_id}")

            # 根据消息类型路由
            if message.type == MessageType.REQUEST:
                await self._handle_request(websocket, message)
            elif message.type == MessageType.NOTIFICATION:
                await self._handle_notification(message)
            elif message.type == MessageType.RESPONSE:
                await self._handle_response(message)
            else:
                logger.warning(f"未知消息类型: {message.type}")

        except Exception as e:
            logger.error(f"处理消息失败: {str(e)}", exc_info=True)
            # 尝试发送错误响应
            try:
                error_data = json.loads(raw_message)
                message = WebSocketMessage(**error_data)
                if message.request_id:
                    error_response = WebSocketMessage(
                        type=MessageType.RESPONSE,
                        request_id=message.request_id,
                        payload={"success": False, "error": str(e)}
                    )
                    await websocket.send_text(error_response.model_dump_json())
            except:
                pass

    async def _handle_request(self, websocket: WebSocket, message: WebSocketMessage):
        """处理请求消息"""
        action = message.payload.get("action")
        if not action:
            logger.warning("请求缺少 action 字段")
            return

        logger.info(f"处理请求: action={action}, requestId={message.request_id}")

        # 调用 action handler
        result: ActionResult = invoke(action, message.payload)

        # 构造响应
        response_payload = {
            "success": result.success,
            "code": result.code,
            "message": result.message,
            "data": result.data
        }

        response = WebSocketMessage(
            type=MessageType.RESPONSE,
            request_id=message.request_id,
            payload=response_payload
        )

        await websocket.send_text(response.model_dump_json())
        logger.info(f"发送响应: requestId={message.request_id}, success={result.success}")

    async def _handle_notification(self, message: WebSocketMessage):
        """处理通知消息"""
        action = message.payload.get("action")
        if not action:
            logger.warning("通知缺少 action 字段")
            return

        logger.info(f"处理通知: action={action}")

        # 特殊处理：任务变更通知，立即同步任务
        if action == "tasks.changed":
            from scheduler.task_scheduler import sync_scheduled_tasks
            sync_scheduled_tasks()
            logger.info("收到任务变更通知，已同步任务")
            return

        # 通知不需要响应，直接调用
        invoke(action, message.payload)

    async def _handle_response(self, message: WebSocketMessage):
        """处理响应消息（从 Java 发来的响应）"""
        logger.info(f"收到响应: requestId={message.request_id}")
        # 这里可以实现客户端响应处理逻辑
        # 目前主要用于日志记录


# 全局实例
router = MessageRouter()
