"""
统一 Python → Java WebSocket 通信模块

提供统一的 WebSocket 客户端，连接到 Java 的 /api/ws 端点。

特性：
- 自动重连机制（指数退避，1s→30s）
- 心跳保活（30秒间隔）
- 消息类型区分：指令类立即失败，数据类丢弃
- 连接状态管理
"""
import asyncio
import json
import threading
import time
import websockets
from typing import Callable, Optional, Dict, Any, Set
from logging_config import get_logger

logger = get_logger('unified_websocket')

# 连接配置
DEFAULT_URL = 'ws://localhost:8080/api/ws'
CONNECT_TIMEOUT = 10  # 连接超时（秒）
HEARTBEAT_INTERVAL = 30  # 心跳间隔（秒）
RECONNECT_MAX_DELAY = 30  # 最大重连延迟（秒）

# 消息类型分类
COMMAND_MESSAGE_TYPES: Set[str] = {
    "taskExecute",
    "taskStatus",
    "taskCancel",
}

DATA_MESSAGE_TYPES: Set[str] = {
    "taskLog",
    "klineBatch",
}


class UnifiedWebSocketClient:
    """
    统一 WebSocket 客户端

    连接到 Java 的 /api/ws 端点，提供可靠的消息传输。
    """

    def __init__(self, url: str = DEFAULT_URL):
        self.url = url
        self.loop = None
        self.ws = None
        self.connected = False
        self._thread = None
        self._stop_event = threading.Event()
        self._message_handler: Optional[Callable] = None
        self._heartbeat_task: Optional[asyncio.Task] = None
        self._reconnect_delay = 1  # 初始重连延迟
        self._client_type = "python"  # 客户端类型标识

    def set_message_handler(self, handler: Callable[[Dict[str, Any]], None]):
        """设置接收消息的处理器"""
        self._message_handler = handler

    def start(self):
        """启动 WebSocket 客户端（后台线程）"""
        if self._thread is None:
            self._thread = threading.Thread(target=self._run_event_loop, daemon=True)
            self._thread.start()
            logger.info("WebSocket 客户端已启动")

    def _run_event_loop(self):
        """在后台线程运行事件循环"""
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        try:
            self.loop.run_until_complete(self._connect_with_retry())
        except Exception as e:
            logger.error(f"WebSocket 客户端异常: {e}")
        finally:
            self.connected = False

    async def _connect_with_retry(self):
        """带重试的连接"""
        while not self._stop_event.is_set():
            try:
                await self._connect_and_keep()
                # 连接正常关闭后，重置重连延迟
                self._reconnect_delay = 1
            except Exception as e:
                logger.error(f"WebSocket 连接异常: {e}")
                self.connected = False

            # 等待重连
            if not self._stop_event.is_set():
                logger.info(f"等待 {self._reconnect_delay} 秒后重连...")
                await asyncio.sleep(self._reconnect_delay)
                # 指数退避，最大 30 秒
                self._reconnect_delay = min(self._reconnect_delay * 2, RECONNECT_MAX_DELAY)

    async def _connect_and_keep(self):
        """连接并保持"""
        try:
            async with websockets.connect(
                self.url,
                ping_interval=HEARTBEAT_INTERVAL,
                ping_timeout=HEARTBEAT_INTERVAL + 5
            ) as ws:
                self.ws = ws
                self.connected = True
                logger.info(f"WebSocket 已连接到 Java: {self.url}")

                # 发送握手消息
                await self._send_handshake()

                # 启动心跳任务
                self._heartbeat_task = asyncio.create_task(self._heartbeat_loop(ws))

                # 处理接收到的消息
                async for message in ws:
                    try:
                        data = json.loads(message)
                        logger.debug(f"收到消息: {data.get('type')}")
                        if self._message_handler:
                            self._message_handler(data)
                    except Exception as e:
                        logger.error(f"处理消息失败: {e}")

        except Exception as e:
            logger.error(f"WebSocket 连接失败: {e}")
            self.connected = False
        finally:
            if self._heartbeat_task:
                self._heartbeat_task.cancel()
                self._heartbeat_task = None

    async def _send_handshake(self):
        """发送握手消息"""
        handshake = {
            "type": "handshake",
            "payload": {"clientType": self._client_type},
            "timestamp": int(time.time() * 1000),
        }
        await self.ws.send(json.dumps(handshake))
        logger.info(f"握手消息已发送: clientType={self._client_type}")

    async def _heartbeat_loop(self, ws):
        """心跳循环"""
        try:
            while self.connected:
                await asyncio.sleep(HEARTBEAT_INTERVAL)
                if ws and self.connected and ws.close_code is None:
                    heartbeat = {
                        "type": "heartbeat",
                        "timestamp": int(time.time() * 1000),
                    }
                    try:
                        await ws.send(json.dumps(heartbeat))
                        logger.debug("心跳已发送")
                    except Exception:
                        # 发送失败，标记连接断开
                        self.connected = False
                        break
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.warning(f"心跳失败: {e}")
            self.connected = False

    def send(self, message: Dict[str, Any]) -> bool:
        """
        发送消息到 Java（线程安全）

        Args:
            message: 消息字典，必须包含 type 和 payload

        Returns:
            bool: 是否发送成功
        """
        if not self.connected or not self.loop:
            msg_type = message.get("type", "")
            if msg_type in COMMAND_MESSAGE_TYPES:
                logger.error(f"WebSocket 未连接，指令类消息发送失败: {msg_type}")
            else:
                logger.debug(f"WebSocket 未连接，数据类消息已丢弃: {msg_type}")
            return False

        try:
            # 添加时间戳
            message["timestamp"] = int(time.time() * 1000)
            self.loop.call_soon_threadsafe(self._send_async, message)
            return True
        except Exception as e:
            logger.error(f"发送消息失败: {e}")
            return False

    def _send_async(self, message: Dict[str, Any]):
        """在事件循环中异步发送"""
        if self.ws:
            asyncio.create_task(self._do_send(message))

    async def _do_send(self, message: Dict[str, Any]):
        """执行异步发送"""
        try:
            await self.ws.send(json.dumps(message))
        except Exception as e:
            logger.warning(f"WebSocket 发送失败: {e}")

    def close(self):
        """关闭连接"""
        self._stop_event.set()
        if self.loop:
            self.loop.call_soon_threadsafe(self._close_async)

    def _close_async(self):
        """异步关闭"""
        if self.ws:
            asyncio.create_task(self.ws.close())

    def is_connected(self) -> bool:
        """检查连接状态"""
        return self.connected


