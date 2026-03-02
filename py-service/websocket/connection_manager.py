from typing import List, Dict
from fastapi import WebSocket
from logging_config import get_logger
import asyncio

logger = get_logger('websocket.connection_manager')


class ConnectionManager:
    """管理 WebSocket 连接"""

    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.connection_metadata: Dict[WebSocket, dict] = {}

    async def connect(self, websocket: WebSocket, client_id: str = None):
        """接受新连接"""
        await websocket.accept()
        self.active_connections.append(websocket)
        self.connection_metadata[websocket] = {
            "client_id": client_id,
            "connected_at": asyncio.get_event_loop().time()
        }
        logger.info(f"WebSocket 连接已建立: {client_id}, 当前连接数: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket):
        """断开连接"""
        if websocket in self.active_connections:
            client_id = self.connection_metadata.get(websocket, {}).get("client_id", "unknown")
            self.active_connections.remove(websocket)
            self.connection_metadata.pop(websocket, None)
            logger.info(f"WebSocket 连接已断开: {client_id}, 当前连接数: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        """发送消息给特定客户端"""
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"发送消息失败: {str(e)}")
            await self.disconnect(websocket)

    async def broadcast(self, message: str):
        """广播消息给所有连接"""
        for connection in self.active_connections:
            await self.send_personal_message(message, connection)

    def get_connection_count(self) -> int:
        """获取当前连接数"""
        return len(self.active_connections)


# 全局实例
manager = ConnectionManager()
