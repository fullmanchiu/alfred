package com.colafan.alfred.websocket.dto

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * WebSocket消息DTO单元测试
 */
class MessageDtoTest {

    private val mapper = jacksonObjectMapper()

    @Test
    fun `should serialize REQUEST message correctly`() {
        val message = WebSocketMessage(
            type = MessageType.REQUEST,
            requestId = "test-123",
            payload = mapOf("action" to "test", "data" to "hello")
        )

        val json = mapper.writeValueAsString(message)

        // 验证JSON格式使用camelCase
        assertEquals("""{"type":"request","requestId":"test-123","payload":{"action":"test","data":"hello"}}""", json)
    }

    @Test
    fun `should deserialize REQUEST message correctly`() {
        val json = """{"type":"request","requestId":"test-123","payload":{"action":"test","data":"hello"}}"""

        val parsed = mapper.readValue(json, WebSocketMessage::class.java)

        assertEquals(MessageType.REQUEST, parsed.type)
        assertEquals("test-123", parsed.requestId)
        assertEquals(mapOf("action" to "test", "data" to "hello"), parsed.payload)
    }

    @Test
    fun `should serialize RESPONSE message correctly`() {
        val message = WebSocketMessage(
            type = MessageType.RESPONSE,
            requestId = "test-456",
            payload = mapOf("result" to "success")
        )

        val json = mapper.writeValueAsString(message)

        // 验证JSON格式使用camelCase
        assertEquals("""{"type":"response","requestId":"test-456","payload":{"result":"success"}}""", json)
    }

    @Test
    fun `should deserialize RESPONSE message correctly`() {
        val json = """{"type":"response","requestId":"test-456","payload":{"result":"success"}}"""

        val parsed = mapper.readValue(json, WebSocketMessage::class.java)

        assertEquals(MessageType.RESPONSE, parsed.type)
        assertEquals("test-456", parsed.requestId)
        assertEquals(mapOf("result" to "success"), parsed.payload)
    }

    @Test
    fun `should serialize NOTIFICATION message correctly`() {
        val message = WebSocketMessage(
            type = MessageType.NOTIFICATION,
            requestId = null,
            payload = mapOf("event" to "update")
        )

        val json = mapper.writeValueAsString(message)

        // 验证JSON格式使用camelCase，requestId为null时不序列化
        assertEquals("""{"type":"notification","payload":{"event":"update"}}""", json)
    }

    @Test
    fun `should deserialize NOTIFICATION message correctly`() {
        val json = """{"type":"notification","payload":{"event":"update"}}"""

        val parsed = mapper.readValue(json, WebSocketMessage::class.java)

        assertEquals(MessageType.NOTIFICATION, parsed.type)
        assertEquals(null, parsed.requestId)
        assertEquals(mapOf("event" to "update"), parsed.payload)
    }
}
