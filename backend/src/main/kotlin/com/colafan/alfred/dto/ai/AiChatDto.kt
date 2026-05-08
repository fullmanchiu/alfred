package com.colafan.alfred.dto.ai

import io.swagger.v3.oas.annotations.media.Schema

@Schema(description = "AI对话请求")
data class AiChatRequest(
    @Schema(description = "对话ID，首次对话可不传")
    val conversationId: Long? = null,
    @Schema(description = "对话标题，首次对话时设置")
    val title: String? = null,
    @Schema(description = "用户消息内容")
    val content: String
)

@Schema(description = "对话列表项")
data class ConversationDto(
    val id: Long,
    val userId: Long,
    val title: String,
    val updatedAt: String
)

@Schema(description = "消息列表响应")
data class MessageListResponse(
    val messages: List<MessageDto>
)

@Schema(description = "单条消息")
data class MessageDto(
    val id: Long,
    val role: String,
    val content: String?,
    val thinking: String?,
    val toolCalls: Any?,
    val a2ui: Any?,
    val createdAt: String
)
