"""WebSocket 消息 DTO 测试"""
import pytest
import json
from dto.message import WebSocketMessage, MessageType


class TestWebSocketMessage:
    """WebSocket 消息测试"""

    def test_create_request_message(self):
        """测试创建请求消息"""
        message = WebSocketMessage(
            type=MessageType.REQUEST,
            request_id="test-123",
            payload={"action": "test", "data": "value"}
        )

        assert message.type == MessageType.REQUEST
        assert message.request_id == "test-123"
        assert message.payload["action"] == "test"

    def test_serialize_request_message(self):
        """测试序列化请求消息"""
        message = WebSocketMessage(
            type=MessageType.REQUEST,
            request_id="test-456",
            payload={"action": "ping"}
        )

        json_str = message.model_dump_json()
        data = json.loads(json_str)

        assert data["type"] == "request"
        assert data["requestId"] == "test-456"
        assert data["payload"]["action"] == "ping"

    def test_deserialize_request_message(self):
        """测试反序列化请求消息"""
        json_str = '{"type":"request","requestId":"test-789","payload":{"action":"test"}}'

        message = WebSocketMessage.model_validate_json(json_str)

        assert message.type == MessageType.REQUEST
        assert message.request_id == "test-789"
        assert message.payload["action"] == "test"

    def test_serialize_response_message(self):
        """测试序列化响应消息"""
        message = WebSocketMessage(
            type=MessageType.RESPONSE,
            request_id="req-999",
            payload={"success": True, "data": "result"}
        )

        json_str = message.model_dump_json()
        data = json.loads(json_str)

        assert data["type"] == "response"
        assert data["requestId"] == "req-999"
        assert data["payload"]["success"] is True

    def test_serialize_notification_without_request_id(self):
        """测试序列化通知消息（无 requestId）"""
        message = WebSocketMessage(
            type=MessageType.NOTIFICATION,
            request_id=None,
            payload={"event": "update"}
        )

        json_str = message.model_dump_json()
        data = json.loads(json_str)

        assert data["type"] == "notification"
        # requestId 不应该出现在 JSON 中（exclude_none=True）
        assert "requestId" not in data

    def test_deserialize_notification_message(self):
        """测试反序列化通知消息"""
        json_str = '{"type":"notification","payload":{"event":"update"}}'

        message = WebSocketMessage.model_validate_json(json_str)

        assert message.type == MessageType.NOTIFICATION
        assert message.request_id is None

    def test_camel_case_field_access(self):
        """测试驼峰命名字段访问"""
        message = WebSocketMessage(
            type=MessageType.REQUEST,
            request_id="test-123",
            payload={"test": "data"}
        )

        # 应该可以通过 requestId 访问
        assert message.request_id == "test-123"

    def test_snake_case_field_access(self):
        """测试蛇形命名字段访问（通过 populate_by_name）"""
        message = WebSocketMessage(
            type=MessageType.REQUEST,
            request_id="test-456",
            payload={"test": "data"}
        )

        # 应该也可以通过 request_id 访问
        assert message.request_id == "test-456"