# 全局 WebSocket 客户端实例
_websocket_client: Optional[UnifiedWebSocketClient] = None


def get_websocket_client() -> Optional[UnifiedWebSocketClient]:
    """获取全局 WebSocket 客户端实例"""
    return _websocket_client


def init_websocket_client(url: str = DEFAULT_URL) -> UnifiedWebSocketClient:
    """
    初始化全局 WebSocket 客户端

    Args:
        url: WebSocket 服务端地址

    Returns:
        UnifiedWebSocketClient: WebSocket 客户端实例
    """
    global _websocket_client

    if _websocket_client is None:
        _websocket_client = UnifiedWebSocketClient(url)
        _websocket_client.start()

    return _websocket_client


def is_websocket_connected() -> bool:
    """检查 WebSocket 是否已连接"""
    client = get_websocket_client()
    return client is not None and client.is_connected()


def send_to_java(message_type: str, payload: Dict[str, Any]) -> bool:
    """
    发送消息到 Java（便捷函数）

    Args:
        message_type: 消息类型（如 taskLog, klineBatch 等）
        payload: 消息数据

    Returns:
        bool: 是否发送成功
    """
    client = get_websocket_client()
    if not client:
        if message_type in COMMAND_MESSAGE_TYPES:
            logger.error("WebSocket 客户端未初始化")
        else:
            logger.debug("WebSocket 客户端未初始化，消息已丢弃")
        return False

    message = {
        "type": message_type,
        "payload": payload,
    }

    logger.debug(f"发送消息到 Java: type={message_type}, connected={client.connected}")
    result = client.send(message)
    if not result and message_type in COMMAND_MESSAGE_TYPES:
        logger.warning(f"指令类消息发送失败: type={message_type}")
    return result


def close_websocket_client():
    """关闭全局 WebSocket 客户端"""
    global _websocket_client

    if _websocket_client:
        _websocket_client.close()
        _websocket_client = None
