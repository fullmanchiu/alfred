package com.colafan.alfred.entity.ai

import com.fasterxml.jackson.databind.JsonNode
import jakarta.persistence.*
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.LocalDateTime

@Entity
@Table(name = "ai_messages")
data class AiMessage(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    var conversation: AiConversation? = null,

    @Column(nullable = false, length = 20)
    val role: String,  // "user" or "assistant"

    @Column(columnDefinition = "TEXT")
    val content: String? = null,

    @Column(columnDefinition = "TEXT")
    val thinking: String? = null,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tool_calls")
    val toolCalls: JsonNode? = null,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "a2ui")
    val a2ui: JsonNode? = null,

    @Column(name = "created_at", nullable = false, updatable = false, insertable = false)
    val createdAt: LocalDateTime? = null
) {
    companion object {
        fun user(conversation: AiConversation, content: String) = AiMessage(
            role = "user",
            content = content,
            conversation = conversation
        )

        fun assistant(
            conversation: AiConversation,
            content: String,
            thinking: String? = null,
            toolCalls: JsonNode? = null,
            a2ui: JsonNode? = null
        ) = AiMessage(
            role = "assistant",
            content = content,
            thinking = thinking,
            toolCalls = toolCalls,
            a2ui = a2ui,
            conversation = conversation
        )
    }
}
