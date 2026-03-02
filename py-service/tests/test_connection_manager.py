"""WebSocket 连接管理器测试"""
import pytest
from unittest.mock import Mock, AsyncMock
from websocket.connection_manager import ConnectionManager


class TestConnectionManager:
    """连接管理器测试"""

    @pytest.fixture
    def manager(self):
        """创建连接管理器实例"""
        return ConnectionManager()

    @pytest.fixture
    def mock_websocket(self):
        """创建模拟 WebSocket 连接"""
        websocket = Mock()
        websocket.accept = AsyncMock()
        websocket.send_text = AsyncMock()
        return websocket

    @pytest.mark.asyncio
    async def test_connect(self, manager, mock_websocket):
        """测试连接"""
        await manager.connect(mock_websocket, "client-1")

        assert mock_websocket.accept.called
        assert manager.get_connection_count() == 1
        assert mock_websocket in manager.active_connections

    @pytest.mark.asyncio
    async def test_disconnect(self, manager, mock_websocket):
        """测试断开连接"""
        await manager.connect(mock_websocket, "client-1")
        await manager.disconnect(mock_websocket)

        assert manager.get_connection_count() == 0
        assert mock_websocket not in manager.active_connections

    @pytest.mark.asyncio
    async def test_send_personal_message(self, manager, mock_websocket):
        """测试发送个人消息"""
        await manager.connect(mock_websocket, "client-1")
        
        await manager.send_personal_message("test message", mock_websocket)

        assert mock_websocket.send_text.called
        mock_websocket.send_text.assert_called_once_with("test message")

    @pytest.mark.asyncio
    async def test_broadcast(self, manager):
        """测试广播消息"""
        ws1 = Mock()
        ws1.accept = AsyncMock()
        ws1.send_text = AsyncMock()
        
        ws2 = Mock()
        ws2.accept = AsyncMock()
        ws2.send_text = AsyncMock()

        await manager.connect(ws1, "client-1")
        await manager.connect(ws2, "client-2")

        await manager.broadcast("broadcast message")

        assert ws1.send_text.called
        assert ws2.send_text.called
        ws1.send_text.assert_called_once_with("broadcast message")
        ws2.send_text.assert_called_once_with("broadcast message")

    @pytest.mark.asyncio
    async def test_multiple_connections(self, manager):
        """测试多个连接"""
        for i in range(5):
            ws = Mock()
            ws.accept = AsyncMock()
            await manager.connect(ws, f"client-{i}")

        assert manager.get_connection_count() == 5

    @pytest.mark.asyncio
    async def test_get_connection_count(self, manager, mock_websocket):
        """测试获取连接数"""
        assert manager.get_connection_count() == 0

        await manager.connect(mock_websocket, "client-1")
        assert manager.get_connection_count() == 1

        await manager.connect(mock_websocket, "client-2")
        assert manager.get_connection_count() == 2

        await manager.disconnect(mock_websocket)
        assert manager.get_connection_count() == 1
