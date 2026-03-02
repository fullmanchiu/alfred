#!/bin/bash
# 测试WebSocket消息DTO序列化/反序列化

echo "=== 测试Java WebSocket消息DTO ==="
cd /Users/qiuliang/code/alfred/backend

# 创建临时测试文件
cat > /tmp/TestMessageDto.kt << 'EOF'
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.colafan.alfred.websocket.dto.WebSocketMessage
import com.colafan.alfred.websocket.dto.MessageType

fun main() {
    val mapper = jacksonObjectMapper()

    // 测试序列化
    val message = WebSocketMessage(
        type = MessageType.REQUEST,
        requestId = "test-123",
        payload = mapOf("action" to "test", "data" to "hello")
    )

    val json = mapper.writeValueAsString(message)
    println("序列化结果: $json")

    // 测试反序列化
    val parsed = mapper.readValue(json, WebSocketMessage::class.java)
    println("反序列化结果: type=${parsed.type}, requestId=${parsed.requestId}, payload=${parsed.payload}")
}
EOF

echo "创建测试文件成功"
echo "注意: 完整的单元测试将在后续任务中编写"

echo ""
echo "=== 测试Python WebSocket消息DTO ==="
cd /Users/qiuliang/code/alfred/py-service

source venv/bin/activate
python3 << 'EOF'
from dto.message import WebSocketMessage, MessageType
import json

# 测试序列化
message = WebSocketMessage(
    type=MessageType.REQUEST,
    request_id="test-123",
    payload={"action": "test", "data": "hello"}
)

print(f"Python模型: {message}")
print(f"JSON序列化: {message.model_dump_json()}")

# 测试反序列化
json_str = '{"type":"request","requestId":"test-123","payload":{"action":"test","data":"hello"}}'
parsed = WebSocketMessage.model_validate_json(json_str)
print(f"反序列化结果: type={parsed.type}, request_id={parsed.request_id}, payload={parsed.payload}")
EOF

echo ""
echo "=== DTO测试完成 ==="
