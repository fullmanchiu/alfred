package com.colafan.alfred.websocket.dto

import com.fasterxml.jackson.annotation.JsonInclude
import com.fasterxml.jackson.annotation.JsonProperty

/**
 * WebSocket 消息格式
 *
 * @property type 消息类型（request/response/notification）
 * @property requestId 请求ID（用于关联请求和响应）
 * @property payload 消息负载数据
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
data class WebSocketMessage(
    @JsonProperty("type")
    val type: MessageType,

    @JsonProperty("requestId")
    val requestId: String? = null,

    @JsonProperty("payload")
    val payload: Map<String, Any>
)

/**
 * WebSocket 消息类型枚举
 */
enum class MessageType {
    @JsonProperty("request")
    REQUEST,

    @JsonProperty("response")
    RESPONSE,

    @JsonProperty("notification")
    NOTIFICATION
}
