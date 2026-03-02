package com.colafan.alfred.websocket.dto

import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * WebSocket 消息 DTO 测试
 */
class WebSocketMessageTest {

    private val objectMapper = ObjectMapper()

    @Test
    fun `should serialize request message correctly`() {
        val message = WebSocketMessage(
            type = MessageType.REQUEST,
            requestId = "test-123",
            payload = mapOf("action" to "test", "data" to "value")
        )

        val json = objectMapper.writeValueAsString(message)
        val parsed = objectMapper.readTree(json)

        assertEquals("request", parsed.get("type").asText())
        assertEquals("test-123", parsed.get("requestId").asText())
        assertEquals("test", parsed.get("payload").get("action").asText())
    }

    @Test
    fun `should deserialize request message correctly`() {
        val json = """{"type":"request","requestId":"test-456","payload":{"action":"ping"}}"""

        val message = objectMapper.readValue(json, WebSocketMessage::class.java)

        assertEquals(MessageType.REQUEST, message.type)
        assertEquals("test-456", message.requestId)
        assertEquals("ping", message.payload["action"])
    }

    @Test
    fun `should serialize response message correctly`() {
        val message = WebSocketMessage(
            type = MessageType.RESPONSE,
            requestId = "req-789",
            payload = mapOf("success" to true, "data" to "result")
        )

        val json = objectMapper.writeValueAsString(message)
        val parsed = objectMapper.readTree(json)

        assertEquals("response", parsed.get("type").asText())
        assertTrue(parsed.get("payload").get("success").asBoolean())
    }

    @Test
    fun `should deserialize response message correctly`() {
        val json = """{"type":"response","requestId":"req-999","payload":{"success":false,"error":"test error"}}"""

        val message = objectMapper.readValue(json, WebSocketMessage::class.java)

        assertEquals(MessageType.RESPONSE, message.type)
        assertEquals("req-999", message.requestId)
        assertEquals(false, message.payload["success"])
    }

    @Test
    fun `should serialize notification message without requestId`() {
        val message = WebSocketMessage(
            type = MessageType.NOTIFICATION,
            requestId = null,
            payload = mapOf("event" to "update")
        )

        val json = objectMapper.writeValueAsString(message)
        val parsed = objectMapper.readTree(json)

        assertEquals("notification", parsed.get("type").asText())
        // requestId 字段被 @JsonInclude(NON_NULL) 排除，不在 JSON 中
        assertTrue(parsed.get("requestId") == null || parsed.get("requestId").isNull)
    }

    @Test
    fun `should deserialize notification message correctly`() {
        val json = """{"type":"notification","payload":{"event":"update"}}"""

        val message = objectMapper.readValue(json, WebSocketMessage::class.java)

        assertEquals(MessageType.NOTIFICATION, message.type)
        assertNull(message.requestId)
    }
}
